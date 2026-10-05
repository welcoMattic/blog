---
title: "Symfony sur Clever Cloud #6 : les tâches récurrentes, entre cron, Scheduler et Clever Tasks"
date: 2026-10-06T09:00:00.000Z
description: "6e article d'une série sur le déploiement d'une application Symfony évolutive sur le PaaS Clever Cloud"
tags:
  - symfony
  - clever-cloud
  - paas
  - php
  - scheduler
  - cron
  - devops
  - serie-symfony-clever
lang: fr
series:
  name: "Symfony sur Clever Cloud"
  order: 6
  label: "Les tâches récurrentes"
---

_This blog post is also available in 🇬🇧 English: [Symfony on Clever Cloud #6: recurring tasks, between cron, Scheduler and Clever Tasks](/blog/2026-10-06-symfony-clever-cloud-6-recurring-tasks/)._

> **Transparence.** Je suis ambassadeur Clever Cloud. J'écris cette série en toute indépendance, personne chez eux ne relit cette série, et je m'y autorise les mêmes critiques que sur n'importe quelle autre plateforme.

Depuis [le précédent article](/blog/2026-09-29-symfony-clever-cloud-5-les-workers-messenger/), les workers Messenger consomment les messages de l'application de démonstration en production. Chaque message traité laisse une clé dans la table `handled_message`, le registre qui permet au handler de reconnaître un message rejoué. Seulement voilà, personne ne vide cette table, elle ne fait donc que grandir.

Il faut la purger chaque nuit, et une seule fois, même quand l'application tourne sur plusieurs scalers. Sur Clever Cloud, trois outils permettent de faire tourner ce genre de tâche : le cron de la plateforme, le Scheduler de Symfony et les Clever Tasks. Voyons ce que chacun donne avec cette purge.

> Note : la purge de `handled_message` n'est qu'un prétexte. C'est un cas d'usage volontairement simple, qui permet de montrer le cron, le Scheduler et les Clever Tasks sans développer une vraie fonctionnalité métier dans l'application de démonstration. Remplacez-la par votre propre tâche récurrente : un récapitulatif envoyé chaque matin, un import nocturne, un nettoyage de fichiers…

## La commande de purge

Quel que soit l'outil, la purge sera une commande console, que l'on peut aussi lancer à la main :

```php
#[AsCommand(
    name: 'app:handled-messages:purge',
    description: "Supprime du registre d'idempotence les clés trop anciennes",
)]
final class PurgeHandledMessagesCommand
{
    public function __construct(
        private readonly HandledMessageRepository $handledMessages,
    ) {
    }

    public function __invoke(
        SymfonyStyle $io,
        #[Option(description: 'Âge au-delà duquel une clé est supprimée')]
        string $olderThan = '30 days',
    ): int {
        $limit = new DatePoint('-'.$olderThan);
        $deleted = $this->handledMessages->purgeOlderThan($limit);

        $io->success(\sprintf('%d clé(s) enregistrée(s) avant le %s supprimée(s).', $deleted, $limit->format('Y-m-d H:i:s T')));

        return Command::SUCCESS;
    }
}
```

La suppression se fait dans `HandledMessageRepository::purgeOlderThan()`, avec une simple requête `DELETE` sur la date d'enregistrement des clés. Par défaut, on garde 30 jours de clés.

## Le cron de Clever Cloud

Clever Cloud installe dans le crontab de chaque instance les lignes du fichier [`clevercloud/cron.json`](https://www.clever.cloud/developers/doc/develop/cron/) du dépôt. Pour notre purge, ça donnerait ceci :

```json
[
  "0 3 * * * $ROOT/clevercloud/purge.sh"
]
```

```bash
#!/bin/bash -l
if [[ "$INSTANCE_NUMBER" != "0" ]]; then
  exit 0
fi

cd "$APP_HOME"
php bin/console app:handled-messages:purge
```

Le `-l` du shebang charge l'environnement de l'application, sans lui le script n'a accès à aucune de ses variables. Le test sur `INSTANCE_NUMBER`, une variable fournie par la plateforme, est là parce que le cron tourne sur chaque scaler : avec deux scalers, la purge tournerait deux fois. La [documentation](https://www.clever.cloud/developers/doc/develop/cron/) propose cette astuce pour ne la lancer que sur l'instance 0.

Deux limites cependant. Pendant un déploiement, Clever Cloud garde les anciennes instances en vie le temps que les nouvelles démarrent, et deux instances portent alors le numéro 0. Lors de mes tests, ce chevauchement a duré deux à trois minutes, pendant lesquelles la tâche peut tourner deux fois. Et les instances sont en UTC, donc `0 3 * * *` veut dire 4 h ou 5 h du matin à Paris, selon la saison.

Pour notre purge, ces deux défauts ne sont pas bien graves. Mais pour une tâche qui envoie un e-mail, une double exécution est rarement acceptable. C'est là qu'intervient le Scheduler.

## Le Scheduler de Symfony

Le [Scheduler](https://symfony.com/doc/current/scheduler.html) s'appuie sur Messenger. Un Schedule est exposé comme un transport, et c'est un `messenger:consume` sur ce transport qui génère les messages au bon moment, puis les traite. Commençons par l'installer :

```bash
composer require symfony/scheduler dragonmantank/cron-expression
```

La seconde dépendance permet d'utiliser une expression cron. Pour planifier la purge, il suffit ensuite d'ajouter l'attribut [`#[AsCronTask]`](https://symfony.com/doc/current/scheduler.html#cron-expression-triggers) à notre commande :

```php
#[AsCommand(
    name: 'app:handled-messages:purge',
    description: "Supprime du registre d'idempotence les clés trop anciennes",
)]
#[AsCronTask('0 3 * * *', timezone: 'Europe/Paris')]
final class PurgeHandledMessagesCommand
```

Le paramètre `timezone` est important, car PHP tourne lui aussi [en UTC](https://www.clever.cloud/developers/doc/deploy/applications/php/) sur Clever Cloud. La commande `php bin/console debug:scheduler` affiche la date de la prochaine exécution, pratique pour vérifier.

Côté Clever Cloud, le Schedule a besoin d'un [worker](https://www.clever.cloud/developers/doc/develop/common-configuration/workers/) qui consomme le transport `scheduler_default`. On garde celui des workers Messenger, défini dans `CC_WORKER_COMMAND`, et on en ajoute un second :

```bash
clever env set -a symfony-clever-demo CC_WORKER_COMMAND_1 \
  "php bin/console messenger:consume scheduler_default --time-limit=3600 --memory-limit=64M"
clever restart -a symfony-clever-demo
```

Il profite des mêmes réglages de redémarrage que le premier (`CC_WORKER_RESTART=always` et 30 secondes de délai).

### Une seule exécution

Comme pour le cron, chaque scaler fait tourner ses workers, donc chaque scaler joue le Schedule. Il faut un verrou, comme le recommande la [documentation du Scheduler](https://symfony.com/doc/current/scheduler.html#efficient-management-with-symfony-scheduler), et ce verrou doit être partagé par toutes les instances. Celui que pose la recette du composant Lock (`LOCK_DSN=flock`) est un fichier sur le disque de la machine, il ne protège donc pas d'une exécution sur un autre scaler.

L'application utilise déjà un [add-on Redis](https://www.clever.cloud/developers/doc/deploy/databases/redis/) pour ses sessions en production, et la [configuration du composant Lock](https://symfony.com/doc/current/lock.html#configuration) accepte directement son URL :

```yaml
framework:
    lock: '%env(LOCK_DSN)%'

when@prod:
    framework:
        lock: '%env(REDIS_URL)%'
```

En local, on garde le verrou par défaut. En production, avec deux scalers, une tâche de test lancée toutes les minutes n'a plus tourné qu'une fois par minute, y compris quand anciennes et nouvelles instances tournaient en même temps.

### Une exécution qui ne se perd pas

Le worker du Scheduler ne tourne pas en continu. Il s'arrête toutes les heures à cause de `--time-limit`, attend 30 secondes avant de redémarrer, et il est remplacé à chaque déploiement. Or, [comme l'explique la documentation](https://symfony.com/doc/current/scheduler.html#efficient-management-with-symfony-scheduler), ce qui devait partir pendant que le worker était arrêté est perdu. Si un redémarrage tombe pile à l'heure prévue pour la purge, elle risque de sauter une nuit.

Pour éviter ça, le Schedule peut retenir la date de sa dernière exécution dans un cache, et rattraper au redémarrage ce qu'il a manqué. Ce cache doit lui aussi être partagé par les instances et survivre aux déploiements, on déclare donc un [pool de cache](https://symfony.com/doc/current/cache.html#creating-custom-namespaced-pools) sur le même Redis :

```yaml
framework:
    cache:
        pools:
            cache.scheduler: null

when@prod:
    framework:
        cache:
            pools:
                cache.scheduler:
                    adapter: cache.adapter.redis
                    provider: '%env(REDIS_URL)%'
```

Il ne reste plus qu'à brancher le verrou et ce pool dans `src/Schedule.php`, le fichier créé par la recette Flex du Scheduler. C'est le rôle de `stateful()` et de `lock()` :

```php
use Symfony\Component\DependencyInjection\Attribute\Target;
use Symfony\Component\Lock\LockFactory;
use Symfony\Component\Scheduler\Attribute\AsSchedule;
use Symfony\Component\Scheduler\Schedule as SymfonySchedule;
use Symfony\Component\Scheduler\ScheduleProviderInterface;
use Symfony\Contracts\Cache\CacheInterface;

#[AsSchedule]
final class Schedule implements ScheduleProviderInterface
{
    public function __construct(
        #[Target('cache.scheduler')]
        private readonly CacheInterface $cache,
        private readonly LockFactory $lockFactory,
    ) {
    }

    public function getSchedule(): SymfonySchedule
    {
        return (new SymfonySchedule())
            ->stateful($this->cache)
            ->lock($this->lockFactory->createLock('scheduler_default'))
        ;
    }
}
```

La purge n'apparaît pas dans ce fichier, c'est l'attribut `#[AsCronTask]` de la commande qui l'ajoute au Schedule. Pour vérifier le rattrapage, j'ai arrêté tous les workers pendant plus d'une minute en production : l'exécution manquée s'est bien lancée à leur redémarrage.

## Les Clever Tasks

Une [Clever Task](https://www.clever.cloud/developers/doc/develop/tasks/) est une application qui démarre le temps d'exécuter une commande, puis s'éteint. Elle n'a pas de déclencheur périodique, ce n'est donc pas le bon outil pour notre purge nocturne. En revanche, elle est très pratique pour lancer la purge à la demande, ou pour un traitement lourd qui ne doit pas tourner sur les machines qui servent le trafic web.

```bash
clever create --type php symfony-clever-task \
  --task "php bin/console app:handled-messages:purge" -a symfony-clever-task
clever service -a symfony-clever-task link-addon symfony-clever-demo-db
clever env set -a symfony-clever-task CC_PHP_VERSION 8.4
clever env set -a symfony-clever-task APP_ENV prod
clever env set -a symfony-clever-task APP_SECRET "$(openssl rand -hex 32)"
clever config set cancel-on-push false -a symfony-clever-task
clever deploy -a symfony-clever-task
```

Une Task a son propre environnement, il faut donc lui redonner la version de PHP, `APP_ENV` et `APP_SECRET`, et la lier au même add-on PostgreSQL que l'application web. Ensuite, déployer une Task revient à l'exécuter : `clever deploy` construit le code sur une machine neuve, lance la commande, puis éteint la machine. Pour relancer la commande sans changer le code, c'est `clever restart -a symfony-clever-task`. Comptez 20 à 30 secondes environ avant que la commande ne démarre : chaque lancement démarre une machine neuve et reconstruit l'application, `composer install` compris, car une Task n'a pas de cache de build.

⚠ Attention au réglage `cancel-on-push`. Il vaut `true` par défaut, et dans ce cas, relancer une Task pendant qu'elle tourne peut interrompre l'exécution en cours, alors que la documentation indique que la seconde attend la fin de la première. C'est pour ça que les commandes de création le passent à `false`.

## Lancer la Task depuis GitHub Actions

```yaml
name: Purge du registre (Clever Task)

on:
  workflow_dispatch:

jobs:
  task:
    name: Lancer la Clever Task
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v7
        with:
          fetch-depth: 0
      - uses: 47ng/actions-clever-cloud@v2.2.0
        with:
          appID: ${{ secrets.CLEVER_TASK_APP_ID }}
          sameCommitPolicy: restart
        env:
          CLEVER_TOKEN: ${{ secrets.CLEVER_TOKEN }}
          CLEVER_SECRET: ${{ secrets.CLEVER_SECRET }}
```

Ce workflow se lance à la main depuis l'onglet Actions, avec la même [action](https://github.com/47ng/actions-clever-cloud) et les mêmes secrets que le pipeline de déploiement continu, plus l'identifiant de la Task dans `CLEVER_TASK_APP_ID`. L'option `sameCommitPolicy: restart` relance la commande quand le code n'a pas changé depuis le dernier passage, sans quoi le job échouerait sans rien lancer. Et si la purge échoue, le job passe au rouge.

Par contre, je déconseille de confier la purge nocturne au `schedule:` de GitHub Actions. La [documentation de GitHub](https://docs.github.com/en/actions/reference/workflows-and-actions/events-that-trigger-workflows#schedule) prévient que ces lancements peuvent être retardés, voire abandonnés, en période de forte charge.

## Pour conclure

La purge tourne maintenant chaque nuit, une seule fois, grâce au Scheduler, et une Task permet de la lancer à la demande.

> **Code source.** La branche [`06-recurring`](https://github.com/welcoMattic/symfony-clever-cloud-series/tree/06-recurring) du [dépôt de la série](https://github.com/welcoMattic/symfony-clever-cloud-series) contient la purge et son Schedule. Pour voir quand la purge se lancera sans attendre 3 h du matin : `symfony console debug:scheduler`. La création de la Task et le secret qu'attend le workflow `task.yml` sont dans le `README` de la branche.
