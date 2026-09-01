---
title: "Symfony on Clever Cloud: the first deployment"
date: 2026-09-08T08:55:00.000Z
description: "Second article in a series about deploying a scalable Symfony application on the Clever Cloud PaaS"
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
  order: 2
  label: "The first deployment"
---

_Cet article est aussi disponible en 🇫🇷 Français : [Symfony sur Clever Cloud : le premier déploiement](/blog/2026-09-08-symfony-clever-cloud-2-premier-deploiement/)._

> **Transparency.** I am a Clever Cloud ambassador. I write this series independently, nobody on their side proofreads this series, and I allow myself the same criticism here as on any other platform.

In [the first article of this series](/blog/2026-09-01-symfony-clever-cloud-1-prepare-your-app-for-a-paas/), we ran a Symfony application through the 12-factor lens without touching a single platform command. That was deliberate: the contract mattered more than the tool.

Today we deploy. By the end of this article, a Symfony 8.1 application runs in production on Clever Cloud, with a managed PostgreSQL database, Doctrine migrations that run on their own at the right moment of the deployment, and a health check the platform calls to know whether the application is doing fine.

This will not be a copy of the official documentation. Three places along the way ask for a bit more than the command to copy: they are questions of sequencing, easy to miss on a first deployment and quick to remind you of themselves on the tenth. Those are the ones that take up the most room here.

Two things we will not do today: FrankenPHP, which deserves its own article and its own comparison, and <abbr title="Continuous Integration / Continuous Deployment">CI/CD</abbr>, which comes once the manual deployment is under control.

One last note before getting into it: everything here happens on the command line, but nothing is exclusive to it. Clever Cloud's web console gives access to the same settings, and every command in this article has its point-and-click equivalent: creating the application, setting an environment variable, creating an add-on and linking it, triggering a deployment, reading the logs. If you would rather click, you will miss none of the journey. I use the command line because it copies and pastes, reads back in a shell history, and will end up in a script once we get to CI/CD.

## The platform's vocabulary

Four words are going to come back over and over. Let's define them right away, because at Clever they do not mean exactly what they mean elsewhere.

An **application** is not a machine. It is a Git repository, a runtime, and some configuration, grouped under one identifier. You never choose which machine it runs on, and you do not need to.

The **runtime** is the execution environment the platform wraps around your code: the binaries, the web server, the extensions. At Clever it is picked when the application is created (`php`, `frankenphp`, `docker`, `node`, and about fifteen others) and it does not change afterwards.

A **scaler**, also called an instance, is one running copy of the application. An application can have one scaler or ten, and that number can change over the course of a day. Each scaler has a size, called a **flavor** at Clever, on a scale that runs from `pico` to `3XL`. That is the only place where you talk about <abbr title="Central Processing Unit">CPU</abbr> and memory. One subtlety worth knowing: `pico`, the smallest one, is not available for the `php`, `frankenphp`, `docker` and `static-apache` runtimes.

An **add-on** is a managed service: a database, file storage, a cache. You create it separately from the application, then you **link** it to the application. That link has a very concrete effect: the platform injects into the application the environment variables that describe the service (its address, its user, its password). It is factor IV from the previous article, attached resources, made literal.

## What you need before you start

A Clever Cloud account first. Creating one is free and you can sign up with an email address, GitHub, or GitLab.

Then Clever Tools, the platform's CLI. It installs through npm, and there are also system packages and an official Docker image:

```bash
npm install -g clever-tools
clever login
```

`clever login` opens your browser to authorise the CLI, then stores a token locally. To check that you are properly logged in:

```bash
clever profile
```

The commands in this article were run with Clever Tools 4.10. The CLI moves fast, and some commands were renamed between major versions: if a command below does not exist on your machine, start by looking at your version.

Finally, the Symfony application from the previous article. If you are starting from scratch, the [`01-fresh-symfony-app`](https://github.com/welcoMattic/symfony-clever-cloud-series/tree/01-fresh-symfony-app) branch of the companion repository is exactly the starting point: a Symfony 8.1 application created with `symfony new --version=8.1 --webapp --docker`, without a single line added by hand.

One thing moves there before we start: the local database goes to PostgreSQL 17, the version the Clever add-on provisions. That comes down to the `compose.yaml` and the `serverVersion` of the `DATABASE_URL`, and to nothing else. It is the first commit of this article's branch.

## Step 1: create the application

From the root of the repository:

```bash
clever create --type php symfony-clever-demo --region par
```

`--type php` selects the platform's historical runtime: Apache 2 in front, PHP-FPM behind. It is the model everyone knows, one PHP process per request, and it is the one that yields the fewest surprises on a first deployment. `--region par` puts the application in Paris; the other regions are listed by `clever create --help`.

The command does two things. On the platform side, it creates the application in your personal organisation. On the repository side, it writes a `.clever.json` file at the root:

```json
{
  "apps": [
    {
      "app_id": "app_xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx",
      "org_id": "user_xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx",
      "deploy_url": "https://push-par-clevercloud-customers.services.clever-cloud.com/app_xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx.git",
      "name": "symfony-clever-demo",
      "alias": "symfony-clever-demo"
    }
  ]
}
```

This file is the link between your local repository and the remote application: it is what lets the following commands know which application you are talking about, without you repeating its identifier. It contains no secret, only public identifiers, and it belongs in version control. If the application already exists on the platform side, `clever link symfony-clever-demo` produces the same file.

At this point the application exists but it is empty: no code has been pushed yet. `clever status` will confirm it.

The default scaler size is more than enough for this article. Sizing, autoscaling, and their traps will get a dedicated article at the end of the series.

## Step 2: environment variables

The previous article laid down the principle: on a <abbr title="Platform as a Service">PaaS</abbr>, configuration goes through the environment, and through nothing else. Here is what that looks like in practice.

```bash
clever env set CC_WEBROOT "/public"
clever env set CC_PHP_VERSION "8.4"
clever env set CC_COMPOSER_VERSION "2"
clever env set APP_ENV "prod"
clever env set APP_SECRET "$(openssl rand -hex 32)"
```

Let's take them one at a time, because three of them hide a trap.

**`CC_WEBROOT`** defines Apache's `DocumentRoot`, that is, the directory files are served from. Its default value is the root of the repository. In other words, if you forget it, your `composer.json`, your, and your `.env` are served over HTTP to anyone who asks. It is the most important variable of the list, and also the most frequently forgotten one, because its absence causes no error: the site answers, it just exposes everything it should not.

**`CC_PHP_VERSION`** accepts a major version (`8`) or a major and minor one (`8.4`). The documentation states a default value, but that value tracks the supported versions and therefore moves over time. Set it explicitly: you do not want to discover a PHP minor version change in the middle of a deployment you thought was risk-free.

**`CC_COMPOSER_VERSION`** accepts `2` or `lts`. Nothing subtle here, but pin it for the same reason.

**`APP_ENV`** and **`APP_SECRET`** come from the previous article. The secret must be stable over time: regenerating it on each deployment would invalidate everything it is used to sign, starting with the remember-me cookies of your logged-in users.

To read the whole set back:

```bash
clever env
```

One behaviour that surprises people at first: changing an environment variable does not restart the application. The new value is only taken into account on the next deployment.

Behind that detail sits a property of the platform that explains a great deal, and it is worth naming now: instances are **immutable**. An instance is never modified after it starts. You do not connect to it to change a value, fix a file or install a package. The platform does not know how to transform a running instance: it knows how to build new ones from an artefact and a configuration, then destroy the old ones. That is exactly what a deployment is.

Everything else follows. An environment variable only takes effect on the next deployment because it takes new instances to carry it, which is factor V from the previous article: a release is an artefact plus a configuration, and changing the configuration builds a new release. A fix made by hand on a scaler disappears without warning, since the scaler itself will disappear. And whatever your application writes to its disk leaves with the instance that wrote it, which is the very concrete reason behind factor VI, the one about stateless processes.

There is also `clever env import < .env` to import everything at once, and Clever's Symfony tutorial mentions it. It serves you well when you hand it a file made for the job. Just look at what you are handing it: your local `.env` holds development values, a `DATABASE_URL` pointing at your Docker container and a `MAILER_DSN` set to `null://null`. Importing those into production overwrites what the platform injects, without a word. As long as the list stays short, `clever env set` one variable at a time asks less of your attention.

One last variable, but that one deserves its own step.

## Step 3: the health check

The previous article laid down the principle: a route that answers 200 without touching anything, which the platform calls to know whether a scaler is fit to serve traffic. Here is the implementation, in `src/EventListener/HealthCheckListener.php`:

```php
<?php

namespace App\EventListener;

use Symfony\Component\EventDispatcher\Attribute\AsEventListener;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\HttpKernel\Event\RequestEvent;
use Symfony\Component\HttpKernel\KernelEvents;

#[AsEventListener(event: KernelEvents::REQUEST, priority: 4096)]
final class HealthCheckListener
{
    public const string PATH = '/cc-health';

    public function __invoke(RequestEvent $event): void
    {
        if (!$event->isMainRequest() || self::PATH !== $event->getRequest()->getPathInfo()) {
            return;
        }

        $event->setResponse(new JsonResponse(['status' => 'ok']));
    }
}
```

A listener, not a controller, and deliberately so. To reach a controller, the request first goes through everything listening to `kernel.request`: request validation, routing, the security firewall, and your own application's listeners. The day one of them queries the database, your health check depends on it too, without its code changing by a single line. The `4096` priority puts this one ahead of all the others, and `setResponse()` calls `stopPropagation()`: nothing else runs for that request. You can check the order on your side with `php bin/console debug:event-dispatcher kernel.request`.

All that is left is giving the platform the path:

```bash
clever env set CC_HEALTH_CHECK_PATH "/cc-health"
```

Without that variable, the platform calls `/` and expects a response code between 200 and 300. A fresh Symfony application answers 404 there, and the deployment would be declared failed while everything is fine. The `cc-` prefix says this path belongs to the platform, and it leaves `/health` free for your own monitoring, the one that is allowed to query your dependencies.

## Step 4: the Apache trap

The `php` runtime serves your files with Apache. When Apache is asked for `/cc-health`, it looks for a file named `cc-health` in the `DocumentRoot`, does not find it, and answers 404. Your listener can do nothing about it: the request never even reaches PHP. For it to hand over to Symfony's front controller, it needs rewrite rules, and those rules live in a `.htaccess` file.

Since Symfony 4, the skeleton no longer ships one. Check for yourself:

```bash
ls -a public/
# .  ..  index.php
```

No `.htaccess`. The file was taken out of the skeleton and moved into a dedicated package, because most modern deployments run behind Nginx, which has no use for it. On Clever's Apache runtime, it becomes necessary again:

```bash
composer require symfony/apache-pack
```

Watch out for the question Symfony Flex asks: the `apache-pack` recipe lives in the `recipes-contrib` repository, and recent skeletons refuse to execute contrib recipes by default. If you answer no, or if you run the command with `--no-interaction`, the package is installed but its `.htaccess` is never written. Answer yes to the question. Once the recipe has run, `public/.htaccess` exists and contains the expected rewrite rules. Commit it.

## Step 5: the database

### Create the add-on and link it

```bash
clever addon create postgresql-addon symfony-clever-demo-db --plan dev --region par
clever service link-addon symfony-clever-demo-db
```

The first command provisions a managed PostgreSQL database. The provider name, `postgresql-addon`, is not pretty, but it is the one the CLI expects; `clever addon providers` lists all the others. The `dev` plan is the smallest of the range, more than enough for a demonstration, with one limitation worth knowing: on-demand PostgreSQL extensions are not available on it. Check the pricing page before confirming. The CLI does protect you from an accidental purchase, since it asks for confirmation as soon as an add-on is not free, and you have to pass `--yes` to skip that.

The second command creates the link between the add-on and the application. That is what triggers the variable injection. Check it:

```bash
clever env | grep POSTGRESQL
```

You get `POSTGRESQL_ADDON_URI`, which holds the complete connection URI, along with the separate pieces: `POSTGRESQL_ADDON_HOST`, `POSTGRESQL_ADDON_PORT`, `POSTGRESQL_ADDON_DB`, `POSTGRESQL_ADDON_USER`, `POSTGRESQL_ADDON_PASSWORD`, `POSTGRESQL_ADDON_ROLE`. On top of those come `POSTGRESQL_ADDON_DIRECT_HOST` and `POSTGRESQL_ADDON_DIRECT_PORT`, which point straight at the database machine, bypassing the platform's proxy.

### The real problem: Symfony does not know those variables

Symfony expects `DATABASE_URL`. The platform provides `POSTGRESQL_ADDON_URI`. The tempting answer is this one:

```bash
# Do not do this.
clever env set DATABASE_URL "$POSTGRESQL_ADDON_URI"
```

It is wrong twice over. First because `$POSTGRESQL_ADDON_URI` is expanded by **your** shell, on **your** machine, where that variable does not exist: you have just set an empty `DATABASE_URL` in production. Second because even with the right value fetched by hand, you are building a frozen copy, one the add-on will leave behind on its first password rotation. Writing `DATABASE_URL=${POSTGRESQL_ADDON_URI}` on the platform side saves nothing either: Clever does not interpolate between environment variables, the value would be taken literally.

The answer is in Symfony. The DependencyInjection component ships a `default` processor, which reads an environment variable and falls back to something else if it is missing or empty. In `config/packages/doctrine.yaml`:

```yaml
parameters:
    # Fallback used locally, when no Clever add-on is plugged in.
    app.database_url_fallback: '%env(resolve:DATABASE_URL)%'

doctrine:
    dbal:
        # On Clever, the add-on injects POSTGRESQL_ADDON_URI and that value
        # wins. Locally it does not exist and Doctrine falls back to
        # DATABASE_URL, read from .env.
        url: '%env(default:app.database_url_fallback:POSTGRESQL_ADDON_URI)%'
        # The add-on URI carries no serverVersion: without this line, the
        # connection cannot be built.
        server_version: '%env(DATABASE_SERVER_VERSION)%'
```

`%env(default:a_parameter:A_VARIABLE)%` reads right to left: take `A_VARIABLE`, and if it is missing or empty, take the parameter. Since that parameter itself holds an `%env()%`, neither value is written into the compiled container: Symfony puts a placeholder there and reads the environment at boot. You can check it by compiling the production cache without `POSTGRESQL_ADDON_URI` and then booting with it, recompiling nothing: the connection targets the add-on's host, not the one from `.env`.

A single code path, then, for both environments. Locally the variable does not exist and you talk to your Docker container; on Clever it exists, it wins, and you talk to the add-on. Nothing to copy, nothing to maintain twice.

That leaves the `server_version` line, which is not there by accident. Without it:

```bash
POSTGRESQL_ADDON_URI="postgresql://user:pass@host:5432/db" php bin/console dbal:run-sql 'SELECT 1'

  Invalid platform version "" specified. The platform version has to be
  specified in the format: "<major_version>.<minor_version>.<patch_version>".
```

Doctrine needs to know which PostgreSQL version it is talking to, so it can adapt the SQL it generates. The skeleton's `DATABASE_URL` carries it in its `serverVersion` parameter, the add-on URI does not: it has to be given some other way.

On the `.env` side, we pull the version out of the URL and into its own variable, the same one on both sides:

```diff
-DATABASE_URL="postgresql://app:!ChangeMe!@127.0.0.1:5432/app?serverVersion=17&charset=utf8"
+DATABASE_URL="postgresql://app:!ChangeMe!@127.0.0.1:5432/app?charset=utf8"
+DATABASE_SERVER_VERSION=17
```

And on the platform side:

```bash
clever env set DATABASE_SERVER_VERSION "17"
```

PostgreSQL 17 has been the default version for new add-ons at Clever since March 2025, but do not take my word for it: `clever addon env symfony-clever-demo-db` will tell you what was actually provisioned for you.

## Step 6: deployment hooks

A deployment at Clever happens in four stages: the platform fetches your code, **builds** the application (for PHP, a `composer install` run automatically as soon as a `composer.json` is present at the root), **archives** the result so it can be reused on the next deployment, then **starts** the application on each scaler, and waits for the health check before sending it traffic.

A **hook** is an environment variable whose value is a shell command, or the path to an executable script in your source code. The platform runs it at the moment its name designates. There are five of them:

| Hook | When it runs | Failure blocks the deployment | Replayed on a deployment from cache |
|---|---|---|---|
| `CC_PRE_BUILD_HOOK` | Before dependencies are fetched | Yes | **No** |
| `CC_POST_BUILD_HOOK` | After the build, before the archive | Yes | **No** |
| `CC_PRE_RUN_HOOK` | After the archive, before start-up | Yes | Yes |
| `CC_RUN_SUCCEEDED_HOOK` and `CC_RUN_FAILED_HOOK` | Once the application has started, or once its start-up has failed | No | Yes, one of the two every time |

The rightmost column is the one that matters. A deployment from cache skips the whole build phase, so it skips both hooks attached to it: no pre-build, no post-build. And a plain restart is one, since `clever restart` reuses the archive by default, unless you pass it `--without-cache`.

### What goes where

Everything goes in `CC_POST_BUILD_HOOK`: compiling assets, warming the cache, and running migrations. In `clevercloud/post-build.sh`:

```bash
#!/bin/bash -l
set -euo pipefail

echo "==> Compiling assets"
php bin/console asset-map:compile --env=prod --no-debug

echo "==> Warming up the cache"
php bin/console cache:warmup --env=prod --no-debug

echo "==> Doctrine migrations"
php bin/console doctrine:migrations:migrate --no-interaction --allow-no-migration --env=prod
```

The `-l` in the shebang loads the runtime's environment, which puts the right PHP binary in the `PATH`. The `set -euo pipefail` fails the deployment on the first command in error: better a red deployment than a live application with missing assets or an out-of-date database schema. And the `--allow-no-migration` keeps a brand-new project, which has no migration yet, from failing its own deployment.

### Why migrations belong in the build

This is where I have seen the most people hesitate, myself included, so let's take it by its properties rather than by habit.

**There is only one build per deployment**, whatever the number of scalers. A migration placed there runs once, and only once. That is the property that matters: nothing to coordinate, no lock to take, no guard to write.

**The hook is not replayed on a deployment from cache, and that is exactly what we want.** The cache is keyed per commit, which the logs spell out:

```
Checking cache data: GET /api/builds/<app_id>/<commit>/php-20260818
No build cache archive has been detected, performing a new build…
```

A new commit can therefore never land on an existing archive: it always triggers a full build, so it always runs the migrations. And a deployment that skips the post-build hook is necessarily the restart of an already deployed commit, whose migrations have already run. Replaying them would serve no purpose.

**`CC_PRE_RUN_HOOK` would not do**, despite a name that might suggest otherwise: it is replayed on every scaler. With four instances, that is four `doctrine:migrations:migrate` started in parallel against the same database. You can filter them with `INSTANCE_NUMBER`, the variable the platform injects into every scaler with its index, but that coordinates nothing: the other instances start without waiting for the first one to finish, and can serve traffic on a schema that has not been migrated yet. The pre-run hook keeps its use for what genuinely has to run on every instance before it serves, which a migration is not.

One reservation remains, and it does not depend on the platform: during the build, the previous version of your code is still serving traffic, against a database the migration has just changed. For a purely additive migration, no problem. For a destructive one, the answer is neither the post-build nor the pre-run hook, it is splitting it across two deployments, one that adds and one that removes.

### Wire the script up

```bash
chmod +x clevercloud/post-build.sh
clever env set CC_POST_BUILD_HOOK "./clevercloud/post-build.sh"
```

The executable bit matters, and Git tracks it: a script without execute permission gives you a failed deployment with a not very explicit message.

## Step 7: the reverse proxy

One more thing before deploying, and it is the one that produces the most puzzling tickets when it is forgotten.

Your application never receives traffic directly. It goes through Clever's load balancers, which terminate <abbr title="Transport Layer Security">TLS</abbr> and forward the request in clear to your scaler. From Symfony's point of view, every request therefore arrives over HTTP, from an internal IP address. The consequences show up fast: your logs hold the proxy's address instead of the visitor's, the absolute URLs you generate start with `http://`, and if you force HTTPS somewhere, you build yourself a redirect loop.

The standard protocol to deal with this exists, it is the `X-Forwarded-*` headers. Symfony knows how to read them, but by default it refuses to trust them, and rightly so: any client can send them. So you have to tell it which addresses those headers can be trusted from. Clever injects a `CC_REVERSE_PROXY_IPS` variable for that, holding the list of its own addresses.

In `.env`:

```bash
# CC_REVERSE_PROXY_IPS is injected by Clever Cloud. Locally it does not exist,
# so the list boils down to the loopback address.
TRUSTED_PROXIES=127.0.0.1,${CC_REVERSE_PROXY_IPS}
```

In `config/packages/framework.yaml`:

```yaml
framework:
    secret: '%env(APP_SECRET)%'

    # On Clever, traffic arrives through a reverse proxy: without this line,
    # Symfony believes every request is plain HTTP and sees the proxy's IP.
    trusted_proxies: '%env(TRUSTED_PROXIES)%'
```

The `${...}` syntax belongs to Symfony's Dotenv component, which expands one variable inside another when it reads the file. That is what lets you write a single line valid everywhere: locally, `CC_REVERSE_PROXY_IPS` does not exist, it expands to an empty string, and the list boils down to `127.0.0.1`. You can check it with `php bin/console debug:dotenv`.

## Step 8: deploy

Everything is in place. Commit, and push.

```bash
git add .clever.json clevercloud/ config/ public/.htaccess src/EventListener/HealthCheckListener.php \
        .env composer.json composer.lock symfony.lock
git commit -m "Prepare the application for its first Clever Cloud deployment"
clever deploy
```

`clever deploy` pushes the current branch to a Git remote managed by the platform, then streams the deployment logs live until it ends. You will see, in order: dependency fetching, the `composer install`, the post-build hook with asset compilation and the migrations, the cache archive being built, then the application starting up and being validated by the health check.

Two options are useful from day one. `--exit-on never` keeps the log stream open after the deployment ends, which is handy to watch the first real requests come in. And if you re-run a deployment without a new commit, the CLI refuses and says so: that is the default behaviour of `--same-commit-policy`, which you have to set to `restart` or `rebuild` to redeploy an identical commit. That is typically what you will need after changing an environment variable, since, as we saw above, a variable only takes effect on the next deployment.

Once the deployment is over:

```bash
clever open
```

The application is served on an automatically assigned subdomain of `cleverapps.io`, which `clever domain` will remind you of. Let's check the health check:

```bash
curl -s https://your-app.cleverapps.io/cc-health
{"status":"ok"}
```

If something went wrong, the logs are one command away:

```bash
clever logs
clever logs --since 10m
clever logs --search "migrations"
```

Wiring up a domain name of your own is done with `clever domain add`, after which you will have to update your domain's DNS zone so it points at Clever Cloud's infrastructure. The documentation for that is here: [Domain Names](https://www.clever.cloud/developers/doc/administrate/domain-names/).

## Step 9: tune the runtime

The application runs. Here are the few settings worth looking at right now, rather than in six months when production asks for them.

**PHP extensions** are enabled and disabled through environment variables, following the `ENABLE_<EXTENSION>` and `DISABLE_<EXTENSION>` pattern:

```bash
clever env set ENABLE_APCU "true"
```

A good share of the extensions a Symfony application needs is already there, but the exact list of what is active by default varies with the PHP version, and that is especially true on the most recent versions where coverage is still partial. Check [the extensions page](https://www.clever.cloud/developers/doc/applications/php/extensions/) for your version rather than trusting a list copied into an article, this one included.

A side note on APCu, since it is the extension Symfony projects turn on first: it is an in-memory cache, local to one scaler. Perfect for Symfony's system cache, which holds data every scaler can recompute identically. To be avoided for shared application cache, for the reason developed in the previous article: what scaler A put in cache, scaler B does not see.

**Memory** is set with `MEMORY_LIMIT`, expressed in MiB, which overrides PHP's `memory_limit`. Its neighbour `CC_CONFIGURATION_PM_MAX_CHILDREN` sets the number of PHP-FPM workers, and the two are related: raising the number of workers lowers the memory the platform computes for each of them. It is a trade-off between requests served in parallel and memory per request, not a slider to push all the way up.

**OpCache** has its own variables, `CC_OPCACHE_MEMORY`, `CC_OPCACHE_MAX_ACCELERATED_FILES` and `CC_OPCACHE_INTERNED_STRINGS_BUFFER`, whose defaults depend on the scaler size. A mid-sized Symfony application easily goes past the default file count, and that is the kind of ceiling that only shows up as diffuse slowness.

**The rest of the PHP directives** go into a `.user.ini` file placed in the webroot, so in `public/` since that is where `CC_WEBROOT` points:

```ini
date.timezone = "Europe/Paris"
```

**And one convenience variable** to finish with, which has nothing technical about it but helps a lot during the first days:

```bash
clever env set CC_HTTP_BASIC_AUTH "demo:some-password"
```

It puts the whole application behind HTTP basic authentication. That is exactly what you want while getting a deployment right on a public address, and it saves you from discovering that an indexing engine got there before you did.

## Finding your way in Clever's documentation

The page that will serve you most is the [environment variables reference](https://www.clever.cloud/developers/doc/reference/reference-environment-variables/). It is dense, and it contains just about everything the platform can do. When something does not behave as expected, chances are the answer is a variable listed there.

The documentation is [open source on GitHub](https://github.com/CleverCloud/documentation). Several details in this article come from going back and forth between what it describes and what I observed while deploying. When a detail is missing, anyone can open a pull request, and it is often the most direct way to spare the next person the same question.

Finally, [the changelog](https://www.clever.cloud/developers/changelog/) publishes an <abbr title="Really Simple Syndication">RSS</abbr> feed. The platform moves fast, runtime versions and default values with it, and that is the only place where those moves are announced.

## What comes next

You have a Symfony application in production, a managed database, automatic migrations, and a health check. That is a complete deployment, and it rests on the Apache and PHP-FPM runtime, the one that has been running PHP for more than twenty-five years.

In the next article, we redo the exact same deployment on FrankenPHP, and compare: what it changes in the configuration, what it brings in performance, and above all in which cases staying on Apache remains the right call.

> **Source code.** The [`02-first-deployment`](https://github.com/welcoMattic/symfony-clever-cloud-series/tree/02-first-deployment) branch of the [welcoMattic/symfony-clever-cloud-series](https://github.com/welcoMattic/symfony-clever-cloud-series) repository holds everything this article adds to the application: the health check listener, the `clevercloud/` script, the Doctrine configuration, and the trusted proxies one.
