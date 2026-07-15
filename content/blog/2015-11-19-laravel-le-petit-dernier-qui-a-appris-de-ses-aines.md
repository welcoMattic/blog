---
title: "[JoliCode] Laravel, le petit dernier qui a appris de ses aînés"
date: 2015-11-19T09:00:00.000Z
description: "Chez JoliCode, nous aimons (beaucoup, passionnément, à la folie) Symfony, et à titre personnel, j'aime beaucoup aussi. Mais il y a un moment que je m'intéresse aussi à Laravel. Laravel est un framework dont nous"
tags:
  - cross-post
  - jolicode
  - php
  - framework
  - laravel
lang: fr
noindex: true
origin:
  url: https://jolicode.com/blog/laravel-le-petit-dernier-qui-a-appris-de-ses-aines
  site: JoliCode
---

![](/img/jolicode/laravel-le-petit-dernier-qui-a-appris-de-ses-aines/laravel-cover.png)

Chez JoliCode, nous aimons (beaucoup, passionnément, à la folie) Symfony, et à titre personnel, j’aime beaucoup aussi. Mais il y a un moment que je m’intéresse aussi à Laravel.

[Laravel](http://laravel.com/) est un framework dont nous entendons beaucoup parler dans l’univers PHP. Mais il y a peu de ressources en français a son sujet, c’est pourquoi j’ai voulu écrire cet article de présentation.

Cet article est mon avis personnel et éclairé sur l’usage professionnel et quotidien de Laravel pendant un peu plus d’un an. Depuis mon arrivée chez JoliCode, je travaille au quotidien avec Symfony, ce qui me permet aujourd’hui d’avoir des élements de comparaison entre ces 2 frameworks.

## Quoi, qui, quand ?

![Logo de Laravel](/img/jolicode/laravel-le-petit-dernier-qui-a-appris-de-ses-aines/laravel-logo.png)

Laravel est un framework open-source PHP créé par [Taylor Otwell](https://twitter.com/taylorotwell) en 2011. Les premières versions ont connu un rythme un peu chaotique, puis la version 4 a marqué un tournant, puisqu’il s’agit d’une réécriture complète du framework.

Laravel 4, nom de code Illuminate, sort le 28 mai 2013. Tout le framework se base désormais sur Composer. Les multiples packages nécessaires à Laravel sont séparés, puis inclus en tant que dépendances dans la Distribution du framework.

À partir de cette version, Laravel commence à suivre un rythme de version plus régulier, une version mineure tous les 6 mois. La couverture de code par une suite de tests unitaires est aujourd’hui de 100% et le framework est construit à partir de plusieurs composants Symfony comme Console, HttpFoundation, HttpKernel, Routing, Translation…

La dernière version de Laravel, la 5, est sortie en février 2015. Entre temps, les versions 4.1 et 4.2 ont apporté une certaine souplesse dans l’architecture du framework et l’ajout de bonnes pratiques au fur et à mesure de leur adoption par la communauté.

## Futur du framework

La version 5.1 est la première LTS (long-time-support). Désormais Laravel connaîtra le même rythme de versions que Symfony, à savoir une version LTS tous les 2 ans, chacune sera supportée pendant 2 ans pour les corrections de bugs, et 3 ans pour la maintenance de sécurité.

## Exploration

### Arborescence des dossiers

![Arborescence de Laravel](/img/jolicode/laravel-le-petit-dernier-qui-a-appris-de-ses-aines/arbo-laravel.png)

Par défaut, Laravel est livré la structure de dossiers illustrée ci-contre.

En ce qui concerne la configuration, Laravel 5 utilise [phpdotenv](https://github.com/vlucas/phpdotenv), cette bibliothèque permet de charger automatiquement le contenu du fichier .env et de le rendre accessible via la fonction [getenv](http://php.net/manual/en/function.getenv.php).

Par défaut, [Gulp](https://github.com/gulpjs/gulp) est livré avec Laravel, avec un ensemble de tâches appelé [Elixir](http://laravel.com/docs/5.1/elixir). Il expose des tâches pour SASS, LESS, CoffeeScript, ES6, et Browserify.

Bien sur, vous n’êtes pas obligé d’utiliser Elixir dans votre application. Mais si vous avez besoin, ou êtes obligé de travailler avec SASS, ES6… Elixir vous fourni rapidement un build-system pré-configuré pour Laravel.

Le plus intéressant à analyser est le contenu du dossier app. Il contient le coeur de l’application. Le dossier Http contiendra les Controllers, les Middlewares, les Requests, et le fichier de Routing. Les Models sont également présents dans ce dossier, mais bizarrement ils ne sont pas dans un dossier à part, ils sont simplement à la racine du dossier Http.

Néanmoins, cette arborescence est une recommandation, si vous le voulez, il est tout à fait possible de mettre vos Models dans un dossier Models. Attention tout de même à vos Namespaces si vous décidez de modifier l’arborescence d’une application existante.

### Artisan CLI

À l’instar de Symfony, Laravel dispose également d’un outil en ligne de commande qui expose plusieurs commandes destinées à accélérer votre productivité.

Ce composant, appelé [Artisan](http://laravel.com/docs/5.1/artisan) est basé sur le composant Console de Symfony. Il propose les commandes classiques permettant de vider le cache de l’application, d’afficher l’ensemble des routes de l’application. Vous pouvez également lancer des commandes plus poussées comme les commandes de génération de fichier.

Le sous-ensemble de commandes `artisan make:xxxxx` permet de générer des Controllers, des Models, des Jobs, des Migrations, des fichiers de tests.

Le sous-ensemble de commandes `artisan migrate:xxxxx` permet de gérer les Migrations de base de données. Exécuter les nouvelles, les réinitialiser, les annuler…

Avec `artisan help` vous trouverez toutes les commandes proposées par Artisan, et vous pourrez créer les votres dans `app/Console/Commands`.

### ORM : Eloquent

Eloquent est l’ORM fourni avec Laravel, il n’est, cependant, plus « obligatoire ». Dans les premières versions de Laravel, Eloquent faisant corps avec le framework, il a été extrait depuis la version 4, et est aujourd’hui maintenu sous le nom de code [Illuminate/Database](https://github.com/illuminate/database).

Eloquent est une implémentation d’ActiveRecord en PHP, il supporte nativement plusieurs systèmes de gestion de base de données (Sqlite3, MySQL, PostgreSQL et SQLServer). On peut trouver des packages qui permettent de connecter Eloquent avec Oracle par exemple : [yajra/laravel-oci8](https://github.com/yajra/laravel-oci8).

L’un des gros points fort d’Eloquent est à mon avis l’ensemble des méthodes qui permettent d’affiner le résultat d’une requête à travers les collections.

Dans la [documentation](http://laravel.com/docs/5.1/eloquent-collections), on peut voir une soixantaine de méthodes telles que `get`, `keys`, `flatten`, `map`… Qui s’appliquent sur une collection et permettent d’affiner le résultat.

Là où dans Symfony nous codons des méthodes spécifiques à chaque besoin (souvent les mêmes à travers les projets), dans Laravel les méthodes les plus courantes existent déjà.

Néanmoins, si vous ne trouvez pas votre bonheur dans cette liste, vous avez toujours la possibilité de créer votre propre méthode afin de trier/filtrer/affiner votre collection.

Lorsque l’on est habitué à Doctrine, le passage à Eloquent est un peu déstabilisant, car nous n’avons pas d’équivalent aux repositories. La plupart des appels à l’ORM sont fait via des méthodes statiques, comme ici :

```php
$article = Article::where('id', '=', $id);
```

Ce qui implique encore une fois de bien se familiariser avec le principe de Façades expliqué dans la prochaine partie de l’article.

Néanmoins, quelques courageux (avec le soutien de Taylor Otwell), ont développé un package permettant de remplacer Eloquent par Doctrine 2 au sein de Laravel. Depuis septembre 2015, il est « officiellement » possible de l’utiliser via [laravel-doctrine](https://github.com/laravel-doctrine).

Faites vos jeux !

### Les Façades

Tout d’abord, il faut savoir que lorsque l’on parle de Façades dans Laravel, on ne parle pas des mêmes Façades que le [design pattern](https://en.wikipedia.org/wiki/Facade_pattern) qui porte ce nom.

Le système de Façades dans Laravel se rapproche beaucoup plus du [design pattern Proxy](https://en.wikipedia.org/wiki/Proxy_pattern). En effet, les Façades sont des classes qui permettent d’accéder facilement et toujours de la même manière (par des appels statiques) à des services présents dans le container. L’ambiguïté de ce nom a fait pas mal de bruit dans la communauté PHP, il reste, cependant, d’actualité.

Maintenant que l’on sait ce à quoi fait référence une Façade dans Laravel, voyons dans quels cas elles sont le plus utile.

Premièrement il y a un fichier dans lequel on va énormément utiliser la Façade Route, c’est… le `router.php`. Voici un exemple :

```php
Route::get('/', ['as' => 'home', 'uses' => 'DefaultController@index']);
Route::get('admin', ['as' => 'admin', 'uses' => 'AdminController@index']);
```

Ici, nous avons déclaré 2 routes simples. L’utilisation de la Façade Route reviendrait en fait à écrire :

```php
$app['router']->get('/', ['as' => 'home', 'uses' => 'DefaultController@index']);
```

Ce qui est un peu plus verbeux et reviendrait surement au final à stocker `$app['router']` dans une variable en début de fichier.

D’ailleurs, il existe une Façade pour appeler le conteneur de services :

```php
App::make('router')->get('/', ['as' => 'home', 'uses' => 'DefaultController@index']);
```

Nous avons donc plusieurs moyens de faire appel à nos services, et le système de Façades permet de les appeler directement par leur nom.

En résumé, dans notre exemple nous avons la Façade **Route**, qui fait référence au service **router** défini dans la classe **Illuminate\\Routing\\Router** (cf, tableau de référence [Façades/Classes](http://laravel.com/docs/5.1/facades#facade-class-reference)).

Je vous laisse découvrir toutes les Façades (ou Proxies si elles sont renommées un jour) dans la [documentation du framework](http://laravel.com/docs/5.1/facades).

## Points forts / points faibles

En comparant Symfony et Laravel, plusieurs choses tournent à l’avantage de Laravel selon moi :

-   La courbe d’apprentissage (Laravel étant conçu pour favoriser le Rapid Application Development) ;
-   La clarté du code, le principe de Façade est là en partie pour ça ;
-   La facilité de maintenance, en suivant les principes de développement de Laravel, on construit de petits fichiers avec de petites méthodes.

Bien sûr avec Symfony on peut également retrouver ces avantages, mais ils ne me paraissent pas innés lorsque l’on commence à travailler avec le framework.

L’un des gros points faibles de Laravel est la quantité de dépendances « officielles » (NodeJS, Gulp, Vagrant…). Avec la distribution par défaut (la seule officielle à ce jour), vous devez avoir NodeJS (pour Elixir). L’obligation d’adhérer au système de façades peut également être un frein pour qui veut essayer Laravel.

L’autre point où Laravel ne fait pas le poids face à Symfony par exemple, c’est sur la flexbilité. Là où Symfony nous permet de poser des bases solides pour créer de grosses applications complexes, Laravel sera vite limité car il n’est pas vraiment possible de surcharger le framework et ses composants, du moins ce n’est pas prévu pour nous faciliter la vie.

Finalement, Laravel est pour moi un très bon framework lorsque l’on a besoin de développer rapidement des applications de petite envergure, mais trouvera ses limites s’il est placé au centre d’un SI complexe et interconnecté à d’autres services (web ou non).

## Selon affinités

Comme beaucoup de choses dans notre métier et ses outils, le choix de Laravel est avant tout basé sur les affinités que vous pourrez avoir avec. L’un des avantages principaux que je trouve à Laravel, c’est la rapidité avec laquelle on peut créer une application basique, et cela peut être plus souvent utile qu’on le croit. On peut également créer facilement et rapidement de petites API REST (soit avec Laravel, soit avec Lumen, le micro-framework issu de Laravel).

Si le système de Façades vous rebute, mais que vous voulez tout de même tester le framework, vous pouvez toujours passer par un appel classique au container ;)

Le mieux pour se faire un avis personnel étant de tester, je vous invite à installer Laravel et à bricoler une petite application (oui, votre blog pourquoi pas, après tout vous l’avez refondu 17 fois sous 17 frameworks différents, non ?).

Dernière chose pour vous convaincre que Laravel est agréable à utiliser, allez faire un tour sur la documentation et son moteur de recherche !

_Sources_:

-   [http://laravel.com/docs/5.1](http://laravel.com/docs/5.1)
-   [http://maxoffsky.com/code-blog/history-of-laravel-php-framework-eloquence-emerging/](http://maxoffsky.com/code-blog/history-of-laravel-php-framework-eloquence-emerging/)
-   [http://www.sitepoint.com/visualize-codes-quality-phpmetrics/](http://www.sitepoint.com/visualize-codes-quality-phpmetrics/)
-   [https://www.brandonsavage.net/lets-talk-about-facades/](https://www.brandonsavage.net/lets-talk-about-facades/)
-   [http://www.sitepoint.com/how-laravel-facades-work-and-how-to-use-them-elsewhere/](http://www.sitepoint.com/how-laravel-facades-work-and-how-to-use-them-elsewhere/)

_Bonus_:

Voici une petite liste de liens à consulter pour découvrir l’univers de Laravel:

-   [https://laravel-news.com/blog/](https://laravel-news.com/blog/)
-   [https://mattstauffer.co/blog](https://mattstauffer.co/blog)
-   [http://taylorotwell.com/](http://taylorotwell.com/)
-   [http://ericlbarnes.com/tag/laravel/](http://ericlbarnes.com/tag/laravel/)
-   [https://murze.be/tag/laravel/](https://murze.be/tag/laravel/)
-   [http://laraveldaily.com/](http://laraveldaily.com/)

### Commentaires et discussions

let commentsLoaded = false; var remark\_config = { host: 'https://jolicode.com/comments', site\_id: 'jolicode', components: \['embed'\], url: 'https://jolicode.com/blog/laravel-le-petit-dernier-qui-a-appris-de-ses-aines', max\_shown\_comments: 20, theme: 'light', page\_title: "Laravel, le petit dernier qui a appris de ses a\\u00een\\u00e9s", locale: 'fr', show\_email\_subscription: false }; const observer = new IntersectionObserver((entries) => { if (commentsLoaded || entries\[0\].intersectionRatio <= 0) return; commentsLoaded = true; !function(e,n){for(var o=0;o<e.length;o++){var r=n.createElement("script"),c=".js",d=n.head||n.body;"noModule"in r?(r.type="module",c=".mjs"):r.async=!0,r.defer=!0,r.src=remark\_config.host+"/web/"+e\[o\]+c,d.appendChild(r)}}(remark\_config.components||\["embed"\],document); }, { root: null, rootMargin: '0px 0px 400px 0px', }); observer.observe(document.getElementById('remark42'));

## Nos articles sur le même sujet

### [Retour d’expérience d’un développeur Symfony qui découvre Laravel](https://jolicode.com/blog/retour-dexperience-dun-developpeur-symfony-qui-decouvre-laravel)

En tant que développeur PHP junior, mon expérience s’est jusqu’à aujourd’hui limitée à Symfony. Curieux de nature, j’ai décidé de me lancer dans l’aventure Laravel, un framework réputé pour sa simplicité et sa…

04/07/2024

par Julien Cousin-Alliot

## Ces clients ont profité de notre expertise
