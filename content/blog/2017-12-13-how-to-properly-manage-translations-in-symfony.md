---
title: "[JoliCode] How to properly manage translations in Symfony?"
date: 2017-12-13T09:00:00.000Z
description: "We already wrote about our Symfony translation workflow some years ago. But since 2015, lots of things have evolved and it was time to update this workflow. The aim stays the same, keeping app translation simple"
tags:
  - cross-post
  - jolicode
  - translations
  - php
  - symfony
  - translation
  - i18n
  - workflow
lang: en
noindex: true
origin:
  url: https://jolicode.com/blog/how-to-properly-manage-translations-in-symfony
  site: JoliCode
---

We already wrote about our [Symfony translation workflow](https://jolicode.com/blog/translation-workflow-with-symfony2) some years ago. But since 2015, lots of things have evolved and it was time to update this workflow.

The aim stays the same, keeping app translation simple and fluent for all stakeholders of the project. To achieve this, we had chosen an external tool: [Loco](https://localise.biz/), which centralizes translation data, and a piece of code written to synchronize it with Symfony translation files.

Many people had the same problem, and since then the [php-translation GitHub organization](https://github.com/php-translation) appeared. It consists in simplifying translation keys management for developers, facilitates the work of the translator, and allows product owner to check and correct translations.

Here is how we translate, at JoliCode, a Symfony application in 2017.

## The birth of PHP Translation organization

Until now, there was 2 major bundles used to handle translations in Symfony applications: [JMSTranslationBundle](https://github.com/schmittjoh/JMSTranslationBundle) and [HappyrTranslation](https://github.com/Happyr/TranslationBundle). Those bundles provide many interesting features like key extraction, data storing in an external services, dedicated WebUI to allow authorized users to edit translations, commands for key extractions…

But there was some missing features for us: adapters to others translation services than Loco, possibility to edit translation directly in the app for non tech users, automatic download on production environment, …

PHP Translation provides most of these features with a framework agnostic approach. A bundle for Symfony and a Laravel package are available.

There are [many supported translation services](https://github.com/php-translation?utf8=%E2%9C%93&q=adapters&type=&language=), and you can create your own adapter. Let’s focus on the Symfony bundle.

## Tools and workflow

We are still using Loco in addition to php-translation bundle. The following schema shows how we separate responsibilities between developers, product owner and translators.

![workflow](/img/jolicode/how-to-properly-manage-translations-in-symfony/04-worfklow-translation.png)

Developers are responsible to push new translations keys in Loco. They must pay attention to write **clear and precise keys** because the next actor in the workflow is the translator which is not necessary a technician. To push new keys, our favorite solution is to use the Web Profiler Panel feature. The bundle changes the display of the Translation Panel in the Profiler to add these features. Here, we can find missing local keys, we can select and push all of them to Loco:

![Send all missing keys to Loco](/img/jolicode/how-to-properly-manage-translations-in-symfony/01-php-translation-send-all.gif)

If the developers have translation messages for one or more languages or if they find a typo, they can edit messages and push them to Loco. In parallel, the updated messages will be written in the local xliff (or yml, xml, …) files:

![Edit in profiler](/img/jolicode/how-to-properly-manage-translations-in-symfony/02-php-translation-edit-one.gif)

Once new keys are pushed to Loco, translators can do their job in as many languages as necessary. Then, developers can pull new translated data to update their local application.

Oh wait, what happens if the product owner catches a mistake on the homepage on pre-production? No problem, if we have activated the edit-in-place feature, then the product owner can directly correct the mistake on the homepage and push it back to Loco.

![Edit in place](/img/jolicode/how-to-properly-manage-translations-in-symfony/03-edit-in-place-demo.gif) Source: [php-translation bundle edit-in-place documentation](http://php-translation.readthedocs.io/en/latest/symfony/edit-in-place.html)

## What about testing environment?

When we test our application, we don’t want to test the Symfony translator. Hence, we usually just disable the translator in the `config_test.yml`. Therefore, we’ll be able to test pure translation keys.

If there are i18n routes, we cannot do that as we want the keys from the “routes” domain to be translated. We can decorate the translator with a custom one that only does its job for these keys.

Here is an example:

```
services:
    app.decorating_translator:
        class: AppBundle\Translator\NoTranslator
        decorates: translator
        arguments:
            - '@app.decorating_translator.inner'
        public: false
```

Our `NoTranslator.php` must translate only keys under domain `routes`:

```php
class NoTranslator implements TranslatorInterface, TranslatorBagInterface
{
    private $translator;

    public function __construct(TranslatorInterface $translator)
    {
        $this->translator = $translator;
    }

    public function trans($id, array $parameters = [], $domain = null, $locale = null)
    {
        if ($domain === 'routes'){
            return $this->translator->trans($id, $parameters, $domain, $locale);
        }

        return $id;
    }

    public function transChoice($id, $number, array $parameters = [], $domain = null, $locale = null)
    {
        if ($domain === 'routes'){
            return $this->translator->transChoice($id, $number, $parameters, $domain, $locale);
        }

        return $id;
    }

    public function getCatalogue($locale = null)
    {
        if (!$this->translator instanceof TranslatorBagInterface){
            throw new \RuntimeException("Translator doesn't implement TranslatorBagInterface.");
        }

        return $this->translator->getCatalogue($locale);
    }

    public function setLocale($locale)
    {
        return $this->translator->setLocale($locale);
    }

    public function getLocale()
    {
        return $this->translator->getLocale();
    }
}
```

Now, we can write a test to assert the presence of a translation key in the Response content:

```php
public function testUnicornsRunTheWorldTitlePresence()
    {
        $crawler = $this->client->request('GET', '/unicorns-run-the-world');

        $this->assertContains('unicorns_page.title', $crawler->filter('body section.content h1')->text());
    }
```

## From translators to production

It is important to keep this translation workflow “deployment independent”. We can deploy at any time of the translation process, because during the deploy the missing keys and messages will be pulled from Loco. After the deployment, a worker on the prod env (aka. a crontab job) will pull new messages every X minutes from Loco. The production environment is always up to date, almost in real time.

Recently, [php-translation got a cache clearing feature](https://github.com/php-translation/symfony-bundle/pull/139) for the translation download command. It computes a MD5 of the translation directory, fetches the translations from Loco, and computes the MD5 again. If the hashes are different, it clears the translation cache. That way, we don’t have to do anything to have updated translations on our deployments and **our clients are 100% independent from technicians to change texts on the website**.

If your translation service is down, what happens? The synchronization will be broken, but don’t be afraid: the next crontab will not erase all existing messages. It will be a real problem if the service is not available for days, because the only way to push new translated messages in production is to pull from the external service. Until now, we have not found a solution to solve this potential problem – which indeed never happened for real.

## What is missing

As users of Loco, there is one bad thing which is the catalog management. Loco doesn’t mind of translation domains. For instance, if you want to translate all validator messages, you must create a new Loco project. It’s a bit tricky, because for each project you have to declare a new configuration in the bundle. There surely is a possible improvement for Loco Adapter to manage domains between fetch from Loco and the writing in files.

Obviously, in many projects, we also need to translate strings on the browser side, and most of time those strings are already translated in our Symfony app. We wondered “how to make our translations available on the frontend?”. Today, the best way to expose translations to the browser is to use the famous [BazingaJsTranslationBundle](https://github.com/willdurand/BazingaJsTranslationBundle).

* * *

Now, you have all the cards in your game to master app translations. Do not hesitate to contribute to the [php-translation](https://github.com/php-translation) organization to add new adapters or improve the Symfony bundle.

We want to give a special thanks to [Tobias](https://github.com/Nyholm) for his amazing work on the php-translation packages ! 👏

### Commentaires et discussions

let commentsLoaded = false; var remark\_config = { host: 'https://jolicode.com/comments', site\_id: 'jolicode', components: \['embed'\], url: 'https://jolicode.com/blog/how-to-properly-manage-translations-in-symfony', max\_shown\_comments: 20, theme: 'light', page\_title: "How to properly manage translations in Symfony?", locale: 'en', show\_email\_subscription: false }; const observer = new IntersectionObserver((entries) => { if (commentsLoaded || entries\[0\].intersectionRatio <= 0) return; commentsLoaded = true; !function(e,n){for(var o=0;o<e.length;o++){var r=n.createElement("script"),c=".js",d=n.head||n.body;"noModule"in r?(r.type="module",c=".mjs"):r.async=!0,r.defer=!0,r.src=remark\_config.host+"/web/"+e\[o\]+c,d.appendChild(r)}}(remark\_config.components||\["embed"\],document); }, { root: null, rootMargin: '0px 0px 400px 0px', }); observer.observe(document.getElementById('remark42'));

## Nos articles sur le même sujet

### [Translation workflow with Symfony2](https://jolicode.com/blog/translation-workflow-with-symfony2)

I have an issue with Symfony2 translations. No in fact, let’s say I have an issue with app translation in general. It’s painful to write, to sync, to contextualize and to maintain. I’ve built many web applications…

06/07/2015

par Damien Alexandre

## Nos formations sur ce sujet

Notre expertise est aussi disponible sous forme de formations professionnelles !

[Voir toutes nos formations](https://jolicode.com/nos-metiers/formations)

 ![Symfony](/img/jolicode/how-to-properly-manage-translations-in-symfony/logo_symfony2.png)

### Symfony

Formez-vous à Symfony, l’un des frameworks Web PHP les complet au monde

[En savoir plus sur cette formation](https://jolicampus.com/formations/symfony)

 ![Symfony avancée](/img/jolicode/how-to-properly-manage-translations-in-symfony/logo_symfony2.png)

### Symfony avancée

Décou­vrez les fonc­tion­na­li­tés et concepts avan­cés de Symfo­ny

[En savoir plus sur cette formation](https://jolicampus.com/formations/symfony-avancee)

## Ces clients ont profité de notre expertise
