---
title: "Symfony on Clever Cloud #3: FrankenPHP, and when to stay on Apache"
date: 2026-09-14T09:00:00.000Z
unlisted: true
description: "Third article in a series about deploying a scalable Symfony application on the Clever Cloud PaaS"
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
  order: 3
  label: "FrankenPHP, and when to stay on Apache"
---

_Cet article est aussi disponible en 🇫🇷 Français : [Symfony sur Clever Cloud #3 : FrankenPHP, et quand rester sur Apache](/blog/2026-09-14-symfony-clever-cloud-3-frankenphp-ou-apache/)._

> **Transparency.** I am a Clever Cloud ambassador. I write this series independently, nobody on their side proofreads this series, and I allow myself the same criticism here as on any other platform.

By the end of [the second article in this series](/blog/2026-09-08-symfony-clever-cloud-2-first-deployment/), a Symfony 8.1 application was running in production on Clever Cloud: Apache in front, PHP-FPM behind, a managed PostgreSQL database, migrations and a healthcheck, on the `php` runtime.

Today, we redo the same deployment on the `frankenphp` runtime of this <abbr title="Platform as a Service">PaaS</abbr>, next to the first one rather than in its place.

Two things break when you change runtime, and they structure what follows. Worker mode, which keeps your application in memory and makes you responsible for what PHP used to erase at the end of every request. And sessions: the `php` runtime mounts a store shared between instances without asking you anything, the `frankenphp` runtime does not, and your users get logged out without an error message.

## FrankenPHP in a few words

**[FrankenPHP](https://frankenphp.dev/) is a PHP application server written in Go.** It embeds PHP's official interpreter inside [Caddy](https://caddyserver.com/) and removes the separate process that PHP-FPM used to be: one binary is both the web server and the code execution.

Two modes coexist. **Classic** mode runs your script on every request then cleans everything up, the functional equivalent of PHP-FPM. **Worker** mode boots your application once, keeps it in memory, and hands it requests inside a loop: the model of [Laravel Octane](https://laravel.com/framework/docs/octane) and [RoadRunner](https://roadrunner.dev/), the one Node and Go have always followed.

It is the work of [Kévin Dunglas](https://dunglas.dev/), a Symfony Core Team member, which explains the integration we are about to see. Versions move, and the documentation lags behind them: it announces PHP 8.4.12, my deployment serves `FrankenPHP v1.9.1 PHP 8.4.13 Caddy v2.10.2`.

## Creating the second application

**There is no `clever env set CC_RUNTIME frankenphp`.** The runtime is picked at creation time and never changes: moving from `php` to `frankenphp` means creating a second application, with its own configuration, its own domain and its own bill. The old one keeps running, which is convenient when you want to compare.

```bash
clever create --type frankenphp symfony-clever-franken --region par --alias franken
```

The `--alias` is not decorative: `clever create` adds a second entry to the `.clever.json`, and every command that follows must say which application it is talking about. Without `-a`, the CLI does not ask, it refuses:

```
[ERROR] Several applications are linked. You can specify one with the "--alias" option.
```

`clever make-default franken` saves the repetition, but I keep `-a` everywhere: naming the application you talk to beats an invisible default. One last detail, this runtime's default instance type is `XS`.

## The deployment, variable by variable

This is the most tedious part, and the one where nasty surprises hide: nothing tells you a variable has no effect. It is accepted, it shows up in `clever env`, it does nothing.

### What carries over untouched

```bash
clever env set -a franken CC_WEBROOT "/public"
clever env set -a franken CC_PHP_VERSION "8.4"
clever env set -a franken CC_COMPOSER_VERSION "2"
clever env set -a franken CC_HEALTH_CHECK_PATH "/cc-health"
clever env set -a franken CC_POST_BUILD_HOOK "./clevercloud/post-build-frankenphp.sh"
clever env set -a franken APP_ENV "prod"
clever env set -a franken APP_SECRET "$(openssl rand -hex 32)"
```

**`CC_WEBROOT`** keeps its role and its trap, with an even less forgiving default: `/`, the root of the repository. Forgetting it exposes your `composer.json` and your `.env`.

**The five deployment hooks** are the same variables, at the same moments, and their `php bin/console` actually calls `frankenphp php-cli` underneath. Since they are environment variables, they belong to the application and not to the repository: that is how two applications born from the same branch run different hooks, `clevercloud/post-build.sh` on one side, `clevercloud/post-build-frankenphp.sh` on the other.

**The healthcheck** passes on the first deployment, without one extra line of configuration:

```
Response from GET {:url=>"/cc-health", :expected_response=>200...300} is 200
```

**The trusted proxies** do not move: `CC_REVERSE_PROXY_IPS` is injected the same way, the Load Balancers terminate <abbr title="Transport Layer Security">TLS</abbr> the same way, and the `TRUSTED_PROXIES` line stays valid.

### What moves somewhere else

**The `public/.htaccess` file** becomes inert, Caddy does not read it, and that is not a loss: the `php_server` directive tries `{path}`, then `{path}/index.php`, then `index.php`, and the front controller is reached without a single rewrite rule.

**The `public/.user.ini` file** does not follow, and it is the quietest trap in the list. That mechanism belongs to [PHP's CGI and FastCGI interfaces](https://www.php.net/manual/en/configuration.file.per-user.php); FrankenPHP is not one of them and will never read that file. The equivalent is a `php.ini` at the root, which FrankenPHP loads automatically. Both files coexist without stepping on each other: the `php` runtime only reads the `.user.ini` in the webroot, a `php.ini` dropped at the root is not on its search path, and one request is enough to check it: `ini_get()` ignores its directives and applies the `.user.ini` ones. A hook exporting `PHP_INI_SCAN_DIR`, the documented way to let the PHP-CLI see the `.user.ini`, is the exception: the directory it names is scanned whole, `php.ini` included, but for that command-line process only, not for Apache.

```ini
; php.ini, at the repository root. public/.user.ini stays in place for Apache.
date.timezone = "Europe/Paris"
```

It is also through that file that `memory_limit` and the `opcache.*` directives go, the `MEMORY_LIMIT` variable and the `CC_OPCACHE_*` ones being [documented](https://www.clever.cloud/developers/doc/reference/reference-environment-variables/) only for the `php` runtime.

Fine-tuning PHP-FPM, for its part, disappears along with PHP-FPM: **`CC_CONFIGURATION_PM_MAX_CHILDREN`** has no object any more, replaced by PHP threads whose default count is twice the number of <abbr title="Central Processing Unit">CPU</abbr>s and which is set in the Caddyfile. A thread holding a Symfony application in memory consumes, and multiplying threads multiplies that consumption.

### The trap: Composer's auto-scripts do not run

Composer's options do not change name: both runtimes document the same base flags, `--no-interaction --no-progress --no-scripts`, and the same `CC_PHP_COMPOSER_FLAGS` to replace them. What changes is the behaviour, and it can be read in the build logs.

On the `php` runtime, Flex's `auto-scripts` do run:

```
Executing script cache:clear [OK]
Executing script assets:install public [OK]
Executing script importmap:install [OK]
```

On the `frankenphp` runtime, none of those lines, which is in fact the documented behaviour: the surprise is rather that the `php` runtime runs them despite its own `--no-scripts`. Yet our `composer.json` declares `importmap:install` in its `auto-scripts`, and that command is the one downloading the [importmap](https://symfony.com/doc/current/frontend/asset_mapper.html)'s JavaScript packages into `assets/vendor/`, a gitignored folder. Without it, the post-build hook stops dead on the asset compilation:

```
The "@hotwired/stimulus" vendor asset is missing. Try running the "importmap:install" command.
[ERROR] POST_BUILD_HOOK failed, aborting
[ERROR] Deploy failed
```

The trap is loud, good news: the deployment is red, not silently broken. The fix is one line, to be added to the hook before `asset-map:compile`:

```bash
php bin/console importmap:install
```

Should the two other auto-scripts be carried over while we are at it? Here, no: `cache:clear` duplicates the `cache:warmup` the hook already runs, and `assets:install public` answers `No assets were provided by any bundle` as long as no bundle ships public files. The rule itself does not depend on this project: read your `auto-scripts` again, and carry into the hook the ones that produce a build artefact.

The other path is to hand the scripts back to Composer, with `CC_PHP_COMPOSER_FLAGS="--no-interaction --no-progress"`. I prefer the explicit line in the hook: it says what it does, and it does not depend on a `composer.json` nobody reads any more.

### Wiring the database, and deploying

Every application gets its own database. Without a linked add-on, `POSTGRESQL_ADDON_URI` is not injected, Doctrine falls back on the `DATABASE_URL` from `.env` and the post-build fails.

```bash
clever addon create postgresql-addon symfony-clever-franken-db \
  --plan dev --region par --link franken
```

An add-on keeps the PostgreSQL version it received at creation time: read `POSTGRESQL_ADDON_VERSION` in the output of `clever addon env symfony-clever-franken-db` rather than copying a number.

That leaves the deployment.

```bash
git add .clever.json php.ini clevercloud/post-build-frankenphp.sh
git commit -m "Deploy the same application on the FrankenPHP runtime"
clever deploy -a franken
clever open -a franken
```

## Worker mode, and its traps

What we have deployed so far runs in classic mode: a different web server, an identical execution model. [Worker mode](https://frankenphp.dev/docs/worker/) is another matter, and one variable is enough to turn it on:

```bash
clever env set -a franken CC_FRANKENPHP_WORKER "/public/index.php"
```

The path is written from the project root, and the script must sit inside the webroot. A worker tucked anywhere else does start: it simply never receives a request, which takes longer to diagnose than a failure to boot.

On the Symfony side, there is nothing to install. [`symfony/runtime`](https://symfony.com/doc/current/components/runtime.html), laid down by the skeleton, spots the `FRANKENPHP_WORKER` that FrankenPHP puts into the script's `$_SERVER` and switches to a `FrankenPhpWorkerRunner` looping on `frankenphp_handle_request()`. That detection is native since Symfony 7.4.

**Worker mode is not a performance setting, it is a change of contract.** PHP has always offered a guarantee nobody bothered to state because it went without saying: at the end of each request, everything disappears, the variables, the objects, the connections, the leaks. Worker mode removes it.

### What Symfony resets, and what it does not

The framework does more than people think, and less than they hope.

**By default, between two requests, Symfony calls `reset()` on every service implementing [`ResetInterface`](https://symfony.com/doc/current/reference/dic_tags.html#kernel-reset).** There is no variable to set: the kernel keeps a `services_resetter` and triggers it at the start of the next request. The framework's own services are covered, it is yours that need reviewing and implementing that interface.

**`FRANKENPHP_RESET_KERNEL`, introduced in Symfony 8.1, goes further: it throws away the kernel and its container after each request.** The next one rebuilds a fresh one, so nothing that lived inside a service survives, whether it implements `ResetInterface` or not. If it is not on by default, it is because it makes you pay the kernel boot again on every request, which is a good part of what worker mode came for.

**Neither one touches what does not belong to the container.** A `static` variable inside a function, a static class property, a global of the worker script, `$_ENV` which is the only superglobal FrankenPHP does not reset: those states are attached to the class or to the process, not to an object, and no kernel cloning brings them back to zero.

One guard rail is left, **`FRANKENPHP_LOOP_MAX`**, which sets the number of requests after which the worker stops and gets restarted: 500 by default, zero meaning never.

### What stays on you

A `static $cache = [];` that never needed a bound becomes a leak. A service remembering the current user or the locale, without implementing `ResetInterface`, now lies to the next request in a plausible way, which is worse than a clean error.

To avoid hunting them by hand, [Igor PHP](https://github.com/igor-php/igor-php) is a static analyser designed for exactly this: services missing `ResetInterface`, properties holding state, mutable local statics, calls to `exit()`, writes to superglobals. It also inspects `vendor/`, and that is where its real value lies.

```bash
composer require --dev igor-php/igor-php
vendor/bin/igor-php .
```

`exit()` and `die()`, precisely: under PHP-FPM, `die('error')` ends the request; in a worker, it ends the worker, which is a thread and not a process. FrankenPHP restarts it at the price of a full boot, and every call to that route pays that restart.

Connections, finally. A connection opened when the worker boots now lives for hours, and it goes through the proxy Clever puts in front of PostgreSQL databases, the very one direct access bypasses. A connection left idle can be closed on the other side without your application noticing, and no timeout is documented. The protection sits in [DoctrineBundle](https://symfony.com/bundles/DoctrineBundle/current/configuration.html), which closes at the start of every request any connection left idle for longer than `idle_connection_ttl`, 600 seconds by default: lower that value if you see connections dropped after quiet hours.

None of these traps shows up on the first request. It is the instance's memory, watched over several hours of real traffic, that reveals them.

## Sessions, the trap that costs the most

By default, Symfony defers to PHP's native handler, which writes sessions wherever `session.save_path` points. On the `php` runtime, the platform mounts an [FS Bucket](https://www.clever.cloud/developers/doc/addons/fs-bucket/) there, a network filesystem shared between instances, and the problem never comes up. On the `frankenphp` runtime, that bucket does not exist: each instance has its own local folder, and the load balancer does the rest.

Here is what that looks like on two instances, with a probe counting the session's requests and exposing `INSTANCE_NUMBER`:

```
hits=5  instance=0  sid=ba6283f4
hits=1  instance=1  sid=a8ad59bc   <- new session
hits=1  instance=0  sid=0b2303bc   <- and another one
```

Every instance switch creates a brand new session: user logged out, cart empty, multi-step form back to zero, and not one line of log to say so.

On the `php` runtime, `ENABLE_REDIS=true` and `SESSION_TYPE=redis` are enough to [hand sessions over to the platform](https://www.clever.cloud/developers/doc/applications/php/sessions-emails/). On the `frankenphp` runtime, those two variables are indeed injected, they show up in `clever env`, and they do nothing: the probe reads an empty `session.save_path`, so nothing was wired by the platform, and sessions stay local to each instance. It is the textbook case of the variable with no effect announced above.

So it has to be said in the code. First a [Redis add-on](https://www.clever.cloud/developers/doc/addons/redis/), linked to the application:

```bash
clever addon create redis-addon symfony-clever-franken-redis \
  --plan s_mono --region par --link franken
```

Then one line in `config/packages/framework.yaml`:

```yaml
when@prod:
    framework:
        session:
            handler_id: '%env(REDIS_URL)%'
```

That is all. The add-on injects `REDIS_URL` as is, [`SessionHandlerFactory`](https://symfony.com/doc/current/session.html#store-sessions-in-a-key-value-database-redis) recognises that URL and builds the handler, and the connection is built by Symfony Cache: you write no service, and you never instantiate `\Redis` yourself. The `when@prod:` keeps your development machine from looking for a Redis server the skeleton's `compose.yaml` does not contain.

Verified afterwards on both instances: same session identifier, counter going up, across instance 0 and instance 1.

```
hits= 5  instance=1  sid=ac48c874
hits= 6  instance=1  sid=ac48c874
hits= 7  instance=0  sid=ac48c874
hits= 8  instance=0  sid=ac48c874
hits= 9  instance=0  sid=ac48c874
hits=10  instance=1  sid=ac48c874
hits=11  instance=0  sid=ac48c874
```

That configuration lives in the code both applications share, so the Apache one needs its own Redis add-on. It is progress for it too: its sessions no longer depend on a store mounted by the platform.

Clever offers an in-house alternative, [Materia KV](https://www.clever.cloud/developers/doc/addons/materia-kv/), a key-value store compatible with the Redis protocol and free during the beta. I have not wired it here, and I am not going to sell you a path I have not walked. What the documentation says: on this runtime you need, for now, `tcp` mode and port `6378`, so no TLS, and the add-on injects `KV_HOST`, `KV_PORT` and `KV_TOKEN` with their `REDIS_*` aliases, but no ready-made `REDIS_URL` like the Redis add-on's. Neither official demo covers this case: [`php-sessions-kv-example`](https://github.com/CleverCloud/php-sessions-kv-example) is plain PHP relying on `ENABLE_REDIS` and `SESSION_TYPE`, the two variables with no effect here, and [`frankenphp-kv-json-example`](https://github.com/CleverCloud/frankenphp-kv-json-example) stores JSON with Predis, not sessions.

## The Caddyfile, and what it hands back to you

By default, the platform starts your application with `frankenphp php-server`: that command is the one reading `CC_WEBROOT`, listening on the port from `CC_FRANKENPHP_PORT` (8080) and installing the worker from `CC_FRANKENPHP_WORKER`. Dropping a [`Caddyfile`](https://frankenphp.dev/docs/config/) at the root is not enough, nothing loads it: you have to go through `CC_RUN_COMMAND`, which **completely replaces** the platform's command. The listening port, the served root, the `worker` directive, everything then falls back to your file, and an application listening anywhere other than 8080 fails the healthcheck.

```caddyfile
:8080 {
	encode zstd br gzip
	root public/
	php_server {
		worker ./public/index.php
	}
}
```

It is rarely worth it, and I did not do it here. Two cases come back: fine-tuning the number of PHP threads, which only the `frankenphp` global option exposes, and the pre-compressed assets AssetMapper produces in Brotli and Zstandard.

## Extensions, a subset

The `php` runtime enabled its extensions through variables, following the `ENABLE_<EXTENSION>` and `DISABLE_<EXTENSION>` pattern. Here, that mechanism is not documented: [the extensions page](https://www.clever.cloud/developers/doc/applications/frankenphp/#included-extensions) lists what is included, and stops there.

The set covers an ordinary Symfony application: `intl`, `mbstring`, `pdo_pgsql`, `opcache`, `redis`, `apcu`, `sodium`, `zip`, `curl`, `gd` and `imagick` are there. Missing are `mongodb`, `xdebug`, `blackfire`, `newrelic`, `grpc` and `event`: if your application or your tooling depends on them, the question is settled.

A calendar point, next. In the first image released after 1 October 2026, PHP 8.5 becomes the default, and two extensions present in 8.4 go with it, `memcache` and `pdo_sqlsrv`. Clever recommends setting `CC_PHP_VERSION` to `8.4` before that image if you want to stay there.

## What actually changes

A table, but not the one you expect: no milliseconds, properties instead, the ones that decide the choice far more often.

| Property | `php` runtime (Apache and PHP-FPM) | `frankenphp` runtime |
|---|---|---|
| Execution model | One process per request, destroyed afterwards | PHP threads, application in memory in worker mode |
| Cost of booting Symfony | Paid on every request | Paid once per worker |
| State leaking between requests | Impossible by construction | Possible, and on you |
| URL rewriting | `.htaccess` and `symfony/apache-pack` | `php_server`, nothing to write |
| PHP directives | `.user.ini` in the webroot | `php.ini` at the root, `.user.ini` ignored |
| Default sessions | FS Bucket mounted by the platform | Nothing, shared store to configure |
| Composer auto-scripts | Run at build time | Not run |
| Extensions | Wide catalogue, `ENABLE_*` and `DISABLE_*` | Fixed set, more restricted |
| Concurrency tuning | `CC_CONFIGURATION_PM_MAX_CHILDREN` | FrankenPHP threads, through the Caddyfile |
| Server configuration | Apache directives | Caddyfile, if you take over the start command |

Two rows are not symmetrical, and they are the two that matter: "impossible by construction" is the real argument for the FPM model, "default sessions: nothing" the real cost of the switch.

As for performance, the gain is real, but its size depends on what your application does between booting and answering: a page dominated by one slow SQL query gains nothing. I have no figure for yours, and a fabricated figure would be worth less than no figure.

## What we would like to see next

The `frankenphp` runtime is young and moving fast, its image updates follow upstream releases closely. Nothing below is a complaint, it is the list of what would make the switch smoother.

**Changing runtime without changing application.** Today, `php` and `frankenphp` are two application types: two domains, two configurations, two invoices for the same code. One day, perhaps, a runtime you can change on an existing application.

**A signal on variables with no effect.** `ENABLE_REDIS` and `SESSION_TYPE` are accepted silently, as are the PHP-FPM settings that no longer have an object. One warning line at deployment, "this variable is not used by this runtime", would replace an evening of diagnosis.

**A word about sessions.** The `php` runtime mounts an FS Bucket without being asked, `frankenphp` mounts nothing, and production is what teaches the reader. A default store would be ideal; a sentence in the documentation would already help a lot.

**Thread count without taking over the start command.** A dedicated variable would spare you writing a whole `Caddyfile`, and owning the port, the served root and the worker, just to change one number.

**Two or three extensions.** [Blackfire](https://www.blackfire.io/) and [Xdebug](https://xdebug.org/) first: profiling an application that stays in memory matters more than elsewhere, and that is precisely where they are missing.

**And documentation aligned with behaviour.** Both runtimes announce the same `--no-scripts`, only one applies it.

## When to stay on Apache

There are good reasons not to migrate, and none of them is laziness.

**You depend on `.htaccess` or on Apache modules.** Three rewrite rules translate into a Caddyfile painlessly. An `.htaccess` accumulating ten years of redirects and finely tuned `mod_expires` is a project in its own right, and some modules have no equivalent.

**A PHP extension is missing.** Full stop. If your application talks to MongoDB, or your team profiles with Blackfire or Xdebug, the list settles it for you.

**You were counting on platform-managed sessions.** `ENABLE_REDIS=true` and `SESSION_TYPE=redis` are enough on the `php` runtime. On the `frankenphp` runtime, those variables are injected and have no effect, and the store becomes your responsibility.

**Your application is old, or full of statics.** Worker mode requires an application you can claim keeps nothing between two requests, and on a codebase nobody has the map of, that claim is expensive. You can deploy in classic mode, but you then give up the only argument that justified the migration.

**Your traffic does not justify it.** The least glorious and most frequent reason. Worker mode's gain is on booting PHP: a site made of static pages and assets does not pay it, and an internal application serving three hundred requests a day will gain nothing noticeable. You will only have added a session store to operate and a class of bugs to watch.

Conversely, the cases where the switch is justified all look alike: a brand new application written with worker mode in mind, a high-traffic API whose response time is dominated by framework boot, a well-factored service whose test suite exists. The question is not "which one is better", but "what does my application already know how to do".

## What comes next

Two applications now run from the same repository, one on Apache and PHP-FPM, the other on FrankenPHP. They share their code and differ by a handful of variables, a PHP directives file, a post-build hook of their own, and a session configuration the application should have carried from day one.

In the next article, we stop deploying by hand: GitHub Actions, deployment triggered by a commit, and the precautions so that a pipeline never puts into production what it has not tested.

> **Source code.** The [`03-frankenphp`](https://github.com/welcoMattic/symfony-clever-cloud-series/tree/03-frankenphp) branch of the [welcoMattic/symfony-clever-cloud-series](https://github.com/welcoMattic/symfony-clever-cloud-series) repository contains what this article adds: the root `php.ini`, which is added next to `public/.user.ini` rather than replacing it, the `clevercloud/post-build-frankenphp.sh` hook and its `importmap:install`, the Redis session configuration in `config/packages/framework.yaml`, the second entry in `.clever.json`, whose identifiers are placeholders to replace with your own, and an example `Caddyfile` left inactive.
