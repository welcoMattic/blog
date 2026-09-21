---
title: "Symfony sur Clever Cloud #4 : automatiser le déploiement avec GitHub Actions"
date: 2026-09-22T09:00:00.000Z
description: "4e article d'une série sur le déploiement d'une application Symfony évolutive sur le PaaS Clever Cloud"
tags:
  - symfony
  - clever-cloud
  - paas
  - php
  - devops
  - serie-symfony-clever
lang: fr
series:
  name: "Symfony sur Clever Cloud"
  order: 4
  label: "Automatiser le déploiement"
---

_This blog post is also available in 🇬🇧 English: [Symfony on Clever Cloud #4: automating the deployment with GitHub Actions](/blog/2026-09-22-symfony-clever-cloud-4-automating-the-deployment/)._

> **Transparence.** Je suis ambassadeur Clever Cloud. J'écris cette série en toute indépendance, personne chez eux ne relit cette série, et je m'y autorise les mêmes critiques que sur n'importe quelle autre plateforme.

Dans [l'article précédent](/blog/2026-09-14-symfony-clever-cloud-3-frankenphp-ou-apache/), nous avons mis les runtimes sur la table : FrankenPHP d'un côté, Apache + PHP-FPM de l'autre. Le déploiement, lui, est resté manuel : un `clever deploy` tapé à la main, sur une branche que personne ne vérifie. Le pipeline qui suit automatise l'application Apache ; pour la variante FrankenPHP, il suffit de changer l'alias.

À la fin de cet article, la même application se déploie seule depuis sa branche de référence, une fois ses tests passés, avec [GitHub Actions](https://docs.github.com/en/actions). Les commandes tapées à la main jusqu'ici vont quitter votre terminal pour aller vivre dans un fichier YAML.

Les versions citées ont été relues à leur source, et elles bougent vite. Un pipeline de <abbr title="Continuous Integration / Continuous Deployment">CI/CD</abbr> se relit régulièrement, surtout quand les tokens expirent, et c'est le bon moment pour vérifier que rien n'a bougé ou comment l'optimiser.

## Pourquoi automatiser un déploiement qui marche

`clever deploy` fonctionne, alors pourquoi s'embêter. Sur un projet personnel à une seule branche, la réponse honnête est qu'il n'y a pas grand-chose à gagner. **La CI/CD ne devient intéressante qu'au moment où le déploiement cesse d'être un geste individuel.** Trois choses changent alors.

- **Les tests tournent avant le déploiement**, et pas après. Un `clever deploy` manuel déploie ce que vous avez sous la main, y compris la suite de tests que vous n'avez peut-être pas relancée depuis trois commits.
- **Le déploiement part d'une seule branche.** Plus personne ne met en production depuis sa branche de travail, ni par erreur, ni parce que c'était urgent.
- **Le retour arrière est une commande**, pas une reconstitution : [`clever restart --commit <commit-id>`](https://www.clever.cloud/developers/doc/cli/applications/deployment-lifecycle/) redémarre l'application sur un commit déjà déployé.

Clever Cloud n'impose aucun outil de CI/CD. Trois chemins mènent au même endroit : pousser à la main, brancher l'[intégration GitHub native](https://www.clever.cloud/developers/doc/ci-cd/github/) depuis la console, où la plateforme pose un webhook et déploie à chaque push, ou écrire votre propre pipeline. Retenez le deuxième : il va nous poser un problème dans quelques paragraphes.

## Ce dont un pipeline Clever a besoin

Quel que soit l'outil qui l'exécute, un pipeline qui déploie sur Clever a besoin des mêmes trois choses.

**`CLEVER_TOKEN` et `CLEVER_SECRET`** forment le couple d'identifiants avec lequel la <abbr title="Command Line Interface">CLI</abbr> s'authentifie sans navigateur. `clever login` les a déjà écrits sur votre disque, dans `~/.config/clever-cloud/clever-tools.json` sur Linux et macOS, dans `%APPDATA%\clever-cloud\clever-tools.json` sur Windows.

Ces deux valeurs expirent au bout d'un an. Posez-vous un rappel le jour où vous créez les tokens. Et ne prenez pas les vôtres : **créez un utilisateur Clever dédié à la CI**, invitez-le dans l'organisation qui héberge l'application, et utilisez ses tokens. Le jour où un secret fuite, ou celui où quelqu'un quitte l'équipe, vous révoquez cet utilisateur sans couper l'accès de personne d'autre ni invalider votre propre session.

**L'identifiant de l'application** ensuite, et vous l'avez déjà. Le `.clever.json` versionné depuis [l'article 2](/blog/2026-09-08-symfony-clever-cloud-2-premier-deploiement/) porte l'`app_id` des deux applications de la série et l'`org_id` de l'organisation. Retenez ce fichier, les sections qui suivent en dépendent : avec deux entrées et aucune clé `default`, toute commande qui déploie doit nommer son alias, sinon la CLI s'arrête sur `Several applications are linked`.

**Enfin, une propriété de la CLI qui simplifie beaucoup de choses.** Quand `CLEVER_TOKEN` et `CLEVER_SECRET` sont présents dans l'environnement, [Clever Tools](https://github.com/CleverCloud/clever-tools) active d'elle-même un profil virtuel, sans étape de connexion : un job qui pose ces deux variables peut déployer sans jamais appeler `clever login`. Un `clever login --token "$CLEVER_TOKEN" --secret "$CLEVER_SECRET"` explicite fonctionne aussi bien, et reste plus lisible six mois plus tard.

## GitHub Actions : tester, puis déployer

Le premier pipeline est le plus simple : un job qui teste, un job qui déploie si le premier a réussi, et rien d'autre. Dans `.github/workflows/deploy.yml` :

```yaml
name: Deploy to Clever Cloud

on:
  push:
    branches: [main]

jobs:
  test:
    name: Tests unitaires
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
    name: Déploiement
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

Le job de tests reprend la version de PHP posée dans `CC_PHP_VERSION` : tester sur une autre version que celle qui exécutera le code en production ne prouve pas grand-chose.

**`fetch-depth: 0` n'est pas une précaution, c'est une obligation.** `clever deploy` pousse la branche courante sur un dépôt Git géré par la plateforme, avec tout ce qu'un `git push` implique. Or [`actions/checkout`](https://github.com/actions/checkout) clone par défaut avec une profondeur de 1. Un dépôt superficiel (*shallow clone*) ne se pousse pas, et c'est le distant qui refuse. Le README de l'action le mentionne en commentaire de son exemple d'usage, à un endroit facile à sauter.

**`alias`** est celui du `.clever.json`. C'est lui que l'action passe à `clever deploy`, ce qui met ce workflow à l'abri des deux entrées du fichier. Si vous ne le versionnez pas, l'entrée `appID` accepte l'identifiant de l'application et prend le pas sur l'alias.

Un mot sur l'action : [`47ng/actions-clever-cloud`](https://github.com/47ng/actions-clever-cloud) est **communautaire, pas officielle**. C'est la plus visible de l'écosystème et son dernier tag est `v2.2.0`. C'est une action Docker, qui embarque une version figée de Clever Tools et ne tourne donc que sur des runners Linux ; ailleurs, il faut passer par la CLI à la main.

Une entrée à connaître : `sameCommitPolicy`, qui reprend le `--same-commit-policy` de la CLI. Sa valeur par défaut, `error`, fait échouer le redéploiement d'un commit déjà déployé, cas d'un pipeline relancé à la main après un échec réseau.

### Le déclencheur et les permissions

`push` sur `main` est le seul déclencheur de ce workflow, et c'est délibéré. La production se déploie depuis la branche de référence, une fois la pull request fusionnée, jamais depuis la branche proposée.

Les permissions suivent : ce workflow lit le dépôt et pousse vers Clever, pas vers GitHub. Le [`GITHUB_TOKEN` en lecture seule par défaut](https://docs.github.com/en/actions/tutorials/authenticate-with-github_token), la valeur recommandée, lui suffit, et il n'y a aucun bloc `permissions` à écrire.

### Le piège de l'application créée depuis GitHub

Voilà l'anti-pattern annoncé plus haut. Une application créée depuis la console en la branchant sur un dépôt GitHub déploie déjà d'elle-même, par un webhook. Lui ajouter cette action ne marche pas : le job s'arrête sur `[ERROR] HTTP Error: 401 Authorization Required`, qui ne vient pas de vos tokens.

La correction est côté plateforme : l'application doit avoir été créée "from a local repository", ce que fait le `clever create` de l'article 2. Sur une application déjà branchée, le README de l'action donne le chemin : la recréer ainsi, puis retirer du dépôt GitHub le webhook posé par Clever, faute de quoi il continue de déclencher des déploiements.

## Et sur GitLab CI ?

Le même déploiement se transpose sur [GitLab CI](https://www.clever.cloud/developers/doc/ci-cd/gitlab/), mais à la main : un job que vous écrivez vous-même et qui appelle la CLI `clever`. Clever publie une [image Docker officielle](https://hub.docker.com/r/clevercloud/clever-tools), `clevercloud/clever-tools`, qui vous évite de l'installer à chaque exécution. Le job a besoin d'un clone complet, pour la raison exacte du `fetch-depth: 0` ci-dessus, puis d'un `clever login` avec les deux mêmes secrets et d'un `clever deploy` sur l'alias. Il existe bien un [composant officiel dans le catalogue GitLab](https://gitlab.com/explore/catalog/CleverCloud/clever-cloud-pipeline), mais son `clever link` en dur échoue sur un dépôt dont le `.clever.json` est versionné, comme le nôtre.

## Et ensuite

Le déploiement manuel est devenu un pipeline : les mêmes commandes, les mêmes variables d'environnement, le même hook de post-build, déplacés dans un fichier que toute l'équipe peut relire et ajuster mais que personne n'exécute de mémoire.

> **Code source.** La branche [`04-ci-cd`](https://github.com/welcoMattic/symfony-clever-cloud-series/tree/04-ci-cd) du dépôt [welcoMattic/symfony-clever-cloud-series](https://github.com/welcoMattic/symfony-clever-cloud-series) contient tout ce que cet article ajoute à l'application : le workflow de déploiement `.github/workflows/deploy.yml` et le premier test de la suite. Deux écarts avec le YAML ci-dessus, que le dépôt impose : chaque article y vit sur sa propre branche, le déclencheur nomme donc `04-ci-cd` et non `main`, et le `.clever.json` versionné ne portant que des gabarits d'identifiants, le workflow prend l'`appID` dans un secret plutôt que l'alias.
