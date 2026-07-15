---
title: "[JoliCode] Les bonnes raisons de mettre à jour vers Symfony 5.3 !"
date: 2021-06-02T09:00:00.000Z
description: "Ça y est, Symfony 5.3 est sorti depuis 3 jours, et nous sommes ravis d'y avoir contribué de plusieurs façons différentes. Cette version apporte son lot de nouveautés, et nous vous listons ici celles que nous allons"
tags:
  - cross-post
  - jolicode
  - php
  - symfony
lang: fr
noindex: true
origin:
  url: https://jolicode.com/blog/les-bonnes-raisons-de-mettre-a-jour-vers-symfony-5-3
  site: JoliCode
---

![](/img/jolicode/les-bonnes-raisons-de-mettre-a-jour-vers-symfony-5-3/symfony-53-pr.png)

Ça y est, Symfony 5.3 est sorti depuis 3 jours, et nous sommes ravis d’y avoir contribué de plusieurs façons différentes. Cette version apporte son lot de nouveautés, et nous vous listons ici celles que nous allons utiliser rapidement, tant elles nous semblent importantes, utiles, et pratiques. Allons-y !

## [Config Builder Classes](https://symfony.com/blog/new-in-symfony-5-3-config-builder-classes)

Il nous arrive parfois d’écrire la configuration d’un bundle en PHP, pour bénéficier de structures de contrôle, de boucles, etc. Cependant, cette configuration sous forme de tableau associatif, est assez peu souple et agréable à manipuler, et surtout, elle ne dispose pas de l’autocomplétion par nos IDEs.

Tobias Nyholm a contribué dans cette version 5.3 un générateur de classes de configuration pour les bundles externes, y compris les nôtres, créés directement au sein de notre application.

Un petit avant / après sera beaucoup plus parlant qu’un long paragraphe :

_Avant_

```php
// config/packages/security.php
use Symfony\Component\DependencyInjection\Loader\Configurator\ContainerConfigurator;

return static function (ContainerConfigurator $container) {
  $array = [
        'firewalls' => [
            'main' => [
                'pattern' => '^/*',
                'lazy' => true,
                'anonymous' => [],
            ],
        ],
        'access_control' => [
            ['path' => '^/admin', 'roles' => 'ROLE_ADMIN'],
        ],
    ];

    $container->extension('security', $array);
};
```

_Après_

```php
// config/packages/security.php
use Symfony\Config\SecurityConfig;

return static function (SecurityConfig $security) {
    $security->firewall('main')
        ->pattern('^/*')
        ->lazy(true)
        ->anonymous();

    $security
        ->accessControl(['path' => '^/admin', 'roles' => 'ROLE_ADMIN']);
};
```

Ces classes sont générées automatiquement au même moment que le build du Container, et sont stockées dans le `kernel.build_dir` qui est par défaut le même que `kernel.cache_dir` et sous le namespace `Symfony\Config`.

À nous l’autocomplétion dans les fichiers de configuration PHP !

## [Translation Providers](https://symfony.com/blog/new-in-symfony-5-3-translation-providers)

Point d’orgue de plusieurs années de réflexion, d’usage, d’articles et conférences sur le sujet[1](#fn:1), Mathieu a contribué cette nouvelle feature qui intègre trois SaaS de gestion des traductions dans le cœur de Symfony, plus précisément dans le composant Translation.

Ces Providers seront d’une grande utilité si vous gérez vos traductions dans un outil tel que [Crowdin](https://crowdin.com/), [Loco](https://localise.biz/), ou [Lokalise](https://lokalise.com/). En effet, vous n’aurez plus à envoyer et télécharger vos fichiers de traduction à la main. Désormais, 2 nouvelles commandes que sont `translation:push` et `translation:pull` feront ce travail de synchronisation à votre place. Plusieurs options sont disponibles pour vous permettre de gérer finement les langues et domaines que vous souhaitez manipuler.

Cette feature est au stade expérimental, nous comptons sur vous pour vous la tester, vous l’approprier, et pourquoi pas contribuer de nouveaux Providers !

> « Cette feature remplace-t-elle php-translation/symfony-bundle ? »

Mathieu vous répond :

« Oui et non (je suis normand, désolé). Les Translations Providers de Symfony sont l’équivalent des Adapters dans php-translation. Donc, en ce sens oui, il vaudra mieux à l’avenir utiliser les Providers. Néanmoins, les autres fonctionnalités du bundle php-translation ne sont pas incluses dans Symfony, je pense notamment à celle qui permet d’ajouter de nouvelles clés directement depuis le Profiler, ou encore à la WebUI, qui affiche l’état de vos traductions sur une page dédiée. À priori, les Adapters vont être dépréciés dans le bundle php-translation, et nous allons nous concentrer avec les autres mainteneurs sur les fonctionnalités propres au bundle. »

## [Configurer plusieurs environnements dans le même fichier](https://symfony.com/blog/new-in-symfony-5-3-configure-multiple-environments-in-a-single-file)

Depuis Symfony 4.0, le dossier `config/packages` peut contenir des sous-dossiers représentant les environnements de notre application. Il est alors parfois nécessaire de créer un ou plusieurs fichiers dans ces dossiers pour surcharger une valeur précise de configuration pour un environnement donné. Lorsque cela concerne un bloc entier de configuration, l’intérêt est là, mais lorsque ce n’est que pour une seule valeur, la création d’un fichier peut sembler un peu disproportionnée.

Nicolas Grekas nous apporte une solution toute simple, le raccourci `when@ENV` :

```yaml
# config/packages/webpack_encore.yaml
webpack_encore:
    # ...
    output_path: '%kernel.project_dir%/public/build'
    strict_mode: true
    cache: false

when@prod:
    webpack_encore:
        cache: true
```

Ainsi, la surcharge d’une valeur peut être simplifiée, et ne nécessite pas la création d’un fichier. Nous ne pensons pas forcément utiliser à outrance ce raccourci, mais c’est toujours pratique de le connaître « au cas où ».

## [Amélioration des commandes de debug](https://symfony.com/blog/new-in-symfony-5-3-improved-debug-commands)

Les outils de debug inclus dans Symfony nous aident grandement au quotidien. Avec les récents changements dans le fonctionnement interne du composant Security, et notamment les Dispatchers d’événements dédiés pour chaque Firewall, la sortie de la commande `debug:event-dispatcher` commençait à devenir longue et complexe à lire.

Il est maintenant possible de filtrer cette sortie en précisant le nom du dispatcher que l’on souhaite débugger, avec l’option `--dispatcher`. Cette option accepte aussi bien un `name` (`security.event_dispatcher.main`) de Dispatcher, un FQCN (`Symfony\\Component\\Mailer\\Event\\MessageEvent`), ou encore un alias (`MessageEvent`).

## [Nouvelles améliorations dans la Sécurité](https://symfony.com/blog/new-in-symfony-5-3-improvements-for-security-users)

La sécurité dans Symfony peut sembler floue et complexe pour les débutants, et c’est après quelques années de pratique et d’expérience que l’on parvient à la maîtriser, et en comprendre le fonctionnement. Ce flou était connu par la Core Team, qui a fourni un effort pour le réduire et effacer les concepts ambigus qui datent du temps de Symfony2.

Les changements sont principalement des renommages de concepts existants, et éprouvés, mais dont le nom peut induire en erreur les personnes qui ne travaillent pas souvent avec la sécurité de Symfony.

-   `Symfony\Component\Security\Core\User\User` devient `Symfony\Component\Security\Core\User\InMemoryUser` ;
-   Le concept de `username` dans la `UserInterface` devient `identifier`, en effet cela peut être un email, ou un token d’API ;
-   Les notions de `password` et de `salt` ont été sorties de la `UserInterface`, car plusieurs mécanismes d’authentification ne font plus appel à ces notions.

Tous ces changements seront définitifs pour la version 6.0, il nous reste donc à tous environ 6 mois pour mettre à jours nos applications 💪

## [Tri des champs de formulaires](https://symfony.com/blog/new-in-symfony-5-3-form-field-sorting)

> L’ordre de rendu des champs du formulaire `FooType` est directement dépendant de l’ordre dans lequel ces champs ont été définis dans la classe `FooType`.

Cette assertion a certainement posé problème au moins une fois à chaque lecteur de cet article. Le temps où cette phrase était vraie est désormais révolu, vous pouvez maintenant définir l’option `priority` sur chaque champ de vos formulaires pour les réorganiser. Les champs avec les priorités les plus grandes seront affichés en premier. Et comme c’est fait au niveau du `FormType`, la valeur de cette option peut dépendre d’autres options passées ! 🤯 Terminé les templates Twig à rallonge pour changer l’ordre de vos champs !

## [Filtre Twig `serialize`](https://symfony.com/blog/new-in-symfony-5-3-twig-serialize-filter)

Que celles et ceux qui n’ont jamais eu besoin d’encoder en JSON des données dans un template Twig pour les passer au JS lèvent la main !

…

Ok, à l’écrit c’est pas super efficace, mais nous savons très bien que beaucoup d’entre vous ont levé la main 😅

Bonne nouvelle, vous pouvez ranger votre classe `JsonEncodeExtension` que vous traînez de projet en projet depuis Symfony 2.3, puisque sur le filtre Twig `serialize` vous permet d’encoder directement des données depuis vos templates en utilisant la puissance du Serializer de Symfony !

```html
<div data-product="{{ product|serialize('json', { groups: 'product:read'})
 }}"></div>
```

## [Contextes de sérialisation via les Attributes](https://symfony.com/blog/new-in-symfony-5-3-inlined-serialization-context)

Encore un petit raccourci qui va plaire aux personnes souvent amenées à travailler avec le Serializer : la possibilité de définir les options de contexte directement au-dessus des propriétés de vos classes, grâce aux annotations (ou Attributes si vous avez déjà migré sur PHP 8 😎).

```php
use Symfony\Component\Serializer\Annotation as Serializer;
use Symfony\Component\Serializer\Normalizer\DateTimeNormalizer;

class SomeClass
{
    /**
     * @Serializer\Context({ DateTimeNormalizer::FORMAT_KEY = 'Y-m-d' })
     */
    public \DateTime $date;

    // In PHP 8 applications you can use PHP attributes instead:
    #[Serializer\Context([DateTimeNormalizer::FORMAT_KEY => 'Y-m-d'])]
    public \DateTime $date;
}
```

Le support des contextes de normalisation/dénormalisation ainsi que le support des groupes de sérialisation sont de la partie.

## [Autoconfiguration](https://symfony.com/blog/new-in-symfony-5-3-service-autoconfiguration-and-attributes) et [autowiring](https://symfony.com/blog/new-in-symfony-5-3-service-autowiring-with-attributes) avec les Attributes

Enfin, si vous n’en étiez pas déjà convaincus, Symfony 5.3 confirme ce que l’on a vu dans cette [Pull Request](https://github.com/symfony/symfony/pull/41282), l’utilisation des nouveautés de PHP 8 sera de plus en plus présente.

C’est dans cette optique là que l’autoconfigure et l’autowiring sont désormais configurables à partir d’Attributes, écrits directement dans le code, et non plus dans la configuration.

Pour ajouter un tag automatiquement à tous les services implémentant une interface :

```php
# src/SomeNamespace/SomeInterface.php
namespace App\SomeNamespace;

use Symfony\Component\DependencyInjection\Attribute\Autoconfigure;

#[Autoconfigure(tags: ['app.some_tag'])]
interface SomeInterface
{
    // ...
}
```

Ou bien pour injecter un tableau contenant tous les services taguées `app.handler` :

```php
// src/Handler/HandlerCollection.php
namespace App\Handler;

use Symfony\Component\DependencyInjection\Attribute\TaggedIterator;

class HandlerCollection
{
    public function __construct(
        #[TaggedIterator('app.handler')]
        private iterable $handlers,
    ) {}
}
```

## En route vers 6.0 🚀 !

Nous sommes ravis d’avoir pu contribuer à cette release avec différentes PRs mais aussi d’avoir pu en être le [sponsor](https://jolicode.com/blog/pourquoi-jolicode-sponsorise-la-release-5-3-de-symfony) et ainsi remercier tous les contributeurs de ce beau projet.

Cette nouvelle version nous motive encore plus à contribuer à faire de Symfony un outil majeur du développement web moderne. Nous espérons vous avoir fait découvrir quelques nouveautés que vous allez mettre en place dès la fin de votre lecture et pourquoi pas contribuer vous même à la prochaine version majeure, la 6.0, prévue pour la fin de l’année !

Si vous souhaitez en savoir plus sur toutes les nouveautés de Symfony 5.3, [un article est disponible](https://symfony.com/blog/symfony-5-3-curated-new-features) sur le site officiel.

* * *

1.  articles sur notre blog en [2015](https://jolicode.com/blog/translation-workflow-with-symfony2) et [2017](https://jolicode.com/blog/how-to-properly-manage-translations-in-symfony), conférences au [SymfonyLive Paris 2018](https://www.youtube.com/watch?v=zP6vbkc-GJY), au SymfonyWorld 2020 ([vidéo](https://live.symfony.com/account/replay/video/525), [slides](https://docs.google.com/presentation/d/1Zz5Oxa-6jedobK4jOhuQ9ggTyVTtGcEP3Un_y0LdBoM/edit#slide=id.g35f391192_00)) [↩](#fnref:1)
    

### Commentaires et discussions

let commentsLoaded = false; var remark\_config = { host: 'https://jolicode.com/comments', site\_id: 'jolicode', components: \['embed'\], url: 'https://jolicode.com/blog/les-bonnes-raisons-de-mettre-a-jour-vers-symfony-5-3', max\_shown\_comments: 20, theme: 'light', page\_title: "Les bonnes raisons de mettre \\u00e0 jour vers Symfony 5.3 !", locale: 'fr', show\_email\_subscription: false }; const observer = new IntersectionObserver((entries) => { if (commentsLoaded || entries\[0\].intersectionRatio <= 0) return; commentsLoaded = true; !function(e,n){for(var o=0;o<e.length;o++){var r=n.createElement("script"),c=".js",d=n.head||n.body;"noModule"in r?(r.type="module",c=".mjs"):r.async=!0,r.defer=!0,r.src=remark\_config.host+"/web/"+e\[o\]+c,d.appendChild(r)}}(remark\_config.components||\["embed"\],document); }, { root: null, rootMargin: '0px 0px 400px 0px', }); observer.observe(document.getElementById('remark42'));

## Nos formations sur ce sujet

Notre expertise est aussi disponible sous forme de formations professionnelles !

[Voir toutes nos formations](https://jolicode.com/nos-metiers/formations)

 ![Symfony](/img/jolicode/les-bonnes-raisons-de-mettre-a-jour-vers-symfony-5-3/logo_symfony2.png)

### Symfony

Formez-vous à Symfony, l’un des frameworks Web PHP les complet au monde

[En savoir plus sur cette formation](https://jolicampus.com/formations/symfony)

 ![Symfony avancée](/img/jolicode/les-bonnes-raisons-de-mettre-a-jour-vers-symfony-5-3/logo_symfony2.png)

### Symfony avancée

Décou­vrez les fonc­tion­na­li­tés et concepts avan­cés de Symfo­ny

[En savoir plus sur cette formation](https://jolicampus.com/formations/symfony-avancee)

## Ces clients ont profité de notre expertise
