---
title: "Symfony on Clever Cloud #4: automating the deployment with GitHub Actions"
date: 2026-09-22T09:00:00.000Z
description: "Fourth article in a series about deploying a scalable Symfony application on the Clever Cloud PaaS"
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
  order: 4
  label: "Automating the deployment"
---

_Cet article est aussi disponible en 🇫🇷 Français : [Symfony sur Clever Cloud #4 : automatiser le déploiement avec GitHub Actions](/blog/2026-09-22-symfony-clever-cloud-4-automatiser-le-deploiement/)._

> **Transparency.** I am a Clever Cloud ambassador. I write this series independently, nobody on their side proofreads this series, and I allow myself the same criticism here as on any other platform.

In [the previous article](/blog/2026-09-14-symfony-clever-cloud-3-frankenphp-or-apache/), we put the runtimes on the table: FrankenPHP on one side, Apache and PHP-FPM on the other. The deployment itself stayed manual: a `clever deploy` typed by hand, on a branch nobody checks. The pipeline below automates the Apache application; for the FrankenPHP variant, you only change the alias.

By the end of this article, the same application deploys on its own from its reference branch, once its tests have passed, with [GitHub Actions](https://docs.github.com/en/actions). The commands typed by hand so far are about to leave your terminal and go live in a YAML file.

The versions quoted here were checked against their source, and they move fast. A <abbr title="Continuous Integration / Continuous Deployment">CI/CD</abbr> pipeline gets reread once a year, when the tokens expire, and that is the right moment to check that nothing has moved.

## Why automate a deployment that already works

The question comes before the first line of YAML: `clever deploy` works, so why bother. On a personal project, on a single branch, the honest answer is that there is not much to gain. **CI/CD only becomes interesting once deployment stops being an individual gesture.** Three things change then.

- **Tests run before the deployment**, not after. A manual `clever deploy` deploys whatever you have at hand, including the test suite you have not re-run in three commits.
- **The deployment starts from a single branch.** Nobody ships to production from their working branch any more, neither by mistake nor because it was urgent.
- **Rolling back is one command**, not a reconstruction: [`clever restart --commit <commit-id>`](https://www.clever.cloud/developers/doc/cli/applications/deployment-lifecycle/) restarts the application on an already deployed commit.

Clever Cloud imposes no CI/CD tool. Three paths lead to the same place: pushing by hand, wiring up the [native GitHub integration](https://www.clever.cloud/developers/doc/ci-cd/github/) from the console, where the platform sets a webhook and deploys on every push, or writing your own pipeline. Keep the second one in mind: it will cause us a problem a few paragraphs from now.

## What a Clever pipeline needs

Whatever tool runs it, a pipeline that deploys to Clever needs the same three things.

**`CLEVER_TOKEN` and `CLEVER_SECRET`** are the credential pair the <abbr title="Command Line Interface">CLI</abbr> authenticates with, without a browser. `clever login` already wrote them to your disk, in `~/.config/clever-cloud/clever-tools.json` on Linux and macOS, in `%APPDATA%\clever-cloud\clever-tools.json` on Windows.

Those two values expire after one year, behind an authentication error message that mentions no date at all. Set yourself a reminder the day you create the tokens. And do not use your own: **create a Clever user dedicated to the CI**, invite it into the organisation hosting the application, and use its tokens. The day a secret leaks, or the day somebody leaves the team, you revoke that user without cutting anyone else's access or invalidating your own session.

**The application identifier** next, and you already have it. The `.clever.json` in version control since [article 2](/blog/2026-09-08-symfony-clever-cloud-2-first-deployment/) carries the `app_id` of both applications of the series and the organisation's `org_id`. Keep that file in mind, the sections that follow depend on it: with two entries and no `default` key, every command that deploys has to name its alias, or the CLI stops on `Several applications are linked`.

**Finally, a property of the CLI that simplifies a lot of things.** When `CLEVER_TOKEN` and `CLEVER_SECRET` are present in the environment, [Clever Tools](https://github.com/CleverCloud/clever-tools) activates a virtual profile on its own, with no login step: a job that sets those two variables can deploy without ever calling `clever login`. An explicit `clever login --token "$CLEVER_TOKEN" --secret "$CLEVER_SECRET"` works just as well, and stays more readable six months later.

## GitHub Actions: test, then deploy

The first pipeline is the simplest: one job that tests, one job that deploys if the first one succeeded, and nothing else. In `.github/workflows/deploy.yml`:

```yaml
name: Deploy to Clever Cloud

on:
  push:
    branches: [main]

jobs:
  test:
    name: Unit tests
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v7
      - uses: shivammathur/setup-php@v2
        with:
          php-version: '8.4'
          extensions: intl, pdo_pgsql
      - run: composer install --no-interaction --prefer-dist
      - run: vendor/bin/phpunit

  deploy:
    name: Deployment
    needs: test
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v7
        with:
          fetch-depth: 0
      - uses: 47ng/actions-clever-cloud@v2.2.0
        with:
          alias: symfony-clever-demo
        env:
          CLEVER_TOKEN: ${{ secrets.CLEVER_TOKEN }}
          CLEVER_SECRET: ${{ secrets.CLEVER_SECRET }}
```

The test job reuses the PHP version set in `CC_PHP_VERSION`: testing on a version other than the one that will run the code in production proves very little.

**`fetch-depth: 0` is not a precaution, it is a requirement.** `clever deploy` pushes the current branch to a Git remote run by the platform, with everything a `git push` implies. And [`actions/checkout`](https://github.com/actions/checkout) clones with a depth of 1 by default. A shallow clone cannot be pushed, and it is the remote that refuses. The action's README mentions it as a comment on its usage example, in a spot that is easy to skip.

**`alias`** is the one from `.clever.json`. It is what the action passes to `clever deploy`, which shields this workflow from the file's two entries. If you do not version it, the `appID` input takes the application identifier and wins over the alias.

A word on the action: [`47ng/actions-clever-cloud`](https://github.com/47ng/actions-clever-cloud) is **community-maintained, not official**. It is the most visible one in the ecosystem and its latest tag is `v2.2.0`. It is a Docker action, shipping a pinned version of Clever Tools, so it only runs on Linux runners; elsewhere, you go through the CLI by hand.

One input worth knowing: `sameCommitPolicy`, which mirrors the CLI's `--same-commit-policy`. Its default value, `error`, fails the redeployment of an already deployed commit, the case of a pipeline re-run by hand after a network failure.

### The trigger and the permissions

`push` on `main` is this workflow's only trigger, and that is deliberate. Production deploys from the reference branch, once the pull request has been merged, never from the proposed branch.

Permissions follow: this workflow reads the repository and pushes to Clever, not to GitHub. The [read-only `GITHUB_TOKEN` default](https://docs.github.com/en/actions/tutorials/authenticate-with-github_token), the recommended setting, is enough for it, and there is no `permissions` block to write.

### The trap of the application created from GitHub

Here is the anti-pattern announced earlier. An application created from the console by wiring it to a GitHub repository already deploys on its own, through a webhook. Adding this action on top does not work: the job stops on `[ERROR] HTTP Error: 401 Authorization Required`, which does not come from your tokens.

The fix is on the platform side: the application has to have been created "from a local repository", which is what article 2's `clever create` does. On an application already wired up, the action's README gives the route: recreate it that way, then remove the webhook Clever set on the GitHub repository, otherwise it keeps triggering deployments.

## And on GitLab CI?

The same deployment transposes to [GitLab CI](https://www.clever.cloud/developers/doc/ci-cd/gitlab/), but by hand: a job you write yourself, calling the `clever` CLI. Clever publishes an [official Docker image](https://hub.docker.com/r/clevercloud/clever-tools), `clevercloud/clever-tools`, which spares you installing it on every run. The job needs a full clone, for the exact reason behind the `fetch-depth: 0` above, then a `clever login` with the same two secrets and a `clever deploy` on the alias. There is an [official component in the GitLab catalog](https://gitlab.com/explore/catalog/CleverCloud/clever-cloud-pipeline), but its hard-coded `clever link` fails on a repository whose `.clever.json` is versioned, like ours.

## What comes next

The manual deployment has become a pipeline: the same commands, the same environment variables, the same post-build hook, moved into a file the whole team can reread and adjust, and that nobody runs from memory.

> **Source code.** The [`04-ci-cd`](https://github.com/welcoMattic/symfony-clever-cloud-series/tree/04-ci-cd) branch of the [welcoMattic/symfony-clever-cloud-series](https://github.com/welcoMattic/symfony-clever-cloud-series) repository holds everything this article adds to the application: the deployment workflow `.github/workflows/deploy.yml` and the suite's first test. Two departures from the YAML above, forced by the repository: every article lives on its own branch there, so the trigger names `04-ci-cd` rather than `main`, and since the versioned `.clever.json` only carries placeholder identifiers, the workflow takes the `appID` from a secret instead of the alias.
