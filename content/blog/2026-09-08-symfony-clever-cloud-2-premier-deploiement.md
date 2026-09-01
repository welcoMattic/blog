---
title: "Symfony sur Clever Cloud : le premier déploiement"
date: 2026-09-08T09:00:00.000Z
description: "2e article d'une série sur le déploiement d'une application Symfony évolutive sur le PaaS Clever Cloud"
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
  order: 2
  label: "Le premier déploiement"
---

_This blog post is also available in 🇬🇧 English: [Symfony on Clever Cloud: the first deployment](/blog/2026-09-08-symfony-clever-cloud-2-first-deployment/)._

> **Transparence.** Je suis ambassadeur Clever Cloud. J'écris cette série en toute indépendance, personne chez eux ne relit cette série, et je m'y autorise les mêmes critiques que sur n'importe quelle autre plateforme.

Dans [le premier article de cette série](/blog/2026-09-01-symfony-clever-cloud-1-preparer-son-app-paas/), nous avons passé une application Symfony au crible de 12-factor sans toucher à une seule commande de la plateforme. C'était volontaire : le contrat comptait plus que l'outil.

Aujourd'hui, on déploie. À la fin de cet article, une application Symfony 8.1 tourne en production sur Clever Cloud, avec une base PostgreSQL managée, des migrations Doctrine qui s'exécutent toutes seules au bon moment du déploiement, et un healthcheck que la plateforme interroge pour savoir si l'application va bien.

Ce ne sera pas un copier-coller de la documentation officielle. Trois endroits du parcours demandent un peu plus que la commande à recopier : ce sont des questions de séquencement, faciles à laisser passer au premier déploiement et qui se rappellent à vous au dixième. Ce sont celles-là qui prennent le plus de place ici.

Deux choses qu'on ne fera pas aujourd'hui : FrankenPHP, qui mérite son propre article et sa propre comparaison, et la <abbr title="Continuous Integration / Continuous Deployment">CI/CD</abbr>, qui viendra une fois que le déploiement manuel sera maîtrisé.

Une dernière précision avant d'entrer dans le vif : tout se fera ici en ligne de commande, mais rien n'y est réservé. La console web de Clever Cloud donne accès aux mêmes réglages, et chaque commande de cet article a son équivalent à la souris : créer l'application, poser une variable d'environnement, créer un add-on et le lier, lancer un déploiement, lire les logs. Si vous préférez cliquer, vous ne raterez rien du parcours. J'utilise la ligne de commande parce qu'elle se copie-colle, se relit dans un historique et finira dans un script quand nous arriverons à la CI/CD.

## Le vocabulaire de la plateforme

Quatre mots vont revenir en boucle. Autant les poser tout de suite, parce qu'ils ne veulent pas dire chez Clever exactement ce qu'ils veulent dire ailleurs.

Une **application** n'est pas une machine. C'est un dépôt Git, un runtime et de la configuration, regroupés sous un identifiant. Vous ne choisissez jamais sur quelle machine elle tourne, et vous n'en avez pas besoin.

Le **runtime** est l'environnement d'exécution que la plateforme met autour de votre code : les binaires, le serveur web, les extensions. Chez Clever, il se choisit au moment de créer l'application (`php`, `frankenphp`, `docker`, `node`, et une quinzaine d'autres) et il ne change plus ensuite.

Un **scaler**, aussi appelé instance, est une copie de l'application en train de tourner. Une application peut avoir un scaler ou dix, et leur nombre peut varier au cours de la journée. Chaque scaler a sa taille, appelée **flavor** chez Clever, dans une échelle qui va de `pico` à `3XL`. C'est le seul endroit où vous parlez de <abbr title="Central Processing Unit">CPU</abbr> et de mémoire. Petite subtilité à connaître : `pico`, la plus petite, n'est pas disponible pour les runtimes `php`, `frankenphp`, `docker` et `static-apache`.

Un **add-on** est un service managé : une base de données, un stockage de fichiers, un cache. On le crée à part de l'application, puis on le **lie** à elle. Ce lien a un effet très concret : la plateforme injecte dans l'application les variables d'environnement qui décrivent le service (son adresse, son utilisateur, son mot de passe). C'est le facteur IV de l'article précédent, les ressources attachées, rendu littéral.

## Ce qu'il vous faut avant de commencer

Un compte Clever Cloud, d'abord. La création est gratuite et l'inscription se fait par e-mail, GitHub ou GitLab.

Ensuite Clever Tools, la CLI de la plateforme. Elle s'installe par npm, et il existe aussi des paquets système et une image Docker officielle :

```bash
npm install -g clever-tools
clever login
```

`clever login` ouvre votre navigateur pour autoriser la CLI, puis stocke un jeton en local. Pour vérifier que vous êtes bien connecté :

```bash
clever profile
```

Les commandes de cet article ont été passées avec Clever Tools 4.10. La CLI bouge vite, et certaines commandes ont changé de nom entre les versions majeures : si une commande ci-dessous n'existe pas chez vous, commencez par regarder votre version.

Enfin, l'application Symfony de l'article précédent. Si vous partez de zéro, la branche [`01-fresh-symfony-app`](https://github.com/welcoMattic/symfony-clever-cloud-series/tree/01-fresh-symfony-app) du dépôt d'accompagnement contient exactement le point de départ : une application Symfony 8.1 créée avec `symfony new --version=8.1 --webapp --docker`, sans une ligne ajoutée à la main.

Une chose y bouge avant qu'on démarre : la base locale passe en PostgreSQL 17, la version que provisionne l'add-on Clever. Ça tient au `compose.yaml` et au `serverVersion` du `DATABASE_URL`, et à rien d'autre. C'est le premier commit de la branche de cet article.

## Étape 1 : créer l'application

Depuis la racine du dépôt :

```bash
clever create --type php symfony-clever-demo --region par
```

Le `--type php` désigne le runtime historique de la plateforme : Apache 2 en frontal, PHP-FPM derrière. C'est un modèle que tout le monde connaît (parfois avec Nginx à la place d'Apache 2), un processus PHP par requête, et c'est celui qui donne le moins de surprises pour un premier déploiement. Le `--region par` place l'application à Paris ; les autres régions sont listées par `clever create --help`.

La commande fait deux choses. Côté plateforme, elle crée l'application dans votre organisation personnelle. Côté git, elle écrit un fichier `.clever.json` à la racine :

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

Ce fichier est le lien entre votre dépôt git local et l'application distante : c'est grâce à lui que les commandes suivantes savent de quelle application vous parlez, sans que vous ayez à répéter son identifiant. Il ne contient aucun secret, uniquement des identifiants publics, et il se versionne. Si l'application existe déjà côté plateforme, `clever link symfony-clever-demo` produit le même fichier.

À ce stade, l'application existe mais elle est vide : aucun code n'a encore été poussé. `clever status` vous le confirmera.

La taille par défaut du scaler suffit largement pour cet article. Le dimensionnement, l'autoscaling et leurs pièges feront l'objet d'un article dédié.

## Étape 2 : les variables d'environnement

L'article précédent posait le principe : sur un <abbr title="Platform as a Service">PaaS</abbr>, la configuration passe par l'environnement, et par rien d'autre. Voici ce que ça donne concrètement.

```bash
clever env set CC_WEBROOT "/public"
clever env set CC_PHP_VERSION "8.4"
clever env set CC_COMPOSER_VERSION "2"
clever env set APP_ENV "prod"
clever env set APP_SECRET "$(openssl rand -hex 32)"
```

Reprenons-les une par une, parce que trois d'entre elles ont un piège.

**`CC_WEBROOT`** définit le `DocumentRoot` d'Apache, c'est-à-dire le dossier depuis lequel les fichiers sont servis. Sa valeur par défaut est la racine du dépôt. Autrement dit, si vous l'oubliez, votre `composer.json`, votre `composer.lock` et votre `.env` sont servis en HTTP à qui les demande. C'est la variable la plus importante de la liste, et c'est aussi celle qu'on oublie le plus souvent, parce que son absence ne provoque pas d'erreur : le site répond, il expose juste tout ce qu'il ne devrait pas. La valeur `/public` permet de servir le contrôleur frontal de Symfony : `index.php`.

**`CC_PHP_VERSION`** accepte une version majeure (`8`) ou majeure et mineure (`8.4`). La documentation annonce une valeur par défaut, mais cette valeur suit les versions supportées et bouge donc dans le temps. Positionnez-la explicitement : vous ne voulez pas découvrir un changement de version mineure de PHP au milieu d'un déploiement que vous pensiez sans risque.

**`CC_COMPOSER_VERSION`** accepte `2` ou `lts`. Rien de subtil, mais autant la figer pour la même raison.

**`APP_ENV`** et **`APP_SECRET`** viennent de l'article précédent. Le secret doit être stable dans le temps : le régénérer à chaque déploiement invaliderait tout ce qu'il sert à signer, à commencer par les cookies remember-me de vos utilisateurs connectés.

Pour relire l'ensemble :

```bash
clever env
```

Un détail de fonctionnement qui surprend au début : modifier une variable d'environnement ne redémarre pas l'application. La nouvelle valeur ne sera prise en compte qu'au déploiement suivant.

Derrière ce détail se cache une propriété de la plateforme qui explique beaucoup de choses, et autant la nommer maintenant : les instances sont **immuables**. Une instance n'est jamais modifiée après son démarrage. On ne s'y connecte pas pour changer une valeur, corriger un fichier ou installer un paquet. La plateforme ne sait pas transformer une instance en cours d'exécution : elle sait en fabriquer de nouvelles à partir d'un artefact et d'une configuration, puis détruire les anciennes. Un déploiement, c'est exactement ça.

Tout le reste en découle. Une variable d'environnement ne prend effet qu'au déploiement suivant parce qu'il faut de nouvelles instances pour la porter, ce qui rejoint le facteur V de l'article précédent : une release est un artefact plus une configuration, et changer la configuration fabrique une nouvelle release. Une correction faite à la main sur un scaler disparaît sans prévenir, puisque le scaler lui-même disparaîtra. Et ce que votre application écrit sur son disque part avec l'instance qui l'a écrit, ce qui est la raison très concrète du facteur VI, celui sur les processus sans état.

Il existe aussi `clever env import < .env` pour tout importer d'un coup, commande que le tutoriel Symfony de Clever mentionne également. Elle rend bien service quand on lui donne un fichier fait pour ça. Regardez juste ce que vous lui donnez : votre `.env` local contient les valeurs de développement, un `DATABASE_URL` qui pointe sur votre Docker et un `MAILER_DSN` en `null://null`. Les importer en production écrase ce que la plateforme injecte, sans rien signaler. Tant que la liste reste courte, `clever env set` variable par variable demande moins d'attention.

Dernière variable, mais celle-là mérite sa propre étape.

## Étape 3 : le healthcheck

L'article précédent a posé le principe : une route qui répond 200 sans toucher à rien, que la plateforme interroge pour savoir si un scaler est en état de servir du trafic. Voici l'implémentation, dans `src/EventListener/HealthCheckListener.php` :

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

Un écouteur, et pas un contrôleur, délibérément. Pour atteindre un contrôleur, la requête traverse d'abord tout ce qui écoute `kernel.request` : la validation de la requête, le routage, le pare-feu de sécurité, et les écouteurs de votre propre application. Le jour où l'un d'eux interroge la base de données, votre healthcheck en dépend aussi, sans que son code ait changé d'une ligne. La priorité `4096` place celui-ci avant tous les autres, et `setResponse()` appelle `stopPropagation()` : plus rien ne s'exécute pour cette requête. Vous pouvez vérifier l'ordre chez vous avec `php bin/console debug:event-dispatcher kernel.request`.

Reste à donner le chemin à la plateforme :

```bash
clever env set CC_HEALTH_CHECK_PATH "/cc-health"
```

Sans cette variable, la plateforme interroge `/` et attend un code de réponse compris entre 200 et 300. Une application Symfony fraîche y répond 404, et le déploiement serait déclaré en échec alors que tout va bien.

## Étape 4 : le piège Apache

Le runtime `php` sert vos fichiers avec Apache. Apache, quand on lui demande `/cc-health`, cherche un fichier nommé `cc-health` dans le `DocumentRoot`, ne le trouve pas, et répond 404. Votre écouteur n'y peut rien : la requête n'atteint même pas PHP. Pour qu'il passe la main au contrôleur frontal de Symfony, il lui faut des règles de réécriture, et ces règles vivent dans un fichier `.htaccess`.

Or, depuis Symfony 4, le squelette n'en contient plus. Vérifiez chez vous :

```bash
ls -a public/
# .  ..  index.php
```

Pas de `.htaccess`. Le fichier a été sorti du squelette et déplacé dans un paquet dédié, parce que la majorité des déploiements modernes tournent sous Nginx, qui n'en a que faire. Sur le runtime Apache de Clever, il redevient nécessaire :

```bash
composer require symfony/apache-pack
```

Attention à la question posée par Symfony Flex : la recipe d'`apache-pack` vit dans le dépôt `recipes-contrib`, et les squelettes récents refusent par défaut d'exécuter les recipes contrib. Si vous répondez non, ou si vous lancez la commande avec `--no-interaction`, le paquet s'installe mais son `.htaccess` n'est jamais écrit. Répondez oui à la question. Une fois la recipe passée, `public/.htaccess` existe et contient les règles de réécriture attendues. Versionnez-le.

## Étape 5 : la base de données

### Créer l'add-on et le lier

```bash
clever addon create postgresql-addon symfony-clever-demo-db --plan dev --region par
clever service link-addon symfony-clever-demo-db
```

La première commande provisionne une base PostgreSQL managée. Le nom du fournisseur, `postgresql-addon`, est bien celui qu'attend la CLI ; `clever addon providers` liste tous les autres. Le plan `dev` est le plus petit de la grille, largement suffisant pour une démonstration, avec une limite à connaître : les extensions PostgreSQL à la demande n'y sont pas disponibles. Regardez la grille tarifaire avant de valider. La CLI vous protège d'ailleurs d'un achat involontaire, puisqu'elle demande confirmation dès que l'add-on n'est pas gratuit, et qu'il faut passer `--yes` pour la sauter.

La seconde commande crée le lien entre l'add-on et l'application. C'est elle qui déclenche l'injection des variables. Vérifiez :

```bash
clever env | grep POSTGRESQL
```

Vous obtenez `POSTGRESQL_ADDON_URI`, qui contient l'URI de connexion complète, ainsi que les morceaux séparés : `POSTGRESQL_ADDON_HOST`, `POSTGRESQL_ADDON_PORT`, `POSTGRESQL_ADDON_DB`, `POSTGRESQL_ADDON_USER`, `POSTGRESQL_ADDON_PASSWORD`, `POSTGRESQL_ADDON_ROLE`. S'y ajoutent `POSTGRESQL_ADDON_DIRECT_HOST` et `POSTGRESQL_ADDON_DIRECT_PORT`, qui pointent directement sur la machine de la base en court-circuitant le proxy de la plateforme.

### Le vrai problème : Symfony ne connaît pas ces variables

Symfony attend `DATABASE_URL`. La plateforme fournit `POSTGRESQL_ADDON_URI`. La réponse tentante est celle-ci :

```bash
# Ne faites pas ça.
clever env set DATABASE_URL "$POSTGRESQL_ADDON_URI"
```

Elle est fausse deux fois. D'abord parce que `$POSTGRESQL_ADDON_URI` est évaluée par **votre** shell, sur **votre** machine, où cette variable n'existe pas : vous venez de positionner un `DATABASE_URL` vide en production. Ensuite parce que même avec la bonne valeur récupérée à la main, vous fabriquez une copie figée, que l'add-on laissera derrière lui à la première rotation de mot de passe. Écrire `DATABASE_URL=${POSTGRESQL_ADDON_URI}` côté plateforme ne sauve rien non plus : Clever ne fait pas d'interpolation entre variables d'environnement, la valeur serait prise au pied de la lettre.

La réponse est dans Symfony. Le composant DependencyInjection fournit un processeur `default`, qui lit une variable d'environnement et se rabat sur autre chose si elle est absente ou vide. Dans `config/packages/doctrine.yaml` :

```yaml
parameters:
    # Repli utilisé en local, quand aucun add-on Clever n'est branché.
    app.database_url_fallback: '%env(resolve:DATABASE_URL)%'

doctrine:
    dbal:
        # Sur Clever, l'add-on injecte POSTGRESQL_ADDON_URI et cette valeur
        # gagne. En local, elle n'existe pas et Doctrine retombe sur
        # DATABASE_URL, lu depuis .env.
        url: '%env(default:app.database_url_fallback:POSTGRESQL_ADDON_URI)%'
        # L'URI de l'add-on ne porte pas de serverVersion : sans cette
        # ligne, la connexion ne peut pas être construite.
        server_version: '%env(DATABASE_SERVER_VERSION)%'
```

`%env(default:un_parametre:UNE_VARIABLE)%` se lit de droite à gauche : prends `UNE_VARIABLE`, et si elle est absente ou vide, prends le paramètre. Comme ce paramètre contient lui-même un `%env()%`, aucune des deux valeurs n'est inscrite dans le conteneur compilé : Symfony y place un marqueur et lit l'environnement au démarrage. Vérifiable en compilant le cache de production sans `POSTGRESQL_ADDON_URI` puis en démarrant avec, sans rien recompiler : la connexion vise l'hôte de l'add-on, pas celui du `.env`.

Un seul chemin de code, donc, pour les deux environnements. En local, la variable n'existe pas et vous parlez à votre conteneur Docker ; sur Clever, elle existe, elle gagne, et vous parlez à l'add-on. Rien à recopier, rien à maintenir en double.

Reste la ligne `server_version`, qui n'est pas là par hasard. Sans elle :

```bash
POSTGRESQL_ADDON_URI="postgresql://user:pass@host:5432/db" php bin/console dbal:run-sql 'SELECT 1'

  Invalid platform version "" specified. The platform version has to be
  specified in the format: "<major_version>.<minor_version>.<patch_version>".
```

Doctrine a besoin de savoir à quelle version de PostgreSQL il parle, pour adapter le SQL qu'il génère. Le `DATABASE_URL` du squelette la porte dans son paramètre `serverVersion`, l'URI de l'add-on non : il faut donc la lui donner autrement.

Côté `.env`, on sort la version de l'URL pour la mettre dans sa propre variable, la même des deux côtés :

```diff
-DATABASE_URL="postgresql://app:!ChangeMe!@127.0.0.1:5432/app?serverVersion=17&charset=utf8"
+DATABASE_URL="postgresql://app:!ChangeMe!@127.0.0.1:5432/app?charset=utf8"
+DATABASE_SERVER_VERSION=17
```

Et côté plateforme :

```bash
clever env set DATABASE_SERVER_VERSION "17"
```

PostgreSQL 17 est la version par défaut des nouveaux add-ons chez Clever depuis mars 2025, mais ne me croyez pas sur parole : `clever addon env symfony-clever-demo-db` vous dira ce qui a réellement été provisionné pour vous.

## Étape 6 : les hooks de déploiement

Un déploiement chez Clever se déroule en quatre temps : la plateforme récupère votre code, **construit** l'application (pour PHP, un `composer install` lancé automatiquement dès qu'un `composer.json` est présent à la racine), **archive** le résultat pour pouvoir le réutiliser au déploiement suivant, puis **démarre** l'application sur chaque scaler et attend le healthcheck avant de lui envoyer du trafic.

Un **hook** est une variable d'environnement dont la valeur est une commande shell, ou le chemin d'un script exécutable de votre code source. La plateforme l'exécute au moment que son nom désigne. Il y en a cinq :

| Hook | Quand il tourne | L'échec bloque le déploiement | Rejoué sur un déploiement depuis le cache |
|---|---|---|---|
| `CC_PRE_BUILD_HOOK` | Avant la récupération des dépendances | Oui | **Non** |
| `CC_POST_BUILD_HOOK` | Après la construction, avant l'archive | Oui | **Non** |
| `CC_PRE_RUN_HOOK` | Après l'archive, avant le démarrage | Oui | Oui |
| `CC_RUN_SUCCEEDED_HOOK` et `CC_RUN_FAILED_HOOK` | Une fois l'application démarrée, ou une fois son démarrage échoué | Non | Oui, l'un des deux à chaque fois |

La colonne de droite est celle qui compte. Un déploiement depuis le cache saute toute la phase de construction, donc les deux hooks qui s'y rattachent : ni pre-build, ni post-build. Et un simple redémarrage en est un, `clever restart` réutilisant l'archive par défaut, sauf si vous lui passez `--without-cache`.

### Ce qui va où

Tout va dans `CC_POST_BUILD_HOOK` : compiler les assets, préchauffer le cache, et jouer les migrations. Dans `clevercloud/post-build.sh` :

```bash
#!/bin/bash -l
set -euo pipefail

echo "==> Compilation des assets"
php bin/console asset-map:compile --env=prod --no-debug

echo "==> Préchauffage du cache"
php bin/console cache:warmup --env=prod --no-debug

echo "==> Migrations Doctrine"
php bin/console doctrine:migrations:migrate --no-interaction --allow-no-migration --env=prod
```

Le `-l` du shebang charge l'environnement du runtime, ce qui met le bon binaire PHP dans le `PATH`. Le `set -euo pipefail` fait échouer le déploiement à la première commande en erreur : mieux vaut un déploiement rouge qu'une application en ligne avec des assets manquants ou un schéma de base pas à jour. Et le `--allow-no-migration` évite qu'un projet neuf, qui n'a encore aucune migration, fasse échouer son propre déploiement.

### Pourquoi les migrations au build

C'est le point où j'ai vu le plus de gens hésiter, moi compris, alors prenons-le par les propriétés plutôt que par les habitudes.

**Il n'y a qu'une seule construction par déploiement**, quel que soit le nombre de scalers. Une migration placée là tourne donc une fois, et une seule. C'est la propriété qui compte : rien à coordonner, pas de verrou à poser, pas de garde-fou à écrire.

**Ce hook n'est pas rejoué sur un déploiement depuis le cache, et c'est exactement ce qu'on veut.** Le build en cache est indexé par commit, ce que les logs affichent en clair :

```
Checking cache data: GET /api/builds/<app_id>/<commit>/php-20260818
No build cache archive has been detected, performing a new build…
```

Un nouveau commit ne peut donc jamais tomber sur une archive existante : il déclenche toujours une construction complète, donc toujours les migrations. Et un déploiement qui saute le post-build est forcément le redémarrage d'un commit déjà déployé, dont les migrations sont déjà passées. Les rejouer ne servirait à rien.

**Le `CC_PRE_RUN_HOOK` ne conviendrait pas**, malgré un nom qui pourrait le laisser croire : il est rejoué sur chaque scaler. Avec quatre instances, ce sont quatre `doctrine:migrations:migrate` lancés en parallèle sur la même base. On peut les filtrer avec `INSTANCE_NUMBER`, la variable que la plateforme injecte dans chaque scaler avec son index, mais ça ne coordonne rien : les autres instances démarrent sans attendre que la première ait fini, et peuvent servir du trafic sur un schéma pas encore migré. Le pre-run garde son utilité pour ce qui doit vraiment tourner sur chaque instance avant qu'elle ne serve, ce qu'une migration n'est pas.

Reste une réserve, qui ne dépend pas de la plateforme : pendant la construction, l'ancienne version de votre code sert encore le trafic, sur une base que la migration vient de modifier. Pour une migration purement additive, aucun problème. Pour une migration destructive, une réponse possible serait de mettre l'application dans un mode de maintenance au `CC_PRE_BUILD_HOOK` et d'en sortir au `CC_RUN_SUCCEEDED_HOOK`. Cette décison dépend de la tolérance à la panne ou à l'indisponibilité que votre application peut accepter.

### Brancher le script

```bash
chmod +x clevercloud/post-build.sh
clever env set CC_POST_BUILD_HOOK "./clevercloud/post-build.sh"
```

Le bit exécutable compte, et il se versionne avec Git : un script sans droit d'exécution donne un déploiement en échec avec un message peu explicite.

## Étape 7 : le reverse proxy

Encore une chose avant de déployer, et c'est celle qui produit les tickets les plus déroutants quand on l'oublie.

Votre application ne reçoit jamais le trafic directement. Il passe par les Load Balancers (répartiteurs de charge en bon français) de Clever, qui terminent le <abbr title="Transport Layer Security">TLS</abbr> et transmettent la requête en clair à vos instances (scalers). Du point de vue de Symfony, toutes les requêtes arrivent donc en HTTP, depuis une adresse IP interne. Les conséquences se voient vite : vos logs contiennent l'adresse du proxy à la place de celle du visiteur, les URL absolues que vous générez commencent par `http://`, et si vous forcez le HTTPS quelque part, vous fabriquez une boucle de redirections.

Le protocole standard pour régler ça existe, ce sont les en-têtes `X-Forwarded-*`. Symfony sait les lire, mais il refuse par défaut de leur faire confiance, et il a raison : n'importe quel client peut les envoyer. Il faut donc lui dire de quelles adresses ces en-têtes sont dignes de foi. Clever injecte pour ça une variable `CC_REVERSE_PROXY_IPS`, qui contient la liste de ses propres adresses.

Dans `.env` :

```bash
# CC_REVERSE_PROXY_IPS est injectée par Clever Cloud. En local elle n'existe
# pas, la liste se réduit alors à la boucle locale.
TRUSTED_PROXIES=127.0.0.1,${CC_REVERSE_PROXY_IPS}
```

Dans `config/packages/framework.yaml` :

```yaml
framework:
    secret: '%env(APP_SECRET)%'

    # Sur Clever, le trafic arrive par un reverse proxy : sans cette ligne,
    # Symfony croit toutes les requêtes en HTTP et voit l'IP du proxy.
    trusted_proxies: '%env(TRUSTED_PROXIES)%'
```

La syntaxe `${...}` est celle du composant Dotenv de Symfony, qui sait évaluer une variable à l'intérieur d'une autre au moment de lire le fichier. C'est ce qui permet d'écrire une seule ligne valable partout : en local, `CC_REVERSE_PROXY_IPS` n'existe pas, elle s'évalue en chaîne vide, et la liste se réduit à `127.0.0.1`. Vous pouvez le vérifier avec `php bin/console debug:dotenv`.

## Étape 8 : déployer

Tout est en place. On commite, et on pousse.

```bash
git add .clever.json clevercloud/ config/ public/.htaccess src/EventListener/HealthCheckListener.php \
        .env composer.json composer.lock symfony.lock
git commit -m "Préparer l'application pour son premier déploiement Clever Cloud"
clever deploy
```

`clever deploy` pousse la branche courante sur un dépôt Git distant géré par la plateforme, puis affiche les logs du déploiement en direct jusqu'à ce qu'il se termine. Vous allez voir passer, dans l'ordre : la récupération des dépendances, le `composer install`, le hook de post-build avec la compilation des assets et les migrations, la constitution de l'archive de cache, puis le démarrage de l'application et sa validation par le healthcheck.

Deux options utiles dès le début. `--exit-on never` garde le flux de logs ouvert après la fin du déploiement, ce qui est pratique pour voir les premières requêtes réelles arriver.

Une fois le déploiement terminé :

```bash
clever open
```

L'application est servie sur un sous-domaine de `cleverapps.io` attribué automatiquement, que `clever domain` vous rappellera. Vérifions le healthcheck :

```bash
curl -s https://votre-app.cleverapps.io/cc-health
{"status":"ok"}
```

Si quelque chose s'est mal passé, les logs sont disponible depuis la CLI :

```bash
clever logs
clever logs --since 10m
clever logs --search "migrations"
```

Le branchement d'un nom de domaine à vous se fait avec `clever domain add`, puis il vous faudra mettre à jour la zone DNS de votre nom de domaine pour qu'il pointe vers l'infrastructure de Clever Cloud. La documentation à ce sujet est ici : [Domain Names](https://www.clever.cloud/developers/doc/administrate/domain-names/).

## Étape 9 : régler le runtime

L'application tourne. Voici les quelques réglages qui valent le détour tout de suite, plutôt que dans six mois quand la production vous les réclamera.

**Les extensions PHP** s'activent et se désactivent par variables d'environnement, sur le modèle `ENABLE_<EXTENSION>` et `DISABLE_<EXTENSION>` :

```bash
clever env set ENABLE_APCU "true"
```

Une bonne partie des extensions dont une application Symfony a besoin est déjà présente, mais la liste exacte de ce qui est actif par défaut varie selon la version de PHP, et c'est particulièrement vrai sur les versions les plus récentes où la couverture est encore partielle. Consultez [la page des extensions](https://www.clever.cloud/developers/doc/applications/php/extensions/) pour votre version plutôt que de vous fier à une liste recopiée dans un article, celui-ci compris.

Une remarque au passage sur APCu, puisque c'est l'extension que les projets Symfony activent en premier : c'est un cache en mémoire, local à un scaler. Parfait pour le cache système de Symfony, qui contient des données recalculables à l'identique par chacun. À proscrire pour du cache applicatif partagé, pour la raison développée dans l'article précédent : ce que le scaler A a mis en cache, le scaler B ne le voit pas.

**La mémoire** se règle avec `MEMORY_LIMIT`, exprimée en MiB, qui surcharge le `memory_limit` de PHP. Sa voisine `CC_CONFIGURATION_PM_MAX_CHILDREN` fixe le nombre de workers PHP-FPM, et les deux sont liées : augmenter le nombre de workers réduit la mémoire que la plateforme calcule pour chacun. C'est un arbitrage entre requêtes servies en parallèle et mémoire par requête, pas un curseur à pousser à fond.

**OpCache** dispose de ses propres variables, `CC_OPCACHE_MEMORY`, `CC_OPCACHE_MAX_ACCELERATED_FILES` et `CC_OPCACHE_INTERNED_STRINGS_BUFFER`, dont les valeurs par défaut dépendent de la taille du scaler. Une application Symfony de taille moyenne dépasse facilement le nombre de fichiers par défaut, et c'est le genre de plafond qui ne se manifeste que par une lenteur diffuse.

**Le reste des directives PHP** se met dans un fichier `.user.ini` placé dans le webroot, donc dans `public/` puisque c'est là que pointe `CC_WEBROOT` :

```ini
date.timezone = "Europe/Paris"
```

**Et une variable de confort** pour finir, qui n'a rien de technique mais qui rend service pendant les premiers jours :

```bash
clever env set CC_HTTP_BASIC_AUTH "demo:un-mot-de-passe"
```

Elle place l'application entière derrière une authentification HTTP basique. C'est exactement ce qu'il faut pendant qu'on met au point un déploiement sur une adresse publique, et ça évite de découvrir qu'un moteur d'indexation est passé avant vous.

## Se repérer dans la documentation Clever

La page qui vous servira le plus est la [référence des variables d'environnement](https://www.clever.cloud/developers/doc/reference/reference-environment-variables/). Elle est dense, et elle contient à peu près tout ce que la plateforme sait faire. Quand quelque chose ne se comporte pas comme prévu, il y a de bonnes chances que la réponse soit une variable listée là.

La documentation est [open source sur GitHub](https://github.com/CleverCloud/documentation). Plusieurs précisions de cet article viennent d'allers-retours entre ce qu'elle décrit et ce que j'ai observé en déployant. Quand il manque une précision, la pull request est possible pour tout le monde, et c'est souvent le chemin le plus direct pour que le suivant ne se pose pas la question.

Enfin, [le changelog](https://www.clever.cloud/developers/changelog/) publie un flux <abbr title="Really Simple Syndication">RSS</abbr>. La plateforme bouge vite, les versions de runtimes et les valeurs par défaut avec elle, et c'est le seul endroit où ces mouvements sont annoncés.

## Et ensuite

Vous avez une application Symfony en production, une base managée, des migrations automatiques et un healthcheck. C'est un déploiement complet, et il repose sur le runtime Apache et PHP-FPM, celui qui fait tourner du PHP depuis plus de 25 ans.

Dans le prochain article, on refait exactement le même déploiement sur FrankenPHP, et on compare : ce que ça change dans la configuration, ce que ça apporte en performance, et surtout dans quels cas rester sur Apache reste le bon choix.

> **Code source.** La branche [`02-first-deployment`](https://github.com/welcoMattic/symfony-clever-cloud-series/tree/02-first-deployment) du dépôt [welcoMattic/symfony-clever-cloud-series](https://github.com/welcoMattic/symfony-clever-cloud-series) contient tout ce que cet article ajoute à l'application : l'écouteur de healthcheck, le script de `clevercloud/`, la configuration Doctrine et celle des proxys de confiance.
