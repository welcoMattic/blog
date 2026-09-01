---
title: "Symfony on Clever Cloud: preparing your app to live on a PaaS"
date: 2026-09-01T08:55:00.000Z
description: "First article in a series about deploying a scalable Symfony application on the Clever Cloud PaaS"
tags:
  - symfony
  - clever-cloud
  - paas
  - php
  - devops
  - serie-symfony-clever
lang: en
series:
  name: "Symfony on Clever Cloud"
  order: 1
  label: "Preparing your app to live on a PaaS"
---

_Cet article est aussi disponible en 🇫🇷 Français : [Symfony sur Clever Cloud : préparer son app à vivre sur un PaaS](/blog/2026-09-01-symfony-clever-cloud-1-preparer-son-app-paas/)._

> **Transparency.** I am a Clever Cloud ambassador. I write this series independently, nobody on their side proofreads this series, and I allow myself the same criticism here as on any other platform.

After [a PHP <abbr title="Software Development Kit">SDK</abbr> to drive Clever Cloud's API](/blog/2026-08-26-sdk-php-clever-cloud/) (in French), I am tackling what actually runs on this cloud provider: a series about deploying Symfony applications on their <abbr title="Platform as a Service">PaaS</abbr>. From auditing the application all the way to autoscaling and distributed configuration.

But I am not going to start with `clever create`. Because while helping teams migrate to a PaaS, I ended up noticing one thing: almost none of the problems come from the platform you picked. They come from the configuration of Symfony applications that were never written to run anywhere other than the original server they were bootstrapped on (often an Nginx + PHP-FPM pair on a single <abbr title="Virtual Private Server">VPS</abbr>). Sessions on disk, uploads in `public/`, logs in `var/log/prod.log`, database host hardcoded in the `.env.prod` file. None of that is a problem on a VPS or in a <abbr title="Virtual Machine">VM</abbr>. All of it can break on a PaaS.

So before picking the size of the Clever instance we are going to deploy on, let's run a quick audit of a typical application. By the end of this article, you will know whether your application is ready, and what to change if it is not. The content holds for Clever Cloud, but also for Scalingo, Upsun, Scaleway, Render, Fly.io, Heroku or just about any other PaaS: it is the same contract.

## The contract is 12-factor

In 2011, Adam Wiggins, co-founder of Heroku, published [The Twelve-Factor App](https://12factor.net/). The document starts from a simple observation: Heroku was hosting thousands of applications, and the ones that deployed painlessly all shared the same properties. Wiggins wrote them down. Fifteen years later, it is still the best available lens on the subject, and above all: **a PaaS is, among other things, the operational implementation of those twelve principles**. When you deploy on a PaaS, you do not choose to adopt 12-factor, you adopt it whether you meant to or not.

The twelve factors are often presented as a list of rules to tick off. That is the best way to retain none of them, because they are really twelve variations on a single idea: **your application must be an interchangeable process**. The platform must be able to stop it, duplicate it, move it to another machine or replace it with a newer version, without your users noticing and without anything being lost along the way. Everything else follows from that.

The 12 principles are:

- I. Codebase
- II. Dependencies
- III. Config
- IV. Backing services
- V. Build, release, run
- VI. Processes
- VII. Port binding
- VIII. Concurrency
- IX. Disposability
- X. Dev/prod parity
- XI. Logs
- XII. Admin processes

To make them digestible, let's group them into four families.

### What goes into the application (I, II, III)

A single versioned repository produces every deployment: production, staging and each developer's machine run the same code, at different revisions. Dependencies are declared explicitly, in `composer.json`, and pinned in `composer.lock`, which means nobody is going to install an extension by hand on the server to save the day on a Friday night. And everything that changes from one environment to the next, the database address, the payment provider's API key, the log level, moves out of the code and becomes an environment variable.

On a Symfony application, the first two come for free: Git and Composer do the work without anyone having to decide anything. The third one is where things get stuck, because it does not show as long as you only have one server: it is the `.env.prod` copied over by hand, the old `parameters.yml` inherited from an earlier version of the project, or the database host hardcoded in a configuration file.

### What sits around the application (IV, VII, XI)

The database, the Redis server, the file storage, the mail server are **backing services**: the application reaches them through an address handed to it at startup, and you must be able to unplug one and replace it with another without touching the code. Switching from a local PostgreSQL database to a managed one must be an environment variable change, nothing more.

The application then exposes its service on a port, being self-contained rather than living inside a web server. That is the factor the PHP world applies the least naturally: with the classic Nginx plus PHP-FPM pair, your application is not the thing listening on the network, the web server is the one invoking it. That is not a flaw to fix, the platform's runtime plays that role for you. Just note that FrankenPHP makes this factor literal by embedding the server inside the application itself, and we will come back to it in a future article.

Finally, the application does not write log files. It writes its logs to standard output, as they happen, and the environment decides where they land: a developer's console locally, a collection system in production.

### How the application is built and started (V, XII)

Three strictly separate stages. The **build** turns the source code into an executable artifact: dependencies installed, assets compiled, cache warmed up. The **release** combines that artifact with the configuration of the target environment. The **run** executes the result. The rule that matters is that a release, once assembled, is never modified: you do not fix a bug by editing a file on the server, you make a new build. That is what guarantees that whatever runs in production matches exactly one identified commit, and that rolling back means re-running a previous release.

One-off tasks follow the same logic: a Doctrine migration or a maintenance command is a process launched separately, on the same artifact and with the same configuration as the application serving traffic. Not a script on the side, not manual access to the database.

### How the application behaves once alive (VI, VIII, IX, X)

The application keeps nothing between two requests: that is the stateless factor, the one that opens the checklist below and the most expensive one to ignore. It scales by multiplying processes rather than by growing the machine, which is only possible if the previous factor is respected. It starts fast and shuts down cleanly, because the platform can kill it at any moment, for a redeployment, a hardware failure or a reduction in the number of instances. And environments look alike: the same database engine locally and in production, and a short delay between a commit and its going live.

### What the PaaS enforces by design

On a PaaS, several of these factors stop being recommendations and become physical constraints. You have no server to connect to, so configuration necessarily goes through the environment (III) and one-off tasks through declared commands (XII). The disk is ephemeral and several instances can run in parallel, so the application has to be stateless (VI) and write its logs to standard output (XI). The platform builds first and runs second, so build and run are separated whether you wanted it or not (V).

The others stay on your side: they will make your life easier, but nothing will force your hand.

On an existing Symfony application, these principles do not all require the same amount of work. Some are already respected without anyone ever thinking about it, others call for real changes. The checklist below goes through the ones that matter, one question at a time. Each question mentions in parentheses the factor it relates to.

## The 8 questions to ask yourself

### 1. Is my application really stateless? (factor VI)

Let's start with the vocabulary, because everything else follows from it. State, here, is the set of information your application writes somewhere and reads back later to keep working: the session of a user who just logged in, the file they uploaded ten seconds ago, the result of an expensive computation cached so it does not have to be redone.

An application is said to be **stateful** when it stores that information at home, in the memory or on the disk of the machine running its code. It is said to be **stateless** when it stores it outside, in a service that every copy of the application can reach: a database, a Redis server, an object storage. The application itself keeps nothing between two requests.

On a single server, the distinction is invisible: there is only one disk and one memory, so "at home" and "outside" designate the same machine. It shows up the day several copies of the application run in parallel, which is the normal mode of operation of a PaaS. Each copy has its own memory and its own disk, and the load balancer sends the requests of a single user sometimes to one, sometimes to another. What copy A wrote at home, copy B does not see. Worse: those copies are destroyed and recreated on every deployment, so whatever was written at home disappears without warning.

This is the question that costs the most to ignore, because the symptom is delightfully intermittent: it works, until the day you scale to two instances and your users get logged out half the time.

Three places to inspect:

- **Sessions.** Symfony does not pick where they land. Its default configuration (`session: true`) defers to PHP's native handler, which writes wherever its `php.ini` `session.save_path` points. On a single machine that is a local folder (`/tmp`, or `/var/lib/php/sessions` on Debian) and nobody ever notices. With two instances, each gets its own: two sets of sessions, and your user is logged out every other request. So it is the platform, not the application, that decides whether your sessions survive scaling out. Find out what yours does with them, and absent a clear answer, switch to storage shared between the instances (Redis, for instance).
- **The cache.** `var/cache/` is local to the instance. For the shared application cache (`cache.app`), you need a distributed adapter (Redis fits here too).
- **Uploads.** If you write to `public/uploads/`, the file only exists on the instance that received it, and it disappears on the next deployment. You need shared file storage (an object storage such as S3, or a network filesystem such as <abbr title="Network File System">NFS</abbr>).

Clever Cloud handles this on its PHP runtime: an FS Bucket is created automatically for each application, and since Symfony defers to `php.ini`, a default application writes its sessions there, shared between instances, with nothing to change. That bucket does not exist in HDS regions, nor on the Docker and FrankenPHP runtimes. Clever recommends a shared session store such as Redis or Materia KV anyway, which performs better than the bucket.

### 2. Are my secrets in the code? (factor III)

Is `.env` committed with real values in it? Is there a `.env.local` that you copy by hand onto the server? Do you use [Symfony's vault](https://symfony.com/doc/current/configuration/secrets.html)?

On a PaaS, the answer is uniform: secrets are declared in the platform's environment, never in the repository. The Symfony vault remains usable, but you then have to manage the decryption key as an environment variable, which brings you back to the same problem with one extra step. For most projects, the platform's variables are enough.

### 3. Is my database access configurable at runtime? (factors III and IV)

Behind this question hides the most structuring principle of the whole article: **an application must know nothing about the environment it runs in**. The same code, out of the same build, must be able to start on your machine, on a staging environment and in production without a single line being changed. What distinguishes those three runs is only the values the environment hands to the application at startup.

In other words, your application does not say "my database is at `10.0.0.12`". It says "my database is wherever I am told it is, at the moment I start". The environment answers, and the environment is right.

In `config/packages/doctrine.yaml`, the line must look like this:

```yaml
doctrine:
    dbal:
        url: '%env(resolve:DATABASE_URL)%'
```

The `%env()%` syntax is not a mere writing convenience: it is what makes that decoupling possible. Symfony does not substitute the value when it compiles its dependency injection container, but when the application starts. The very same, already built application can therefore point at different databases depending on where it runs, without being rebuilt.

If you have a hardcoded `host: 10.0.0.12`, or a frozen `dbname`, you have already lost: on a PaaS, the database URL is provided by the platform at startup, and it can change, and that is normal.

And the database is only one example. The same reasoning holds for everything your application does not own itself: the Redis server, the object storage, the mail server, the third-party API you call. Each one is a backing service, described by an environment variable, replaceable without touching the code. That is exactly what factor IV says.

### 4. Are my assets built at deploy time? (factor V)

Locally, you run `npm run build` or `bin/console asset-map:compile` by hand. On the server, who does it? If the answer is "nobody, I commit `public/build/`", it still works, but you are versioning build artifacts and you are heading straight for a merge conflict. The asset build has to become an automated step of the deployment. AssetMapper, Webpack Encore or Symfony Reprise, it does not matter: what counts is that it is scripted.

### 5. Do my Doctrine migrations run on their own? (factor XII)

Honest question: today, how do you deploy? If the sequence is `git pull` then an SSH session to run `bin/console doctrine:migrations:migrate --no-interaction` by hand, that gesture has to disappear. On a PaaS, you have no server to connect to, and above all you do not want to be in the loop.

This is the point that requires the most care, because timing matters: migrations have to run after the build and before the application serves any traffic. And with several instances, you have to prevent them from starting in parallel. We will handle that in detail in the next article.

### 6. Do my logs go to standard output? (factor XI)

If Monolog writes to `var/log/prod.log`, that file sits on an ephemeral disk, on one instance among N, and nobody will ever read it. The PaaS collects what comes out on `stdout` and `stderr`, full stop.

Good news: if you have never touched `config/packages/monolog.yaml`, the Symfony recipe already does the right thing. The gist of what it sets up in prod:

```yaml
when@prod:
    monolog:
        handlers:
            main:
                type: fingers_crossed
                action_level: error
                handler: nested
                excluded_http_codes: [404, 405]
                buffer_size: 50
            nested:
                type: stream
                path: php://stderr
                level: debug
                formatter: monolog.formatter.json
            console:
                type: console
                process_psr_3_messages: false
                channels: ["!event", "!doctrine"]
```

Three things to take away from it. The `nested` handler writes to `php://stderr`, the output the platform collects. The `formatter: monolog.formatter.json` is not cosmetic: without it, a stack trace is split into as many log lines as it has levels, and your collection hands you back a puzzle instead of an event. And the `console` handler covers CLI commands, which matters more than you would think on a PaaS, where migrations and administration tasks run inside deployment hooks.

The `fingers_crossed` sitting upstream avoids drowning the collection: it only releases the buffer when an error occurs, which gives you the context of the requests that fail, and silence for the others. Careful how you read `buffer_size: 50`: those are the last 50 records, not the whole request. Beyond that, the beginning of the context is lost.

This is the only point of this checklist where platforms really diverge. Clever Cloud's PHP documentation, for its part, documents an `error_log` handler, which sends to PHP's own logging mechanism rather than directly to standard output:

```yaml
monolog:
  handlers:
    clever_logs:
      type: error_log
      level: warning
```

The idea stays the same in both cases: never write to a file, but rather write where the platform expects it and can read the logs in a standardized way.

### 7. Do I have a healthcheck? (outside 12-factor)

A route that answers 200 without touching the database, so the platform knows whether the instance is alive:

```php
#[Route('/health', name: 'health', methods: ['GET'])]
public function health(): JsonResponse
{
    return new JsonResponse(['status' => 'ok'], 200);
}
```

Without the database, deliberately. A healthcheck endpoint that queries the database turns a database incident into a total outage of the application: the platform believes all your instances are dead and recycles them in a loop. If you want to check your dependencies, make it a second, separate route, one that you monitor without wiring it to the platform's healthcheck.

### 8. Does my application start fast? (factor IX)

Factor IX, "Disposability", is the one you discover at the first traffic peak. When the platform starts an extra instance, a cold `cache:warmup` can take about ten seconds. During that time, the instance is still coming up while the traffic is already there.

The rule is simple: warmup happens at build time, not at startup. The build artifact must contain an already warm cache.

## How this translates at Clever Cloud

So much for the universal part. Now, the concrete mapping, on the platform this series is about:

| 12-factor principle | At Clever Cloud |
|---|---|
| III. Config | Environment variables through the console, `clever env` through the CLI, or a config-provider addon shared between several applications, to share variables whose values are common to several apps |
| IV. Backing services | Addons: PostgreSQL, MySQL, MongoDB, Redis, Cellar (S3), FS Buckets, Materia KV |
| VI. Stateless processes | Sessions shared out of the box by the PHP runtime's FS Bucket, or on Redis and Materia KV, uploads on Cellar, nothing left on the local disk |
| VIII. Concurrency | Horizontal scalers, `--min-instances` and `--max-instances` |
| XI. Logs | Monolog `error_log` handler, plus optional drains to Datadog, Elastic or OVH |

Clever officially points back to 12-factor in its best practices documentation: [the 12 factors at Clever](https://www.clever.cloud/developers/doc/best-practices/12-factors). The page fits in three links, but it says what matters: this really is the expected contract.

Three variables to keep in mind right now, because they will come back in every article of the series:

- **`CC_WEBROOT`** must be set to `/public`. Without it, the runtime serves the root of the repository, and you expose your `composer.json` and your `.env` to the whole world.
- **`APP_ENV`** must be set to `prod`. If you forget it, you deploy with the profiler and the debug assertions active.
- **`APP_SECRET`** must be defined, identical on every instance, and stable from one deployment to the next, otherwise you invalidate everything this secret is used to sign (remember-me cookie, signed URLs, and so on).

## What comes next

Your application is ready to be audited against these criteria. In the next article, we move to action: `clever create`, the PostgreSQL addon, the deployment hooks and migrations at the right moment, all the way to a first production deployment.

> **Source code.** Every article in the series has its own branch in the companion repository: [welcoMattic/symfony-clever-cloud-series](https://github.com/welcoMattic/symfony-clever-cloud-series). For this first article, there is nothing to show beyond the starting point: the [`01-fresh-symfony-app`](https://github.com/welcoMattic/symfony-clever-cloud-series/tree/01-fresh-symfony-app) branch contains a Symfony 8.1 application created with `symfony new --version=8.1 --webapp --docker`, without a single line added by hand.
