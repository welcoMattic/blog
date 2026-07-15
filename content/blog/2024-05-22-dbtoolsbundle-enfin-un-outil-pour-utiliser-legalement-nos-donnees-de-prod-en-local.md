---
title: "[JoliCode] DbToolsBundle, enfin un outil pour utiliser légalement nos données de prod en local"
date: 2024-05-22T09:00:00.000Z
description: "\"Nul n'est censé ignorer la loi\", commençons donc par une piqûre de rappel : Il est illégal d'utiliser les données personnelles de vos utilisateurs ailleurs que sur la prod. Plus précisément, le RGPD1"
tags:
  - cross-post
  - jolicode
  - php
  - symfony
  - tool
  - database
  - rgpd
  - backup
lang: fr
noindex: true
origin:
  url: https://jolicode.com/blog/dbtoolsbundle-enfin-un-outil-pour-utiliser-legalement-nos-donnees-de-prod-en-local
  site: JoliCode
---

« Nul n’est censé ignorer la loi », commençons donc par une piqûre de rappel :

Il est illégal d’utiliser les données personnelles de vos utilisateurs ailleurs que sur la prod. Plus précisément, le RGPD[1](#fn:rgpd) indique que :

> Les données à caractère personnel doivent être :
> 
> -   traitées de manière licite, loyale et transparente au regard de la personne concernée (principes de licéité, de loyauté, et de transparence);
> -   collectées pour des finalités déterminées, explicites et légitimes, et ne pas être traitées ultérieurement d’une manière incompatible avec ces finalités; le traitement ultérieur à des fins archivistiques dans l’intérêt public, à des fins de recherche scientifique ou historique ou à des fins statistiques n’est pas considéré, conformément à l’article 89, paragraphe 1, comme incompatible avec les finalités initiales (limitation des finalités);
> -   \[…\]
> -   traitées de façon à garantir une sécurité appropriée des données à caractère personnel, y compris la protection contre le traitement non autorisé ou illicite et contre la perte, la destruction ou les dégâts d’origine accidentelle, à l’aide de mesures techniques ou organisationnelles appropriées (intégrité et confidentialité);

En résumé, l’utilisation de données personnelles dans le cadre du développement d’une application ne rentre pas dans le cadre légal fixé par le RGPD.

## Qu’avons-nous le droit de faire ?

Quotidiennement, nous avons besoin de données pour nourrir nos applications en local afin de tester notre code, corriger des bugs, faire évoluer des fonctionnalités, etc. Ces données « de travail » peuvent être générées grâce à des outils comme [Foundry](https://github.com/zenstruck/foundry), que nous vous recommandons chaudement. Mais parfois les fixtures ne suffisent pas, par manque de temps pour les maintenir, parce que la complexité du modèle de données augmente, et qu’il devient chronophage de tenir les fixtures à jour, ou pour plein d’autres raisons (coucou le legacy).

Il devient alors tentant d’utiliser les meilleures données qui soient, c’est-à-dire celles de la production. Mais comme nous l’avons vu quelques lignes plus haut, c’est illégal (du moins au sein de l’Union Européenne).

Heureusement, nous avons une alliée pour faire face à ce dilemme, la CNIL. En plus d’être l’organisation qui s’assure que le numérique soit au service des citoyens et qu’il ne porte pas atteinte aux droits de l’Homme, la CNIL édite également des guides à destination des professionnels afin de les aider à respecter la loi, qu’elle soit Française ou Européenne.

Ainsi, dans le Guide pratique RGPD[2](#fn:guide-pratique) il est recommandé :

> De ne pas utiliser des données personnelles réelles pour les phases de développement et de test. > Des jeux fictifs doivent être utilisés autant que possible.

Par ailleurs, la CNIL édite également un [Guide RGPD pour l’équipe de développement](https://lincnil.github.io/Guide-RGPD-du-developpeur/), que nous vous invitons à consulter.

Maintenant que nous connaissons nos droits, imaginons le cas suivant :

_Une application Symfony en production depuis quelques années, avec un modèle de données assez conséquent, dont l’équipe de développement cherche à optimiser son temps et notamment à se passer de la maintenance des fixtures, devenue trop chronophage et complexe._

L’idéal, dans ce cas d’exemple, serait de pouvoir fournir, à chaque développeur, une copie de la base de données de production dans laquelle toutes les données personnelles des utilisateurs ont été anonymisées. Voyons comment mettre en place une telle solution !

## Comment la respecter sans s’arracher les cheveux ?

Toute la difficulté réside dans le mot « Anonymisation ». Faire une copie d’une base de données est relativement simple, peu importe que le projet utilise MySQL, PostgreSQL, etc. Mais anonymiser les données de cette copie est une tâche spécifique à chaque base de données.

Nous devons nous poser plusieurs questions en amont :

-   Qu’est ce qu’une donnée personnelle ?
-   Est-ce que certaines données indirectement liées aux utilisateurs pourraient permettre de retrouver leur identité (factures, fichiers envoyés par les utilisateurs comme des photos de profil, code promotion utilisé sur une boutique en ligne, etc).

NB : Bien sûr, comme nous ne maîtrisons pas TOUT Internet, le RGPD nous laisse une marge de manœuvre quant à la possibilité de ré-identifier une personne à partir d’une donnée issue d’un autre système d’information (par exemple, un code promotionnel unique émis par un partenaire et utiliser sur notre boutique en ligne pourrait être un cas à la marge).

La première étape est donc de lister toutes les colonnes de notre base de données qui peuvent s’apparenter à de la donnée personnelle.

Ensuite, nous devons respecter un ordre précis d’opérations à effectuer pour garantir que nous n’aurons jamais accès aux données personnelles des utilisateurs.

## Outillage technique

Jusqu’à présent, nous faisions ce genre de choses au cas par cas selon les besoins spécifiques de chaque projet et/ou client. Mais depuis peu il existe un outil écrit en PHP qui va grandement faciliter la vie des développeurs Symfony : [DbToolsBundle](https://dbtoolsbundle.readthedocs.io/en/stable/).

Ce bundle Symfony nous offre un ensemble de commandes afin de sauvegarder, anonymiser et restaurer des bases de données. Ces commandes reposent sur le composant Command de Symfony, nous sommes donc en terrain connu.

Faisons ensemble un petit tour du propriétaire avant de voir comment le mettre en place dans un cas plus concret.

### Configuration

Après [quelques lignes de configuration](https://dbtoolsbundle.readthedocs.io/en/stable/configuration.html#binaries) pour indiquer au bundle quel moteur de base de données vous utilisez, nous allons devoir indiquer au bundle quelles propriétés de nos entités nous voulons anonymiser :

```php
#[ORM\Column(length: 180, unique: true)]
#[Anonymize(type: 'email')]
private ?string $emailAddress = null;
```

Cette étape se fait assez simplement avec des Attributs à placer sur les propriétés de vos entités Doctrine !

La [documentation est très bien faite](https://dbtoolsbundle.readthedocs.io/en/stable/anonymization/essentials.html), elle liste tous les Attributs disponibles. Il existe même un système de [« packs » localisés](https://dbtoolsbundle.readthedocs.io/en/stable/anonymization/packs.html) pour anonymiser vos données dans la bonne locale selon vos utilisateurs.

Pour une utilisation avancée, il est même possible de [créer vos propres « Anonymizers »](https://dbtoolsbundle.readthedocs.io/en/stable/anonymization/custom-anonymizers.html).

### Commandes disponibles

La première commande `bin/console db-tools:backup` va tirer partie des binaires fournis avec MariaDB, MySQL, PostgreSQL ou SQLite pour exporter un dump. Nous nous retrouvons donc avec un fichier `.dump` (nommons ce dump « D1 ») dans le dossier `var/db_tools/default/{Y}/{m}` avec `Y` et `m` correspondant respectivement à l’année et au mois courant.

La commande suivante `bin/console db-tools:anonymize [PATH]` va effectuer une série d’actions pour anonymiser le dump précédemment créé. ⚠️ Attention, cette commande charger le dump dans la base de données courante de l’environnement sur lequel elle est exécutée pour effectuer l’anonymisation, puis exporter le résultat dans un fichier .dump portant le même nom. Pour en savoir plus et maîtriser vos actions, consultez la [documentation](https://dbtoolsbundle.readthedocs.io/en/stable/anonymization/command.html).

Pour finir, la dernière commande `bin/console db-tools:restore [FILENAME]` permet de charger un dump dans notre base de données locale. Ici, elle nous servira à charger le dump fraîchement anonymisé.

## Dans la vraie vie

Les personnes de [Makina Corpus](https://makina-corpus.com/), l’entreprise derrière le bundle DbToolsBundle fournissent dans la documentation un excellent schéma animé pour comprendre un des workflows idéal pour utiliser des données anonymisées en local à partir d’une base de données de production.

[![Schéma animée d'utilisation de données de production anonymisées en local](/img/jolicode/dbtoolsbundle-enfin-un-outil-pour-utiliser-legalement-nos-donnees-de-prod-en-local/db-tools-bundle.gif)](https://dbtoolsbundle.readthedocs.io/en/stable/anonymization/workflow.html#the-workflow)

Dans ce schéma, l’environnement « tampon », appelé « Preprod », va régulièrement (par exemple une fois par jour) accéder à un backup de la base de données de production, l’anonymiser, et stocker sur le disque le dump prêt à l’emploi pour les développeurs, qui pourront l’importer en local grâce à la commande `bin/console db-tools:restore`.

La partie « accès à un backup » dépend entièrement de votre projet. Si votre environnement de production dispose de backups, il faudra permettre à l’environnement intermédiaire d’y accéder. S’ils sont chiffrés, il faudra pouvoir les déchiffrer. Si jamais vous n’avez pas de backups, (demandez nous de vous aider à en mettre en place via [notre page de contact](https://jolicode.com/contact)) vous pouvez également configurer un accès dédié en lecture seule de votre preprod à votre base de données de production. **Ce n’est pas ce que nous recommandons**, car cet accès peut être détourné de son usage primaire.

Il existe également une solution que nous trouvons plus élégante. L’environnement intermédiaire peut également être notre service d’intégration continue !

En effet, sur la plupart des services de CI, il est désormais possible de faire exécuter à intervalles réguliers des actions.

Prenons le cas d’une application ayant des backups de base de données configurés pour être chiffrés et stockés sur un Object Storage distant. Nous pouvons stocker les informations d’accès à cet Object Storage ainsi que la clé de déchiffrement dans les « secrets » de notre service de CI. Enfin, quelques lignes de YAML devraient suffire pour configurer une action récurrente qui récupère le dernier backup en date, exécute la commande `bin/console db-tools:anonymize [PATH]` avec ce backup, et stocke le fichier .dump anonymisé dans les artefacts de notre CI afin de le rendre disponible aux développeurs.

Quelques points d’attention doivent néanmoins être pris en compte lors de la mise en place de ce processus :

-   L’environnement de votre CI devra disposer du binaire correspondant à votre base de données (`mariadb`, `mysql`, `pg_restore`, etc), tout comme vos environnements de développement locaux pour la restauration ;
-   Pensez à inclure vos secrets de CI dans la rotation de vos clés de chiffrement de vos backups de production le cas échéant.

L’avantage principal de ce workflow est qu’il permet, en plus de mettre à disposition des développeurs un dump qualitatif, de tester l’intégrité de vos backups de production !

## Bonus, une tâche Castor 🦫

Les commandes fournies par DbToolsBundle sont très efficaces et assez simples à utiliser. Cependant, elles impliquent, pour deux d’entre elles, de connaître le chemin vers le backup à anonymiser, ou à restaurer.

Pour simplifier ça, nous vous proposons trois tâches qui tirent parti de notre nouveau task runner, [Castor](https://castor.jolicode.com/) !

```php
const LATEST_BACKUP_CACHE_KEY = 'latest-backup';
const LATEST_ANONYMIZED_BACKUP_CACHE_KEY = 'latest-anonymized-backup';

#[AsTask(description: 'Backup database')]
function backup(): void
{
    run('bin/console db-tools:backup');

    cache(LATEST_BACKUP_CACHE_KEY, function () {
        $files = finder()
            ->in(__DIR__.'/var/db_tools/default/'.date('Y').'/'.date('m'))
            ->sortByNames()
            ->reverseSorting()
            ->files();

        foreach ($files as $file) {
            return $file;
        }

        throw new \RuntimeException('No backup file found');
    });
}

#[AsTask(description: 'Anonymize database')]
function anonymize(
    #[AsArgument(description: 'Path to the raw backup file, if not provided, the latest created backup will be used')]
    string $path = null,
): void {
    $path ??= cache(
        LATEST_BACKUP_CACHE_KEY,
        fn() => throw new \RuntimeException('No backup file found, please provide a path to the raw backup file.')
    );

    run('bin/console db-tools:anonymize --no-interaction '.$path);

    cache(LATEST_ANONYMIZED_BACKUP_CACHE_KEY, fn() => $path);
}

#[AsTask(description: 'Get last anonymized backup path')]
function last_anonymized_backup(): void
{
    $path = cache(
        LATEST_ANONYMIZED_BACKUP_CACHE_KEY,
        fn() => throw new \RuntimeException('No backup file found, please backup your database and anonymize it first')
    );

    io()->text($path);
}

#[AsTask(description: 'Restore anonymized database')]
function restore(
    #[AsArgument(description: 'Path to the anonymized backup file, if not provided, the latest anonymized backup will be used')]
    string $filename = null,
): void {
    $filename ??= cache(
        LATEST_BACKUP_CACHE_KEY,
        fn() => throw new \RuntimeException('No backup file found, please provide a path to the anonymized backup file.')
    );

    run('bin/console db-tools:restore --yes-i-am-sure-of-what-i-am-doing --force --filename '.$filename);

    get_cache()->delete(LATEST_ANONYMIZED_BACKUP_CACHE_KEY);
    get_cache()->delete(LATEST_BACKUP_CACHE_KEY);
}
```

Ces tâches sont fournies à but informatif, libre à vous de vous en inspirer pour améliorer votre workflow et simplifier la vie de vos développeurs !

#### Sources et liens

-   [https://pgsessions.com/assets/archives/pgs12\_06\_anonymisation\_beyond\_gdpr.pdf](https://pgsessions.com/assets/archives/pgs12_06_anonymisation_beyond_gdpr.pdf)
-   [https://dbtoolsbundle.readthedocs.io/en/stable/](https://dbtoolsbundle.readthedocs.io/en/stable/)
-   [https://castor.jolicode.com/](https://castor.jolicode.com/)

* * *

1.  [https://gdpr.algolia.com/fr/gdpr-article-5](https://gdpr.algolia.com/fr/gdpr-article-5) [↩](#fnref:rgpd)
    
2.  [https://www.cnil.fr/sites/cnil/files/2024–03/cnil\_guide\_securite\_personnelle\_2024.pdf](https://www.cnil.fr/sites/cnil/files/2024-03/cnil_guide_securite_personnelle_2024.pdf) [↩](#fnref:guide-pratique)
    

### Commentaires et discussions

let commentsLoaded = false; var remark\_config = { host: 'https://jolicode.com/comments', site\_id: 'jolicode', components: \['embed'\], url: 'https://jolicode.com/blog/dbtoolsbundle-enfin-un-outil-pour-utiliser-legalement-nos-donnees-de-prod-en-local', max\_shown\_comments: 20, theme: 'light', page\_title: "DbToolsBundle, enfin un outil pour utiliser l\\u00e9galement nos donn\\u00e9es de prod en local", locale: 'fr', show\_email\_subscription: false }; const observer = new IntersectionObserver((entries) => { if (commentsLoaded || entries\[0\].intersectionRatio <= 0) return; commentsLoaded = true; !function(e,n){for(var o=0;o<e.length;o++){var r=n.createElement("script"),c=".js",d=n.head||n.body;"noModule"in r?(r.type="module",c=".mjs"):r.async=!0,r.defer=!0,r.src=remark\_config.host+"/web/"+e\[o\]+c,d.appendChild(r)}}(remark\_config.components||\["embed"\],document); }, { root: null, rootMargin: '0px 0px 400px 0px', }); observer.observe(document.getElementById('remark42'));

## Nos articles sur le même sujet

### [Améliorer la DX de vos Fixtures PHP](https://jolicode.com/blog/ameliorer-la-dx-de-vos-fixtures-php)

Les fixtures sont utilisées pour charger des données définies par les développeurs dans une base de données. Elles sont très utiles en environnement de développement car elles permettent d’avoir une application…

24/06/2020

par Grégoire Pineau

### [Comment tester fonctionnellement un projet legacy](https://jolicode.com/blog/comment-tester-fonctionnellement-un-projet-legacy)

Travailler sur un projet fraîchement démarré, c’est hype ! Mais beaucoup d’entre nous n’ont pas cette chance. Au travers d’une mission, j’ai dû mettre en place un système d’intégration continue sur un projet considéré…

22/03/2019

par Grégoire Pineau

## Nos formations sur ce sujet

Notre expertise est aussi disponible sous forme de formations professionnelles !

[Voir toutes nos formations](https://jolicode.com/nos-metiers/formations)

 ![Symfony avancée](/img/jolicode/dbtoolsbundle-enfin-un-outil-pour-utiliser-legalement-nos-donnees-de-prod-en-local/logo_symfony2.png)

### Symfony avancée

Décou­vrez les fonc­tion­na­li­tés et concepts avan­cés de Symfo­ny

[En savoir plus sur cette formation](https://jolicampus.com/formations/symfony-avancee)

## Ces clients ont profité de notre expertise
