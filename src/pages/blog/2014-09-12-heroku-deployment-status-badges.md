---
templateKey: blog-post
title: Heroku Deployment Status Badges
date: 2014-09-12T07:42:00.000Z
description: _
tags:
  - badges
  - github
  - heroku
---
En cherchant quels étaient les badges disponibles pour certifier l'état d'une application (Travis-CI, David-DM ...), je me suis rendu compte qu'aucun ne certifiait l'état de déploiement sur Heroku ...

Sauf [ceci](https://github.com/pussinboots/heroku-badge).

Seulement, le badge n'est pas cohérent graphiquement par rapport aux "normes" des autres badges, et de plus le script renvoie`failed` quand une application se trouve derrière un HTTP-Auth.

J'ai corrigé tout cela sur mon [fork](http://github.com/welcomattic/heroku-badge) !

N'hésitez pas à vous en servir dans vos README.md, et à ouvrir issues/PR si nécessaire !

Enjoy();
