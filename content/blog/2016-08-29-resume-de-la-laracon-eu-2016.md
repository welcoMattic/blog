---
title: "[JoliCode] Résumé de la Laracon EU 2016"
date: 2016-08-29T09:00:00.000Z
description: "Les 23 et 24 août derniers se tenait à Amsterdam la conférence annuelle européenne de Laravel. Nous y étions et c’était chouette, alors nous vous racontons ! Commençons par le lieu où se déroulait la conférence"
tags:
  - cross-post
  - jolicode
  - php
  - conférence
  - laravel
  - laracon
  - amsterdam
lang: fr
noindex: true
origin:
  url: https://jolicode.com/blog/resume-de-la-laracon-eu-2016
  site: JoliCode
---

Les 23 et 24 août derniers se tenait à Amsterdam la conférence annuelle européenne de Laravel. Nous y étions et c’était chouette, alors nous vous racontons !

Commençons par le lieu où se déroulait la conférence (SugarCity Events), qui est tout simplement incroyable. Il s’agit d’une ancienne manufacture de sucre réhabilitée en lieu pouvant accueillir toutes sortes d’évènements.

![Laracon venue](/img/jolicode/resume-de-la-laracon-eu-2016/laracon-venue.jpg "Laracon venue")

## Keynote par [Taylor Otwell](https://twitter.com/taylorotwell)

La conférence s’est ouverte avec une keynote de Taylor Otwell, lors de laquelle il a fait une démonstration de certaines nouveautés de Laravel 5.3 qui avaient été annoncées lors de la Laracon US le mois dernier. Parmi ces innovations, nous avons pu découvrir le nouveau système de notification du framework, basé sur des drivers que chacun peut créer pour connecter le service de messagerie de son choix. « Messagerie » au sens large, puisque Taylor Otwell lui-même s’est fendu d’un driver pour le service d’envoi de cartes postales [Lob](https://lob.com/services/postcards). Oui, maintenant nous pouvons même envoyer des cartes postales depuis nos applications Laravel 😀

![Taylor Otwell](/img/jolicode/resume-de-la-laracon-eu-2016/taylor-otwell.jpg "Taylor Otwell")

Ce système de notifications améliore beaucoup l’_Event Broadcasting_, déjà présent dans Laravel depuis quelques versions. Par défaut, le framework supporte [Pusher](https://pusher.com/) et [Redis](http://redis.io/). Côté PHP, tous les évènements que nous voulons pouvoir brodcaster doivent implémenter l’interface `ShouldBroadcast`. Côté javascript, nous découvrons [Laravel Echo](https://laravel.com/docs/5.3/broadcasting#installing-laravel-echo), un module NPM servant à écouter les événements émis par le serveur, sans avoir à se préoccuper du broadcaster utilisé.

Bien entendu, les notifications classiques par email sont toujours présentes, et ont même été améliorées grâce au Trait `Mailable` et à un template d’email par défaut que nous pouvons facilement personnaliser.

## Chatops par [Geshan Manandhar](https://twitter.com/geshan)

Durant ce talk, assez intriguant au premier abord, nous avons pu apprécier le retour d’expérience de Namshi sur les Chatops, ces bots avec lesquels nous discutons sur Slack, HipChat ou autre, afin de déployer nos applications avec une simple phrase comme

> @KittenOps please deploy ClientApp from master on srv1.

Nous trouvons cette approche plutôt cool, puisque ça permet de responsabiliser un peu plus chaque développeur sur le déploiement des applications mais sans pour autant accroître les risques liés aux accès SSH donnés à toute l’équipe de développement.

> Makes devs happy and ops happier

Les slides sont disponibles [ici](https://speakerdeck.com/geshan/embrace-chatops-stop-installing-deployment-software-larcon-eu-2016).

## Dashboard with Laravel, Pusher and Vue.js par [Freek Van der Herten](https://twitter/com/freekmurze)

Ce talk a été donné sur une scène assez particulière de la conférence, la “Unconference Track”, une scène libre d’accès sur laquelle pouvait intervenir chaque spectateur de la conférence – il suffit juste d’inscrire sur un tableau le sujet que l’on souhaite aborder, sans condition particulière de temps.

C’est ce qu’a choisi Freek Van der Herten pour présenter son dashboard réalisé avec Laravel, Pusher et Vue.js. C’est un dashboard en temps réel dans lequel il fait remonter des informations à propos de Packagist (nombre de téléchargement des packages réalisés par [Spatie](https://spatie.be/), la société de Freek), mais également des données provenant de Last.fm, la date et l’heure, la météo, l’état de la connexion internet, et les prochains événements à venir dans leur société.

![Dashboard Spatie](/img/jolicode/resume-de-la-laracon-eu-2016/spatie-dashboard.png "Dashboard Spatie")

Les API externes sont interrogées par Laravel, qui émet des événements dans Pusher et Vue.js écoute ces événements pour mettre à jour l’interface du dashboard.

Le code est [disponible sur GitHub](https://github.com/spatie/dashboard.spatie.be) et les slides sont [disponibles sur Speakerdeck](https://speakerdeck.com/freekmurze/creating-a-dashboard).

## Modern frontend development with Vue.js par [Evan You](https://twitter.com/youyuxi)

![Evan You](/img/jolicode/resume-de-la-laracon-eu-2016/evan-you.jpg "Evan You")

Evan You est le créateur de Vue.js, le framework javascript recommandé par la communauté Laravel depuis quelques mois, et de manière plus officielle depuis la sortie de Laravel 5.3. En effet, Vue.js est présent par défaut dans le fichier package.json d’une installation de Laravel et est donc utilisable directement sur toute nouvelle installation de Laravel.

Énormément de participants connaissaient ce framework dans le public. Quelques uns s’en servent sur des projets personnels, mais peu ont levé la main quand Evan You a demandé “Qui l’utilise en production ?”.

Evan You nous a présenté l’historique rapide de Vue.js et comment il a pensé sa conception. Nous avons pu découvrir aussi les nouveaux concepts introduits dans la version 2.0, actuellement en _Release Candidate_. Parmi ces concepts, nous retrouvons principalement le Virtual DOM, originellement introduit par ReactJS.

À JoliCode, nous utilisons beaucoup ReactJS, mais nous trouvons toujours instructif de regarder ce qui se fait à côté pour répondre au même besoin, celui d’avoir des applications frontend toujours plus performantes et maintenables. Plus d’informations au sujet de Vue.js sont disponibles sur le [site officiel](http://rc.vuejs.org/).

## Taking care of backups with Laravel par [Freek Van der Herten](https://twitter.com/freekmurze)

![Freek Van der Herten](/img/jolicode/resume-de-la-laracon-eu-2016/freek-van-der-herten.jpg "Freek Van der Herten")

Nous retrouvons Freek, cette fois sur la grande scène de la Laracon, pour nous parler de backups. Après avoir raconté quelques histoires d’horreur avec des serveurs qui sont brutalement tombés et où aucune restauration n’était possible, même par l’hébergeur (normal lorsque la coupure est liée à un incendie dans le data-center…), Freek a enchaîné sur la présentation de différentes solutions de backup pour nos applications et leurs bases de données.

Selon Freek, aucune des solutions existantes ne répondant complètement à son besoin vital de faire des backups, et surtout d’en faire à plusieurs endroits physiquement distants, il a donc choisi de créer un package pour Laravel nommé `laravel-backup`. Il nous a présenté ce package à travers une démonstration en direct dans laquelle il a configuré les backups d’une application à la fois en local et sur Amazon S3. La gestion des backups est assez fine, nous pouvons choisir précisément les règles de suppression des anciens backups par semaine, par mois ou par année.

Ce package est sous Postcardware (😊), sous-entendu si nous utilisons les packages de [Spatie](https://spatie.be/), nous sommes invités à leur envoyer une carte postale de la ville où nous nous trouvons avec un petit mot et les packages utilisés. Les plus belles seront publiées sur la [page open source](https://spatie.be/opensource) de leur site.

Laravel-backup est déjà compatible avec Laravel 5.3, et a été mis à jour à peine quelques heures après la sortie. À l’avenir, Freek pense rendre son package compatible PHP 7.x only, tout en conservant et maintenant une branche compatible pour PHP 5.x. Il souhaite également améliorer le système de dump pour MySQL en rendant accessible à travers des méthodes les paramètres de la commande `mysqldump` utilisée dans le package.

Les slides de cette présentation sont [disponibles sur Speakerdeck](https://speakerdeck.com/freekmurze/backing-up-with-laravel-laracon).

## Curing the common loop (with Collections pipelines) par [Adam Wathan](https://twitter.com/adamwathan)

Pour ce dernier talk de la conférence, Adam a réalisé une belle session de live coding dans laquelle il a démontré la puissance et le gain de lisibilité possible en utilisant la classe `Collection` de Laravel pour remplacer les boucles classiques :

```php
function getSalesEmails($employees) {
  $emails = [];
  foreach ($employees as $employee) {
    if ($employee->department === 'Sales') {
      $emails[] = $employee->email;
    }
  }
  return $emails;
}
```

Peut ainsi devenir :

```php
function getSalesEmails(Collection $employees) {
    return $employees->map(function ($employee) {
      return $employee->email;
    })->filter($employees, function ($employee) {
      return $employee->department == 'Sales';
    }));
}
```

Évidemment, c’était un exemple peu réaliste dans la mesure où, dans la réalité, la bonne pratique voudrait que nous récupérions plus précisément les données depuis la base de données, et non toutes les données d’une table pour ensuite les traiter en PHP. Néanmoins, la présentation des possibilités offertes par les Collections était très instructive.

Les slides de la présentation d’Adam Wathan sont [disponibles sur Speakerdeck](https://speakerdeck.com/adamwathan/curing-the-common-loop).

* * *

Pour conclure le résumé de cette Laracon EU 2016, n’hésitez pas à aller regarder les vidéos des talks disponibles [ici](https://www.youtube.com/playlist?list=PLMdXHJK-lGoCMkOxqe82hOC8tgthqhHCN "Vidéos Talks Laracon EU 2016"). Notamment pour celui d’Adam Wathan, puisque plus de la moitié de son talk était un live coding.

### Bonus

Cette Laracon EU était le moyen idéal pour retrouver les quelques développeurs français avec qui nous discutons déjà sur le [Slack Laravel Fr](https://laravel.fr/slack). Nous avons beaucoup échangé à propos de Laravel mais aussi plus généralement de PHP et de développement Web, et avons donc décidé de faire renaître le [Meetup Laravel Paris](http://www.meetup.com/fr-FR/Paris-Laravel-Meetup/) ! N’hésitez pas à suivre le [compte Twitter LaravelFr](https://twitter.com/laravel_fr) pour être informé de la date du prochain meetup ! 😉

* * *

Cet article porte sur la conférence [Laracon EU Amsterdam 2016](https://jolicode.com/nos-metiers/conferences/laracon-eu-amsterdam-2016).

 [![Laracon EU Amsterdam 2016](/img/jolicode/resume-de-la-laracon-eu-2016/laracon-eu-2016.png)](https://jolicode.com/nos-metiers/conferences/laracon-eu-amsterdam-2016)

### Commentaires et discussions

let commentsLoaded = false; var remark\_config = { host: 'https://jolicode.com/comments', site\_id: 'jolicode', components: \['embed'\], url: 'https://jolicode.com/blog/resume-de-la-laracon-eu-2016', max\_shown\_comments: 20, theme: 'light', page\_title: "R\\u00e9sum\\u00e9 de la Laracon EU 2016", locale: 'fr', show\_email\_subscription: false }; const observer = new IntersectionObserver((entries) => { if (commentsLoaded || entries\[0\].intersectionRatio <= 0) return; commentsLoaded = true; !function(e,n){for(var o=0;o<e.length;o++){var r=n.createElement("script"),c=".js",d=n.head||n.body;"noModule"in r?(r.type="module",c=".mjs"):r.async=!0,r.defer=!0,r.src=remark\_config.host+"/web/"+e\[o\]+c,d.appendChild(r)}}(remark\_config.components||\["embed"\],document); }, { root: null, rootMargin: '0px 0px 400px 0px', }); observer.observe(document.getElementById('remark42'));

## Ces clients ont profité de notre expertise
