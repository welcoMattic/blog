---
title: "Symfony sur Clever Cloud #5 : opérer les workers Messenger en production"
date: 2026-09-29T09:00:00.000Z
description: "5e article d'une série sur le déploiement d'une application Symfony évolutive sur le PaaS Clever Cloud"
tags:
  - symfony
  - clever-cloud
  - paas
  - php
  - messenger
  - devops
  - serie-symfony-clever
lang: fr
series:
  name: "Symfony sur Clever Cloud"
  order: 5
  label: "Les workers Messenger"
---

_This blog post is also available in 🇬🇧 English: [Symfony on Clever Cloud #5: running Messenger workers in production](/blog/2026-09-29-symfony-clever-cloud-5-messenger-workers/)._

> **Transparence.** Je suis ambassadeur Clever Cloud. J'écris cette série en toute indépendance, personne chez eux ne relit cette série, et je m'y autorise les mêmes critiques que sur n'importe quelle autre plateforme.

Dans [l'article précédent](/blog/2026-09-22-symfony-clever-cloud-4-automatiser-le-deploiement/), le déploiement est devenu un pipeline : les tests passent, `main` bouge, l'application se met en production toute seule. Il manque une brique souvent présente dans les environnements de production pour que la boucle soit complète : les traitements de messages asynchrones. L'application embarque [Messenger](https://symfony.com/doc/current/messenger.html) depuis le premier article, son transport pointe vers la base PostgreSQL de l'add-on, et les messages de Mailer et Notifier y sont déjà routés par défaut. Sauf que personne ne les consomme.

À la fin de cet article, la file d'attente (queue) de l'application est consommée en production par un processus que la plateforme surveille, relance quand il s'arrête, et remplace à chaque déploiement. Sans Supervisor, sans accès root, et avec une variable d'environnement.

## Ce que l'application a déjà

Le `config/packages/messenger.yaml` posé par Flex n'a jamais servi, mais il est complet :

```yaml
framework:
    messenger:
        failure_transport: failed

        transports:
            async:
                dsn: '%env(MESSENGER_TRANSPORT_DSN)%'
                retry_strategy:
                    max_retries: 3
                    multiplier: 2
            failed: 'doctrine://default?queue_name=failed'

        routing:
            Symfony\Component\Mailer\Messenger\SendEmailMessage: async
            Symfony\Component\Notifier\Message\ChatMessage: async
            Symfony\Component\Notifier\Message\SmsMessage: async
```

Le `MESSENGER_TRANSPORT_DSN=doctrine://default?auto_setup=0` du `.env` désigne le [transport Doctrine](https://symfony.com/doc/current/messenger.html#doctrine-transport) : les messages vivent dans une table `messenger_messages` de la base PostgreSQL, et les queues s'y séparent par une colonne `queue_name`. Le `auto_setup=0` est le bon choix en production (la documentation recommande de créer la table par une migration plutôt que de laisser le premier `dispatch()` le faire), il ne reste qu'à la générer : le transport publie son schéma, donc `doctrine:migrations:diff` la voit, et le hook de post-build joue la migration.

Les messages partent dans le transport `async`, s'ils échouent trois fois ils finissent par atterrir dans le transport `failed`. Reste le maillon absent : une commande `messenger:consume` qui tourne en permanence pour consommer les messages de la queue. Sur votre machine, ce maillon peut s'appeler Supervisor ou systemd, et [j'ai écrit en 2021](/blog/2021-12-29-symfony-messenger-systemd/) un article expliquant comment le configurer à la main. Sur Clever Cloud, ni l'un ni l'autre ne sont accessibles : pas de root, pas de process manager à installer, pas de « process types » à la Heroku. Il y a [une page de documentation](https://www.clever.cloud/developers/doc/develop/common-configuration/workers/), trois variables d'environnement, et c'est suffisant.

## Un worker, c'est une variable d'environnement

```bash
clever env set -a symfony-clever-demo CC_WORKER_COMMAND \
  "php bin/console messenger:consume async --time-limit=3600 --memory-limit=64M"
clever restart -a symfony-clever-demo
```

C'est tout. La documentation est explicite sur ce qui se passe : la commande est lancée comme un service systemd, dans le dossier de l'application, et le worker tourne dans le même environnement qu'elle. Mêmes variables, même add-on PostgreSQL, même code que le processus web. Les logs du worker remontent dans `clever logs` comme les autres, la config Monolog écrivant sur `php://stderr` en production.

Il est possible de lancer plusieurs workers en parallèle, grâce à un système d'index (`_0`, `_1`, etc.) dans le nom des variables d'environnement. C'est ce qui permet de séparer une file lente d'une file rapide sans multiplier les applications :

```bash
clever env set -a symfony-clever-demo CC_WORKER_COMMAND_0 \
  "php bin/console messenger:consume async_low --time-limit=3600"
clever env set -a symfony-clever-demo CC_WORKER_COMMAND_1 \
  "php bin/console messenger:consume async_high --time-limit=3600"
```

À vous de déclarer ces deux transports dans `messenger.yaml`, la config par défaut n'en pose qu'un, `async`. Et gardez `failed` hors des workers : un message qui échoue alors qu'il est consommé depuis le transport d'échec n'y retourne pas, il sera rejeté, donc perdu définitivement. La queue des échecs se rejoue généralement à la main, c'est tout l'intérêt de la séparer.

Et comme chaque scaler est une machine qui exécute l'application entière, chaque scaler exécute aussi ses workers : trois scalers, trois consommateurs sur la même queue. C'est ce qu'on veut pour absorber la charge, et ce qu'on ne veut pas pour une tâche qui doit rester unique. Dans ce second cas, la réponse simple est une application dédiée, dont il est question plus bas.

## Le contrat de redémarrage

[La documentation de Symfony](https://symfony.com/doc/current/messenger.html#deploying-to-production) est claire : un worker ne doit pas tourner indéfiniment. Doctrine, entre autres, accumule de la mémoire au fil des messages, donc on lui donne des conditions d'arrêt (`--limit`, `--memory-limit`, `--time-limit`), et le process manager le relance si l'une de ces limites est atteinte ou dépassée. Ces options ne sont pas des exceptions : quand le worker atteint la limite, il finit son message en cours et **sort proprement, en code 0**.

Or le (petit) défaut de Clever Cloud (eh oui, j'avais prévenu que je serai honnête 😁), c'est `CC_WORKER_RESTART=on-failure` : le worker n'est relancé que s'il échoue. Une sortie en code 0 n'est pas un échec. Un `messenger:consume --time-limit=3600` vit donc exactement une heure, sort proprement, et n'est jamais relancé. La file cesse d'être consommée sans la moindre ligne d'erreur dans les logs : la plateforme a vu un processus finir normalement, c'est tout.

La parade tient dans les 2 variables suivantes :

```bash
clever env set -a symfony-clever-demo CC_WORKER_RESTART always
clever env set -a symfony-clever-demo CC_WORKER_RESTART_DELAY 30
```

`always` relance aussi les sorties propres, en code 0 : `--time-limit=3600` devient ce qu'il doit être, un redémarrage périodique du processus contre les fuites mémoire, et non un arrêt définitif. `CC_WORKER_RESTART_DELAY` est le délai entre la sortie et la relance, en secondes, appliqué à tous les workers de l'application, à ajuster selon votre cas.

Ne laissez pas ce délai à sa valeur par défaut pour autant. Un worker dont la configuration est cassée, ou dont la base est injoignable, se stoppe immédiatement : à une seconde de délai, c'est un redémarrage par seconde, et systemd finit par refuser de relancer ce qui plante en boucle. C'est la « restart burst limit » que la documentation de Clever mentionne sans la détailler. 30 secondes laissent le temps à un service indisponible de revenir, et ne coûtent (presque) rien quand le worker tourne une heure.

Un mot sur `--memory-limit`, puisqu'il faut le choisir. Il doit rester sous le `memory_limit` de PHP, que Clever Cloud calcule d'après la taille du scaler et que sa variable `MEMORY_LIMIT` permet de surcharger, comme n'importe quelle autre variable de la plateforme. Au-dessus, PHP meurt en erreur fatale avant que Messenger ait pu sortir proprement. D'où le `64M` de la commande plus haut plutôt que le `128M` de la documentation de Symfony : le plus petit scaler s'arrête à 91 Mio. Lisez la valeur par vous même sur votre instance :

```bash
clever ssh -a symfony-clever-demo --command "php -r 'echo ini_get(\"memory_limit\"), PHP_EOL;'"
```

En résumé, le couple qui tient en production : `--time-limit` et `--memory-limit` comme garde-fous, `CC_WORKER_RESTART=always` pour que le redémarrage du worker soit vraiment pris en compte, et un délai assez long pour qu'un plantage en boucle ne brûle pas la limite de systemd.

## Le déploiement, vu du worker

Que devient le worker quand le pipeline de déploiement continu pousse une nouvelle version ? La plateforme ne redéploie pas un processus, elle remplace des machines : le worker de l'ancienne instance disparaît avec elle, celui de la nouvelle démarre sur le code fraîchement construit. Le `messenger:stop-workers` des déploiements classiques n'a donc rien à faire ici, et il ne servirait pas à grand-chose : son signal passe par le cache de l'application, local à chaque scaler, et n'atteindrait de toute façon pas les autres instances.

Le remplacement reste propre grâce à une extension : `pcntl` fait partie de [celles activées par défaut](https://www.clever.cloud/developers/doc/deploy/applications/php/extensions/) sur le runtime PHP, donc `messenger:consume` capte les signaux d'arrêt, finit le message en cours, puis sort.

Reste le message que le worker traitait au moment de disparaître, et son sort est le même chez n'importe quel hébergeur. Un message pris en charge n'est retiré de la table qu'une fois terminé : si personne ne le termine, le transport Doctrine le redonnera à un worker. Autrement dit, **un message interrompu sera rejoué**, et un handler doit être [idempotent](https://symfony.com/doc/current/messenger.html#writing-idempotent-handlers), c'est-à-dire avoir les mêmes effets qu'on le joue une ou deux fois. La parade tient en deux choses : une clé dérivée de l'événement métier, jamais tirée au hasard à l'envoi, et une contrainte d'unicité en base pour la faire respecter. Si vos handlers dépassent l'heure, allongez le `redeliver_timeout` du transport, sinon la file les rejouera pendant qu'ils travaillent encore. Mais ce sont des considérations à avoir dans le code de vos applications, et la plateforme n'y peut rien à votre place.

Dernier point d'attention, le chevauchement des versions : avec le déploiement sans interruption, l'ancienne instance continue de consommer pendant que la nouvelle démarre, et les deux partagent la même table. Un message sérialisé par l'ancien code puis décodé par le nouveau échoue si la classe du message a changé de nom ou disparu. Avant Symfony 8.1, le receveur le supprimait de la file ; depuis, il suit le chemin normal des échecs, atterrit dans `failed`, et pourra être rejoué manuellement une fois la cause corrigée. La règle qui évite le problème tient en une phrase : un message écrit par la version N doit rester consommable par la version N+1. Smaïne Milianni la développe dans [son article sur le zéro downtime deployment](https://smaine-milianni.medium.com/le-z%C3%A9ro-downtime-deployment-74eb9112be3d), et l'a outillée dans [`youtrust/zdd-message-bundle`](https://github.com/Youtrust/zdd-message-bundle), qui vérifie cette compatibilité depuis votre suite de tests.

## Sur l'application web, ou sur une application à part

Par défaut, le worker vit sur l'application web, et c'est le bon défaut : une application, une base, un seul pipeline de déploiement, un seul `clever env set` à retenir. Cependant, 3 situations peuvent justifier de le séparer :

- la consommation ne suit pas le rythme du trafic HTTP, et une file lente appelle un scaler dédié ;
- un job gourmand en mémoire cohabite mal avec des requêtes web qui n'ont pas la même limite (`MEMORY_LIMIT` fixe le `memory_limit` de tout le PHP de l'application, requêtes web comprises) ;
- les deux n'ont pas besoin de la même taille d'instance, ni du même calendrier de déploiement.

La séparation reprend le chemin de l'application FrankenPHP de [l'article 3](/blog/2026-09-14-symfony-clever-cloud-3-frankenphp-ou-apache/) : `clever create -t php`, liaison du même add-on PostgreSQL, une deuxième entrée dans le `.clever.json`, puis un job de plus dans le workflow de la CI/CD. Et il n'y a rien à prévoir côté HTTP, même si cette application ne sert aucune page : le runtime PHP démarre Apache de toute façon, et sans `CC_HEALTH_CHECK_PATH`, la plateforme se contente d'une réponse entre 200 et 499 sur `/`. Le 404 d'une application sans route lui suffit, donc une application de workers passe le healthcheck sans rien avoir à servir.

## Regarder ce qui se passe

**Suivre le worker dans les logs.** `clever logs -a symfony-clever-demo --search worker` attrape la bannière que `messenger:consume` écrit à chaque démarrage : « The worker will automatically exit once it has exceeded 64M of memory, been running for 3600s or received a stop signal via the messenger:stop-workers command. » La voir réapparaître toutes les heures est la preuve que le redémarrage fonctionne. Ne cherchez pas le « Worker stopped due to time limit » correspondant : il est en niveau `info`, et en production la configuration Monolog n'écrit que les erreurs, le reste étant mis en tampon par son `fingers_crossed` ou filtré par son handler `console`, qui s'arrête à `warning` en verbosité normale. C'est la même raison qui réserve les messages traités à un `-vv` de débogage.

**Compter la file.** Le transport Doctrine sait se compter :

```bash
clever ssh -a symfony-clever-demo --command "php bin/console messenger:stats"
```

`messenger:stats` sans argument liste tous les transports, `--format=json` peut vous servir à alimenter un graphique. C'est la seule métrique qui compte vraiment : une file qui grandit, c'est un consommateur qui ne suit pas, quel que soit l'état de santé apparent du worker.

**Traiter les échecs.** Les messages ratés trois fois atterrissent dans `failed`. La commande `messenger:failed:show --stats` fait l'inventaire par classe de message, `messenger:failed:retry <id>` rejoue un message, `messenger:failed:remove <id>` supprime définitivement un message. Pour aller plus loin, la taille de la file peut s'exporter comme métrique custom (si besoin, Clever Cloud collecte le protocole statsd sur le port 8125, et un endpoint Prometheus sur `localhost:9100/metrics`) et se tracer dans le Grafana de la console, avec une alerte quand elle s'allonge.

## Et ensuite

L'application consomme ses messages, et elle le fait en suivant le même contrat que le reste : une variable d'environnement, un service sous la surveillance de la plateforme, des déploiements qui remplacent les instances sans perdre de message. Ce contrat va resservir : le Scheduler de Symfony est un worker Messenger comme un autre, et les tâches récurrentes sont le sujet du prochain article, entre le cron de la plateforme, les Clever Tasks et ce Scheduler.

> **Code source.** La branche [`05-workers`](https://github.com/welcoMattic/symfony-clever-cloud-series/tree/05-workers) du [dépôt de la série](https://github.com/welcoMattic/symfony-clever-cloud-series) contient le worker de cet article, et de quoi le voir travailler sans attendre de vrais visiteurs : `symfony console app:welcome alice@example.com` met un message en file, et la même commande relancée avec la même adresse montre le handler qui reconnaît le rejeu. Les variables de worker sont dans le `README` de la branche.
