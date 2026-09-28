---
title: "Symfony on Clever Cloud #5: running Messenger workers in production"
date: 2026-09-29T09:00:00.000Z
description: "Fifth article in a series about deploying a scalable Symfony application on the Clever Cloud PaaS"
tags:
  - symfony
  - clever-cloud
  - paas
  - php
  - messenger
  - devops
  - serie-symfony-clever
lang: en
series:
  name: "Symfony on Clever Cloud"
  order: 5
  label: "The Messenger workers"
---

_Cet article est aussi disponible en 🇫🇷 Français : [Symfony sur Clever Cloud #5 : opérer les workers Messenger en production](/blog/2026-09-29-symfony-clever-cloud-5-les-workers-messenger/)._

> **Transparency.** I am a Clever Cloud ambassador. I write this series independently, nobody on their side proofreads this series, and I allow myself the same criticism here as on any other platform.

In [the previous article](/blog/2026-09-22-symfony-clever-cloud-4-automating-the-deployment/), the deployment became a pipeline: tests pass, `main` moves, and the application ships itself to production. One brick that most production environments have is still missing for the loop to be complete: asynchronous message handling. The application has shipped [Messenger](https://symfony.com/doc/current/messenger.html) since the first article, its transport points at the PostgreSQL add-on database, and the Mailer and Notifier messages are already routed there by default. Except that nobody consumes them.

By the end of this article, the application queue is consumed in production by a process that the platform watches, restarts when it stops, and replaces on every deployment. No Supervisor, no root access, and one environment variable.

## What the application already has

The `config/packages/messenger.yaml` that Flex wrote has never been used, but it is complete:

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

The `MESSENGER_TRANSPORT_DSN=doctrine://default?auto_setup=0` in `.env` points at the [Doctrine transport](https://symfony.com/doc/current/messenger.html#doctrine-transport): messages live in a `messenger_messages` table of the PostgreSQL database, and the queues are kept apart there by a `queue_name` column. The `auto_setup=0` is the right call in production (the documentation recommends creating the table with a migration rather than letting the first `dispatch()` do it), so it only remains to generate it: the transport publishes its schema, so `doctrine:migrations:diff` sees it, and the post-build hook runs the migration.

Messages go into the `async` transport, and if they fail three times they end up in the `failed` transport. The missing link is a `messenger:consume` command running permanently to consume the messages in the queue. On your own machine, that link may be called Supervisor or systemd, and [I wrote an article in 2021](/blog/2021-12-29-symfony-messenger-systemd/) explaining how to configure it by hand. On Clever Cloud, neither of them is reachable: no root, no process manager to install, no Heroku-style "process types". There is [one documentation page](https://www.clever.cloud/developers/doc/develop/common-configuration/workers/), three environment variables, and that is enough.

## A worker is an environment variable

```bash
clever env set -a symfony-clever-demo CC_WORKER_COMMAND \
  "php bin/console messenger:consume async --time-limit=3600 --memory-limit=64M"
clever restart -a symfony-clever-demo
```

That is all. The documentation is explicit about what happens: the command is launched as a systemd service, in the application directory, and the worker runs in the same environment as the application. Same variables, same PostgreSQL add-on, same code as the web process. The worker logs show up in `clever logs` like the others, the Monolog configuration writing to `php://stderr` in production.

Several workers can run in parallel, thanks to an index in the variable names (`_0`, `_1`, and so on). That is what lets you keep a slow queue apart from a fast one without multiplying applications:

```bash
clever env set -a symfony-clever-demo CC_WORKER_COMMAND_0 \
  "php bin/console messenger:consume async_low --time-limit=3600"
clever env set -a symfony-clever-demo CC_WORKER_COMMAND_1 \
  "php bin/console messenger:consume async_high --time-limit=3600"
```

Declaring those two transports in `messenger.yaml` is up to you, the default configuration only sets one, `async`. And keep `failed` out of your workers: a message that fails while being consumed from the failure transport does not go back to it, it gets rejected, and is therefore lost for good. The failure queue is usually replayed by hand, which is the whole point of keeping it apart.

And since each scaler is a machine running the whole application, each scaler also runs its workers: three scalers, three consumers on the same queue. That is what you want to absorb load, and what you do not want for a task that has to stay unique. In that second case, the simple answer is a dedicated application, which is covered below.

## The restart contract

[The Symfony documentation](https://symfony.com/doc/current/messenger.html#deploying-to-production) is clear: a worker should not run forever. Doctrine, among others, accumulates memory as messages go by, so you give it stop conditions (`--limit`, `--memory-limit`, `--time-limit`), and the process manager restarts it when one of those limits is reached or exceeded. Those options are not exceptions: when the worker reaches the limit, it finishes the message in flight and **exits cleanly, with code 0**.

Now, Clever Cloud's (small) flaw here (yes, I did warn you I would be honest 😁) is `CC_WORKER_RESTART=on-failure`: the worker is only restarted if it fails. An exit with code 0 is not a failure. A `messenger:consume --time-limit=3600` therefore lives for exactly one hour, exits cleanly, and is never restarted. The queue stops being consumed without a single error line in the logs: the platform saw a process finish normally, that is all.

The fix lies in these 2 variables:

```bash
clever env set -a symfony-clever-demo CC_WORKER_RESTART always
clever env set -a symfony-clever-demo CC_WORKER_RESTART_DELAY 30
```

`always` also restarts clean exits, with code 0: `--time-limit=3600` becomes what it is meant to be, a periodic restart of the process to fight memory leaks, and not a definitive stop. `CC_WORKER_RESTART_DELAY` is the delay between the exit and the restart, in seconds, applied to every worker of the application, to be adjusted to your own case.

Do not leave that delay at its default value though. A worker whose configuration is broken, or whose database is unreachable, stops immediately: at a one second delay, that is one restart per second, and systemd ends up refusing to restart what crashes in a loop. That is the "restart burst limit" that the Clever documentation mentions without detailing it. 30 seconds leave time for an unavailable service to come back, and cost (almost) nothing when the worker runs for an hour.

A word on `--memory-limit`, since you have to pick a value. It has to stay below PHP's `memory_limit`, which Clever Cloud computes from the scaler size and which its `MEMORY_LIMIT` variable lets you override, like any other platform variable. Above it, PHP dies on a fatal error before Messenger gets a chance to exit cleanly. Hence the `64M` in the command above rather than the `128M` of the Symfony documentation: the smallest scaler stops at 91 MiB. Read the value yourself on your own instance:

```bash
clever ssh -a symfony-clever-demo --command "php -r 'echo ini_get(\"memory_limit\"), PHP_EOL;'"
```

In short, the combination that holds in production: `--time-limit` and `--memory-limit` as guardrails, `CC_WORKER_RESTART=always` so that the worker restart is actually honoured, and a delay long enough that a crash loop does not burn systemd's limit.

## The deployment, seen from the worker

What happens to the worker when the continuous deployment pipeline pushes a new version? The platform does not redeploy a process, it replaces machines: the worker of the old instance disappears with it, the one of the new instance starts on the freshly built code. The `messenger:stop-workers` of classic deployments therefore has nothing to do here, and it would not help much: its signal goes through the application cache, local to each scaler, and would not reach the other instances anyway.

The replacement stays clean thanks to an extension: `pcntl` is among [those enabled by default](https://www.clever.cloud/developers/doc/deploy/applications/php/extensions/) on the PHP runtime, so `messenger:consume` catches the stop signals, finishes the message in flight, then exits.

That leaves the message the worker was handling when it disappeared, and its fate is the same with any host. A message that has been picked up is only removed from the table once it is finished: if nobody finishes it, the Doctrine transport will hand it back to a worker. In other words, **an interrupted message will be replayed**, and a handler has to be [idempotent](https://symfony.com/doc/current/messenger.html#writing-idempotent-handlers), meaning it has the same effects whether it runs once or twice. The remedy comes down to two things: a key derived from the business event, never drawn at random when dispatching, and a uniqueness constraint in the database to enforce it. If your handlers run for more than an hour, raise the transport's `redeliver_timeout`, otherwise the queue will replay them while they are still working. But these are concerns for your own application code, and the platform cannot deal with them on your behalf.

One last thing to watch out for, overlapping versions: with zero downtime deployment, the old instance keeps consuming while the new one starts, and both share the same table. A message serialized by the old code and then decoded by the new one fails if the message class has been renamed or has disappeared. Before Symfony 8.1, the receiver used to remove it from the queue; since then, it follows the normal failure path, lands in `failed`, and can be replayed by hand once the cause is fixed. The rule that avoids the problem fits in one sentence: a message written by version N has to stay consumable by version N+1. Smaïne Milianni develops it in [his article on zero downtime deployment](https://smaine-milianni.medium.com/le-z%C3%A9ro-downtime-deployment-74eb9112be3d) (in French), and has tooled it in [`youtrust/zdd-message-bundle`](https://github.com/Youtrust/zdd-message-bundle), which checks that compatibility from your test suite.

## On the web application, or on a separate one

By default, the worker lives on the web application, and that is the right default: one application, one database, one deployment pipeline, one `clever env set` to remember. However, 3 situations can justify splitting it out:

- consumption does not follow the rhythm of HTTP traffic, and a slow queue calls for a dedicated scaler;
- a memory hungry job sits badly next to web requests that do not have the same limit (`MEMORY_LIMIT` sets the `memory_limit` of all the PHP in the application, web requests included);
- the two do not need the same instance size, nor the same deployment schedule.

Splitting it out follows the same path as the FrankenPHP application of [article 3](/blog/2026-09-14-symfony-clever-cloud-3-frankenphp-or-apache/): `clever create -t php`, linking the same PostgreSQL add-on, a second entry in `.clever.json`, then one more job in the CI/CD workflow. And there is nothing to plan on the HTTP side, even though this application serves no page: the PHP runtime starts Apache anyway, and without `CC_HEALTH_CHECK_PATH`, the platform is happy with any response between 200 and 499 on `/`. The 404 of an application without routes is enough for it, so a worker application passes the healthcheck without having anything to serve.

## Watching what happens

**Following the worker in the logs.** `clever logs -a symfony-clever-demo --search worker` catches the banner that `messenger:consume` writes on every start: "The worker will automatically exit once it has exceeded 64M of memory, been running for 3600s or received a stop signal via the messenger:stop-workers command." Seeing it reappear every hour is the proof that the restart works. Do not look for the matching "Worker stopped due to time limit": it is at `info` level, and in production the Monolog configuration only writes errors, the rest being buffered by its `fingers_crossed` or filtered by its `console` handler, which stops at `warning` at normal verbosity. That is the same reason why handled messages are reserved for a `-vv` debugging session.

**Counting the queue.** The Doctrine transport knows how to count itself:

```bash
clever ssh -a symfony-clever-demo --command "php bin/console messenger:stats"
```

`messenger:stats` without an argument lists every transport, and `--format=json` can feed a graph. It is the only metric that really matters: a queue that grows is a consumer that cannot keep up, whatever the apparent health of the worker.

**Dealing with failures.** Messages that failed three times land in `failed`. The `messenger:failed:show --stats` command takes inventory by message class, `messenger:failed:retry <id>` replays a message, and `messenger:failed:remove <id>` deletes one for good. To go further, the queue size can be exported as a custom metric (if needed, Clever Cloud collects the statsd protocol on port 8125, and a Prometheus endpoint on `localhost:9100/metrics`) and be plotted in the Grafana of the console, with an alert for when it grows.

## What comes next

The application consumes its messages, and it does so following the same contract as everything else: an environment variable, a service watched by the platform, and deployments that replace instances without losing a message. That contract is about to be useful again: the Symfony Scheduler is a Messenger worker like any other, and recurring tasks are the topic of the next article, between the platform cron, Clever Tasks and that Scheduler.

> **Source code.** The [`05-workers`](https://github.com/welcoMattic/symfony-clever-cloud-series/tree/05-workers) branch of the [welcoMattic/symfony-clever-cloud-series](https://github.com/welcoMattic/symfony-clever-cloud-series) repository holds everything this article adds to the application: the migration for the `messenger_messages` table, generated by `doctrine:migrations:diff` despite the `auto_setup=0`; a message routed to `async`, its handler and an `app:welcome` command to give it work by hand; the `handled_message` registry and its unique index, which make the handler idempotent the way this article asks for; a test checking that a second delivery sends nothing, without a database since the workflow test job does not start one; and the three worker variables documented in the branch `README`.
