---
title: "[JoliCode] Symfony Webhook & RemoteEvent, or how to simplify external event management"
date: 2023-04-04T09:00:00.000Z
description: "During the SymfonyCon 2022 conference at Disneyland Paris, Fabien Potencier unveiled two new components to the Symfony community: Webhook and RemoteEvent. They have recently (March 2023) been merged into the 6.3"
tags:
  - cross-post
  - jolicode
  - php
  - symfony
  - webhook
lang: en
noindex: true
origin:
  url: https://jolicode.com/blog/symfony-webhook-remoteevent-or-how-to-simplify-external-event-management
  site: JoliCode
---

_Cet article est aussi disponible en 🇫🇷 Français : [Symfony Webhook et RemoteEvent, ou comment simplifier la gestion d’événements externes](https://jolicode.com/blog/symfony-webhook-et-remoteevent-ou-comment-simplifier-la-gestion-devenements-externes)._

During the SymfonyCon 2022 conference at Disneyland Paris, Fabien Potencier [unveiled two new components](https://speakerdeck.com/fabpot/symfonycon-2022-keynote-webhooks) to the Symfony community: [Webhook](https://github.com/symfony/webhook) and [RemoteEvent](https://github.com/symfony/remote-event).

They have recently (March 2023) been merged into the 6.3 branch, so we can start testing them, which is what we’ll do in the following article!

## Webhook

A webhook allows a service outside your application to send you events. A webhook is an HTTP call from server to server. The format of the request sent is often specified by the sender of the request. For example, with Stripe, when the event `checkout.session.completed` occurs, Stripe will send as many webhooks as necessary. To receive a webhook, we need to configure Stripe with an URL from our application.

Let’s see concretely, with the help of a demo application, how we can receive these webhooks with a minimum of code.

## Ensure an email is delivered

In this demo application, we will send an email using the [Postmark](https://postmarkapp.com/) service, and configure the reception of the Postmark webhook that will inform us of the delivery of our email.

> Note: In order to simplify the demonstration, we have voluntarily chosen not to make an example with Stripe or Slack.

Let’s create a new Symfony application by specifying the `--version=next` option to install the future version 6.3.

```bash
symfony new --webapp --version=next webhook-demo
```

We will need the Bridge Mailer Postmark, in order to send emails easily via this service.

```bash
symfony composer require symfony/postmark-mailer
```

Then let’s install the new Webhook component.

```bash
symfony composer require symfony/webhook
```

⚠ Since these components are very new, they don’t have Flex Recipes yet in March 2023, but they will be available when Symfony 6.3 is released. So for now, we have to configure them manually.

First, in the `config/routes.yaml` file, let’s add the few lines that tell our application how to use the `WebhookController` provided by the component:

```yaml
# …
webhook:
	resource: '@FrameworkBundle/Resources/config/routing/webhook.xml'
	prefix: /webhook
```

Here we also declare that the prefix of all our webhook URLs will be `/webhook`.

Then, in a new `webhook.yaml` file, let’s add the following code:

```yaml
framework:
    webhook:
        routing:
            postmark: # this string will be used to build the webhook reception URL
                service: mailer.webhook.request_parser.postmark
```

This configuration tells the Webhook component that we want to expose the URL `/webhook/postmark`. And upon receiving a request on this URL we want to use the `mailer.webhook.request_parser.postmark` service.

Let’s have a look at this service, which is not provided by the Webhook component but by the [symfony/postmark-mailer](https://github.com/symfony/postmark-mailer) package. Indeed, Fabien has started to natively integrate webhook management in two Symfony Mailer Bridges: Postmark and MailGun. In the future, we can imagine that most of the Notifier and Mailer Bridges will have everything needed to manage webhooks sent by the corresponding services.

This service, whose FQCN is `Symfony\Component\Mailer\Bridge\Postmark\Webhook\PostmarkRequestParser`, allows the Webhook component to check that requests arriving on the previously defined URL are legitimate and valid.

The `RequestParserInterface`:

```
interface RequestParserInterface
{
   /**
    * Parses an HTTP Request and converts it into a RemoteEvent.
    *
    * @return ?RemoteEvent Returns null if the webhook must be ignored
    *
    * @throws RejectWebhookException When the payload is rejected (signature issue, parse issue, ...)
    */
    public function parse(Request $request, string $secret): ?RemoteEvent;

    public function createSuccessfulResponse(): Response;

    public function createRejectedResponse(string $reason): Response;
}
```

And its implementation for Postmark :

```php
namespace Symfony\Component\Mailer\Bridge\Postmark\Webhook;

final class PostmarkRequestParser extends AbstractRequestParser
{
    public function __construct(
        private readonly PostmarkPayloadConverter $converter,
    ) {
    }

    protected function getRequestMatcher(): RequestMatcherInterface
    {
        return new ChainRequestMatcher([
            new MethodRequestMatcher('POST'),
            // https://postmarkapp.com/support/article/800-ips-for-firewalls#webhooks
            // localhost is added for testing
            new IpsRequestMatcher(['3.134.147.250', '50.31.156.6', '50.31.156.77', '18.217.206.57', '127.0.0.1', '::1']),
            new IsJsonRequestMatcher(),
        ]);
    }

    protected function doParse(Request $request, string $secret): ?AbstractMailerEvent
    {
        $payload = $request->toArray();
        if (
            !isset($payload['RecordType'])
            || !isset($payload['MessageID'])
            || !(isset($payload['Recipient']) || isset($payload['Email']))
            || !isset($payload['Metadata'])
            || !isset($payload['Tag'])
        ) {
            throw new RejectWebhookException(406, 'Payload is malformed.');
        }

        try {
            return $this->converter->convert($payload);
        } catch (ParseException $e) {
            throw new RejectWebhookException(406, $e->getMessage(), $e);
        }
    }
}
```

To perform these validations, `PostmarkRequestParser` uses the RequestMatcher mechanism included in the HTTPFoundation component. Practically, this mechanism proposes classes to check that the IP sending the request is included in a defined list, or that the request content is in JSON, or that the HTTP verb is `POST`. Fabien preferred to use what already existed rather than reinventing a similar system.

If this first step is successful, then the component triggers the `doParse` method. This method will validate the content of the request, and make sure that all the expected data are present, then, if necessary, call a new service, the Payload Converter, which will transform our payload into an object.

## RemoteEvent

This is where the RemoteEvent component comes into light. Its role is to convert the data received in the webhooks into validated objects that we can then use as we like.

From the HTTP request received by our `PostmarkRequestParser` service, the Payload Converter will create a `RemoteEvent` object, and even more precisely in our case, a `MailerDeliveryEvent` object.

🗒 Note here that several classes inheriting from `RemoteEvent` are already available to us in the [component code](https://github.com/symfony/symfony/tree/6.3/src/Symfony/Component/RemoteEvent/Event).

As for the Webhook part, the Postmark Bridge provides a `PostmarkPayloadConverter` service.

Here, we don’t have to do anything in our code since it is the `PostmarkRequestParser` that calls `PostmarkPayloadConverter`.

The only PHP file we need to create to access this `MailerDeliveryEvent` object is a `PostmarkConsumer`.

```php
use App\Message\MarkEmailAsDeliveredMessage;
use Doctrine\ORM\EntityManagerInterface;
use Symfony\Component\RemoteEvent\Attribute\AsRemoteEventConsumer;
use Symfony\Component\RemoteEvent\Event\Mailer\MailerDeliveryEvent;

#[AsRemoteEventConsumer(name: 'postmark')]
class PostmarkConsumer
{
    public function __construct(
        public readonly TransactionalEmailRepository $transactionalEmailRepository,
        public readonly EntityManagerInterface $em,
    ) {
    }

    public function consume(MailerDeliveryEvent $event): void
    {
        $transactionalEmail = $this->transactionalEmailRepository->findOneBy(['messageIdentifier' => $event->getMetadata()['Message-ID']]); // "Message-ID" is a metadata field defined when sending the email. Postmark sends it back in the webhook, as the email identifier.
        $transactionalEmail->setDelivered(true);
        $this->em->persist($transactionalEmail);
        $this->em->flush();
    }
}
```

Be aware of several things in this file. First, the `AsRemoteEventConsumer` attribute, which allows us to declare this class as a `RemoteEventConsumer` and thus, make it known to the RemoteEvent component so that it can pass the converted object to it. Then, the `name` is also important, it must be equal to the configuration entry under `routing` that we entered in the webhook.yaml file, which in our case is `postmark`.

In the `consume` method, we can finally have our object containing the data of the event that triggers the webhook, and act accordingly.

For the demonstration, we chose to store each email sent into the database, and to mark them as delivered upon reception of the webhook issued by Postmark.

## Source code

The source code of the demo application is available on [our GitHub](https://github.com/jolicode/webhook-demo). To use it you will first need a Postmark account configured on a dedicated domain (validation of DKIM and Return-Path DNS entries is required).

On this repository, there is a difference with the code presented in the article; we chose to use Messenger to make the processing of the received RemoteEvent asynchronous. Indeed, it seems important to us to respond as quickly as possible, in the HTTP sense of the term, to the external service and that it is not dependent on the processing time. However, some services such as Stripe expect our application to be able to respond to a 500 error for example. In this case, it is possible that Stripe will replay the webhook a few moments later.

## Your turn to play!

As we just saw, these two new components provide all the necessary infrastructure to receive webhooks from any service.

If your applications manage webhooks from Slack, Discord, Stripe, PayPal or your CRM, don’t hesitate to contribute them to Symfony to benefit the community and enrich all the existing Bridges for Mailer, Notifier and why not Translation 😉

### Commentaires et discussions

let commentsLoaded = false; var remark\_config = { host: 'https://jolicode.com/comments', site\_id: 'jolicode', components: \['embed'\], url: 'https://jolicode.com/blog/symfony-webhook-remoteevent-or-how-to-simplify-external-event-management', max\_shown\_comments: 20, theme: 'light', page\_title: "Symfony Webhook & RemoteEvent, or how to simplify external event management", locale: 'en', show\_email\_subscription: false }; const observer = new IntersectionObserver((entries) => { if (commentsLoaded || entries\[0\].intersectionRatio <= 0) return; commentsLoaded = true; !function(e,n){for(var o=0;o<e.length;o++){var r=n.createElement("script"),c=".js",d=n.head||n.body;"noModule"in r?(r.type="module",c=".mjs"):r.async=!0,r.defer=!0,r.src=remark\_config.host+"/web/"+e\[o\]+c,d.appendChild(r)}}(remark\_config.components||\["embed"\],document); }, { root: null, rootMargin: '0px 0px 400px 0px', }); observer.observe(document.getElementById('remark42'));

## Nos articles sur le même sujet

### [SymfonyCon at Disneyland Paris for the 15+2th birthday of Symfony](https://jolicode.com/blog/symfonycon-at-disneyland-paris-for-the-15-2th-birthday-of-symfony)

After more than two years of waiting, SymfonyCon 2020 2021 2022 was held at Disneyland Paris on November 17th and 18th. We were delighted to meet community members, other members of the Core Team, as well as contributors…

29/11/2022

par Grégoire Pineau, + 1 autre

## Nos formations sur ce sujet

Notre expertise est aussi disponible sous forme de formations professionnelles !

[Voir toutes nos formations](https://jolicode.com/nos-metiers/formations)

 ![Symfony](/img/jolicode/symfony-webhook-remoteevent-or-how-to-simplify-external-event-management/logo_symfony2.png)

### Symfony

Formez-vous à Symfony, l’un des frameworks Web PHP les complet au monde

[En savoir plus sur cette formation](https://jolicampus.com/formations/symfony)

 ![Symfony avancée](/img/jolicode/symfony-webhook-remoteevent-or-how-to-simplify-external-event-management/logo_symfony2.png)

### Symfony avancée

Décou­vrez les fonc­tion­na­li­tés et concepts avan­cés de Symfo­ny

[En savoir plus sur cette formation](https://jolicampus.com/formations/symfony-avancee)

## Ces clients ont profité de notre expertise
