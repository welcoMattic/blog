---
title: "Messenger Central : piloter les workers Messenger depuis le terminal"
date: 2026-10-14T09:00:00.000Z
description: "Un bundle Symfony pour démarrer, scaler et observer vos workers Messenger en développement depuis une interface en terminal, et renvoyer les messages en échec une fois corrigés."
tags:
  - symfony
  - php
  - messenger
  - tui
lang: fr
---
_This blog post is also available in 🇬🇧 English: [Messenger Central: drive your Messenger workers from the terminal](/blog/2026-10-14-messenger-central-drive-messenger-workers-from-the-terminal/)._

## Un terminal par transport

Dans [l'article #5 de la série Symfony sur Clever Cloud](/blog/2026-09-29-symfony-clever-cloud-5-les-workers-messenger/), je parlais des workers Messenger en production : un process par transport, relancé par la plateforme, suivi par des métriques. En développement, c'est une autre histoire. On ouvre un terminal par transport pour y lancer `messenger:consume`, on oublie de relancer celui qui tourne encore avec l'ancien code, on remonte les logs pour retrouver le message qui a échoué, et on finit avec `messenger:failed:show` et `messenger:failed:retry` dans un cinquième onglet de terminal.

Je voulais une seule fenêtre pour tout ça. Le [composant TUI](https://symfony.com/doc/current/tui.html), arrivé en expérimental dans Symfony 8.1, m'en a donné l'occasion : [Messenger Central](https://github.com/welcoMattic/messenger-central) est un bundle de développement qui pilote vos workers depuis le terminal.

<video controls muted playsinline preload="metadata" width="1350" height="916" poster="/img/messenger-central/demo-poster.webp">
  <source src="/video/messenger-central/demo.mp4" type="video/mp4">
</video>

## Ce que fait le bundle

- **Les transports** de votre application, dans une barre latérale, avec leurs workers en cours et les messages en attente.
- **Les workers**, démarrés, arrêtés et scalés au clavier. Ce sont de vrais `messenger:consume`, lancés par votre console : rien à changer dans l'application. Ceux qui s'arrêtent d'eux-mêmes (`--time-limit`, `--memory-limit`) sont relancés aussitôt, ceux qui plantent aussi, avec un délai croissant.
- **Une vue en temps réel** : débit entrant, message en cours de chaque worker et depuis combien de temps, file d'attente, derniers messages traités, réessayés ou en échec avec leur erreur, et ce que les workers écrivent (logs, `dump()`).
- **Les messages en échec** : sur un transport de failure, on les parcourt page par page, on lit l'erreur complète avec sa trace, on les supprime, ou on les renvoie dans leur transport d'origine, tels quels ou après avoir corrigé leurs propriétés dans un éditeur JSON.
- **La concurrence** de Symfony 8.2, attendu en novembre : avec `amphp/parallel`, chaque worker peut traiter plusieurs messages à la fois.

Chaque worker reçoit aussi un `MESSENGER_CONSUMER_NAME` unique, à brancher sur l'option `consumer` des transports Redis : des workers scalés ne se partagent alors pas leurs messages en attente.

Tout est pilotable au clavier, un menu d'aide (`?`) permet d'afficher tous les raccourcis utiles.

## On l'essaye ?

C'est un outil de développement, il s'installe donc en dépendance de dev :

```bash
composer require --dev welcomattic/messenger-central
php bin/console messenger:central
```

Il faut PHP 8.4 minimum, Symfony 8.1 avec Messenger, et un système de type Unix (Linux, macOS ou WSL). Avec l'extension `pcntl`, les workers terminent leur message en cours quand on les arrête. Par précaution, la commande refuse de tourner quand le kernel n'est pas en debug, ce qui permet quand même de l'utiliser en local, en env prod et mode debug si besoin.

Le README détaille [les touches](https://github.com/welcoMattic/messenger-central#usage) et [la configuration](https://github.com/welcoMattic/messenger-central#configuration), entièrement optionnelle : options passées à `messenger:consume`, délai d'arrêt des workers, concurrence par défaut.

## La suite

Cette [0.1.0](https://github.com/welcoMattic/messenger-central/releases/tag/v0.1.0) est la première release. Elle s'appuie sur un composant encore expérimental, et suivra donc ses évolutions version après version. Si vous l'essayez, vos retours m'intéressent : issues, pull requests et « ce serait bien qu'il fasse aussi X » sont les bienvenus sur [GitHub](https://github.com/welcoMattic/messenger-central).
