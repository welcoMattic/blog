---
title: "Symfony sur Clever Cloud : préparer son app à vivre sur un PaaS"
date: 2026-09-01T09:00:00.000Z
description: "1er article d'une série sur le déploiement d'une application Symfony évolutive sur le PaaS Clever Cloud"
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
  order: 1
  label: "Préparer son app à vivre sur un PaaS"
---

_This blog post is also available in 🇬🇧 English: [Symfony on Clever Cloud: preparing your app to live on a PaaS](/blog/2026-09-01-symfony-clever-cloud-1-prepare-your-app-for-a-paas/)._

> **Transparence.** Je suis ambassadeur Clever Cloud. J'écris cette série en toute indépendance, personne chez eux ne relit cette série, et je m'y autorise les mêmes critiques que sur n'importe quelle autre plateforme.

Après [un <abbr title="Software Development Kit">SDK</abbr> PHP pour piloter l'API de Clever Cloud](/blog/2026-08-26-sdk-php-clever-cloud/), je m'attaque à ce qui tourne sur ce cloud provider : une série sur le déploiement d'applications Symfony sur leur <abbr title="Platform as a Service">PaaS</abbr>. De l'audit de l'application jusqu'à l'autoscaling et la configuration distribuée.

Mais je ne vais pas commencer par `clever create`. Parce qu'en accompagnant des migrations vers un PaaS, j'ai fini par constater une chose : la quasi-totalité des problèmes ne vient pas de la plateforme choisie. Elle vient de la configuration d'applications Symfony qui n'ont jamais été écrites pour tourner ailleurs que sur le serveur d'origine où elles ont été initialisées (souvent un couple Nginx + PHP-FPM sur un <abbr title="Virtual Private Server">VPS</abbr> unique). Sessions sur le disque, uploads dans `public/`, logs dans `var/log/prod.log`, host de base de données en dur dans le fichier `.env.prod`. Rien de tout ça n'est un problème sur un VPS ou dans une <abbr title="Virtual Machine">VM</abbr>. Tout ça peut casser sur un PaaS.

Alors avant de choisir la taille de l'instance Clever sur laquelle nous allons déployer, faisons un audit rapide d'une application classique. À la fin de cet article, vous saurez si votre application est prête, et ce qu'il faut changer si elle ne l'est pas. Le contenu vaut pour Clever Cloud, mais aussi pour Scalingo, Upsun, Scaleway, Render, Fly.io, Heroku ou quasiment n'importe quel autre PaaS : c'est le même contrat.

## Le contrat, c'est 12-factor

En 2011, Adam Wiggins, cofondateur de Heroku, publie [The Twelve-Factor App](https://12factor.net/). Le document part d'un constat simple : Heroku hébergeait des milliers d'applications, et celles qui se déployaient sans douleur partageaient les mêmes propriétés. Wiggins les a écrites. Quinze ans plus tard, c'est toujours la meilleure grille de lecture disponible, et surtout : **un PaaS est, entre autres, la mise en œuvre opérationnelle de ces douze principes**. Quand vous déployez sur un PaaS, vous ne choisissez pas d'adopter 12-factor, vous l'adoptez de fait.

On présente souvent les douze facteurs comme une liste de règles à cocher. C'est la meilleure façon de ne rien en retenir, parce que ce sont en réalité douze déclinaisons d'une seule idée : **votre application doit être un processus interchangeable**. La plateforme doit pouvoir l'arrêter, la dupliquer, la déplacer sur une autre machine ou la remplacer par une version plus récente, sans que vos utilisateurs s'en aperçoivent et sans que rien ne se perde au passage. Tout le reste en découle.

Les 12 principes sont :

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

Pour les rendre digestes, regroupons-les en quatre familles.

### Ce qui entre dans l'application (I, II, III)

Un dépôt versionné unique produit tous les déploiements : la production, la préproduction et le poste de chaque développeur exécutent le même code, à des versions différentes. Les dépendances sont déclarées explicitement, dans `composer.json` et figées dans `composer.lock`, ce qui veut dire que personne ne va installer une extension à la main sur le serveur pour dépanner un vendredi soir. Et tout ce qui change d'un environnement à l'autre, l'adresse de la base de données, la clé d'API du prestataire de paiement, le niveau de log, sort du code pour devenir une variable d'environnement.

Sur une application Symfony, les deux premiers sont acquis d'office : Git et Composer font le travail sans qu'on ait rien à décider. Le troisième est celui qui coince, parce qu'il ne se voit pas tant qu'on n'a qu'un serveur : c'est le `.env.prod` recopié à la main, le vieux `parameters.yml` hérité d'une version antérieure du projet, ou le host de base de données écrit en dur dans un fichier de configuration.

### Ce qu'elle a autour de l'application (IV, VII, XI)

La base de données, le serveur Redis, le stockage de fichiers, le serveur d'envoi de mails sont des **ressources attachées** : l'application les joint via une adresse qu'on lui fournit au démarrage, et on doit pouvoir en débrancher une pour la remplacer par une autre sans toucher au code. Basculer d'une base PostgreSQL locale à une base managée doit être un changement de variable d'environnement, rien de plus.

L'application expose ensuite son service sur un port, en se suffisant à elle-même plutôt qu'en étant installée à l'intérieur d'un serveur web. C'est le facteur que le monde PHP applique le moins naturellement : avec le couple classique Nginx plus PHP-FPM, ce n'est pas votre application qui écoute sur le réseau, c'est le serveur web qui l'invoque. Ce n'est pas un défaut à corriger, le runtime de la plateforme joue ce rôle pour vous. Notez simplement que FrankenPHP rend ce facteur littéral en embarquant le serveur dans l'application elle-même, et nous y reviendrons dans un prochain article.

Enfin, l'application n'écrit pas de fichiers de log. Elle écrit ses logs sur sa sortie standard, au fil de l'eau, et c'est l'environnement qui décide où ils atterrissent : la console d'un développeur en local, un système de collecte en production.

### Comment l'application est fabriquée et lancée (V, XII)

Trois étapes, strictement distinctes. Le **build** transforme le code source en un artefact exécutable : dépendances installées, assets compilés, cache préchauffé. La **release** associe cet artefact à la configuration de l'environnement visé. Le **run** exécute le résultat. La règle qui compte est qu'une release, une fois constituée, ne se modifie plus : on ne corrige pas un bug en éditant un fichier sur le serveur, on refait un build. C'est ce qui garantit que ce qui tourne en production correspond exactement à un commit identifié, et que revenir en arrière consiste à réexécuter une release précédente.

Les tâches ponctuelles suivent la même logique : une migration Doctrine ou une commande de maintenance est un processus lancé à part, sur le même artefact et avec la même configuration que l'application qui sert le trafic. Pas un script à part, pas un accès manuel à la base.

### Comment l'application se comporte en vie (VI, VIII, IX, X)

L'application ne garde rien entre deux requêtes : c'est le facteur sans état (stateless), celui qui ouvre la checklist plus bas et qui coûte le plus cher à ignorer. Elle monte en charge en multipliant les processus plutôt qu'en grossissant la machine, ce qui n'est possible que si le facteur précédent est respecté. Elle démarre vite et s'arrête proprement, parce que la plateforme peut la tuer à tout moment, pour un redéploiement, une panne matérielle ou une réduction du nombre d'instances. Et les environnements se ressemblent : le même moteur de base de données en local et en production, et un délai court entre un commit et sa mise en ligne.

### Ce que le PaaS impose de fait

Sur un PaaS, plusieurs de ces facteurs cessent d'être des recommandations pour devenir des contraintes physiques. Vous n'avez pas de serveur où vous connecter, donc la configuration passe forcément par l'environnement (III) et les tâches ponctuelles par des commandes déclarées (XII). Le disque est éphémère et plusieurs instances peuvent tourner en parallèle, donc l'application doit être sans état (VI) et écrire ses logs sur la sortie standard (XI). La plateforme construit d'abord, exécute ensuite, donc le build et le run sont séparés que vous l'ayez voulu ou non (V).

Les autres restent de votre côté : ils rendront votre vie plus simple, mais rien ne vous forcera la main.

Sur une application Symfony existante, tous ces principes ne demandent pas le même travail. Certains sont déjà respectés sans qu'on y ait jamais pensé, d'autres demandent de vrais changements. La checklist qui suit passe en revue ceux qui comptent, une question à la fois. Chaque question indique entre parenthèses le facteur auquel elle se rattache.

## Les 8 questions à se poser

### 1. Mon application est-elle vraiment sans état ? (facteur VI)

Commençons par le vocabulaire, parce que tout le reste en découle. L'état, ici, c'est l'ensemble des informations que votre application écrit quelque part et relit ensuite pour continuer à travailler : la session d'un utilisateur qui vient de se connecter, le fichier qu'il a envoyé il y a dix secondes, le résultat d'un calcul coûteux mis en cache pour ne pas le refaire.

Une application est dite **avec état** (*stateful*) quand elle range ces informations chez elle, dans la mémoire ou sur le disque de la machine qui exécute son code. Elle est dite **sans état** (*stateless*) quand elle les range à l'extérieur, dans un service que toutes les copies de l'application peuvent joindre : une base de données, un serveur Redis, un stockage objet. L'application, elle, ne garde rien entre deux requêtes.

Sur un serveur unique, la distinction est invisible : il n'y a qu'un disque et qu'une mémoire, donc "chez elle" et "à l'extérieur" désignent la même machine. Elle apparaît le jour où plusieurs exemplaires de l'application tournent en parallèle, ce qui est le mode de fonctionnement normal d'un PaaS. Chaque exemplaire a sa mémoire et son disque à lui, et le répartiteur de charge envoie les requêtes d'un même utilisateur tantôt sur l'un, tantôt sur l'autre. Ce que l'exemplaire A a écrit chez lui, l'exemplaire B ne le voit pas. Pire : ces exemplaires sont détruits et recréés à chaque déploiement, donc ce qui était écrit chez eux disparaît sans prévenir.

C'est la question qui coûte le plus cher à ignorer, parce que le symptôme est délicieusement intermittent : ça marche, jusqu'au jour où vous passez à deux instances et où vos utilisateurs se déconnectent une fois sur deux.

Trois endroits à inspecter :

- **Les sessions.** Par défaut, Symfony les écrit sur le système de fichiers. Deux instances, deux systèmes de fichiers, deux jeux de sessions. Il faut basculer sur un stockage partagé entre les instances (comme Redis).
- **Le cache.** `var/cache/` est local à l'instance. Pour le cache applicatif partagé (`cache.app`), il faut un adaptateur distribué (Redis aussi peut convenir ici).
- **Les uploads.** Si vous écrivez dans `public/uploads/`, le fichier n'existe que sur l'instance qui l'a reçu, et il disparaît au prochain déploiement. Il faut un stockage partagé de fichiers (un Object Storage comme S3 ou un système de fichier réseau comme <abbr title="Network File System">NFS</abbr>).

### 2. Mes secrets sont-ils dans le code ? (facteur III)

Le `.env` est-il commité avec des vraies valeurs dedans ? Y a-t-il un `.env.local` que vous copiez à la main sur le serveur ? Utilisez-vous le [vault de Symfony](https://symfony.com/doc/current/configuration/secrets.html) ?

Sur un PaaS, la réponse est uniforme : les secrets sont déclarés dans l'environnement de la plateforme, jamais dans le dépôt. Le vault Symfony reste utilisable, mais il vous faut alors gérer la clé de déchiffrement comme variable d'environnement, ce qui revient au même problème avec une étape en plus. Pour la plupart des projets, les variables de la plateforme suffisent.

### 3. Mon accès base de données est-il configurable au runtime ? (facteurs III et IV)

Derrière cette question se cache le principe le plus structurant de tout l'article : **une application ne doit rien savoir de l'environnement dans lequel elle tourne**. Le même code, issu du même build, doit pouvoir démarrer sur votre poste, sur une préproduction et en production sans qu'on y change une seule ligne. Ce qui distingue ces trois exécutions, ce sont uniquement les valeurs que l'environnement fournit à l'application au démarrage.

Autrement dit, votre application ne dit pas "ma base de données est sur `10.0.0.12`". Elle dit "ma base de données est là où on me dira qu'elle est, au moment où je démarrerai". C'est l'environnement qui répond, et c'est lui qui a raison.

Dans `config/packages/doctrine.yaml`, la ligne doit ressembler à ça :

```yaml
doctrine:
    dbal:
        url: '%env(resolve:DATABASE_URL)%'
```

La syntaxe `%env()%` n'est pas une simple commodité d'écriture : c'est elle qui rend cette décorrélation possible. Symfony ne remplace pas la valeur au moment où il compile son conteneur d'injection de dépendances, mais au moment où l'application démarre. La même application déjà construite peut donc pointer sur des bases différentes selon l'endroit où elle s'exécute, sans être reconstruite.

Si vous avez un `host: 10.0.0.12` en dur, ou un `dbname` figé, c'est perdu d'avance : sur un PaaS, l'URL de la base est fournie par la plateforme au démarrage, et elle peut changer, et c'est normal.

Et la base de données n'est qu'un exemple. Le même raisonnement vaut pour tout ce que votre application ne détient pas elle-même : le serveur Redis, le stockage objet, le serveur d'envoi de mails, l'API tierce que vous appelez. Chacun est une ressource attachée, décrite par une variable d'environnement, remplaçable sans toucher au code. C'est exactement ce que dit le facteur IV.

### 4. Mes assets sont-ils construits au déploiement ? (facteur V)

En local, vous lancez `npm run build` ou `bin/console asset-map:compile` à la main. Sur le serveur, qui le fait ? Si la réponse est "personne, je commite `public/build/`", ça fonctionne encore, mais vous versionnez des artefacts de build et vous allez au conflit de merge. Le build d'assets doit devenir une étape automatisée du déploiement. AssetMapper, Webpack Encore ou Symfony Reprise, peu importe : ce qui compte est que ce soit scripté.

### 5. Mes migrations Doctrine tournent-elles toutes seules ? (facteur XII)

Question honnête : aujourd'hui, comment déployez-vous ? Si la séquence est `git pull` puis un SSH pour lancer `bin/console doctrine:migrations:migrate --no-interaction` à la main, ce geste doit disparaître. Sur un PaaS, vous n'avez pas de serveur où vous connecter, et surtout vous ne voulez pas être dans la boucle.

C'est le point qui demande le plus de soin, parce que le timing compte : les migrations doivent tourner après le build et avant que l'application ne serve du trafic. Et avec plusieurs instances, il faut éviter qu'elles se lancent en parallèle. On traitera ça en détail dans l'article suivant.

### 6. Mes logs partent-ils sur la sortie standard ? (facteur XI)

Si Monolog écrit dans `var/log/prod.log`, ce fichier est sur un disque éphémère, sur une instance parmi N, et personne ne le lira jamais. Le PaaS collecte ce qui sort sur `stdout` et `stderr`, point.

Bonne nouvelle : si vous n'avez jamais touché à `config/packages/monolog.yaml`, la recipe Symfony fait déjà ce qu'il faut. L'essentiel de ce qu'elle pose en prod :

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

Trois choses à en retenir. Le handler `nested` écrit sur `php://stderr`, la sortie que la plateforme collecte. Le `formatter: monolog.formatter.json` n'est pas cosmétique : sans lui, une stack trace part en autant de lignes de log qu'elle a de niveaux, et votre collecte vous rend un puzzle au lieu d'un événement. Et le handler `console` couvre les commandes CLI, ce qui compte plus qu'on ne croit sur un PaaS, où les migrations et les tâches d'administration tournent dans des hooks de déploiement.

Le `fingers_crossed` en amont évite de noyer la collecte : il ne relâche le buffer que quand une erreur survient, ce qui vous donne le contexte des requêtes qui échouent, et le silence pour les autres. Attention à la lecture de `buffer_size: 50` : ce sont les 50 derniers enregistrements, pas la requête entière. Au-delà, le début du contexte est perdu.

C'est le seul point de cette checklist où les plateformes divergent vraiment. La doc PHP de Clever Cloud, elle, documente un handler `error_log`, qui envoie vers le mécanisme de log de PHP plutôt que directement sur la sortie standard :

```yaml
monolog:
  handlers:
    clever_logs:
      type: error_log
      level: warning
```

L'idée reste la même dans les deux cas : ne jamais écrire dans un fichier, mais plutôt là où la plateforme attend et peut lire les logs de façon standardisée.

### 7. Ai-je un healthcheck ? (hors 12-factor)

Une route qui répond 200 sans toucher à la base de données, pour que la plateforme sache si l'instance est vivante :

```php
#[Route('/health', name: 'health', methods: ['GET'])]
public function health(): JsonResponse
{
    return new JsonResponse(['status' => 'ok'], 200);
}
```

Sans base de données, volontairement. Un endpoint healthcheck qui interroge la base transforme un incident de base de données en indisponibilité totale de l'application : la plateforme croit que toutes vos instances sont mortes et les recycle en boucle. Si vous voulez vérifier vos dépendances, faites-en une seconde route, distincte, que vous surveillez sans la brancher au healthcheck de la plateforme.

### 8. Mon application démarre-t-elle vite ? (facteur IX)

Le facteur IX, "Disposability", est celui qu'on découvre au premier pic de charge. Quand la plateforme démarre une instance supplémentaire, un `cache:warmup` à froid peut prendre une dizaine de secondes. Pendant ce temps, l'instance est en train de se lever alors que le trafic, lui, est déjà là.

La règle est simple : le warmup se fait à la construction, pas au démarrage. L'artefact de build doit contenir un cache déjà chaud.

## Comment ça se traduit chez Clever Cloud

Voilà pour la partie universelle. Maintenant, la correspondance concrète, sur la plateforme dont parle cette série :

| Principe 12-factor | Chez Clever Cloud |
|---|---|
| III. Config | Variables d'environnement via la console, `clever env` via la CLI, ou un addon config-provider partagé entre plusieurs applications pour partager des variables dont les valeurs sont communes à plusieurs apps |
| IV. Backing services | Addons : PostgreSQL, MySQL, MongoDB, Redis, Cellar (S3), FS Buckets, Materia KV |
| VI. Processus sans état | Sessions sur Redis ou Materia KV, uploads sur Cellar, plus rien sur le disque local |
| VIII. Concurrence | Scalers horizontaux, `--min-instances` et `--max-instances` |
| XI. Logs | Handler Monolog `error_log`, et drains optionnels vers Datadog, Elastic ou OVH |

Clever renvoie officiellement à 12-factor dans sa doc des bonnes pratiques : [les 12 facteurs côté Clever](https://www.clever.cloud/developers/doc/best-practices/12-factors). La page tient en trois liens, mais elle dit l'essentiel : c'est bien le contrat attendu.

Trois variables à retenir dès maintenant, parce qu'elles reviendront à chaque article :

- **`CC_WEBROOT`** doit valoir `/public`. Sans elle, le runtime sert la racine du dépôt, et vous exposez votre `composer.json` et votre `.env` au monde entier.
- **`APP_ENV`** doit valoir `prod`. Si vous l'oubliez, vous déployez avec le profiler et les assertions de debug actives.
- **`APP_SECRET`** doit être définie, identique sur toutes les instances, et stable d'un déploiement à l'autre au risque d'invalider tout ce que ce secret sert à signer (cookie remember-me, URL signées, etc).

## Et ensuite

Votre application est prête à être auditée selon ces critères. Dans le prochain article, on passe à l'action : `clever create`, l'addon PostgreSQL, les hooks de déploiement et les migrations au bon moment, jusqu'à un premier déploiement en production.

> **Code source.** Chaque article de la série a sa branche dans le dépôt d'accompagnement : [welcoMattic/symfony-clever-cloud-series](https://github.com/welcoMattic/symfony-clever-cloud-series). Pour ce premier article, il n'y a rien à montrer d'autre que le point de départ : la branche [`01-fresh-symfony-app`](https://github.com/welcoMattic/symfony-clever-cloud-series/tree/01-fresh-symfony-app) contient une application Symfony 8.1 créée avec `symfony new --version=8.1 --webapp --docker`, sans une ligne ajoutée à la main.
