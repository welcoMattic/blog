---
title: "PHP2Shell: where to get the patched PHP for your setup"
date: 2026-10-22T09:00:00.000Z
description: "Sources, Windows, Linux distributions, macOS, Docker images, FrankenPHP and platforms: where to get PHP 8.5.12, 8.4.27, 8.3.36, 8.2.35, or your distribution's backported fix."
tags:
  - php
  - security
  - php2shell
  - docker
  - frankenphp
  - linux
lang: en
---

_Cet article est aussi disponible en 🇫🇷 Français : [PHP2Shell : où trouver la version corrigée de PHP selon votre installation](/blog/2026-10-22-php2shell-ou-trouver-la-version-corrigee-de-php/)._

> - **EDIT, October 22, 2026, 13:46**:
>     - PHP 8.2 fixed on Alpine 3.21.
>     - static-php-cli `gnu-bulk` binaries fixed, PHP 8.4 on aarch64.
>     - static-php-cli `bulk` binaries fixed, PHP 8.5 on aarch64.
>     - static-php-cli Windows `spc-max` binaries fixed, PHP 8.4 and 8.5.
> - **EDIT, October 22, 2026, 13:17**:
>     - PHP 8.3 fixed on Alpine 3.21.
>     - static-php-cli `gnu-bulk` binaries fixed, PHP 8.4 and 8.5 on x86_64.
>     - static-php-cli `bulk` binaries fixed, PHP 8.4 on aarch64.
> - **EDIT, October 22, 2026, 12:48**:
>     - PHP 8.4 fixed on Alpine 3.23.
>     - Aikido images fixed, PHP 8.2, 8.4 and 8.5.
>     - Aikido `8.3.36-apache` tag fixed.
> - **EDIT, October 22, 2026, 11:44**:
>     - PHP 8.5 fixed on Alpine 3.23.
> - **EDIT, October 22, 2026, 11:29**:
>     - PHP 8.3 fixed on Alpine 3.23.
>     - `dhi.io/php:8.5` tag fixed (Docker Hardened Images).
>     - static-php-cli `bulk` binaries fixed, PHP 8.2 to 8.5.
>     - static-php-cli `gnu-bulk` binaries fixed, PHP 8.2 and 8.3.
>     - static-php-cli Windows `spc-min` binaries fixed, PHP 8.2 to 8.5.

> **TL;DR: the essentials** (status on October 22, 2026, 13:46, Paris time)
>
> **Install PHP 8.5.12, 8.4.27, 8.3.36 or 8.2.35.** These versions fix the 2 vulnerabilities.
>
> PHP 8.1 and older versions do not get a new official release. Some distributions publish a fix for them using source backports from PHP team.
>
> | Platform | ✅ Fixed | ⏳ Fix pending | ❌ No fix |
> |---|---|---|---|
> | **Official sources** |  |  |  |
> | php.net, sources | PHP 8.2 to 8.5 |  |  |
> | php.net, Windows | PHP 8.2 to 8.5 |  |  |
> | **Linux** |  |  |  |
> | Debian | Debian 13: PHP 8.4<br>Debian 12: PHP 8.2<br>Debian 9 to 11: PHP 7.0 to 7.4, with Debian ELTS | Debian testing: PHP 8.4 |  |
> | Ubuntu | Ubuntu 22.04 to 26.10: PHP 8.1 to 8.5<br>Ubuntu 14.04 to 20.04: PHP 5.5 to 7.4, with Ubuntu Pro |  |  |
> | Ondřej Surý's repositories | Ubuntu PPA: PHP 5.6 to 8.5<br>packages.sury.org on amd64: PHP 5.6 to 8.5 | packages.sury.org on arm64 |  |
> | RHEL | RHEL 10: PHP 8.3 and 8.4<br>RHEL 9: PHP 8.0, 8.2 and 8.3<br>RHEL 8: PHP 7.4 and 8.2 | RHEL 9: PHP 8.4 | RHEL 9: PHP 8.1<br>RHEL 8: PHP 7.2, 7.3 and 8.0 |
> | AlmaLinux | All streams: PHP 7.2 to 8.4 |  |  |
> | Rocky Linux | The same versions as RHEL | Rocky 8: PHP 8.2 |  |
> | Remi's repository | PHP 7.4 to 8.5 |  | PHP 5.6 to 7.3 |
> | Fedora | Fedora 44: PHP 8.5 | Fedora 43: PHP 8.4 |  |
> | Amazon Linux | Amazon Linux 2023: PHP 8.2 to 8.5<br>Amazon Linux 2, extra repository: PHP 8.2 |  | Amazon Linux 2023: PHP 8.1<br>Amazon Linux 2, core repository: `php` package |
> | Alpine | Alpine 3.23, 3.24 and edge: PHP 8.3 to 8.5<br>Alpine 3.21: PHP 8.2 and 8.3 |  | Alpine 3.22: PHP 8.2 to 8.4<br>Alpine 3.21: PHP 8.4 |
> | Arch Linux | `php` package: PHP 8.5<br>`php-legacy` package: PHP 8.3 |  |  |
> | SUSE | SLES 15 SP7: PHP 8.3<br>openSUSE Tumbleweed: PHP 8.5 | SLES 16: PHP 8.4 | openSUSE Leap: all versions |
> | **macOS** |  |  |  |
> | Homebrew | PHP 8.2 to 8.5 |  | PHP 8.1 |
> | shivammathur/php tap | PHP 7.4, and PHP 8.1 to 8.5 |  |  |
> | MacPorts | PHP 8.2 to 8.5 |  | PHP 7.4 and 8.1 |
> | **Docker** |  |  |  |
> | Official `php` image | PHP 8.2 to 8.5<br>cli, apache, fpm and zts variants<br>Debian trixie, Debian bookworm, Alpine 3.23 and Alpine 3.24 |  | PHP 7.4, 8.0 and 8.1 |
> | serversideup/php | PHP 8.2 to 8.5, versions v5.0.2 and v4.5.3 |  |  |
> | Chainguard | PHP 8.2 to 8.5 |  |  |
> | Docker Hardened Images | PHP 8.2 to 8.5 |  |  |
> | webdevops/php | PHP 8.2 to 8.5 |  | PHP 8.1 |
> | thecodingmachine/php | PHP 8.2 to 8.5 |  | PHP 8.1 |
> | Bitnami | PHP 8.5, `bitnami/php-fpm:latest` tag |  | PHP 8.2 to 8.4: no free image |
> | ubuntu/php | Ubuntu 24.04: PHP 8.3<br>Ubuntu 26.04: PHP 8.5 |  |  |
> | Red Hat UBI | PHP 7.4, 8.0, 8.2, 8.3 and 8.4 |  | PHP 8.1 |
> | Aikido | PHP 8.2, 8.4 and 8.5<br>PHP 8.3: `8.3.36-apache` tag |  | PHP 8.3: cli and fpm tags |
> | **FrankenPHP** |  |  |  |
> | FrankenPHP 1.13.2 | Static binaries: PHP 8.5<br>Docker images: PHP 8.2 to 8.5<br>deb, rpm and apk packages: PHP 8.2 to 8.5 |  |  |
> | **PaaS and serverless** |  |  |  |
> | Clever Cloud | PHP 7.4 to 8.5<br>**No action necessary.** | FrankenPHP 1.13.2. Until then, FrankenPHP 1.13.1 runs with the fixed PHP. |  |
> | Upsun | PHP 7.4 to 8.5<br>**No action necessary.** |  |  |
> | Heroku | PHP 8.2 to 8.5<br>PHP 8.1 on the heroku-22 stack<br>**Redeploy your application.** |  |  |
> | Laravel Cloud | PHP 8.2 to 8.5<br>**No action necessary.** |  |  |
> | Laravel Forge | **Click "Update PHP" on each server.** |  | Servers with Ubuntu 20.04 and older |
> | Laravel Vapor | PHP 8.2 to 8.5<br>**Redeploy your application.** |  |  |
> | Bref | PHP 8.2 to 8.5<br>**Run `composer update bref/bref -W`, then redeploy.** |  |  |
> | Google App Engine | **No action necessary.** |  |  |
> | Google Cloud Run | **Redeploy the services that you deployed from source.** |  |  |
> | Azure App Service (Linux) | Latest and Standard channels: PHP 8.2 to 8.5<br>**No action necessary.** |  |  |
> | **Development tools** |  |  |  |
> | Symfony CLI | Symfony CLI uses the PHP of your machine.<br>**Update this PHP.** |  |  |
> | Laravel Herd |  | PHP update |  |
> | Laravel Sail | amd64: **run `sail build --no-cache`.** | arm64, for example a Mac with an Apple chip |  |
> | DDEV | amd64: workaround in the DDEV post | arm64 |  |
> | WampServer | PHP 8.2 to 8.5 |  |  |
> | static-php-cli | `common`, `minimal` and `bulk` binaries: PHP 8.2 to 8.5<br>`gnu-bulk` binaries: PHP 8.2 to 8.4<br>`gnu-bulk` binaries on x86_64: PHP 8.5<br>Windows `spc-min` binaries: PHP 8.2 to 8.5<br>Windows `spc-max` binaries: PHP 8.4 and 8.5 | `gnu-bulk` binaries on aarch64: PHP 8.5<br>Windows `spc-max` binaries: PHP 8.2 and 8.3 |  |
> | XAMPP |  |  | The installers still use PHP 8.2.12. |
> | Lando |  |  | The `devwithlando/php` images are not rebuilt. |
>
> **With Docker**: rebuild your images with `docker compose build --pull`.
>
> **After the update**: restart PHP-FPM, Apache and the workers.
>
> ⚠ **On Debian, Ubuntu and RHEL, `php -v` shows the old number, also with the fix.** Check the package version. [See how](#check-what-is-really-running).

On October 21, the PHP team shipped emergency releases: **PHP 8.5.12, 8.4.27, 8.3.36 and 8.2.35**. They fix two vulnerabilities nicknamed PHP2Shell, [CVE-2026-109618](https://github.com/php/php-src/security/advisories/GHSA-w8hw-w9fx-j79w) and [CVE-2026-109619](https://github.com/php/php-src/security/advisories/GHSA-6wmf-4rv5-p3rp). They are RCE (Remote Code Execution) vulnerabilities, which allow running code remotely without authentication (CVSS v4.0 score of 9.2).

According to the [security advisory published on php.net](https://www.php.net/archive/2026.php#2026-10-21-5), **every PHP installation serving web requests is exposed**: PHP-FPM, Apache with mod_php, php-cgi, FrankenPHP or LiteSpeed. The risk is highest with mod_php.

Every distribution, Docker image and platform ships the fix at its own pace. I gathered here, case by case, where to find the patched version.

**Last checked: October 22, 2026, around 13:46 (Paris time).** In the tables:

- ✅ the fix is published;
- ⏳ the fix is pending;
- ❌ no fix is available so far.

## The versions to target

| Branch | Patched version | Security fixes until |
|---|---|---|
| 8.5 | **8.5.12** | 2029-12-31 |
| 8.4 | **8.4.27** | 2028-12-31 |
| 8.3 | **8.3.36** | 2027-12-31 |
| 8.2 | **8.2.35** | 2026-12-31 |
| 8.1, 8.0, 7.4 | ❌ no new release | end of life |

**The PHP team no longer ships releases for 8.1 and older branches.** It still published backports for [7.4](https://github.com/php/php-src/tree/PHP-7.4-CVE-2026-109618-109619), [8.0](https://github.com/php/php-src/tree/PHP-8.0-CVE-2026-109618-109619) and [8.1](https://github.com/php/php-src/tree/PHP-8.1-CVE-2026-109618-109619). These are Git branches, with no tag and no tarball to download. To get a patched package or image for 7.4, 8.0 or 8.1, look for your distribution or your image in the rest of the article.

> **If you are still on a PHP version lower than 8.2, the best way to secure your installations is to upgrade PHP to an actively maintained version: 8.3 (security fixes only), 8.4 or 8.5.**
>
> ⚠ PHP 8.2 reaches its end of life on December 31, 2026.

> ⚠ **On Debian, Ubuntu, RHEL and their derivatives, `php -v` still prints the old number, even with the fix installed.** These distributions backport the fix into their own PHP version. For instance, on Ubuntu 24.04, the patched package prints PHP 8.3.6. To know whether you are up to date, compare the installed package version with the "Patched version" column of the [Linux](#linux) section. The commands that print this version are in the [Check what is really running](#check-what-is-really-running) section.

## If you can't update right away

The [php.net advisory](https://www.php.net/archive/2026.php#2026-10-21-5) lists mitigations. **They reduce exposure, but they don't replace the update.** Here are the main ones.

Against CVE-2026-109619:

- Set `session.upload_progress.enabled=0` in `php.ini`, the FPM pool or the server configuration. `ini_set()` and FPM's `.user.ini` file are not enough.
- On PHP 8.5 only, also set `fatal_error_backtraces=0`.
- **Then restart every PHP worker.**

Against CVE-2026-109618:

- Set `memory_limit=-1`, in a way the application can't change: with `php_admin_value` in the FPM pool or in the Apache configuration.
- Set a low `post_max_size`: `8M`, or `32M` if the application receives file uploads.
- Don't use `RLIMIT_AS` or `RLIMIT_DATA` to limit memory: they can trigger the vulnerability.
- Lower `max_input_nesting_level` (64 by default), for instance to `16`, and `max_input_vars` (1000 by default), for instance to `500`. Set them in `php.ini` or the FPM pool: `ini_set()` can't change them. Check your largest forms first: beyond `max_input_vars`, PHP drops the extra fields.

**These two limits stay useful after the update**: according to the [GHSA-w8hw-w9fx-j79w advisory](https://github.com/php/php-src/security/advisories/GHSA-w8hw-w9fx-j79w), they reduce the risk of memory exhaustion and denial of service.

The [php.net advisory](https://www.php.net/archive/2026.php#2026-10-21-5) also recommends limits at the web server or proxy level: request size, number of fields, number of multipart parts and number of headers.

## The official sources

The tarballs are on [php.net's downloads page](https://www.php.net/downloads.php?source=Y). Each tarball has its SHA256 and its GPG signature (a `.asc` file next to the tarball). The release managers' keys are on the [GPG keys page](https://www.php.net/gpg-keys.php).

| Version | Tarball | GitHub tag |
|---|---|---|
| 8.5.12 | [php-8.5.12.tar.xz](https://www.php.net/distributions/php-8.5.12.tar.xz) | [php-8.5.12](https://github.com/php/php-src/releases/tag/php-8.5.12) |
| 8.4.27 | [php-8.4.27.tar.xz](https://www.php.net/distributions/php-8.4.27.tar.xz) | [php-8.4.27](https://github.com/php/php-src/releases/tag/php-8.4.27) |
| 8.3.36 | [php-8.3.36.tar.xz](https://www.php.net/distributions/php-8.3.36.tar.xz) | [php-8.3.36](https://github.com/php/php-src/releases/tag/php-8.3.36) |
| 8.2.35 | [php-8.2.35.tar.xz](https://www.php.net/distributions/php-8.2.35.tar.xz) | [php-8.2.35](https://github.com/php/php-src/releases/tag/php-8.2.35) |

The tarballs also exist as `.tar.gz` and `.tar.bz2`: just change the extension in the URL.

## Windows

Windows builds are on [php.net's Windows downloads page](https://www.php.net/downloads.php?os=windows). The old windows.php.net address redirects to this page.

Each version comes in Thread Safe and Non Thread Safe, x64 and x86. SHA256 sums are in the [sha256sum.txt](https://downloads.php.net/~windows/releases/sha256sum.txt) file. **These files have no GPG signature.**

| Version | Compiler | x64 Non Thread Safe archive |
|---|---|---|
| 8.5.12 | VS17 | [php-8.5.12-nts-Win32-vs17-x64.zip](https://downloads.php.net/~windows/releases/archives/php-8.5.12-nts-Win32-vs17-x64.zip) |
| 8.4.27 | VS17 | [php-8.4.27-nts-Win32-vs17-x64.zip](https://downloads.php.net/~windows/releases/archives/php-8.4.27-nts-Win32-vs17-x64.zip) |
| 8.3.36 | VS16 | [php-8.3.36-nts-Win32-vs16-x64.zip](https://downloads.php.net/~windows/releases/archives/php-8.3.36-nts-Win32-vs16-x64.zip) |
| 8.2.35 | VS16 | [php-8.2.35-nts-Win32-vs16-x64.zip](https://downloads.php.net/~windows/releases/archives/php-8.2.35-nts-Win32-vs16-x64.zip) |

For the Thread Safe build, remove `-nts` from the file name. For 32 bits, replace `x64` with `x86`.

## Linux

On a server, go through your distribution's package manager. The tables below give the version of the patched package, as `apt`, `dnf` or `apk` prints it.

### Debian and Ubuntu

| Distribution | Package | Patched version | Status |
|---|---|---|---|
| Debian 13 trixie | php8.4 | **8.4.27-1~deb13u1** | ✅ [DSA-6574-1](https://security-tracker.debian.org/tracker/DSA-6574-1) |
| Debian 12 bookworm | php8.2 | **8.2.35-1~deb12u1** | ✅ [DLA-4848-1](https://security-tracker.debian.org/tracker/DLA-4848-1) |
| Debian testing (forky) | php8.4 | 8.4.27-1 | ⏳ waiting for migration from sid ([tracker](https://tracker.debian.org/pkg/php8.4)) |
| Debian 11 bullseye | php7.4 | **7.4.33-1+deb11u14** | ✅ with Debian ELTS, [ELA-1853-1](https://deb.freexian.com/extended-lts/tracker/ELA-1853-1) |
| Debian 10 buster | php7.3 | **7.3.31-1~deb10u16** | ✅ with Debian ELTS, [ELA-1854-1](https://deb.freexian.com/extended-lts/tracker/ELA-1854-1) |
| Debian 9 stretch | php7.0 | **7.0.33-0+deb9u26** | ✅ with Debian ELTS, [ELA-1855-1](https://deb.freexian.com/extended-lts/tracker/ELA-1855-1) |
| Ubuntu 26.10 | php8.5 | **8.5.9-0ubuntu2.1** | ✅ [USN-8948-1](https://ubuntu.com/security/notices/USN-8948-1) |
| Ubuntu 26.04 LTS | php8.5 | **8.5.4-0ubuntu1.5** | ✅ [USN-8948-1](https://ubuntu.com/security/notices/USN-8948-1) |
| Ubuntu 24.04 LTS | php8.3 | **8.3.6-0ubuntu0.24.04.13** | ✅ [USN-8948-1](https://ubuntu.com/security/notices/USN-8948-1) |
| Ubuntu 22.04 LTS | php8.1 | **8.1.2-1ubuntu2.28** | ✅ [USN-8948-1](https://ubuntu.com/security/notices/USN-8948-1) |
| Ubuntu 20.04 | php7.4 | **7.4.3-4ubuntu2.29+esm5** | ✅ with Ubuntu Pro, [USN-8948-2](https://ubuntu.com/security/notices/USN-8948-2) |
| Ubuntu 18.04 | php7.2 | **7.2.24-0ubuntu0.18.04.17+esm14** | ✅ with Ubuntu Pro, [USN-8948-2](https://ubuntu.com/security/notices/USN-8948-2) |
| Ubuntu 16.04 | php7.0 | **7.0.33-0ubuntu0.16.04.16+esm22** | ✅ with Ubuntu Pro, [USN-8948-2](https://ubuntu.com/security/notices/USN-8948-2) |
| Ubuntu 14.04 | php5 | **5.5.9+dfsg-1ubuntu4.29+esm18** | ✅ with Ubuntu Pro, [USN-8948-2](https://ubuntu.com/security/notices/USN-8948-2) |

The full tracking is on [Debian's security tracker](https://security-tracker.debian.org/tracker/CVE-2026-109618) and [Ubuntu's CVE page](https://ubuntu.com/security/CVE-2026-109618).

**Ondřej Surý's repositories** ([packages.sury.org](https://packages.sury.org/php/) for Debian, [ppa:ondrej/php](https://launchpad.net/~ondrej/+archive/ubuntu/php) for Ubuntu):

- ✅ every branch from 5.6 to 8.5 was rebuilt on October 21, including 7.4, 8.0 and 8.1 (for instance 8.1.34-9 for 8.1);
- ✅ the Ubuntu PPA is up to date on every architecture;
- ✅ packages.sury.org is up to date on amd64;
- ⏳ packages.sury.org is still pending on arm64, for most branches;
- ⚠ for 5.6 to 7.1, an [issue](https://codeberg.org/oerdnj/deb.sury.org/issues/146) reports an incomplete fix. A new build has been announced.

### Red Hat and its derivatives

| Distribution | Stream | Patched version | Status |
|---|---|---|---|
| RHEL 10 | php (8.3) | **php-8.3.36-1.el10_2** | ✅ [RHSA-2026:87070](https://access.redhat.com/errata/RHSA-2026:87070) |
| RHEL 10 | php8.4 | **php8.4-8.4.27-1.el10_2** | ✅ [RHSA-2026:87071](https://access.redhat.com/errata/RHSA-2026:87071) |
| RHEL 9 | php (8.0) | **php-8.0.30-8.el9_8.1** | ✅ [RHSA-2026:87151](https://access.redhat.com/errata/RHSA-2026:87151) |
| RHEL 9 | php:8.2 | **php-8.2.35-1** | ✅ [RHSA-2026:87072](https://access.redhat.com/errata/RHSA-2026:87072) |
| RHEL 9 | php:8.3 | **php-8.3.36-1** | ✅ [RHSA-2026:87079](https://access.redhat.com/errata/RHSA-2026:87079) |
| RHEL 9 | php:8.4 | | ⏳ pending ([CVE page](https://access.redhat.com/security/cve/CVE-2026-109618)) |
| RHEL 9 | php:8.1 | | ❌ end of life, no fix ([CVE page](https://access.redhat.com/security/cve/CVE-2026-109618)) |
| RHEL 8 | php:7.4 | **php-7.4.33-8** | ✅ [RHSA-2026:87080](https://access.redhat.com/errata/RHSA-2026:87080) |
| RHEL 8 | php:8.2 | **php-8.2.35-1** | ✅ [RHSA-2026:87073](https://access.redhat.com/errata/RHSA-2026:87073) |
| RHEL 8 | php:7.2, php:7.3, php:8.0 | | ❌ end of life, no fix ([CVE page](https://access.redhat.com/security/cve/CVE-2026-109618)) |

- **Rocky Linux**: ✅ same fixes as RHEL, published on October 22. The advisories have the same numbers, with the RLSA prefix instead of RHSA (for instance [RLSA-2026:87071](https://errata.rockylinux.org/RLSA-2026:87071) for php8.4 on Rocky 10). ⏳ Only php:8.2 on Rocky 8 is still pending.
- **AlmaLinux**: ✅ [all streams are patched](https://almalinux.org/blog/2026-10-21-php2shell-cve-2026-109618-cve-2026-109619/), including end-of-life ones (7.2, 7.3, 8.0 and 8.1).

**Remi's repository** ([rpms.remirepo.net](https://rpms.remirepo.net/)):

- ✅ the EL8, EL9 and EL10 repositories have contained patched packages since October 21: 7.4.33-31, 8.0.30-21, 8.1.34-6, 8.2.35-1, 8.3.36-1, 8.4.27-1 and 8.5.12-1. Their [changelog](https://git.remirepo.net/cgit/rpms/scl-php81/php.git/log/) mentions both CVEs;
- ❌ branches 5.6 to 7.3 are not patched;
- ℹ the php.net advisory said this repository would not be updated on October 21. Remi has not published any post on [his blog](https://blog.remirepo.net/) yet.

### Fedora, Amazon Linux, Alpine, Arch and SUSE

| Distribution | Package | Patched version | Status |
|---|---|---|---|
| Fedora 44 | php | **8.5.12-1.fc44** | ✅ [FEDORA-2026-a9eba4bbc3](https://bodhi.fedoraproject.org/updates/FEDORA-2026-a9eba4bbc3) |
| Fedora 43 | php | 8.4.27-2.fc43 | ⏳ in updates-testing, [FEDORA-2026-d5f8446449](https://bodhi.fedoraproject.org/updates/FEDORA-2026-d5f8446449) |
| Amazon Linux 2023 | php8.2 | **8.2.35-1.amzn2023.0.1** | ✅ [ALAS2023-2026-3301](https://alas.aws.amazon.com/AL2023/ALAS2023-2026-3301.html) |
| Amazon Linux 2023 | php8.3 | **8.3.36-1.amzn2023.0.1** | ✅ [ALAS2023-2026-3302](https://alas.aws.amazon.com/AL2023/ALAS2023-2026-3302.html) |
| Amazon Linux 2023 | php8.4 | **8.4.27-1.amzn2023.0.1** | ✅ [ALAS2023-2026-3303](https://alas.aws.amazon.com/AL2023/ALAS2023-2026-3303.html) |
| Amazon Linux 2023 | php8.5 | **8.5.12-1.amzn2023.0.1** | ✅ [ALAS2023-2026-3304](https://alas.aws.amazon.com/AL2023/ALAS2023-2026-3304.html) |
| Amazon Linux 2023 | php8.1 | | ❌ no fix planned ([CVE page](https://explore.alas.aws.amazon.com/CVE-2026-109618.html)) |
| Amazon Linux 2 | php (extra php8.2) | **8.2.35-1.amzn2.0.1** | ✅ [ALAS2PHP8.2-2026-015](https://alas.aws.amazon.com/AL2/ALAS2PHP8.2-2026-015.html) |
| Amazon Linux 2 | php (core repository) | | ❌ no fix planned ([CVE page](https://explore.alas.aws.amazon.com/CVE-2026-109618.html)) |
| Alpine edge and 3.24 | php83, php84, php85 | **8.3.36-r0, 8.4.27-r0, 8.5.12-r0** | ✅ [3.24 packages](https://pkgs.alpinelinux.org/packages?name=php8*&branch=v3.24&repo=community&arch=x86_64), [edge packages](https://pkgs.alpinelinux.org/packages?name=php8*&branch=edge&repo=community&arch=x86_64) |
| Alpine 3.23 | php83, php84, php85 | **8.3.36-r0, 8.4.27-r0, 8.5.12-r0** | ✅ [3.23 packages](https://pkgs.alpinelinux.org/packages?name=php8*&branch=v3.23&repo=community&arch=x86_64) |
| Alpine 3.22 | php82, php83, php84 | | ❌ no fix so far ([3.22 packages](https://pkgs.alpinelinux.org/packages?name=php8*&branch=v3.22&repo=community&arch=x86_64)) |
| Alpine 3.21 | php82 | **8.2.35-r0** | ✅ [3.21 packages](https://pkgs.alpinelinux.org/packages?name=php82&branch=v3.21&repo=community&arch=x86_64) |
| Alpine 3.21 | php83 | **8.3.36-r0** | ✅ [3.21 packages](https://pkgs.alpinelinux.org/packages?name=php83&branch=v3.21&repo=community&arch=x86_64) |
| Alpine 3.21 | php84 | | ❌ no fix so far |
| Arch Linux | php | **8.5.12-1** | ✅ [ASA-202610-1](https://security.archlinux.org/ASA-202610-1) |
| Arch Linux | php-legacy | **8.3.36-1** | ✅ [ASA-202610-2](https://security.archlinux.org/ASA-202610-2) |
| SLES 15 SP7 | php8 | **8.3.36** | ✅ [SUSE CVE page](https://www.suse.com/security/cve/CVE-2026-109618.html) |
| SLES 16.0 | php8 | 8.4.27 | ⏳ in QA ([SUSE CVE page](https://www.suse.com/security/cve/CVE-2026-109618.html)) |
| openSUSE Tumbleweed | php8 | **8.5.12** | ✅ [update repository](https://download.opensuse.org/update/tumbleweed/x86_64/) |
| openSUSE Leap | php8, php7 | | ❌ no fix so far ([SUSE CVE page](https://www.suse.com/security/cve/CVE-2026-109618.html)) |

**On Amazon Linux 2023, a plain `dnf update` is not enough**: the repository version is locked. The ALAS advisories (for instance [ALAS2023-2026-3303](https://alas.aws.amazon.com/AL2023/ALAS2023-2026-3303.html)) give the command, here for the php8.4 package:

```bash
dnf update php8.4 --releasever 2023.12.20261021
```

The official `php:*-alpine` Docker images don't use Alpine packages: they compile PHP themselves. They are already patched, see the [Docker images](#docker-images) section.

## macOS

| Package manager | Package | Patched version | Status |
|---|---|---|---|
| Homebrew | [php](https://formulae.brew.sh/formula/php) | **8.5.12** | ✅ |
| Homebrew | [php@8.4](https://formulae.brew.sh/formula/php@8.4) | **8.4.27** | ✅ |
| Homebrew | [php@8.3](https://formulae.brew.sh/formula/php@8.3) | **8.3.36** | ✅ |
| Homebrew | [php@8.2](https://formulae.brew.sh/formula/php@8.2) | **8.2.35** | ✅ |
| Homebrew | [php@8.1](https://formulae.brew.sh/formula/php@8.1) | | ❌ deprecated formula, no fix |
| [shivammathur/php](https://github.com/shivammathur/homebrew-php) tap | php, php@8.4, php@8.3, php@8.2 | **8.5.12, 8.4.27, 8.3.36, 8.2.35** | ✅ |
| [shivammathur/php](https://github.com/shivammathur/homebrew-php) tap | [php@8.1](https://github.com/shivammathur/homebrew-php/blob/main/Formula/php@8.1.rb), [php@7.4](https://github.com/shivammathur/homebrew-php/blob/main/Formula/php@7.4.rb) | **8.1.34_4, 7.4.33_16** (backport) | ✅ |
| MacPorts | [php85](https://ports.macports.org/port/php85/), [php84](https://ports.macports.org/port/php84/), [php83](https://ports.macports.org/port/php83/), [php82](https://ports.macports.org/port/php82/) | **8.5.12, 8.4.27, 8.3.36, 8.2.35** | ✅ |
| MacPorts | [php81](https://ports.macports.org/port/php81/), [php74](https://ports.macports.org/port/php74/) | | ❌ no fix so far |

With Homebrew, upgrade the formula you use, for instance `brew upgrade php@8.4`.

## Docker images

### The official php image

The [official `php` image](https://hub.docker.com/_/php) is ✅ rebuilt in all its variants ([update commit](https://github.com/docker-library/php/commit/f6048b5f6e3c2202ee082665a4ccc0d90de291a3)):

- cli, apache, fpm and zts;
- on Debian trixie (the default base) and on Debian bookworm;
- on Alpine 3.23 and 3.24, without the apache variant.

| Branch | Floating tag examples | Precise tag examples |
|---|---|---|
| 8.5 | `8.5`, `8.5-fpm`, `8.5-apache`, `latest`, `fpm-alpine` | `8.5.12-fpm`, `8.5.12-zts-bookworm` |
| 8.4 | `8.4`, `8.4-fpm`, `8.4-fpm-alpine`, `8.4-zts` | `8.4.27-fpm`, `8.4.27-fpm-alpine3.24` |
| 8.3 | `8.3`, `8.3-fpm`, `8.3-fpm-alpine`, `8.3-apache` | `8.3.36-cli`, `8.3.36-apache-trixie` |
| 8.2 | `8.2`, `8.2-fpm`, `8.2-fpm-alpine`, `8.2-apache` | `8.2.35-fpm`, `8.2.35-cli-alpine3.23` |

**Your tag already points to the patched version, but Docker uses the image it has in cache.** On a machine or a CI runner that already downloaded `php:8.4-fpm`, a `FROM php:8.4-fpm` rebuilds on the old 8.4.26. Add `--pull` to the build to force downloading the new image:

```bash
docker compose build --pull
docker compose up -d
```

If your `compose.yaml` uses the image as is, without a build step, run `docker compose pull` before `docker compose up -d`.

Other cases keep the old version:

- **Kubernetes**: with `imagePullPolicy: IfNotPresent` and a floating tag, each node keeps the image it has in cache.
- **Image pinned by digest** (`php:8.4-fpm@sha256:…`): it stays vulnerable. Replace the digest.
- **Image pinned by version** (`php:8.4.26-fpm`): it stays vulnerable. Move to `php:8.4.27-fpm`.
- **PHP 8.1, 8.0 and 7.4**: ❌ the `8.1`, `8.0` and `7.4` tags of the official image are no longer rebuilt. There is no patched official image for these versions.

### Other images

| Image | Tags | Source |
|---|---|---|
| [serversideup/php](https://hub.docker.com/r/serversideup/php) | ✅ v5.0.2 (`8.4-fpm-nginx`, `8.4.27-fpm-nginx-alpine`, etc.) and v4.5.3 (`*-v4.5.3` tags), from 8.2 to 8.5 | [v5.0.2 release](https://github.com/serversideup/docker-php/releases/tag/v5.0.2), [v4.5.3 release](https://github.com/serversideup/docker-php/releases/tag/v4.5.3) |
| Chainguard `cgr.dev/chainguard/php` | ✅ `latest` (8.5.12), `8.4.27`, `8.3.36`, `8.2.35`, with their `-fpm` and `-dev` variants | [image page](https://images.chainguard.dev/directory/image/php/overview) |
| Docker Hardened Images `dhi.io/php` | ✅ `8.5.12`, `8.4.27`, `8.3.36`, `8.2.35` (Debian 13 and Alpine), including the `8.5` tag | [tag log](https://github.com/docker-hardened-images/log/tree/main/dhi/php) |
| [webdevops/php](https://hub.docker.com/r/webdevops/php), `php-nginx`, `php-apache` | ✅ `8.2` to `8.5` and their `-alpine` variants; ❌ `8.1` | [tags](https://hub.docker.com/r/webdevops/php/tags) |
| [thecodingmachine/php](https://hub.docker.com/r/thecodingmachine/php) | ✅ `8.2-v5-*` to `8.5-v5-*`; ❌ `8.1-v5-*` | [tags](https://hub.docker.com/r/thecodingmachine/php/tags) |
| [bitnami/php-fpm](https://hub.docker.com/r/bitnami/php-fpm) | ✅ `latest` (8.5.12) only; ❌ no free tag for 8.4, 8.3 and 8.2 | [Dockerfile](https://github.com/bitnami/containers/tree/main/bitnami/php-fpm) |
| [ubuntu/php](https://hub.docker.com/r/ubuntu/php) | ✅ `8.3-24.04` (backported package 8.3.6-0ubuntu0.24.04.13) and `8.5-26.04_edge` | [USN-8948-1](https://ubuntu.com/security/notices/USN-8948-1) |
| Red Hat UBI | ✅ `ubi10/php-84`, `ubi10/php-83`, `ubi9/php-83`, `ubi9/php-82`, `ubi9/php-80`, `ubi8/php-82`, `ubi8/php-74`; ❌ `ubi9/php-81` | [Red Hat catalog](https://catalog.redhat.com/software/containers/search?q=php) |
| Aikido `aikido-dev/php` | ✅ `8.5.12`, `8.4.27` and `8.2.35`, with their cli, fpm, apache and alpine variants; `8.3.36-apache` for 8.3; ❌ no 8.3.36 tag for cli or fpm | [Aikido catalog](https://images.aikido.dev/images/php) |

**For PHP 8.0 and 7.4**, the only patched images I found are Red Hat's: `ubi9/php-80` and `ubi8/php-74`. They ship RHEL's backports.

## FrankenPHP

**Move to [FrankenPHP 1.13.2](https://github.com/php/frankenphp/releases/tag/v1.13.2), released on October 21.** It embeds the patched PHP versions. It also fixes four FrankenPHP-specific vulnerabilities.

⚠ The `1.13.1` Docker tag was rebuilt with PHP 8.5.12. PHP is patched there, but not the four FrankenPHP-specific vulnerabilities.

| Installation | Where to find it | Embedded PHP |
|---|---|---|
| Static binary (Linux x86_64 and aarch64, macOS arm64, Windows) | assets of the [v1.13.2 release](https://github.com/php/frankenphp/releases/tag/v1.13.2) | **8.5.12** only |
| Docker image | [dunglas/frankenphp](https://hub.docker.com/r/dunglas/frankenphp): `1.13.2`, `php8.5`, `php8.4`, `php8.3`, `php8.2`, with or without the `-alpine` or `-bookworm` suffix | **8.5.12, 8.4.27, 8.3.36, 8.2.35** |
| [deb](https://frankenphp.dev/docs/#deb-packages), [rpm](https://frankenphp.dev/docs/#rpm-packages) and [apk](https://frankenphp.dev/docs/#apk-packages) packages | `frankenphp` 1.13.2 package, one per PHP branch | **8.2 to 8.5** |
| [Homebrew](https://frankenphp.dev/docs/#homebrew) | `dunglas/frankenphp` 1.13.2 formula | **8.5.12** |

- **Static binaries only exist with PHP 8.5.** To stay on 8.2, 8.3 or 8.4 outside Docker, use the deb, rpm or apk packages.
- **Intel Macs**: the release no longer ships a binary. You have to [build it](https://frankenphp.dev/docs/static/) with `build-static.sh`.

To check a binary, run `frankenphp version`. The output must show FrankenPHP v1.13.2 and a patched PHP version:

```console
$ frankenphp version
FrankenPHP v1.13.2 PHP 8.5.12 Caddy v2.11.7 …
```

## Development tools

| Tool | How to get the patched PHP | Status |
|---|---|---|
| [Symfony CLI](https://symfony.com/doc/current/setup/symfony_cli.html) | it uses the PHP installed on the machine: update that PHP | |
| [Laravel Herd](https://herd.laravel.com/docs/macos/getting-started/updates) | `herd php:update 8.5` (replace 8.5 with your branch). The docs warn that patch versions can lag a few days behind | ⏳ nothing announced |
| [Laravel Sail](https://laravel.com/docs/12.x/sail) | `sail build --no-cache` (Ubuntu 24.04 image with Ondřej Surý's repositories) | ✅ amd64; ⏳ arm64 (Apple Silicon Macs) |
| [DDEV](https://ddev.com/blog/php2shell-what-ddev-users-need-to-know/) | amd64 workaround described in the post; full fix expected in v1.25.5 | ✅ amd64 with the workaround; ⏳ arm64 |
| Lando | [devwithlando/php](https://hub.docker.com/r/devwithlando/php) images not rebuilt, still on 8.5.7 and 8.4.22 | ❌ |
| [WampServer](https://wampserver.aviatechno.net/) | PHP 8.2.35, 8.3.36, 8.4.27 and 8.5.12 addons | ✅ |
| [XAMPP](https://www.apachefriends.org/download.html) | installers still on PHP 8.2.12 | ❌ |
| [static-php-cli](https://dl.static-php.dev/v3/php-bin/) | `common`, `minimal` and `bulk` binaries in 8.2.35, 8.3.36, 8.4.27 and 8.5.12, for Linux and macOS; `gnu-bulk` binaries in 8.2.35, 8.3.36 and 8.4.27, for Linux, and in 8.5.12, for Linux x86_64; Windows `spc-min` binaries in 8.2.35, 8.3.36, 8.4.27 and 8.5.12; Windows `spc-max` binaries in 8.4.27 and 8.5.12 | ✅ `common`, `minimal`, `bulk`, `gnu-bulk` for 8.2 to 8.4, `gnu-bulk` for 8.5 on x86_64, Windows `spc-min`, Windows `spc-max` for 8.4 and 8.5; ⏳ `gnu-bulk` for 8.5 on aarch64, Windows `spc-max` for 8.2 and 8.3 |

**RoadRunner, Swoole and OpenSwoole don't ship PHP.** They use the machine's or the base image's PHP: that is the one to update.

- ✅ the [phpswoole/swoole](https://hub.docker.com/r/phpswoole/swoole) image was rebuilt on October 22;
- ❌ the [openswoole/swoole](https://hub.docker.com/r/openswoole/swoole) image was not rebuilt.

## PaaS and serverless platforms

| Platform | What to do | Source |
|---|---|---|
| Clever Cloud | ✅ **Nothing to do**: automatic redeploy on 8.2.35, 8.3.36, 8.4.27 and 8.5.12, and patched builds of 7.4.33, 8.0.30 and 8.1.34. FrankenPHP is on 1.13.1 with patched PHP; 1.13.2 will come with the next Clever Cloud image update | [changelog](https://www.clever.cloud/developers/changelog/2026/10-21-php-security-vulnerabilities/), [end-of-life versions](https://www.clever.cloud/developers/changelog/2026/10-21-php-eol-security-backport/) |
| Upsun | ✅ **Nothing to do**: automatic redeploy, 7.4, 8.0 and 8.1 included. Check with `upsun ssh -- php -v` | [post](https://developer.upsun.com/posts/releases/critical-php-security-patches-upsun-rollout-and-what-to-check) |
| Heroku | ✅ **Redeploy** the application. Buildpack v298: 8.2.35 to 8.5.12, and 8.1.34 backported on the heroku-22 stack | [changelog](https://devcenter.heroku.com/changelog-items/3845) |
| Laravel Cloud | ✅ **Nothing to do**: patched without redeploy | [post](https://laravel.com/blog/php-critical-vulnerability-response-updates) |
| Laravel Forge | ✅ **"Update PHP" button** on each server, or update over SSH; ❌ Ubuntu 20.04 and older can't be updated | [post](https://laravel.com/blog/php-critical-vulnerability-response-updates) |
| Laravel Vapor | ✅ **Redeploy** | [post](https://laravel.com/blog/php-critical-vulnerability-response-updates) |
| Bref | ✅ **`composer update bref/bref -W`, then redeploy.** With Docker images: `docker build --pull`, then redeploy | [post](https://bref.sh/news/06-php-security-release-october-2026) |
| Google App Engine standard | ✅ **Nothing to do**: patched automatically | [release notes](https://cloud.google.com/appengine/docs/standard/php-gen2/release-notes) |
| Google Cloud Run | ✅ **Redeploy** the services deployed from source | [release notes](https://cloud.google.com/run/docs/release-notes) |
| Azure App Service (Linux) | ✅ **Nothing to do** on the Latest and Standard channels. With a custom container, update your image | [post](https://azure.github.io/AppService/2026/10/21/php-critical-security-release-app-service-linux.html) |

## Check what is really running

**PHP installed from source, the official Docker image, Homebrew, or Ondřej Surý's or Remi's repositories**: `php -v` prints the right number directly. Compare it with [The versions to target](#the-versions-to-target) section.

**PHP installed with Debian, Ubuntu, RHEL or derivative packages**: `php -v` prints the old number. Check the installed package version instead. It must be equal to or higher than the "Patched version" column of the [Linux](#linux) section.

On Debian and Ubuntu:

```bash
dpkg-query -W 'php*-cli'
```

On RHEL, AlmaLinux, Rocky Linux and Fedora:

```bash
rpm -qa 'php*-cli*'
```

On Alpine:

```bash
apk info -v | grep php
```

**In a container**, ask the PHP of the running container, after rebuilding the image with `--pull` (see the [Docker images](#docker-images) section). Replace `php` with the name of your Compose service:

```bash
docker compose exec php php -v
```

**Finally, restart everything that runs PHP.** A process that is already running keeps the old version in memory, even after the package update:

- PHP-FPM and Apache, if your package manager didn't;
- Messenger workers and other long-running commands;
- FrankenPHP in worker mode and RoadRunner.

## Going further

- The [PHP Foundation's post](https://thephp.foundation/blog/2026/10/21/todays-php-security-release-and-how-were-strengthening-php-security/) tells the story of the leaked vulnerability details and the release moved forward by a day.
- The two security advisories, [GHSA-w8hw-w9fx-j79w](https://github.com/php/php-src/security/advisories/GHSA-w8hw-w9fx-j79w) and [GHSA-6wmf-4rv5-p3rp](https://github.com/php/php-src/security/advisories/GHSA-6wmf-4rv5-p3rp), give all the technical details.
- The UK's NCSC published an [alert](https://www.ncsc.gov.uk/news/critical-security-issue-affecting-php).
