---
title: "PHP2Shell : où trouver la version corrigée de PHP selon votre installation"
date: 2026-10-22T09:00:00.000Z
description: "Sources, Windows, distributions Linux, macOS, images Docker, FrankenPHP et plateformes : où récupérer PHP 8.5.12, 8.4.27, 8.3.36, 8.2.35, ou le correctif backporté de votre distribution."
tags:
  - php
  - security
  - php2shell
  - docker
  - frankenphp
  - linux
lang: fr
---

_This blog post is also available in 🇬🇧 English: [PHP2Shell: where to get the patched PHP for your setup](/blog/2026-10-22-php2shell-where-to-get-the-patched-php/)._

> - **EDIT du 22 octobre 2026, 14 h 57** :
>     - Rocky Linux 8 : PHP 8.2 corrigé.
>     - Alpine 3.23 : PHP 8.3, 8.4 et 8.5 corrigés.
>     - Alpine 3.21 : PHP 8.2 et 8.3 corrigés.
>     - Docker Hardened Images : tag `dhi.io/php:8.5` corrigé.
>     - Aikido : PHP 8.2, 8.4 et 8.5 corrigés, et les tags `8.3.36-apache` et `8.3.36-cli`.
>     - static-php-cli : binaires `bulk` et `gnu-bulk` corrigés, PHP 8.2 à 8.5.
>     - static-php-cli : binaires Windows corrigés, `spc-min` en PHP 8.2 à 8.5, `spc-max` en PHP 8.4 et 8.5.

> **TL;DR : l'essentiel, sans tout lire** (état au 22 octobre 2026, 14 h 57, heure de Paris)
>
> **Installez PHP 8.5.12, 8.4.27, 8.3.36 ou 8.2.35.** Ces versions corrigent les 2 failles.
>
> PHP 8.1 et les versions plus anciennes n'ont pas de nouvelle version officielle. Certaines distributions publient quand même un correctif grâce aux backports source fournis par l'équipe de PHP.
>
> | Plateforme | ✅ Corrigé | ⏳ Correctif en attente | ❌ Aucun correctif |
> |---|---|---|---|
> | **Sources officielles** |  |  |  |
> | php.net, sources | PHP 8.2 à 8.5 |  |  |
> | php.net, Windows | PHP 8.2 à 8.5 |  |  |
> | **Linux** |  |  |  |
> | Debian | Debian 13 : PHP 8.4<br>Debian 12 : PHP 8.2<br>Debian 9 à 11 : PHP 7.0 à 7.4, avec Debian ELTS | Debian testing : PHP 8.4 |  |
> | Ubuntu | Ubuntu 22.04 à 26.10 : PHP 8.1 à 8.5<br>Ubuntu 14.04 à 20.04 : PHP 5.5 à 7.4, avec Ubuntu Pro |  |  |
> | Dépôts d'Ondřej Surý | PPA Ubuntu : PHP 5.6 à 8.5<br>packages.sury.org en amd64 : PHP 5.6 à 8.5 | packages.sury.org en arm64 |  |
> | RHEL | RHEL 10 : PHP 8.3 et 8.4<br>RHEL 9 : PHP 8.0, 8.2 et 8.3<br>RHEL 8 : PHP 7.4 et 8.2 | RHEL 9 : PHP 8.4 | RHEL 9 : PHP 8.1<br>RHEL 8 : PHP 7.2, 7.3 et 8.0 |
> | AlmaLinux | Tous les flux : PHP 7.2 à 8.4 |  |  |
> | Rocky Linux | Les mêmes versions que RHEL |  |  |
> | Dépôt de Remi | PHP 7.4 à 8.5 |  | PHP 5.6 à 7.3 |
> | Fedora | Fedora 44 : PHP 8.5 | Fedora 43 : PHP 8.4 |  |
> | Amazon Linux | Amazon Linux 2023 : PHP 8.2 à 8.5<br>Amazon Linux 2, dépôt extra : PHP 8.2 |  | Amazon Linux 2023 : PHP 8.1<br>Amazon Linux 2, dépôt principal : paquet `php` |
> | Alpine | Alpine 3.23, 3.24 et edge : PHP 8.3 à 8.5<br>Alpine 3.21 : PHP 8.2 et 8.3 |  | Alpine 3.22 : PHP 8.2 à 8.4<br>Alpine 3.21 : PHP 8.4 |
> | Arch Linux | Paquet `php` : PHP 8.5<br>Paquet `php-legacy` : PHP 8.3 |  |  |
> | SUSE | SLES 15 SP7 : PHP 8.3<br>openSUSE Tumbleweed : PHP 8.5 | SLES 16 : PHP 8.4 | openSUSE Leap : toutes les versions |
> | **macOS** |  |  |  |
> | Homebrew | PHP 8.2 à 8.5 |  | PHP 8.1 |
> | Tap shivammathur/php | PHP 7.4, et PHP 8.1 à 8.5 |  |  |
> | MacPorts | PHP 8.2 à 8.5 |  | PHP 7.4 et 8.1 |
> | **Docker** |  |  |  |
> | Image officielle `php` | PHP 8.2 à 8.5<br>Variantes cli, apache, fpm et zts<br>Debian trixie, Debian bookworm, Alpine 3.23 et Alpine 3.24 |  | PHP 7.4, 8.0 et 8.1 |
> | serversideup/php | PHP 8.2 à 8.5, versions v5.0.2 et v4.5.3 |  |  |
> | Chainguard | PHP 8.2 à 8.5 |  |  |
> | Docker Hardened Images | PHP 8.2 à 8.5 |  |  |
> | webdevops/php | PHP 8.2 à 8.5 |  | PHP 8.1 |
> | thecodingmachine/php | PHP 8.2 à 8.5 |  | PHP 8.1 |
> | Bitnami | PHP 8.5, tag `bitnami/php-fpm:latest` |  | PHP 8.2 à 8.4 : aucune image gratuite |
> | ubuntu/php | Ubuntu 24.04 : PHP 8.3<br>Ubuntu 26.04 : PHP 8.5 |  |  |
> | Red Hat UBI | PHP 7.4, 8.0, 8.2, 8.3 et 8.4 |  | PHP 8.1 |
> | Aikido | PHP 8.2, 8.4 et 8.5<br>PHP 8.3 : tags `8.3.36-apache` et `8.3.36-cli` |  | PHP 8.3 : tag fpm |
> | **FrankenPHP** |  |  |  |
> | FrankenPHP 1.13.2 | Binaires statiques : PHP 8.5<br>Images Docker : PHP 8.2 à 8.5<br>Paquets deb, rpm et apk : PHP 8.2 à 8.5 |  |  |
> | **PaaS et serverless** |  |  |  |
> | Clever Cloud | PHP 7.4 à 8.5<br>**Rien à faire.** | FrankenPHP 1.13.2. En attendant, FrankenPHP 1.13.1 tourne avec le PHP corrigé. |  |
> | Upsun | PHP 7.4 à 8.5<br>**Rien à faire.** |  |  |
> | Heroku | PHP 8.2 à 8.5<br>PHP 8.1 sur la stack heroku-22<br>**Redéployez votre application.** |  |  |
> | Laravel Cloud | PHP 8.2 à 8.5<br>**Rien à faire.** |  |  |
> | Laravel Forge | **Cliquez sur « Update PHP » sur chaque serveur.** |  | Serveurs Ubuntu 20.04 et plus anciens |
> | Laravel Vapor | PHP 8.2 à 8.5<br>**Redéployez votre application.** |  |  |
> | Bref | PHP 8.2 à 8.5<br>**Lancez `composer update bref/bref -W`, puis redéployez.** |  |  |
> | Google App Engine | **Rien à faire.** |  |  |
> | Google Cloud Run | **Redéployez les services déployés depuis les sources.** |  |  |
> | Azure App Service (Linux) | Canaux Latest et Standard : PHP 8.2 à 8.5<br>**Rien à faire.** |  |  |
> | **Outils de développement** |  |  |  |
> | Symfony CLI | Symfony CLI utilise le PHP de votre machine.<br>**Mettez à jour ce PHP.** |  |  |
> | Laravel Herd |  | Mise à jour de PHP |  |
> | Laravel Sail | amd64 : **lancez `sail build --no-cache`.** | arm64, par exemple un Mac avec puce Apple |  |
> | DDEV | amd64 : contournement dans le billet de DDEV | arm64 |  |
> | WampServer | PHP 8.2 à 8.5 |  |  |
> | static-php-cli | Binaires `common`, `minimal` et `bulk` : PHP 8.2 à 8.5<br>Binaires `gnu-bulk` : PHP 8.2 à 8.5<br>Binaires Windows `spc-min` : PHP 8.2 à 8.5<br>Binaires Windows `spc-max` : PHP 8.4 et 8.5 | Binaires Windows `spc-max` : PHP 8.2 et 8.3 |  |
> | XAMPP |  |  | Les installeurs utilisent encore PHP 8.2.12. |
> | Lando |  |  | Les images `devwithlando/php` ne sont pas reconstruites. |
>
> **Avec Docker** : reconstruisez vos images avec `docker compose build --pull`.
>
> **Après la mise à jour** : redémarrez PHP-FPM, Apache et les workers.
>
> ⚠ **Sur Debian, Ubuntu et RHEL, `php -v` affiche l'ancien numéro, même avec le correctif.** Vérifiez la version du paquet. [Voir comment faire](#vérifier-ce-qui-tourne-vraiment).

Le 21 octobre, l'équipe de PHP a publié en urgence **PHP 8.5.12, 8.4.27, 8.3.36 et 8.2.35**. Ces versions corrigent deux failles baptisées PHP2Shell, [CVE-2026-109618](https://github.com/php/php-src/security/advisories/GHSA-w8hw-w9fx-j79w) et [CVE-2026-109619](https://github.com/php/php-src/security/advisories/GHSA-6wmf-4rv5-p3rp). Elles sont de type RCE (Remote Code Execution), et permettent d'exécuter du code à distance sans authentification (score CVSS v4.0 de 9.2).

D'après l'[avis de sécurité publié sur php.net](https://www.php.net/archive/2026.php#2026-10-21-5), **toute installation de PHP qui sert des requêtes web est exposée** : PHP-FPM, Apache avec mod_php, php-cgi, FrankenPHP ou LiteSpeed. Le risque est le plus élevé avec mod_php.

Chaque distribution, chaque image Docker et chaque plateforme publie le correctif à son rythme. J'ai rassemblé ici, cas par cas, où trouver la version corrigée.

**Dernière vérification : 22 octobre 2026, vers 14 h 57 (heure de Paris).** Dans les tableaux :

- ✅ le correctif est publié ;
- ⏳ le correctif est en attente ;
- ❌ aucun correctif n'est disponible à ce jour.

## Les versions à viser

| Branche | Version corrigée | Correctifs de sécurité jusqu'au |
|---|---|---|
| 8.5 | **8.5.12** | 31/12/2029 |
| 8.4 | **8.4.27** | 31/12/2028 |
| 8.3 | **8.3.36** | 31/12/2027 |
| 8.2 | **8.2.35** | 31/12/2026 |
| 8.1, 8.0, 7.4 | ❌ aucune nouvelle version | fin de vie |

**L'équipe de PHP ne publie plus de version pour 8.1 et les branches plus anciennes.** Elle a quand même publié des backports pour [7.4](https://github.com/php/php-src/tree/PHP-7.4-CVE-2026-109618-109619), [8.0](https://github.com/php/php-src/tree/PHP-8.0-CVE-2026-109618-109619) et [8.1](https://github.com/php/php-src/tree/PHP-8.1-CVE-2026-109618-109619). Ce sont des branches Git, sans tag ni archive à télécharger. Pour obtenir un paquet ou une image corrigée en 7.4, 8.0 ou 8.1, cherchez votre distribution ou votre image dans la suite de l'article.

> **Si vous êtes encore sur une version de PHP inférieure à 8.2, la meilleure manière de sécuriser vos installations est de mettre PHP à jour vers une version activement maintenue : 8.3 (fixes de sécurité uniquement), 8.4 ou 8.5.** 
>
> ⚠ PHP 8.2 arrive en fin de vie le 31 décembre 2026.

> ⚠ **Sur Debian, Ubuntu, RHEL et leurs dérivés, `php -v` affiche toujours l'ancien numéro, même avec le correctif installé.** Ces distributions backportent le correctif dans leur propre version de PHP. Par exemple, sur Ubuntu 24.04, le paquet corrigé affiche PHP 8.3.6. Pour savoir si vous êtes à jour, comparez la version du paquet installé avec la colonne « Version corrigée » de la section [Linux](#linux). Les commandes qui affichent cette version sont dans la section [Vérifier ce qui tourne vraiment](#vérifier-ce-qui-tourne-vraiment).

## Si vous ne pouvez pas mettre à jour tout de suite

L'[avis de php.net](https://www.php.net/archive/2026.php#2026-10-21-5) liste des mesures d'atténuation. **Elles réduisent l'exposition, mais elles ne remplacent pas la mise à jour.** Voici les principales.

Contre CVE-2026-109619 :

- Mettez `session.upload_progress.enabled=0` dans le `php.ini`, le pool FPM ou la configuration du serveur. `ini_set()` et le fichier `.user.ini` de FPM ne suffisent pas.
- Sur PHP 8.5 uniquement, mettez aussi `fatal_error_backtraces=0`.
- **Redémarrez ensuite tous les workers PHP.**

Contre CVE-2026-109618 :

- Mettez `memory_limit=-1`, de façon que l'application ne puisse pas le modifier : avec `php_admin_value` dans le pool FPM ou dans la configuration Apache.
- Mettez un `post_max_size` bas : `8M`, ou `32M` si l'application reçoit des fichiers.
- N'utilisez pas `RLIMIT_AS` ni `RLIMIT_DATA` pour limiter la mémoire : ils peuvent déclencher la faille.
- Réduisez `max_input_nesting_level` (64 par défaut), par exemple à `16`, et `max_input_vars` (1000 par défaut), par exemple à `500`. Posez-les dans le `php.ini` ou le pool FPM : `ini_set()` ne peut pas les modifier. Vérifiez d'abord vos plus gros formulaires : au-delà de `max_input_vars`, PHP ignore les champs en trop.

**Ces deux limites restent utiles après la mise à jour** : d'après l'[avis GHSA-w8hw-w9fx-j79w](https://github.com/php/php-src/security/advisories/GHSA-w8hw-w9fx-j79w), elles réduisent le risque de saturation de la mémoire et de déni de service.

L'[avis de php.net](https://www.php.net/archive/2026.php#2026-10-21-5) recommande aussi des limites à poser au niveau du serveur web ou du proxy : taille des requêtes, nombre de champs, nombre de parties multipart et nombre d'en-têtes.

## Les sources officielles

Les archives sont sur la [page de téléchargement de php.net](https://www.php.net/downloads.php?source=Y). Chaque archive a son SHA256 et sa signature GPG (un fichier `.asc` à côté de l'archive). Les clés des release managers sont sur la [page des clés GPG](https://www.php.net/gpg-keys.php).

| Version | Archive | Tag GitHub |
|---|---|---|
| 8.5.12 | [php-8.5.12.tar.xz](https://www.php.net/distributions/php-8.5.12.tar.xz) | [php-8.5.12](https://github.com/php/php-src/releases/tag/php-8.5.12) |
| 8.4.27 | [php-8.4.27.tar.xz](https://www.php.net/distributions/php-8.4.27.tar.xz) | [php-8.4.27](https://github.com/php/php-src/releases/tag/php-8.4.27) |
| 8.3.36 | [php-8.3.36.tar.xz](https://www.php.net/distributions/php-8.3.36.tar.xz) | [php-8.3.36](https://github.com/php/php-src/releases/tag/php-8.3.36) |
| 8.2.35 | [php-8.2.35.tar.xz](https://www.php.net/distributions/php-8.2.35.tar.xz) | [php-8.2.35](https://github.com/php/php-src/releases/tag/php-8.2.35) |

Les archives existent aussi en `.tar.gz` et en `.tar.bz2` : il suffit de changer l'extension dans l'URL.

## Windows

Les builds Windows sont sur la [page de téléchargement Windows de php.net](https://www.php.net/downloads.php?os=windows). L'ancienne adresse windows.php.net redirige vers cette page.

Chaque version existe en Thread Safe et en Non Thread Safe, en x64 et en x86. Les SHA256 sont dans le fichier [sha256sum.txt](https://downloads.php.net/~windows/releases/sha256sum.txt). **Ces fichiers n'ont pas de signature GPG.**

| Version | Compilateur | Archive x64 Non Thread Safe |
|---|---|---|
| 8.5.12 | VS17 | [php-8.5.12-nts-Win32-vs17-x64.zip](https://downloads.php.net/~windows/releases/archives/php-8.5.12-nts-Win32-vs17-x64.zip) |
| 8.4.27 | VS17 | [php-8.4.27-nts-Win32-vs17-x64.zip](https://downloads.php.net/~windows/releases/archives/php-8.4.27-nts-Win32-vs17-x64.zip) |
| 8.3.36 | VS16 | [php-8.3.36-nts-Win32-vs16-x64.zip](https://downloads.php.net/~windows/releases/archives/php-8.3.36-nts-Win32-vs16-x64.zip) |
| 8.2.35 | VS16 | [php-8.2.35-nts-Win32-vs16-x64.zip](https://downloads.php.net/~windows/releases/archives/php-8.2.35-nts-Win32-vs16-x64.zip) |

Pour la version Thread Safe, retirez `-nts` du nom du fichier. Pour le 32 bits, remplacez `x64` par `x86`.

## Linux

Sur un serveur, passez par le gestionnaire de paquets de votre distribution. Les tableaux ci-dessous donnent la version du paquet corrigé, telle que `apt`, `dnf` ou `apk` l'affiche.

### Debian et Ubuntu

| Distribution | Paquet | Version corrigée | État |
|---|---|---|---|
| Debian 13 trixie | php8.4 | **8.4.27-1~deb13u1** | ✅ [DSA-6574-1](https://security-tracker.debian.org/tracker/DSA-6574-1) |
| Debian 12 bookworm | php8.2 | **8.2.35-1~deb12u1** | ✅ [DLA-4848-1](https://security-tracker.debian.org/tracker/DLA-4848-1) |
| Debian testing (forky) | php8.4 | 8.4.27-1 | ⏳ en attente de migration depuis sid ([suivi](https://tracker.debian.org/pkg/php8.4)) |
| Debian 11 bullseye | php7.4 | **7.4.33-1+deb11u14** | ✅ avec Debian ELTS, [ELA-1853-1](https://deb.freexian.com/extended-lts/tracker/ELA-1853-1) |
| Debian 10 buster | php7.3 | **7.3.31-1~deb10u16** | ✅ avec Debian ELTS, [ELA-1854-1](https://deb.freexian.com/extended-lts/tracker/ELA-1854-1) |
| Debian 9 stretch | php7.0 | **7.0.33-0+deb9u26** | ✅ avec Debian ELTS, [ELA-1855-1](https://deb.freexian.com/extended-lts/tracker/ELA-1855-1) |
| Ubuntu 26.10 | php8.5 | **8.5.9-0ubuntu2.1** | ✅ [USN-8948-1](https://ubuntu.com/security/notices/USN-8948-1) |
| Ubuntu 26.04 LTS | php8.5 | **8.5.4-0ubuntu1.5** | ✅ [USN-8948-1](https://ubuntu.com/security/notices/USN-8948-1) |
| Ubuntu 24.04 LTS | php8.3 | **8.3.6-0ubuntu0.24.04.13** | ✅ [USN-8948-1](https://ubuntu.com/security/notices/USN-8948-1) |
| Ubuntu 22.04 LTS | php8.1 | **8.1.2-1ubuntu2.28** | ✅ [USN-8948-1](https://ubuntu.com/security/notices/USN-8948-1) |
| Ubuntu 20.04 | php7.4 | **7.4.3-4ubuntu2.29+esm5** | ✅ avec Ubuntu Pro, [USN-8948-2](https://ubuntu.com/security/notices/USN-8948-2) |
| Ubuntu 18.04 | php7.2 | **7.2.24-0ubuntu0.18.04.17+esm14** | ✅ avec Ubuntu Pro, [USN-8948-2](https://ubuntu.com/security/notices/USN-8948-2) |
| Ubuntu 16.04 | php7.0 | **7.0.33-0ubuntu0.16.04.16+esm22** | ✅ avec Ubuntu Pro, [USN-8948-2](https://ubuntu.com/security/notices/USN-8948-2) |
| Ubuntu 14.04 | php5 | **5.5.9+dfsg-1ubuntu4.29+esm18** | ✅ avec Ubuntu Pro, [USN-8948-2](https://ubuntu.com/security/notices/USN-8948-2) |

Le suivi complet est sur le [security tracker de Debian](https://security-tracker.debian.org/tracker/CVE-2026-109618) et sur la [page CVE d'Ubuntu](https://ubuntu.com/security/CVE-2026-109618).

**Dépôts d'Ondřej Surý** ([packages.sury.org](https://packages.sury.org/php/) pour Debian, [ppa:ondrej/php](https://launchpad.net/~ondrej/+archive/ubuntu/php) pour Ubuntu) :

- ✅ toutes les branches de 5.6 à 8.5 ont été reconstruites le 21 octobre, y compris 7.4, 8.0 et 8.1 (par exemple 8.1.34-9 pour 8.1) ;
- ✅ le PPA Ubuntu est à jour sur toutes les architectures ;
- ✅ packages.sury.org est à jour en amd64 ;
- ⏳ packages.sury.org est encore en attente en arm64, pour la plupart des branches ;
- ⚠ pour 5.6 à 7.1, un [ticket](https://codeberg.org/oerdnj/deb.sury.org/issues/146) signale un correctif incomplet. Une nouvelle build est annoncée.

### Red Hat et ses dérivés

| Distribution | Flux | Version corrigée | État |
|---|---|---|---|
| RHEL 10 | php (8.3) | **php-8.3.36-1.el10_2** | ✅ [RHSA-2026:87070](https://access.redhat.com/errata/RHSA-2026:87070) |
| RHEL 10 | php8.4 | **php8.4-8.4.27-1.el10_2** | ✅ [RHSA-2026:87071](https://access.redhat.com/errata/RHSA-2026:87071) |
| RHEL 9 | php (8.0) | **php-8.0.30-8.el9_8.1** | ✅ [RHSA-2026:87151](https://access.redhat.com/errata/RHSA-2026:87151) |
| RHEL 9 | php:8.2 | **php-8.2.35-1** | ✅ [RHSA-2026:87072](https://access.redhat.com/errata/RHSA-2026:87072) |
| RHEL 9 | php:8.3 | **php-8.3.36-1** | ✅ [RHSA-2026:87079](https://access.redhat.com/errata/RHSA-2026:87079) |
| RHEL 9 | php:8.4 | | ⏳ en attente ([page CVE](https://access.redhat.com/security/cve/CVE-2026-109618)) |
| RHEL 9 | php:8.1 | | ❌ fin de vie, pas de correctif ([page CVE](https://access.redhat.com/security/cve/CVE-2026-109618)) |
| RHEL 8 | php:7.4 | **php-7.4.33-8** | ✅ [RHSA-2026:87080](https://access.redhat.com/errata/RHSA-2026:87080) |
| RHEL 8 | php:8.2 | **php-8.2.35-1** | ✅ [RHSA-2026:87073](https://access.redhat.com/errata/RHSA-2026:87073) |
| RHEL 8 | php:7.2, php:7.3, php:8.0 | | ❌ fin de vie, pas de correctif ([page CVE](https://access.redhat.com/security/cve/CVE-2026-109618)) |

- **Rocky Linux** : ✅ mêmes correctifs que RHEL, publiés le 22 octobre. Les avis portent les mêmes numéros, avec le préfixe RLSA au lieu de RHSA (par exemple [RLSA-2026:87071](https://errata.rockylinux.org/RLSA-2026:87071) pour php8.4 sur Rocky 10). ✅ php:8.2 sur Rocky 8 est corrigé en **php-8.2.35-1**, [RLSA-2026:87073](https://errata.rockylinux.org/RLSA-2026:87073).
- **AlmaLinux** : ✅ [tous les flux sont corrigés](https://almalinux.org/blog/2026-10-21-php2shell-cve-2026-109618-cve-2026-109619/), y compris ceux en fin de vie (7.2, 7.3, 8.0 et 8.1).

**Dépôt de Remi** ([rpms.remirepo.net](https://rpms.remirepo.net/)) :

- ✅ les dépôts EL8, EL9 et EL10 contiennent des paquets corrigés depuis le 21 octobre : 7.4.33-31, 8.0.30-21, 8.1.34-6, 8.2.35-1, 8.3.36-1, 8.4.27-1 et 8.5.12-1. Leur [changelog](https://git.remirepo.net/cgit/rpms/scl-php81/php.git/log/) cite les deux CVE ;
- ❌ les branches 5.6 à 7.3 ne sont pas corrigées ;
- ℹ l'avis de php.net annonçait que ce dépôt ne serait pas mis à jour le 21 octobre. Remi n'a encore publié aucun billet sur [son blog](https://blog.remirepo.net/).

### Fedora, Amazon Linux, Alpine, Arch et SUSE

| Distribution | Paquet | Version corrigée | État |
|---|---|---|---|
| Fedora 44 | php | **8.5.12-1.fc44** | ✅ [FEDORA-2026-a9eba4bbc3](https://bodhi.fedoraproject.org/updates/FEDORA-2026-a9eba4bbc3) |
| Fedora 43 | php | 8.4.27-2.fc43 | ⏳ dans updates-testing, [FEDORA-2026-d5f8446449](https://bodhi.fedoraproject.org/updates/FEDORA-2026-d5f8446449) |
| Amazon Linux 2023 | php8.2 | **8.2.35-1.amzn2023.0.1** | ✅ [ALAS2023-2026-3301](https://alas.aws.amazon.com/AL2023/ALAS2023-2026-3301.html) |
| Amazon Linux 2023 | php8.3 | **8.3.36-1.amzn2023.0.1** | ✅ [ALAS2023-2026-3302](https://alas.aws.amazon.com/AL2023/ALAS2023-2026-3302.html) |
| Amazon Linux 2023 | php8.4 | **8.4.27-1.amzn2023.0.1** | ✅ [ALAS2023-2026-3303](https://alas.aws.amazon.com/AL2023/ALAS2023-2026-3303.html) |
| Amazon Linux 2023 | php8.5 | **8.5.12-1.amzn2023.0.1** | ✅ [ALAS2023-2026-3304](https://alas.aws.amazon.com/AL2023/ALAS2023-2026-3304.html) |
| Amazon Linux 2023 | php8.1 | | ❌ pas de correctif prévu ([page CVE](https://explore.alas.aws.amazon.com/CVE-2026-109618.html)) |
| Amazon Linux 2 | php (extra php8.2) | **8.2.35-1.amzn2.0.1** | ✅ [ALAS2PHP8.2-2026-015](https://alas.aws.amazon.com/AL2/ALAS2PHP8.2-2026-015.html) |
| Amazon Linux 2 | php (dépôt principal) | | ❌ pas de correctif prévu ([page CVE](https://explore.alas.aws.amazon.com/CVE-2026-109618.html)) |
| Alpine edge et 3.24 | php83, php84, php85 | **8.3.36-r0, 8.4.27-r0, 8.5.12-r0** | ✅ [paquets 3.24](https://pkgs.alpinelinux.org/packages?name=php8*&branch=v3.24&repo=community&arch=x86_64), [paquets edge](https://pkgs.alpinelinux.org/packages?name=php8*&branch=edge&repo=community&arch=x86_64) |
| Alpine 3.23 | php83, php84, php85 | **8.3.36-r0, 8.4.27-r0, 8.5.12-r0** | ✅ [paquets 3.23](https://pkgs.alpinelinux.org/packages?name=php8*&branch=v3.23&repo=community&arch=x86_64) |
| Alpine 3.22 | php82, php83, php84 | | ❌ aucun correctif à ce jour ([paquets 3.22](https://pkgs.alpinelinux.org/packages?name=php8*&branch=v3.22&repo=community&arch=x86_64)) |
| Alpine 3.21 | php82 | **8.2.35-r0** | ✅ [paquets 3.21](https://pkgs.alpinelinux.org/packages?name=php82&branch=v3.21&repo=community&arch=x86_64) |
| Alpine 3.21 | php83 | **8.3.36-r0** | ✅ [paquets 3.21](https://pkgs.alpinelinux.org/packages?name=php83&branch=v3.21&repo=community&arch=x86_64) |
| Alpine 3.21 | php84 | | ❌ aucun correctif à ce jour |
| Arch Linux | php | **8.5.12-1** | ✅ [ASA-202610-1](https://security.archlinux.org/ASA-202610-1) |
| Arch Linux | php-legacy | **8.3.36-1** | ✅ [ASA-202610-2](https://security.archlinux.org/ASA-202610-2) |
| SLES 15 SP7 | php8 | **8.3.36** | ✅ [page CVE SUSE](https://www.suse.com/security/cve/CVE-2026-109618.html) |
| SLES 16.0 | php8 | 8.4.27 | ⏳ en validation ([page CVE SUSE](https://www.suse.com/security/cve/CVE-2026-109618.html)) |
| openSUSE Tumbleweed | php8 | **8.5.12** | ✅ [dépôt de mises à jour](https://download.opensuse.org/update/tumbleweed/x86_64/) |
| openSUSE Leap | php8, php7 | | ❌ aucun correctif à ce jour ([page CVE SUSE](https://www.suse.com/security/cve/CVE-2026-109618.html)) |

**Sur Amazon Linux 2023, un `dnf update` simple ne suffit pas** : la version du dépôt est figée. Les avis ALAS (par exemple [ALAS2023-2026-3303](https://alas.aws.amazon.com/AL2023/ALAS2023-2026-3303.html)) donnent la commande, ici pour le paquet php8.4 :

```bash
dnf update php8.4 --releasever 2023.12.20261021
```

Les images Docker officielles `php:*-alpine` n'utilisent pas les paquets Alpine : elles compilent PHP elles-mêmes. Elles sont déjà corrigées, voir la section [Les images Docker](#les-images-docker).

## macOS

| Gestionnaire | Paquet | Version corrigée | État |
|---|---|---|---|
| Homebrew | [php](https://formulae.brew.sh/formula/php) | **8.5.12** | ✅ |
| Homebrew | [php@8.4](https://formulae.brew.sh/formula/php@8.4) | **8.4.27** | ✅ |
| Homebrew | [php@8.3](https://formulae.brew.sh/formula/php@8.3) | **8.3.36** | ✅ |
| Homebrew | [php@8.2](https://formulae.brew.sh/formula/php@8.2) | **8.2.35** | ✅ |
| Homebrew | [php@8.1](https://formulae.brew.sh/formula/php@8.1) | | ❌ formule dépréciée, pas de correctif |
| Tap [shivammathur/php](https://github.com/shivammathur/homebrew-php) | php, php@8.4, php@8.3, php@8.2 | **8.5.12, 8.4.27, 8.3.36, 8.2.35** | ✅ |
| Tap [shivammathur/php](https://github.com/shivammathur/homebrew-php) | [php@8.1](https://github.com/shivammathur/homebrew-php/blob/main/Formula/php@8.1.rb), [php@7.4](https://github.com/shivammathur/homebrew-php/blob/main/Formula/php@7.4.rb) | **8.1.34_4, 7.4.33_16** (backport) | ✅ |
| MacPorts | [php85](https://ports.macports.org/port/php85/), [php84](https://ports.macports.org/port/php84/), [php83](https://ports.macports.org/port/php83/), [php82](https://ports.macports.org/port/php82/) | **8.5.12, 8.4.27, 8.3.36, 8.2.35** | ✅ |
| MacPorts | [php81](https://ports.macports.org/port/php81/), [php74](https://ports.macports.org/port/php74/) | | ❌ aucun correctif à ce jour |

Avec Homebrew, mettez à jour la formule que vous utilisez, par exemple `brew upgrade php@8.4`.

## Les images Docker

### L'image officielle php

L'[image officielle `php`](https://hub.docker.com/_/php) est ✅ reconstruite dans toutes ses variantes ([commit de mise à jour](https://github.com/docker-library/php/commit/f6048b5f6e3c2202ee082665a4ccc0d90de291a3)) :

- cli, apache, fpm et zts ;
- sur Debian trixie (la base par défaut) et sur Debian bookworm ;
- sur Alpine 3.23 et 3.24, sans la variante apache.

| Branche | Exemples de tags flottants | Exemples de tags précis |
|---|---|---|
| 8.5 | `8.5`, `8.5-fpm`, `8.5-apache`, `latest`, `fpm-alpine` | `8.5.12-fpm`, `8.5.12-zts-bookworm` |
| 8.4 | `8.4`, `8.4-fpm`, `8.4-fpm-alpine`, `8.4-zts` | `8.4.27-fpm`, `8.4.27-fpm-alpine3.24` |
| 8.3 | `8.3`, `8.3-fpm`, `8.3-fpm-alpine`, `8.3-apache` | `8.3.36-cli`, `8.3.36-apache-trixie` |
| 8.2 | `8.2`, `8.2-fpm`, `8.2-fpm-alpine`, `8.2-apache` | `8.2.35-fpm`, `8.2.35-cli-alpine3.23` |

**Votre tag pointe déjà sur la version corrigée, mais Docker utilise l'image qu'il a en cache.** Sur une machine ou un runner de CI qui a déjà téléchargé `php:8.4-fpm`, un `FROM php:8.4-fpm` reconstruit sur l'ancienne 8.4.26. Ajoutez `--pull` au build pour forcer le téléchargement de la nouvelle image :

```bash
docker compose build --pull
docker compose up -d
```

Si votre `compose.yaml` utilise l'image telle quelle, sans étape de build, lancez `docker compose pull` avant `docker compose up -d`.

D'autres cas gardent l'ancienne version :

- **Kubernetes** : avec `imagePullPolicy: IfNotPresent` et un tag flottant, chaque nœud garde l'image qu'il a en cache.
- **Image épinglée par digest** (`php:8.4-fpm@sha256:…`) : elle reste vulnérable. Remplacez le digest.
- **Image épinglée par version** (`php:8.4.26-fpm`) : elle reste vulnérable. Passez à `php:8.4.27-fpm`.
- **PHP 8.1, 8.0 et 7.4** : ❌ les tags `8.1`, `8.0` et `7.4` de l'image officielle ne sont plus reconstruits. Il n'existe pas d'image officielle corrigée pour ces versions.

### Les autres images

| Image | Tags | Source |
|---|---|---|
| [serversideup/php](https://hub.docker.com/r/serversideup/php) | ✅ v5.0.2 (`8.4-fpm-nginx`, `8.4.27-fpm-nginx-alpine`, etc.) et v4.5.3 (tags `*-v4.5.3`), de 8.2 à 8.5 | [release v5.0.2](https://github.com/serversideup/docker-php/releases/tag/v5.0.2), [release v4.5.3](https://github.com/serversideup/docker-php/releases/tag/v4.5.3) |
| Chainguard `cgr.dev/chainguard/php` | ✅ `latest` (8.5.12), `8.4.27`, `8.3.36`, `8.2.35`, avec leurs variantes `-fpm` et `-dev` | [fiche de l'image](https://images.chainguard.dev/directory/image/php/overview) |
| Docker Hardened Images `dhi.io/php` | ✅ `8.5.12`, `8.4.27`, `8.3.36`, `8.2.35` (Debian 13 et Alpine), y compris le tag `8.5` | [journal des tags](https://github.com/docker-hardened-images/log/tree/main/dhi/php) |
| [webdevops/php](https://hub.docker.com/r/webdevops/php), `php-nginx`, `php-apache` | ✅ `8.2` à `8.5` et leurs variantes `-alpine` ; ❌ `8.1` | [tags](https://hub.docker.com/r/webdevops/php/tags) |
| [thecodingmachine/php](https://hub.docker.com/r/thecodingmachine/php) | ✅ `8.2-v5-*` à `8.5-v5-*` ; ❌ `8.1-v5-*` | [tags](https://hub.docker.com/r/thecodingmachine/php/tags) |
| [bitnami/php-fpm](https://hub.docker.com/r/bitnami/php-fpm) | ✅ `latest` (8.5.12) uniquement ; ❌ aucun tag gratuit pour 8.4, 8.3 et 8.2 | [Dockerfile](https://github.com/bitnami/containers/tree/main/bitnami/php-fpm) |
| [ubuntu/php](https://hub.docker.com/r/ubuntu/php) | ✅ `8.3-24.04` (paquet backporté 8.3.6-0ubuntu0.24.04.13) et `8.5-26.04_edge` | [USN-8948-1](https://ubuntu.com/security/notices/USN-8948-1) |
| Red Hat UBI | ✅ `ubi10/php-84`, `ubi10/php-83`, `ubi9/php-83`, `ubi9/php-82`, `ubi9/php-80`, `ubi8/php-82`, `ubi8/php-74` ; ❌ `ubi9/php-81` | [catalogue Red Hat](https://catalog.redhat.com/software/containers/search?q=php) |
| Aikido `aikido-dev/php` | ✅ `8.5.12`, `8.4.27` et `8.2.35`, avec leurs variantes cli, fpm, apache et alpine ; `8.3.36-apache` et `8.3.36-cli` pour 8.3 ; ❌ aucun tag 8.3.36 en fpm | [catalogue Aikido](https://images.aikido.dev/images/php) |

**Pour PHP 8.0 et 7.4**, les seules images corrigées que j'ai trouvées sont celles de Red Hat : `ubi9/php-80` et `ubi8/php-74`. Elles contiennent les backports de RHEL.

## FrankenPHP

**Passez à [FrankenPHP 1.13.2](https://github.com/php/frankenphp/releases/tag/v1.13.2), sortie le 21 octobre.** Elle embarque les versions corrigées de PHP. Elle corrige aussi quatre failles propres à FrankenPHP.

⚠ Le tag Docker `1.13.1` a été reconstruit avec PHP 8.5.12. PHP y est corrigé, mais pas les quatre failles propres à FrankenPHP.

| Installation | Où la trouver | PHP embarqué |
|---|---|---|
| Binaire statique (Linux x86_64 et aarch64, macOS arm64, Windows) | assets de la [release v1.13.2](https://github.com/php/frankenphp/releases/tag/v1.13.2) | **8.5.12** uniquement |
| Image Docker | [dunglas/frankenphp](https://hub.docker.com/r/dunglas/frankenphp) : `1.13.2`, `php8.5`, `php8.4`, `php8.3`, `php8.2`, avec ou sans suffixe `-alpine` ou `-bookworm` | **8.5.12, 8.4.27, 8.3.36, 8.2.35** |
| Paquets [deb](https://frankenphp.dev/docs/#deb-packages), [rpm](https://frankenphp.dev/docs/#rpm-packages) et [apk](https://frankenphp.dev/docs/#apk-packages) | paquet `frankenphp` 1.13.2, un par branche de PHP | **8.2 à 8.5** |
| [Homebrew](https://frankenphp.dev/docs/#homebrew) | formule `dunglas/frankenphp` 1.13.2 | **8.5.12** |

- **Les binaires statiques n'existent qu'avec PHP 8.5.** Pour rester en 8.2, 8.3 ou 8.4 hors Docker, utilisez les paquets deb, rpm ou apk.
- **Mac Intel** : la release ne fournit plus de binaire. Il faut le [compiler](https://frankenphp.dev/docs/static/) avec `build-static.sh`.

Pour vérifier un binaire, lancez `frankenphp version`. La sortie doit indiquer FrankenPHP v1.13.2 et une version corrigée de PHP :

```console
$ frankenphp version
FrankenPHP v1.13.2 PHP 8.5.12 Caddy v2.11.7 …
```

## Les outils de développement

| Outil | Comment récupérer le PHP corrigé | État |
|---|---|---|
| [Symfony CLI](https://symfony.com/doc/current/setup/symfony_cli.html) | il utilise le PHP installé sur la machine : mettez à jour ce PHP | |
| [Laravel Herd](https://herd.laravel.com/docs/macos/getting-started/updates) | `herd php:update 8.5` (remplacez 8.5 par votre branche). La doc prévient que les versions de correctif peuvent arriver avec quelques jours de retard | ⏳ rien d'annoncé |
| [Laravel Sail](https://laravel.com/docs/12.x/sail) | `sail build --no-cache` (image Ubuntu 24.04 avec les dépôts d'Ondřej Surý) | ✅ amd64 ; ⏳ arm64 (Mac Apple Silicon) |
| [DDEV](https://ddev.com/blog/php2shell-what-ddev-users-need-to-know/) | contournement pour amd64 décrit dans le billet ; correctif complet attendu dans la v1.25.5 | ✅ amd64 avec le contournement ; ⏳ arm64 |
| Lando | images [devwithlando/php](https://hub.docker.com/r/devwithlando/php) non reconstruites, encore en 8.5.7 et 8.4.22 | ❌ |
| [WampServer](https://wampserver.aviatechno.net/) | addons PHP 8.2.35, 8.3.36, 8.4.27 et 8.5.12 | ✅ |
| [XAMPP](https://www.apachefriends.org/download.html) | installeurs encore en PHP 8.2.12 | ❌ |
| [static-php-cli](https://dl.static-php.dev/v3/php-bin/) | binaires `common`, `minimal` et `bulk` en 8.2.35, 8.3.36, 8.4.27 et 8.5.12, pour Linux et macOS ; binaires `gnu-bulk` en 8.2.35, 8.3.36, 8.4.27 et 8.5.12, pour Linux ; binaires Windows `spc-min` en 8.2.35, 8.3.36, 8.4.27 et 8.5.12 ; binaires Windows `spc-max` en 8.4.27 et 8.5.12 | ✅ `common`, `minimal`, `bulk`, `gnu-bulk`, Windows `spc-min`, Windows `spc-max` en 8.4 et 8.5 ; ⏳ Windows `spc-max` en 8.2 et 8.3 |

**RoadRunner, Swoole et OpenSwoole n'embarquent pas PHP.** Ils utilisent le PHP de la machine ou de l'image de base : c'est lui qu'il faut mettre à jour.

- ✅ l'image [phpswoole/swoole](https://hub.docker.com/r/phpswoole/swoole) a été reconstruite le 22 octobre ;
- ❌ l'image [openswoole/swoole](https://hub.docker.com/r/openswoole/swoole) n'a pas été reconstruite.

## Les plateformes PaaS et serverless

| Plateforme | Ce qu'il faut faire | Source |
|---|---|---|
| Clever Cloud | ✅ **Rien à faire** : redéploiement automatique en 8.2.35, 8.3.36, 8.4.27 et 8.5.12, et builds corrigés de 7.4.33, 8.0.30 et 8.1.34. FrankenPHP est en 1.13.1 avec PHP corrigé ; la 1.13.2 arrivera avec la prochaine mise à jour de l'image Clever Cloud | [changelog](https://www.clever.cloud/developers/changelog/2026/10-21-php-security-vulnerabilities/), [versions en fin de vie](https://www.clever.cloud/developers/changelog/2026/10-21-php-eol-security-backport/) |
| Upsun | ✅ **Rien à faire** : redéploiement automatique, y compris en 7.4, 8.0 et 8.1. Vérifiez avec `upsun ssh -- php -v` | [billet](https://developer.upsun.com/posts/releases/critical-php-security-patches-upsun-rollout-and-what-to-check) |
| Heroku | ✅ **Redéployez** l'application. Buildpack v298 : 8.2.35 à 8.5.12, et 8.1.34 backporté sur la stack heroku-22 | [changelog](https://devcenter.heroku.com/changelog-items/3845) |
| Laravel Cloud | ✅ **Rien à faire** : corrigé sans redéploiement | [billet](https://laravel.com/blog/php-critical-vulnerability-response-updates) |
| Laravel Forge | ✅ **Bouton « Update PHP »** sur chaque serveur, ou mise à jour en SSH ; ❌ Ubuntu 20.04 et versions antérieures ne peuvent pas être mis à jour | [billet](https://laravel.com/blog/php-critical-vulnerability-response-updates) |
| Laravel Vapor | ✅ **Redéployez** | [billet](https://laravel.com/blog/php-critical-vulnerability-response-updates) |
| Bref | ✅ **`composer update bref/bref -W`, puis redéployez.** Avec des images Docker : `docker build --pull`, puis redéployez | [billet](https://bref.sh/news/06-php-security-release-october-2026) |
| Google App Engine standard | ✅ **Rien à faire** : corrigé automatiquement | [release notes](https://cloud.google.com/appengine/docs/standard/php-gen2/release-notes) |
| Google Cloud Run | ✅ **Redéployez** les services déployés depuis les sources | [release notes](https://cloud.google.com/run/docs/release-notes) |
| Azure App Service (Linux) | ✅ **Rien à faire** sur les canaux Latest et Standard. Avec un conteneur personnalisé, mettez à jour votre image | [billet](https://azure.github.io/AppService/2026/10/21/php-critical-security-release-app-service-linux.html) |

## Vérifier ce qui tourne vraiment

**PHP installé depuis les sources, l'image Docker officielle, Homebrew, ou les dépôts d'Ondřej Surý ou de Remi** : `php -v` affiche directement le bon numéro. Comparez-le à la section [Les versions à viser](#les-versions-à-viser).

**PHP installé avec les paquets de Debian, Ubuntu, RHEL ou de leurs dérivés** : `php -v` affiche l'ancien numéro. Vérifiez plutôt la version du paquet installé. Elle doit être égale ou supérieure à la colonne « Version corrigée » de la section [Linux](#linux).

Sur Debian et Ubuntu :

```bash
dpkg-query -W 'php*-cli'
```

Sur RHEL, AlmaLinux, Rocky Linux et Fedora :

```bash
rpm -qa 'php*-cli*'
```

Sur Alpine :

```bash
apk info -v | grep php
```

**Dans un conteneur**, interrogez le PHP du conteneur en cours d'exécution, après avoir reconstruit l'image avec `--pull` (voir la section [Les images Docker](#les-images-docker)). Remplacez `php` par le nom de votre service Compose :

```bash
docker compose exec php php -v
```

**Enfin, redémarrez tout ce qui exécute PHP.** Un processus déjà lancé garde l'ancienne version en mémoire, même après la mise à jour du paquet :

- PHP-FPM et Apache, si votre gestionnaire de paquets ne l'a pas fait ;
- les workers Messenger et les autres commandes qui tournent en continu ;
- FrankenPHP en mode worker et RoadRunner.

## Pour aller plus loin

- Le [billet de la PHP Foundation](https://thephp.foundation/blog/2026/10/21/todays-php-security-release-and-how-were-strengthening-php-security/) raconte la fuite des détails des failles et la sortie avancée d'un jour.
- Les deux avis de sécurité, [GHSA-w8hw-w9fx-j79w](https://github.com/php/php-src/security/advisories/GHSA-w8hw-w9fx-j79w) et [GHSA-6wmf-4rv5-p3rp](https://github.com/php/php-src/security/advisories/GHSA-6wmf-4rv5-p3rp), donnent tous les détails techniques.
- Le CERT-FR a publié une [alerte en français](https://cert.cyber.gouv.fr/alerte/CERTFR-2026-ALE-014/).
