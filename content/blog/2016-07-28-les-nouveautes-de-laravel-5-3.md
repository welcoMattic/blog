---
title: "[JoliCode] Les nouveautés de Laravel 5.3"
date: 2016-07-28T09:00:00.000Z
description: "Mercredi 27 juillet 2016, s'ouvrait la Laracon US 2016. Une conférence très attendue par les développeurs Laravel puisque la version 5.3 du framework y a été présentée. C'est Taylor Otwell, créateur de Laravel"
tags:
  - cross-post
  - jolicode
  - php
  - laravel
  - laracon
lang: fr
noindex: true
origin:
  url: https://jolicode.com/blog/les-nouveautes-de-laravel-5-3
  site: JoliCode
---

![](/img/jolicode/les-nouveautes-de-laravel-5-3/taylor-otwell-at-laracon-us-2016.jpg)

Mercredi 27 juillet 2016, s’ouvrait la Laracon US 2016. Une conférence très attendue par les développeurs Laravel puisque la version 5.3 du framework y a été présentée.

C’est Taylor Otwell, créateur de Laravel qui a clôturé cette première journée en présentant les nouveautés de la version 5.3. Nous avions eu le droit à quelques informations sur ces nouveautés à travers des tweets de Taylor Otwell via le compte [@laravelphp](https://twitter.com/laravelphp), le teasing donnait vraiment envie d’en savoir plus !

> Small new feature in Laravel 5.3: roll back one migration at a time. [pic.twitter.com/Q2mfslDXo9](https://t.co/Q2mfslDXo9) — Laravel (@laravelphp) [6 juin 2016](https://twitter.com/laravelphp/status/739819300521836545)

> Also coming in Laravel 5.3… [$loop](https://twitter.com/search?q=%24loop&src=ctag) variable in Blade « foreach » loops provides helpful info! [pic.twitter.com/K7URBZNm0Q](https://t.co/K7URBZNm0Q) — Laravel (@laravelphp) [6 juin 2016](https://twitter.com/laravelphp/status/739859945651216384)

Venons-en aux nouveautés présentées :

## Laravel Scout

Laravel Scout est une nouvelle fonctionnalité interne au framework qui permettra dès sa sortie de faire de la recherche full-text sur un model. Par défaut Scout supportera Algolia comme moteur de recherche full-text, mais il sera extensible puisqu’il est driver-based. On pourra donc très certainement voir apparaître le support d’Elasticsearch très peu de temps après la sortie officielle de Laravel 5.3.

Scout fonctionne simplement en implémentant un trait `Searchable` sur nos models existants. Ensuite il suffit de synchroniser les données avec le moteur de recherche via la commande :

```bash
php artisan scout:import App\\Post
```

Enfin, on peut utiliser Scout facilement à partir de nos models :

```php
Post::search('JoliCode')->get();
```

On peut également utiliser la pagination :

```php
Post::search('JoliCode')—>where('status', '=', 'published')->paginate();
```

## Laravel Mailable

Laravel Mailable est un nouveau trait qui permet d’envoyer des emails, rien de nouveau à première vue, ça utilise toujours Swiftmailer. La nouveauté se situe dans la manière avec laquelle on peut très facilement envoyer un mail :

```php
Mail::to('humans@jolicode.com')->send(new CurriculumVitae);
```

La classe `CurriculumVitae` doit implémenter un trait `Mailable` afin que chacune de ses instances puisse être passée au `Mailer`.

On peut également utiliser toutes les autres fonctionnalités d’envoi d’email :

```php
Mail::to('humans@jolicode.com')->cc('ponies@jolicode.com')->send(new CurriculumVitae);
```

## Laravel Notifications

Cette nouvelle fonctionnalité permet d’envoyer facilement des notifications à travers différents canaux comme Slack, les SMS ou les emails.

Pour envoyer une notification, voici le bout de code magique :

```php
$user->notify(new DeploymentCompleted($server));
```

`DeploymentCompleted` est une classe qui implémente le trait `Notifiable`

Peu d’informations sur cette fonctionnalité pour le moment, nous en saurons plus lors de sa sortie.

## Laravel Passport

Sans doute la nouveauté qui a fait le plus de bruit dans la salle de conférence, à en croire les tweets sur le hashtag #Laracon.

Laravel Passport est un package optionnel pour instancier un serveur oAuth 2 prêt à l’emploi.

Il y a peu d’informations pour le moment sur ce package. Il sera très certainement mis à disposition en dehors de Laravel à travers un package Composer officiel externe, à l’image de [Spark](https://spark.laravel.com/), mais gratuitement.

## Autres nouveautés

Laravel Echo : une fonctionnalité améliorant grandement la propagation d’événements et l’interaction avec [Pusher](https://pusher.com/). Matt Stauffer en parle plus longuement dans un [article](https://mattstauffer.co/blog/introducing-laravel-echo).

* * *

Le type de données JSON dans MySQL est maintenant « requêtable » directement à travers Eloquent, avec cette syntaxe :

```php
DB::table('users')
    ->where('stats->published_posts', '>', 3)
    ->get();
```

On peut également effectuer des opérations d’update avec cette syntaxe.

* * *

Le QueryBuilder renvoie désormais une Collection et plus un tableau PHP contenant dans instances de StdClass.

* * *

Les migrations peuvent maintenant être stockées dans un dossier différent de celui par défaut.

```php
$this->loadMigrationsFrom('path/to/your/migrations/folder');
```

On peut maintenant revenir en arrière migration par migration :

```bash
php artisan migrate:rollback --step=1
```

* * *

Vue.js devient de plus en plus lié Laravel. La version 5.3 sera livrée avec tout le nécessaire pour utiliser Vue.js avec Elixir. À l’image de Bootstrap qui est depuis quelques versions inclus dans le `package.json` d’une installation classique de Laravel.

> Laravel 5.3 sets you up with boilerplate to work with Vue straight out of the box. [pic.twitter.com/L2T9LvCkZE](https://t.co/L2T9LvCkZE) — Laracasts (@laracasts) [27 juillet 2016](https://twitter.com/laracasts/status/758396261225623552)

## Date de sortie

Le code source de ces nouveautés n’est pas encore accessible, puisqu’il ne s’agissait là que de l’annonce de la version 5.3. Pour le moment aucune date de sortie officielle n’a été communiquée. Mais il semblerait que la sortie se fasse avant la Laracon EU qui débute le 22 août 2016 à Amsterdam à laquelle nous serons présents.

Pour connaître les détails de toutes les nouveautés de Laravel 5.3, voici quelques comptes Twitter à suivre :

-   [Laravel News](https://twitter.com/laravelnews)
-   [Laracasts](https://twitter.com/laracasts)
-   [Laracon EU](https://twitter.com/laraconeu)
-   [Laracon US](https://twitter.com/laraconus)

Vous pouvez appronfondir avec la [série d’articles de Matt Stauffer](https://mattstauffer.co/blog/series/new-features-in-laravel-5-3) sur les nouveautés de Laravel 5.3.

Et bien sûr suivre ce qui se passe lors des conférences sur le hastash [#Laracon](https://twitter.com/hashtag/laracon?f=tweets&vertical=default).

Photo credit to [@abigailotwell](https://twitter.com/abigailotwell)

### Commentaires et discussions

let commentsLoaded = false; var remark\_config = { host: 'https://jolicode.com/comments', site\_id: 'jolicode', components: \['embed'\], url: 'https://jolicode.com/blog/les-nouveautes-de-laravel-5-3', max\_shown\_comments: 20, theme: 'light', page\_title: "Les nouveaut\\u00e9s de Laravel 5.3", locale: 'fr', show\_email\_subscription: false }; const observer = new IntersectionObserver((entries) => { if (commentsLoaded || entries\[0\].intersectionRatio <= 0) return; commentsLoaded = true; !function(e,n){for(var o=0;o<e.length;o++){var r=n.createElement("script"),c=".js",d=n.head||n.body;"noModule"in r?(r.type="module",c=".mjs"):r.async=!0,r.defer=!0,r.src=remark\_config.host+"/web/"+e\[o\]+c,d.appendChild(r)}}(remark\_config.components||\["embed"\],document); }, { root: null, rootMargin: '0px 0px 400px 0px', }); observer.observe(document.getElementById('remark42'));

## Ces clients ont profité de notre expertise
