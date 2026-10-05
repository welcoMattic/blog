---
title: "Symfony on Clever Cloud #6: recurring tasks, between cron, Scheduler and Clever Tasks"
date: 2026-10-06T09:00:00.000Z
description: "Sixth article in a series about deploying a scalable Symfony application on the Clever Cloud PaaS"
tags:
  - symfony
  - clever-cloud
  - paas
  - php
  - scheduler
  - cron
  - devops
  - serie-symfony-clever
lang: en
series:
  name: "Symfony on Clever Cloud"
  order: 6
  label: "Recurring tasks"
---

_Cet article est aussi disponible en 🇫🇷 Français : [Symfony sur Clever Cloud #6 : les tâches récurrentes, entre cron, Scheduler et Clever Tasks](/blog/2026-10-06-symfony-clever-cloud-6-les-taches-recurrentes/)._

> **Transparency.** I am a Clever Cloud ambassador. I write this series independently, nobody on their side proofreads this series, and I allow myself the same criticism here as on any other platform.

Since [the previous article](/blog/2026-09-29-symfony-clever-cloud-5-messenger-workers/), Messenger workers have been consuming the demo application's messages in production. Each handled message leaves a key in the `handled_message` table, the registry that lets the handler recognize a message that is delivered again. The thing is, nobody ever empties that table, so it just keeps growing.

It needs to be purged every night, and only once, even when the application runs on several scalers. On Clever Cloud, three tools can run this kind of job: the platform cron, the Symfony Scheduler and Clever Tasks. Let's see how each of them handles this purge.

> Note: purging `handled_message` is only a pretext. It is a deliberately simple use case, which lets me show the cron, the Scheduler and Clever Tasks without building a real business feature into the demo application. Replace it with your own recurring task: a summary sent every morning, a nightly import, a file cleanup…

## The purge command

Whichever tool we use, the purge will be a console command, which you can also run by hand:

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

The deletion happens in `HandledMessageRepository::purgeOlderThan()`, with a plain `DELETE` query on the date each key was recorded. By default, 30 days of keys are kept.

## The Clever Cloud cron

Clever Cloud installs the lines of the repository's [`clevercloud/cron.json`](https://www.clever.cloud/developers/doc/develop/cron/) file in the crontab of every instance. For our purge, it would look like this:

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

The `-l` in the shebang loads the application environment; without it, the script has none of its variables. The check on `INSTANCE_NUMBER`, a variable provided by the platform, is there because the cron runs on every scaler: with two scalers, the purge would run twice. The [documentation](https://www.clever.cloud/developers/doc/develop/cron/) suggests this trick to only run it on instance 0.

There are two limits, though. During a deployment, Clever Cloud keeps the old instances alive while the new ones start, and two instances then carry the number 0. In my tests, this overlap lasted two to three minutes, during which the task may run twice. And the instances run in UTC, so `0 3 * * *` means 4 or 5 am in Paris, depending on the season.

For our purge, neither of these is a big deal. But for a task that sends an email, running twice is rarely acceptable. That's where the Scheduler comes in.

## The Symfony Scheduler

The [Scheduler](https://symfony.com/doc/current/scheduler.html) builds on Messenger. A schedule is exposed as a transport, and a `messenger:consume` on that transport generates the messages at the right time, then handles them. Let's start by installing it:

```bash
composer require symfony/scheduler dragonmantank/cron-expression
```

The second dependency lets you use a cron expression. To schedule the purge, all we need to do is add the [`#[AsCronTask]`](https://symfony.com/doc/current/scheduler.html#cron-expression-triggers) attribute to our command:

```php
#[AsCommand(
    name: 'app:handled-messages:purge',
    description: "Supprime du registre d'idempotence les clés trop anciennes",
)]
#[AsCronTask('0 3 * * *', timezone: 'Europe/Paris')]
final class PurgeHandledMessagesCommand
```

The `timezone` parameter matters, because PHP also runs [in UTC](https://www.clever.cloud/developers/doc/deploy/applications/php/) on Clever Cloud. The `php bin/console debug:scheduler` command shows when it will run next, which is handy to check.

On the Clever Cloud side, the schedule needs a [worker](https://www.clever.cloud/developers/doc/develop/common-configuration/workers/) consuming the `scheduler_default` transport. We keep the Messenger worker defined in `CC_WORKER_COMMAND`, and add a second one:

```bash
clever env set -a symfony-clever-demo CC_WORKER_COMMAND_1 \
  "php bin/console messenger:consume scheduler_default --time-limit=3600 --memory-limit=64M"
clever restart -a symfony-clever-demo
```

It gets the same restart settings as the first one (`CC_WORKER_RESTART=always` and a 30 second delay).

### Only once

As with the cron, each scaler runs its workers, so each scaler runs the schedule. We need a lock, as the [Scheduler documentation](https://symfony.com/doc/current/scheduler.html#efficient-management-with-symfony-scheduler) recommends, and that lock has to be shared by all the instances. The one set up by the Lock component recipe (`LOCK_DSN=flock`) is a file on the machine's disk, so it does not prevent a run on another scaler.

The application already uses a [Redis add-on](https://www.clever.cloud/developers/doc/deploy/databases/redis/) for its sessions in production, and the [Lock component configuration](https://symfony.com/doc/current/lock.html#configuration) accepts its URL directly:

```yaml
framework:
    lock: '%env(LOCK_DSN)%'

when@prod:
    framework:
        lock: '%env(REDIS_URL)%'
```

Locally, we keep the default lock. In production, with two scalers, a test task running every minute only ran once a minute, including while old and new instances were running at the same time.

### A run that doesn't get lost

The Scheduler worker does not run continuously. It stops every hour because of `--time-limit`, waits 30 seconds before restarting, and is replaced on every deployment. And [as the documentation explains](https://symfony.com/doc/current/scheduler.html#efficient-management-with-symfony-scheduler), whatever was due while the worker was stopped is lost. If a restart happens right when the purge is due, it may skip a night.

To avoid that, the schedule can remember the date of its last run in a cache, and catch up on what it missed when it restarts. That cache also has to be shared by the instances and survive deployments, so we declare a [cache pool](https://symfony.com/doc/current/cache.html#creating-custom-namespaced-pools) on the same Redis:

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

All that's left is to plug the lock and this pool into `src/Schedule.php`, the file created by the Scheduler Flex recipe. That's what `stateful()` and `lock()` are for:

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

The purge does not appear in this file, it is the command's `#[AsCronTask]` attribute that adds it to the schedule. To check the catch-up, I stopped all the workers for more than a minute in production: the missed run did fire when they restarted.

## Clever Tasks

A [Clever Task](https://www.clever.cloud/developers/doc/develop/tasks/) is an application that starts just long enough to run a command, then shuts down. It has no periodic trigger, so it is not the right tool for our nightly purge. It is very handy, however, to run the purge on demand, or for a heavy job that should not run on the machines serving web traffic.

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

A Task has its own environment, so you need to give it the PHP version, `APP_ENV` and `APP_SECRET` again, and link it to the same PostgreSQL add-on as the web application. After that, deploying a Task means running it: `clever deploy` builds the code on a fresh machine, runs the command, then shuts the machine down. To run the command again without changing the code, use `clever restart -a symfony-clever-task`. Expect roughly 20 to 30 seconds before the command starts: each run boots a fresh machine and rebuilds the application, `composer install` included, because a Task has no build cache.

⚠ Watch out for the `cancel-on-push` setting. It defaults to `true`, and in that case, restarting a Task while it runs can interrupt the current run, even though the documentation says the second run waits for the first one to finish. That's why the creation commands set it to `false`.

## Starting the Task from GitHub Actions

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

This workflow is started by hand from the Actions tab, with the same [action](https://github.com/47ng/actions-clever-cloud) and the same secrets as the continuous deployment pipeline, plus the Task's ID in `CLEVER_TASK_APP_ID`. The `sameCommitPolicy: restart` option runs the command again when the code hasn't changed since the last run; otherwise the job would fail without running anything. And if the purge fails, the job turns red.

On the other hand, I advise against handing the nightly purge over to GitHub Actions' `schedule:`. The [GitHub documentation](https://docs.github.com/en/actions/reference/workflows-and-actions/events-that-trigger-workflows#schedule) warns that these runs can be delayed, or even dropped, during periods of high load.

## Wrapping up

The purge now runs every night, only once, thanks to the Scheduler, and a Task lets us run it on demand.

> **Source code.** The [`06-recurring`](https://github.com/welcoMattic/symfony-clever-cloud-series/tree/06-recurring) branch of the [series repository](https://github.com/welcoMattic/symfony-clever-cloud-series) holds the purge and its schedule. To see when the purge will run without waiting for 3 am: `symfony console debug:scheduler`. Creating the Task, and the secret the `task.yml` workflow expects, are covered in the branch `README`.
