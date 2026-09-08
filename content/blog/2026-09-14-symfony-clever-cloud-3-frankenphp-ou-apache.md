---
title: "Symfony sur Clever Cloud #3 : FrankenPHP, et quand rester sur Apache"
date: 2026-09-14T09:00:00.000Z
unlisted: true
description: "3e article d'une série sur le déploiement d'une application Symfony évolutive sur le PaaS Clever Cloud"
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
  order: 3
  label: "FrankenPHP, et quand rester sur Apache"
---

_This blog post is also available in 🇬🇧 English: [Symfony on Clever Cloud #3: FrankenPHP, and when to stay on Apache](/blog/2026-09-14-symfony-clever-cloud-3-frankenphp-or-apache/)._

> **Transparence.** Je suis ambassadeur Clever Cloud. J'écris cette série en toute indépendance, personne chez eux ne relit cette série, et je m'y autorise les mêmes critiques que sur n'importe quelle autre plateforme.

À la fin [du deuxième article de cette série](/blog/2026-09-08-symfony-clever-cloud-2-premier-deploiement/), une application Symfony 8.1 tournait en production sur Clever Cloud : Apache en frontal, PHP-FPM derrière, une base PostgreSQL managée, des migrations et un healthcheck, sur le runtime `php`.

Aujourd'hui, on refait le même déploiement sur le runtime `frankenphp` de ce <abbr title="Platform as a Service">PaaS</abbr>, à côté du premier plutôt qu'à sa place.

Deux choses cassent en changeant de runtime, et elles structurent la suite. Le mode worker, qui garde votre application en mémoire et vous rend responsable de ce que PHP effaçait à la fin de chaque requête. Et les sessions : le runtime `php` leur monte un stockage partagé entre instances sans rien vous demander, le runtime `frankenphp` ne le fait pas, et vos utilisateurs se déconnectent sans un message d'erreur.

## FrankenPHP en quelques mots

**[FrankenPHP](https://frankenphp.dev/) est un serveur d'application PHP écrit en Go, initié par [Kévin Dunglas](https://dunglas.dev/).** Il embarque l'interpréteur officiel de PHP dans le serveur web [Caddy](https://caddyserver.com/) et supprime le processus séparé qu'était PHP-FPM : un seul binaire fait le serveur web et l'exécution du code.

Deux modes cohabitent. Le mode **classic** exécute votre script à chaque requête puis nettoie tout, l'équivalent fonctionnel de PHP-FPM. Le mode **worker** démarre votre application une fois, la garde en mémoire, et lui passe les requêtes dans une boucle : le modèle de [Laravel Octane](https://laravel.com/framework/docs/octane) et de [RoadRunner](https://roadrunner.dev/), celui que Node et Go pratiquent depuis toujours.

## Créer la seconde application

**Il n'existe pas de `clever env set CC_RUNTIME frankenphp`.** Le runtime se choisit à la création et ne change plus : passer de `php` à `frankenphp`, c'est créer une deuxième application, avec sa configuration, son domaine et sa facture. L'ancienne continue de tourner, ce qui tombe bien quand on veut comparer.

```bash
clever create --type frankenphp symfony-clever-franken --region par --alias franken
```

Le `--alias` (ou `-a`) n'est pas décoratif : `clever create` ajoute une seconde entrée au `.clever.json`, et toutes les commandes qui suivent doivent dire de quelle application elles parlent. Sans `-a`, la CLI ne pose pas de question, elle refuse :

```
[ERROR] Several applications are linked. You can specify one with the "--alias" option.
```

`clever make-default franken` évite la répétition, mais je garde `-a` partout : nommer l'application à qui l'on parle vaut mieux qu'un défaut invisible. Dernier détail, le type d'instance par défaut de ce runtime est `XS`.

## Le déploiement, variable par variable

C'est le passage le plus fastidieux, et celui où les mauvaises surprises se cachent : rien ne signale une variable sans effet. Elle est acceptée, elle apparaît dans `clever env`, elle ne fait rien. Ce qui n'est pas grave en soi, mais procédons soigneusement.

### Ce qui se transpose tel quel

```bash
clever env set -a franken CC_WEBROOT "/public"
clever env set -a franken CC_PHP_VERSION "8.4"
clever env set -a franken CC_COMPOSER_VERSION "2"
clever env set -a franken CC_HEALTH_CHECK_PATH "/cc-health"
clever env set -a franken CC_POST_BUILD_HOOK "./clevercloud/post-build-frankenphp.sh"
clever env set -a franken APP_ENV "prod"
clever env set -a franken APP_SECRET "$(openssl rand -hex 32)"
```

**`CC_WEBROOT`** ne change pas de rôle, et reste indispensable. Cette variable **doit** pointer vers le point d'entrée HTTP de l'application, pour nous `public/`, le dossier où Caddy ira chercher `index.php`.

**Les cinq hooks de déploiement** sont les mêmes, et leur `php bin/console` appelle en réalité `frankenphp php-cli bin/console` en dessous. Comme ce sont des variables d'environnement, elles appartiennent à l'application sur la plateforme et non au dépôt de code : c'est ainsi que deux applications nées de la même branche exécutent des hooks différents, `clevercloud/post-build.sh` d'un côté pour la version Apache/PHP-FPM, `clevercloud/post-build-frankenphp.sh` de l'autre pour FrankenPHP.

**Le healthcheck** passe au premier déploiement, sans une ligne de configuration en plus :

```
Response from GET {:url=>"/cc-health", :expected_response=>200...300} is 200
```

**Les proxys de confiance** ne bougent pas : `CC_REVERSE_PROXY_IPS` est injectée de la même façon, les Load Balancers terminent le <abbr title="Transport Layer Security">TLS</abbr> de la même façon, et le `TRUSTED_PROXIES` reste valable.

### Ce qui change de place

**Le fichier `public/.htaccess`** devient inerte, Caddy ne le lit pas, et ce n'est pas une perte : dans le `Caddyfile` par défaut du runtime, la directive `php_server` essaie `{path}`, puis `{path}/index.php`, puis `index.php`, et le contrôleur frontal est atteint sans une règle de réécriture.

**Le fichier `public/.user.ini`** ne suit pas, et c'est le piège le plus discret ici. Ce fichier n'est lu que par [les interfaces CGI et FastCGI de PHP](https://www.php.net/manual/en/configuration.file.per-user.php) ; FrankenPHP n'en est pas une et ne lira jamais ce fichier. L'équivalent est un `php.ini` à la racine, que FrankenPHP charge automatiquement. Les deux fichiers cohabitent sans se marcher dessus : le runtime `php` ne lit que le `.user.ini` du webroot, un `php.ini` posé à la racine n'est pas sur son chemin de recherche, et une requête suffit à le vérifier : `ini_get()` ignore ses directives et applique celles du `.user.ini`. Un hook qui exporte `PHP_INI_SCAN_DIR`, la méthode documentée pour que le PHP-CLI voie le `.user.ini`, fait exception : le dossier indiqué est scanné en entier, `php.ini` compris, mais pour ce seul processus en ligne de commande, pas pour Apache.

```ini
; php.ini, à la racine du dépôt. public/.user.ini reste en place pour Apache.
date.timezone = "Europe/Paris"
```

C'est aussi par ce fichier que passent `memory_limit` et les directives `opcache.*`, la variable `MEMORY_LIMIT` et les `CC_OPCACHE_*` n'étant [documentées](https://www.clever.cloud/developers/doc/reference/reference-environment-variables/) que pour le runtime `php`.

Le réglage fin de PHP-FPM, lui, disparaît avec le changement de runtime : **`CC_CONFIGURATION_PM_MAX_CHILDREN`** n'a plus d'objet, remplacée par des threads PHP dont le nombre par défaut vaut deux fois le nombre de <abbr title="Central Processing Unit">CPU</abbr> et se règle dans le `Caddyfile`. Un thread qui garde une application Symfony en mémoire consomme, et multiplier les threads multiplie cette consommation.

### Le piège : les auto-scripts de Composer ne tournent pas

Les options de Composer ne changent pas de nom : les deux runtimes documentent les mêmes flags de base, `--no-interaction --no-progress --no-scripts`, et la même variable `CC_PHP_COMPOSER_FLAGS` pour les remplacer. Ce qui change, c'est le comportement, et ça se lit dans les logs de build.

Sur le runtime `php`, les `auto-scripts` de Flex s'exécutent :

```
Executing script cache:clear [OK]
Executing script assets:install public [OK]
Executing script importmap:install [OK]
```

Sur le runtime `frankenphp`, aucune de ces lignes, ce qui est d'ailleurs le comportement annoncé : la surprise est plutôt que le runtime `php` les exécute malgré son propre `--no-scripts`. Or notre `composer.json` déclare `importmap:install` dans ses `auto-scripts`, et c'est cette commande qui télécharge les paquets JavaScript de l'[importmap](https://symfony.com/doc/current/frontend/asset_mapper.html) dans `assets/vendor/`. Sans elle, le hook de post-build s'arrête net sur la compilation des assets :

```
The "@hotwired/stimulus" vendor asset is missing. Try running the "importmap:install" command.
[ERROR] POST_BUILD_HOOK failed, aborting
[ERROR] Deploy failed
```

Le piège est bruyant, bonne nouvelle : le déploiement est rouge, pas silencieusement cassé. La correction tient en une ligne, à ajouter au hook avant `asset-map:compile` :

```bash
php bin/console importmap:install
```

Faut-il reporter les deux autres auto-scripts pendant qu'on y est ? Ici, non : `cache:clear` fait double emploi avec le `cache:warmup` que le hook exécute déjà, et `assets:install public` répond `No assets were provided by any bundle` tant qu'aucun bundle n'expose de fichiers publics. La règle, elle, ne dépend pas de ce projet : relisez vos `auto-scripts` et reportez dans le hook ceux qui produisent un artefact de build.

L'autre chemin est de rendre les scripts à Composer, avec `CC_PHP_COMPOSER_FLAGS="--no-interaction --no-progress"`. Je préfère la ligne explicite dans le hook : elle dit ce qu'elle fait, et elle ne dépend pas d'un `composer.json` que plus personne ne relit.

### Brancher la base, et déployer

Chaque application a sa propre base. Sans add-on lié, `POSTGRESQL_ADDON_URI` n'est pas injectée, Doctrine retombe sur le `DATABASE_URL` du `.env` et le post-build échoue.

```bash
clever addon create postgresql-addon symfony-clever-franken-db \
  --plan dev --region par --link franken
```

Un add-on garde la version de PostgreSQL reçue à sa création : lisez `POSTGRESQL_ADDON_VERSION` dans la sortie de `clever addon env symfony-clever-franken-db` plutôt que de recopier un chiffre.

Reste à déployer.

```bash
git add .clever.json php.ini clevercloud/post-build-frankenphp.sh
git commit -m "Déployer la même application sur le runtime FrankenPHP"
clever deploy -a franken
clever open -a franken
```

## Le mode worker, et ses pièges

Ce qu'on a déployé jusqu'ici tourne en mode classic : un serveur web différent, un modèle d'exécution identique. [Le mode worker](https://frankenphp.dev/docs/worker/), c'est autre chose, et une variable suffit à l'activer :

```bash
clever env set -a franken CC_FRANKENPHP_WORKER "/public/index.php"
```

Le chemin s'écrit depuis la racine du projet, et le script doit se trouver dans le webroot. Un worker rangé ailleurs démarre quand même : il ne reçoit simplement jamais de requête, ce qui est plus long à diagnostiquer qu'un échec au démarrage.

Côté Symfony, il n'y a rien à installer. [`symfony/runtime`](https://symfony.com/doc/current/components/runtime.html), posé par le squelette, repère le `FRANKENPHP_WORKER` que FrankenPHP place dans le `$_SERVER` du script et bascule sur un `FrankenPhpWorkerRunner` qui boucle sur `frankenphp_handle_request()`. Cette détection est native depuis Symfony 7.4.

**Le mode worker n'est pas un réglage de performance, c'est un changement de contrat.** PHP offrait depuis toujours une garantie que personne ne formulait tant elle allait de soi : à la fin de chaque requête, tout disparaît, les variables, les objets, les connexions, les fuites. Le mode worker la retire.

### Ce que Symfony nettoie, et ce qu'il ne nettoie pas

Le framework en fait plus qu'on ne croit, et moins qu'on ne l'espère.

**Par défaut, entre deux requêtes, Symfony appelle `reset()` sur tous les services qui implémentent [`ResetInterface`](https://symfony.com/doc/current/reference/dic_tags.html#kernel-reset).** Il n'y a aucune variable à poser : le noyau garde un `services_resetter` et le déclenche au début de la requête suivante. Les services du framework sont couverts, ce sont les vôtres qu'il faut passer en revue et faire implémenter cette interface.

**`FRANKENPHP_RESET_KERNEL`, apparue avec Symfony 8.1, va plus loin : elle jette le noyau et son conteneur après chaque requête.** La suivante en reconstruit un neuf, donc rien de ce qui vivait dans un service ne survit, qu'il implémente `ResetInterface` ou pas. Si elle n'est pas active par défaut, c'est qu'elle fait repayer le démarrage du noyau à chaque requête, c'est-à-dire une bonne part de ce que le mode worker était venu chercher.

**Ni l'une ni l'autre ne touche à ce qui n'appartient pas au conteneur.** Une variable `static` dans une fonction, une propriété statique de classe, une globale du script worker, `$_ENV` qui est la seule superglobale que FrankenPHP ne réinitialise pas : ces états sont attachés à la classe ou au processus, pas à un objet, et aucun clonage de noyau ne les remet à zéro.

Reste un garde-fou, **`FRANKENPHP_LOOP_MAX`**, qui fixe le nombre de requêtes après lequel le worker s'arrête et se fait relancer : 500 par défaut, 0 signifiant jamais.

### Ce qui reste à votre charge

Un `static $cache = [];` qui n'avait jamais eu besoin de borne devient une fuite. Un service qui mémorise l'utilisateur courant ou la locale, sans implémenter `ResetInterface`, le conserve maintenant à la requête suivante de façon plausible, ce qui est pire qu'une erreur franche.

Pour ne pas les chercher à la main, [Igor PHP](https://github.com/igor-php/igor-php) est un analyseur statique conçu pour ce cas : services sans `ResetInterface`, propriétés qui gardent un état, statiques locales modifiables, appels à `exit()`, écritures dans les superglobales. Il inspecte aussi `vendor/`, et c'est là son vrai apport.

```bash
composer require --dev igor-php/igor-php
vendor/bin/igor-php .
```

`exit()` et `die()`, justement : sous PHP-FPM, `die('erreur')` termine la requête ; dans un worker, il termine le worker, qui est un thread et non un processus. FrankenPHP le relance au prix d'un démarrage complet, et chaque appel à cette route paie ce redémarrage.

Les connexions, enfin. Une connexion ouverte au démarrage du worker vit maintenant des heures, et elle traverse le proxy que Clever place devant les bases PostgreSQL, celui-là même que l'accès direct court-circuite. Une connexion laissée inactive peut être fermée de l'autre côté sans que votre application le remarque, et aucun délai n'est documenté. La protection est dans [DoctrineBundle](https://symfony.com/bundles/DoctrineBundle/current/configuration.html), qui ferme en début de requête toute connexion inactive depuis plus de `idle_connection_ttl`, 600 secondes par défaut : baissez cette valeur si vous voyez des connexions coupées après les heures creuses.

Aucun de ces pièges ne se voit à la première requête. C'est la mémoire de l'instance, regardée sur plusieurs heures de trafic réel, qui les révèle.

## Les sessions, le piège qui coûte le plus cher

Par défaut, Symfony s'en remet au gestionnaire natif de PHP, qui écrit les sessions là où pointe `session.save_path`. Sur le runtime `php`, la plateforme y monte un [FS Bucket](https://www.clever.cloud/developers/doc/addons/fs-bucket/), un système de fichiers réseau partagé entre les instances, et le problème ne se pose jamais. Sur le runtime `frankenphp`, ce bucket n'existe pas : chaque instance a son dossier local, et le répartiteur de charge fait le reste.

Voici ce que ça donne sur deux instances, avec une sonde qui compte les requêtes de la session et expose `INSTANCE_NUMBER` :

```
hits=5  instance=0  sid=ba6283f4
hits=1  instance=1  sid=a8ad59bc   <- nouvelle session
hits=1  instance=0  sid=0b2303bc   <- et encore une
```

Chaque bascule d'instance crée une session neuve : utilisateur déconnecté, panier vide, formulaire multi-étapes reparti à zéro, et pas une ligne de log pour le dire.

Sur le runtime `php`, `ENABLE_REDIS=true` et `SESSION_TYPE=redis` suffisent à [confier les sessions à la plateforme](https://www.clever.cloud/developers/doc/applications/php/sessions-emails/). Sur le runtime `frankenphp`, ces deux variables sont bien injectées, elles apparaissent dans `clever env`, et elles ne font rien : la sonde lit un `session.save_path` vide, donc aucun stockage branché par la plateforme, et les sessions restent locales à chaque instance. C'est le cas d'école de la variable sans effet décrit en intro.

Il faut donc le dire dans le code. D'abord un [add-on Redis](https://www.clever.cloud/developers/doc/addons/redis/), lié à l'application :

```bash
clever addon create redis-addon symfony-clever-franken-redis \
  --plan s_mono --region par --link franken
```

Puis une ligne dans `config/packages/framework.yaml` :

```yaml
when@prod:
    framework:
        session:
            handler_id: '%env(REDIS_URL)%'
```

C'est tout. L'add-on injecte `REDIS_URL` telle quelle, [`SessionHandlerFactory`](https://symfony.com/doc/current/session.html#store-sessions-in-a-key-value-database-redis) reconnaît cette URL et construit le gestionnaire, et la connexion est bâtie par Symfony Cache : vous n'écrivez aucun service, et vous n'instanciez jamais `\Redis` vous-même.

Vérifié ensuite sur les deux instances : même identifiant de session, compteur qui monte, à travers l'instance 0 et l'instance 1.

```
hits= 5  instance=1  sid=ac48c874
hits= 6  instance=1  sid=ac48c874
hits= 7  instance=0  sid=ac48c874
hits= 8  instance=0  sid=ac48c874
hits= 9  instance=0  sid=ac48c874
hits=10  instance=1  sid=ac48c874
hits=11  instance=0  sid=ac48c874
```

Cette configuration vit dans le code que partagent les deux applications, donc celle sous Apache a besoin de son propre add-on Redis. C'est un progrès pour elle aussi : ses sessions ne dépendent plus d'un stockage monté par la plateforme.

Clever propose une alternative maison, [Materia KV](https://www.clever.cloud/developers/doc/addons/materia-kv/), un stockage clé-valeur compatible avec le protocole Redis et gratuit pendant la bêta. Je ne l'ai pas branché ici, et je ne vais pas vous vendre un chemin que je n'ai pas parcouru. Ce que dit la documentation : sur ce runtime, il faut pour l'instant le mode `tcp` et le port `6378`, donc sans TLS, et l'add-on injecte `KV_HOST`, `KV_PORT` et `KV_TOKEN` avec leurs alias `REDIS_*`, mais pas de `REDIS_URL` toute faite comme celle de l'add-on Redis. Aucune des deux démonstrations officielles ne couvre ce cas : [`php-sessions-kv-example`](https://github.com/CleverCloud/php-sessions-kv-example) est du PHP nu qui repose sur `ENABLE_REDIS` et `SESSION_TYPE`, les deux variables sans effet ici, et [`frankenphp-kv-json-example`](https://github.com/CleverCloud/frankenphp-kv-json-example) range du JSON avec Predis, pas des sessions.

## Le Caddyfile, et ce qu'il vous fait reprendre

Par défaut, la plateforme démarre votre application avec `frankenphp php-server` : c'est cette commande qui lit `CC_WEBROOT`, écoute sur le port de `CC_FRANKENPHP_PORT` (8080) et installe le worker de `CC_FRANKENPHP_WORKER`. Poser un [`Caddyfile`](https://frankenphp.dev/docs/config/) à la racine ne suffit pas, rien ne le charge : il faut passer par `CC_RUN_COMMAND`, qui **remplace complètement** la commande de la plateforme. Le port d'écoute, la racine servie, la directive `worker`, tout revient alors à votre fichier, et une application qui écoute ailleurs qu'en 8080 échoue au healthcheck.

```caddyfile
:8080 {
	encode zstd br gzip
	root public/
	php_server {
		worker ./public/index.php
	}
}
```

Ça vaut rarement le coup, et je ne l'ai pas fait ici. Deux cas reviennent : le réglage fin du nombre de threads PHP, que seule l'option globale `frankenphp` expose, et les assets pré-compressés qu'AssetMapper produit en Brotli et Zstandard.

## Les extensions, un sous-ensemble

Le runtime `php` activait ses extensions par variables, sur le modèle `ENABLE_<EXTENSION>` et `DISABLE_<EXTENSION>`. Ici, cette mécanique n'est pas documentée : [la page des extensions](https://www.clever.cloud/developers/doc/applications/frankenphp/#included-extensions) liste ce qui est inclus, et s'arrête là.

L'ensemble couvre une application Symfony ordinaire : `intl`, `mbstring`, `pdo_pgsql`, `opcache`, `redis`, `apcu`, `sodium`, `zip`, `curl`, `gd` et `imagick` sont là. Manquent `mongodb`, `xdebug`, `blackfire`, `newrelic`, `grpc` et `event` : si votre application ou votre outillage en dépend, la question est tranchée, restez pour l'instant sur le runtime `php`.

## Ce que ça change vraiment

Un tableau, mais pas celui qu'on attend : pas de millisecondes, des propriétés, celles qui décident du choix bien plus souvent.

| Propriété                        | Runtime `php` (Apache et PHP-FPM)          | Runtime `frankenphp` (mode Worker)                                |
|----------------------------------|--------------------------------------------|------------------------------------------------------|
| Modèle d'exécution               | Un processus par requête, détruit ensuite  | Threads PHP, application en mémoire en mode worker   |
| Coût du démarrage de Symfony     | Payé à chaque requête                      | Payé une fois par worker                             |
| État qui fuit entre les requêtes | Impossible par construction                | Possible, et à votre charge                          |
| Réécriture d'URL                 | `.htaccess` et `symfony/apache-pack`       | `php_server`, rien à écrire                          |
| Directives PHP                   | `.user.ini` dans le webroot                | `php.ini` à la racine, `.user.ini` ignoré            |
| Sessions par défaut              | FS Bucket monté par la plateforme          | Rien, stockage partagé à configurer                  |
| Auto-scripts de Composer         | Exécutés au build                          | Non exécutés                                         |
| Extensions                       | Catalogue large, `ENABLE_*` et `DISABLE_*` | Ensemble fixe, plus restreint                        |
| Réglage de la concurrence        | `CC_CONFIGURATION_PM_MAX_CHILDREN`         | Threads FrankenPHP, via le Caddyfile                 |
| Configuration du serveur         | Directives Apache                          | Caddyfile, si vous reprenez la commande de démarrage |

Deux lignes ne sont pas symétriques, et ce sont les deux qui comptent : "impossible par construction" est le vrai argument du modèle FPM, "sessions par défaut : rien" le vrai coût de la bascule.

Quant à la performance, le gain est réel, mais son ampleur dépend de ce que fait votre application entre son démarrage et sa réponse : une page dont le temps de réponse est dominé par une requête SQL lente ne gagne rien.

## Ce qu'on aimerait voir arriver

Le runtime `frankenphp` est jeune et il avance vite, les mises à jour d'image suivent les versions amont de près. Rien de ce qui suit n'est un reproche, c'est la liste de ce qui rendrait la bascule plus douce.

**Changer de runtime sans changer d'application.** Aujourd'hui, `php` et `frankenphp` sont deux types d'application : deux domaines, deux configurations, deux factures pour le même code. Un jour, peut-être, un runtime qui se change sur une application existante.

**Un signal sur les variables sans effet.** `ENABLE_REDIS` et `SESSION_TYPE` sont acceptées en silence, comme les réglages de PHP-FPM qui n'ont plus d'objet. Une ligne d'avertissement au déploiement, « cette variable n'est pas utilisée par ce runtime », remplacerait avantageusement une soirée de diagnostic.

**Un mot sur les sessions.** Le runtime `php` monte un FS Bucket sans rien demander, `frankenphp` ne monte rien, et c'est la production qui l'apprend au lecteur. Un stockage par défaut serait idéal ; une phrase dans la documentation ferait déjà beaucoup.

**Le nombre de threads sans reprendre la commande de démarrage.** Une variable dédiée éviterait d'écrire un `Caddyfile` complet, et donc d'assumer le port, la racine servie et le worker pour changer un seul chiffre.

**Deux ou trois extensions.** [Blackfire](https://www.blackfire.io/) et [Xdebug](https://xdebug.org/) d'abord : profiler une application qui reste en mémoire est plus utile qu'ailleurs, et c'est précisément là qu'ils manquent.

**Et une documentation alignée sur le comportement.** Les deux runtimes annoncent le même `--no-scripts`, un seul l'applique.

## Quand rester sur Apache

Il y a de bonnes raisons de ne pas migrer, et aucune n'est de la paresse.

**Vous dépendez de `.htaccess` ou de modules Apache.** Trois règles de réécriture se retraduisent en Caddyfile sans douleur. Un `.htaccess` qui accumule dix ans de redirections et de `mod_expires` réglés finement, c'est un projet à part entière, et certains modules n'ont pas d'équivalent.

**Une extension PHP vous manque.** Point final. Si votre application parle à MongoDB, ou si votre équipe profile avec Blackfire ou Xdebug, la liste tranche à votre place.

**Vous comptiez sur les sessions gérées par la plateforme.** `ENABLE_REDIS=true` et `SESSION_TYPE=redis` suffisent sur le runtime `php`. Sur le runtime `frankenphp`, ces variables sont injectées et sans effet, et le stockage devient votre responsabilité.

**Votre application est ancienne, ou pleine de statiques.** Le mode worker demande une application dont on peut affirmer qu'elle ne garde rien entre deux requêtes, et sur une base de code dont personne n'a la carte, cette affirmation coûte cher. Vous pouvez déployer en mode classic, mais vous perdez alors le seul argument qui justifiait la migration.

**Votre trafic ne le justifie pas.** La raison la moins glorieuse et la plus fréquente. Le gain du mode worker porte sur le démarrage de PHP : un site fait de pages statiques et d'assets ne le paie pas, et une application interne qui sert trois cents requêtes par jour ne gagnera rien de perceptible. Vous aurez seulement ajouté un stockage de sessions à opérer et échangé une stack stable, éprouvée et qui ronronne pour un peu de hype.

À l'inverse, les cas où la bascule se justifie se ressemblent tous : une application neuve écrite avec le mode worker en tête, une API à fort trafic dont le temps de réponse est dominé par le démarrage du framework, un service bien découpé dont la suite de tests existe. La question n'est pas "lequel est le meilleur", mais "qu'est-ce que mon application sait déjà faire".

## Et ensuite

Deux applications tournent maintenant depuis le même dépôt, l'une sur Apache et PHP-FPM, l'autre sur FrankenPHP. Elles partagent leur code et diffèrent par une poignée de variables, un fichier de directives PHP, un hook de post-build propre à chacune, et une configuration de sessions que l'application aurait dû porter dès le premier jour.

Dans le prochain article, on arrête de déployer à la main : GitHub Actions, le déploiement déclenché par un commit, et les précautions pour qu'un pipeline ne mette jamais en production ce qu'il n'a pas testé.

> **Code source.** La branche [`03-frankenphp`](https://github.com/welcoMattic/symfony-clever-cloud-series/tree/03-frankenphp) du dépôt [welcoMattic/symfony-clever-cloud-series](https://github.com/welcoMattic/symfony-clever-cloud-series) contient ce que cet article ajoute : le `php.ini` à la racine, qui s'ajoute à `public/.user.ini` sans le remplacer, le hook `clevercloud/post-build-frankenphp.sh` et son `importmap:install`, la configuration des sessions Redis dans `config/packages/framework.yaml`, la seconde entrée du `.clever.json`, et un `Caddyfile` d'exemple laissé inactif.
