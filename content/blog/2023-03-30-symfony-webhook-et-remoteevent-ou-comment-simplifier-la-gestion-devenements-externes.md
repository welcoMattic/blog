---
title: "[JoliCode] Symfony Webhook et RemoteEvent, ou comment simplifier la gestion d’événements externes"
date: 2023-03-30T09:00:00.000Z
description: "Lors de la conférence SymfonyCon 2022 à Disneyland Paris, Fabien Potencier a dévoilé à la communauté Symfony deux nouveaux composants : Webhook et RemoteEvent. Ces derniers ont récemment (mars 2023) été mergés"
tags:
  - cross-post
  - jolicode
  - php
  - symfony
  - webhook
lang: fr
noindex: true
origin:
  url: https://jolicode.com/blog/symfony-webhook-et-remoteevent-ou-comment-simplifier-la-gestion-devenements-externes
  site: JoliCode
---

_This blog post is also available in 🇬🇧 English: [Symfony Webhook & RemoteEvent, or how to simplify external event management](https://jolicode.com/blog/symfony-webhook-remoteevent-or-how-to-simplify-external-event-management)._

Lors de la conférence SymfonyCon 2022 à Disneyland Paris, Fabien Potencier [a dévoilé à la communauté Symfony](https://speakerdeck.com/fabpot/symfonycon-2022-keynote-webhooks) deux nouveaux composants : [Webhook](https://github.com/symfony/webhook) et [RemoteEvent](https://github.com/symfony/remote-event).

Ces derniers ont récemment (mars 2023) été mergés dans la branche 6.3 et nous pouvons donc commencer à les tester, c’est ce que nous allons faire dans la suite de cet article !

## Webhook

Un webhook permet à un service extérieur à votre application de vous envoyer des événements. Un webhook est un appel HTTP de serveur à serveur. Le format de la requête envoyée est souvent spécifié par l’expéditeur de celui-ci. Par exemple, chez Stripe, lorsque l’événement `checkout.session.completed` (paiement terminé avec succès) survient, Stripe enverra autant de webhooks que nécessaire. Pour recevoir un webhook, il faut configurer Stripe avec une URL de notre application.

Voyons concrètement, à l’aide d’une application de démonstration, comment nous pouvons recevoir ces webhooks avec un minimum de code.

## S’assurer de la livraison d’un e-mail

Dans cette application de démonstration, nous allons envoyer un e-mail à l’aide du service [Postmark](https://postmarkapp.com/), et configurer la réception du webhook Postmark qui nous informera de la livraison de notre e-mail.

> Note : Afin de simplifier la démonstration, nous avons volontairement fait le choix de ne pas faire un exemple avec Stripe ou Slack.

Créons une nouvelle application Symfony en précisant l’option `--version=next` pour installer la future version 6.3.

```bash
symfony new --webapp --version=next webhook-demo
```

Nous aurons besoin du Bridge Mailer Postmark, afin d’envoyer des e-mails facilement via ce service.

```bash
symfony composer require symfony/postmark-mailer
```

Installons ensuite le nouveau composant Webhook.

```bash
symfony composer require symfony/webhook
```

⚠ Étant donné que ces composants sont très récents, ils ne disposent pas encore en mars 2023 de Recipes Flex, mais elles seront disponibles dès la sortie de Symfony 6.3. Nous devons donc, pour le moment, les configurer manuellement.

Premièrement, dans le fichier `config/routes.yaml`, ajoutons les quelques lignes permettant d’indiquer à notre application comment utiliser le `WebhookController` fourni par le composant :

```yaml
# …
webhook:
    resource: '@FrameworkBundle/Resources/config/routing/webhook.xml'
    prefix: /webhook
```

Ici, nous déclarons également que le préfixe de toutes les URLs de nos webhooks sera `/webhook`.

Ensuite, dans un nouveau fichier `webhook.yaml`, ajoutons le code suivant :

```yaml
framework:
    webhook:
        routing:
            postmark: # cette chaîne de caractères sera utilisée pour construire l'URL de réception du webhook
                service: mailer.webhook.request_parser.postmark
```

Cette configuration indique au composant Webhook que nous voulons exposer l’URL `/webhook/postmark`. Et à la réception d’une requête sur cette URL nous voulons utiliser le service `mailer.webhook.request_parser.postmark`.

Arrêtons-nous un instant sur ce service, qui n’est pas fourni par le composant Webhook mais par le package [symfony/postmark-mailer](https://github.com/symfony/postmark-mailer). En effet, Fabien a commencé à intégrer nativement la gestion des webhooks dans deux Bridges du Mailer de Symfony : Postmark et MailGun. À l’avenir, nous pouvons imaginer que la plupart des Bridges Notifier et Mailer disposeront de tout le nécessaire pour gérer les webhooks émis par les services correspondants.

Ce service dont le FQCN est `Symfony\Component\Mailer\Bridge\Postmark\Webhook\PostmarkRequestParser` permet au composant Webhook de vérifier que les requêtes arrivant sur l’URL définie précédemment sont légitimes et valides.

L’interface `RequestParserInterface` :

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

Et son implémentation pour Postmark :

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

Pour effectuer ces validations, `PostmarkRequestParser` utilise le mécanisme de RequestMatcher inclus dans le composant HTTPFoundation. Concrètement, ce mécanisme propose des classes afin de vérifier que l’IP émettant la requête est incluse dans une liste définie, ou que le contenu de la requête est bien du JSON, ou encore que le verbe HTTP est bien `POST`. Fabien a privilégié l’utilisation de l’existant plutôt que de réinventer un système similaire.

Si cette première étape est passée avec succès, alors le composant déclenche ensuite la méthode `doParse`. Celle-ci va valider le contenu de la requête, et s’assurer que toutes les données attendues sont bien présentes, puis, le cas échéant, appeler un nouveau service, le Payload Converter, qui va transformer notre payload en objet.

## RemoteEvent

C’est à partir d’ici qu’entre en scène le composant RemoteEvent. Son rôle est de convertir les données reçues dans les webhooks en objets validés que l’on peut ensuite utiliser à notre guise.

À partir de la requête HTTP reçue par notre service `PostmarkRequestParser`, le Payload Converter va créer un objet `RemoteEvent`, et même plus précisément dans notre cas, un objet `MailerDeliveryEvent`.

🗒 Notons ici que plusieurs classes héritant de `RemoteEvent` sont d’ores et déjà à notre disposition dans le [code du composant](https://github.com/symfony/symfony/tree/6.3/src/Symfony/Component/RemoteEvent/Event).

Comme pour la partie Webhook, le Bridge Postmark met à notre disposition un service`PostmarkPayloadConverter`.

Ici, nous n’avons rien à faire dans notre code puisque c’est le `PostmarkRequestParser` qui appelle `PostmarkPayloadConverter`.

Le seul fichier PHP que nous avons besoin de créer pour avoir accès à cet objet `MailerDeliveryEvent` est un `PostmarkConsumer`.

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
        $transactionalEmail = $this->transactionalEmailRepository->findOneBy(['messageIdentifier' => $event->getMetadata()['Message-ID']]); // "Message-ID" est un champ metadata que nous avons défini arbitrairement lors de l'envoi de l'e-mail, Postmark nous le renvoie dans le webhook, ce qui nous permet d'identifier l'e-mail
        $transactionalEmail->setDelivered(true);
        $this->em->persist($transactionalEmail);
        $this->em->flush();
    }
}
```

Attention à plusieurs choses dans ce fichier. D’abord l’attribut `AsRemoteEventConsumer`, qui nous permet de déclarer cette classe comme étant un `RemoteEventConsumer` et donc de la faire connaître au composant RemoteEvent pour qu’il puisse y passer l’objet converti. Le `name` est également important, il doit être égal à l’entrée de configuration sous `routing` que nous avons saisie dans le fichier webhook.yaml, soit dans notre cas : `postmark`.

Dans la méthode `consume`, nous pouvons enfin disposer de notre objet contenant les données de l’événement à l’origine du déclenchement du webhook, et agir en conséquence.

Pour la démonstration, nous avons choisi de stocker chaque e-mail envoyé en base de données, et de les marquer comme livrés à la réception du webhook émis par Postmark.

## Code source

Le code source de l’application de démonstration est disponible sur [notre GitHub](https://github.com/jolicode/webhook-demo), pour l’utiliser il vous faudra au préalable un compte Postmark configuré sur un domaine dédié (la validation des entrées DNS DKIM et Return-Path est nécessaire).

Sur ce repository, il existe une différence avec le code présenté dans l’article ; nous avons choisi d’utiliser Messenger pour rendre asynchrone le traitement du RemoteEvent reçu. En effet, il nous paraît important de répondre le plus vite possible, au sens HTTP du terme, au service externe et qu’il ne soit pas tributaire du temps de traitement que nous avons à faire. Cependant certains services comme Stripe s’attendent à ce que notre application puisse répondre une erreur 500 par exemple. Dans ce cas, il est possible que Stripe rejoue le webhook quelques instants plus tard.

## À vous de jouer

Comme nous venons de le voir, ces deux nouveaux composants apportent toute l’infrastructure nécessaire pour recevoir des webhooks provenant de n’importe quel service.

Si dans vos applications vous gérez des webhooks émis par Slack, Discord, Stripe, PayPal ou votre CRM, n’hésitez pas à les contribuer au sein de Symfony pour en faire profiter la communauté et ainsi enrichir tous les Bridges existants déjà pour Mailer, Notifier et pourquoi pas Translation. 😉

### Commentaires et discussions

let commentsLoaded = false; var remark\_config = { host: 'https://jolicode.com/comments', site\_id: 'jolicode', components: \['embed'\], url: 'https://jolicode.com/blog/symfony-webhook-et-remoteevent-ou-comment-simplifier-la-gestion-devenements-externes', max\_shown\_comments: 20, theme: 'light', page\_title: "Symfony Webhook et RemoteEvent, ou comment simplifier la gestion d'\\u00e9v\\u00e9nements externes", locale: 'fr', show\_email\_subscription: false }; const observer = new IntersectionObserver((entries) => { if (commentsLoaded || entries\[0\].intersectionRatio <= 0) return; commentsLoaded = true; !function(e,n){for(var o=0;o<e.length;o++){var r=n.createElement("script"),c=".js",d=n.head||n.body;"noModule"in r?(r.type="module",c=".mjs"):r.async=!0,r.defer=!0,r.src=remark\_config.host+"/web/"+e\[o\]+c,d.appendChild(r)}}(remark\_config.components||\["embed"\],document); }, { root: null, rootMargin: '0px 0px 400px 0px', }); observer.observe(document.getElementById('remark42'));

## Nos articles sur le même sujet

### [SymfonyCon Disneyland Paris pour les 15+2 ans de Symfony !](https://jolicode.com/blog/symfonycon-disneyland-paris-pour-les-15-2-ans-de-symfony)

Après plus de deux ans d’attente, la SymfonyCon 2020 2021 2022 s’est tenue à Disneyland Paris les 17 et 18 novembre derniers. Nous étions ravis d’y retrouver des membres de la communauté, les autres membres de…

29/11/2022

par Grégoire Pineau

## Nos formations sur ce sujet

Notre expertise est aussi disponible sous forme de formations professionnelles !

[Voir toutes nos formations](https://jolicode.com/nos-metiers/formations)

 ![Symfony](/img/jolicode/symfony-webhook-et-remoteevent-ou-comment-simplifier-la-gestion-devenements-externes/logo_symfony2.png)

### Symfony

Formez-vous à Symfony, l’un des frameworks Web PHP les complet au monde

[En savoir plus sur cette formation](https://jolicampus.com/formations/symfony)

 ![Symfony avancée](/img/jolicode/symfony-webhook-et-remoteevent-ou-comment-simplifier-la-gestion-devenements-externes/logo_symfony2.png)

### Symfony avancée

Décou­vrez les fonc­tion­na­li­tés et concepts avan­cés de Symfo­ny

[En savoir plus sur cette formation](https://jolicampus.com/formations/symfony-avancee)

## Ces clients ont profité de notre expertise
