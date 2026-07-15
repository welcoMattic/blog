---
title: "[JoliCode] L’opérateur de merge en YAML, le pire ennemi de la duplication de configuration"
date: 2019-03-05T09:00:00.000Z
description: "📺 Dans l'épisode précédent… Fin 2017 à l'occasion du Calendrier de l'avent de l'AFSY, Baptiste avait écrit un article plein de bons conseils pour configurer efficacement EasyAdminBundle. Depuis, nous avons été"
tags:
  - cross-post
  - jolicode
  - protips
  - symfony
  - yaml
  - easyadmin
lang: fr
noindex: true
origin:
  url: https://jolicode.com/blog/loperateur-de-merge-en-yaml-le-pire-ennemi-de-la-duplication-de-configuration
  site: JoliCode
---

## 📺 Dans l’épisode précédent…

Fin 2017 à l’occasion du Calendrier de l’avent de l’AFSY, [Baptiste](https://jolicode.com/equipe/baptiste-adrien) avait écrit [un article plein de bons conseils](https://afsy.fr/avent/2017/01-easyadminbundle-l-arriere-guichet-easy-peasy) pour configurer efficacement [EasyAdminBundle](https://symfony.com/doc/master/bundles/EasyAdminBundle/index.html). Depuis, nous avons été confronté à de nouveaux cas qui nous ont forcé à repousser les limites de notre imagination et à exploiter tout le potentiel du YAML dans la configuration d’EasyAdminBundle ! Prêt ? C’est parti !

Prenons l’entité `Beer` (déjà utilisée dans l’article de Baptiste), dont les propriétés sont les suivantes :

```
Beer
    - id: integer (mandatory)
    - name: string (mandatory)
    - description: string (mandatory)
    - abv: integer (mandatory)
    - ibu: integer (mandatory)
    - labelThumbnail: string (mandatory)
    - isOrganic: bool (mandatory, default = false)
    - category: Category (mandatory)
    - status: smallint (mandatory)
    # On ajoute aujourd'hui ces 2 propriétés
    # l'une pour les bières "d'usine", l'autre pour les bières "d'abbaye"
    - factory: Factory (optional)
    - abbey: Abbey (optional)
```

Nous voulons maintenant afficher 2 listes de bières dans EasyAdmin : les bières bio (isOrganic = true) qui viennent d’une abbaye et les autres qui viennent d’une usine (pour faire simple). L’idéal serait donc de ne pas avoir à répéter 2 fois toutes nos propriétés dans la configuration d’EasyAdmin comme on le ferait naturellement :

```yaml
easy_admin:
    entities:
        Beer:
            class: App\Entity\Beer
            list:
                dql_filter: "entity.isOrganic = false"
                fields:
                    - { property: 'name' }
                    - { property: 'description' }
                    - { property: 'labelThumbnail' }
                    - { property: 'factory' }
        OrganicBeer:
            class: App\Entity\Beer
            list:
                dql_filter: "entity.isOrganic = true"
                fields:
                    - { property: 'name' }
                    - { property: 'description' }
                    - { property: 'labelThumbnail' }
                    - { property: 'abbey' }
```

Chaque liste de propriétés `fields` est ici une séquence YAML (équivalent d’un tableau sans clé). L’idée serait de pouvoir réutiliser notre première liste de propriétés, et même de pouvoir la surcharger.

Nous allons donc utiliser le système de références fourni par YAML, ainsi que l’opérateur de merge `<<`.

Voici comment déclarer une référence réutilisable :

```yaml
easy_admin:
    entities:
        Beer:
            class: App\Entity\Beer
            list:
                dql_filter: "entity.isOrganic = false"
                fields: &beerListFields
                    - { property: 'name' }
                    - { property: 'description' }
                    - { property: 'labelThumbnail' }
                    - { property: 'factory' }
```

La référence est déclarée avec le symbole `&` et elle porte le nom `beerListFields`.

Le problème que nous allons rencontrer ici, c’est que les références YAML ne supportent pas les séquences. L’astuce consiste à transformer la séquence des propriétés en mapping avec des clés (numériques par défaut).

## ✨ Here’s the magic

```yaml
easy_admin:
    entities:
        Beer:
            class: App\Entity\Beer
            list:
                dql_filter: "entity.isOrganic = false"
                fields: &beerListFields
                    1: { property: 'name' }
                    2: { property: 'description' }
                    3: { property: 'labelThumbnail' }
                    4: { property: 'factory' }
        OrganicBeer:
            class: App\Entity\Beer
            list:
                dql_filter: "entity.isOrganic = true"
                fields:
                    <<: *beerListFields
                    4: { property: 'abbey' }
```

Ici nous déclarons une référence avec `&beerListFields`, à laquelle nous faisons appel avec `*beerListFields`. Nous utilisons l’opérateur de merge YAML `<<` pour récupérer notre liste de champs. Nous en profitons pour surcharger le 4eme champ avec la propriété `abbey`.

Le tout reste du YAML valide, parfaitement compris par le composant YAML de Symfony 🎉

## 🎁 One more thing

Cet opérateur de merge YAML `<<` est utilisable dans n’importe quel fichier YAML. Vous pouvez donc vous en servir pour vos configurations ; HTTPlug, mapping Elasticsearch, Doctrine, etc. C’est en tout cas un bon moyen de réduire la répétition de code dans vos fichiers YAML lorsque ceux ci deviennent trop volumineux !

### Commentaires et discussions

let commentsLoaded = false; var remark\_config = { host: 'https://jolicode.com/comments', site\_id: 'jolicode', components: \['embed'\], url: 'https://jolicode.com/blog/loperateur-de-merge-en-yaml-le-pire-ennemi-de-la-duplication-de-configuration', max\_shown\_comments: 20, theme: 'light', page\_title: "L'op\\u00e9rateur de merge en YAML, le pire ennemi de la duplication de configuration", locale: 'fr', show\_email\_subscription: false }; const observer = new IntersectionObserver((entries) => { if (commentsLoaded || entries\[0\].intersectionRatio <= 0) return; commentsLoaded = true; !function(e,n){for(var o=0;o<e.length;o++){var r=n.createElement("script"),c=".js",d=n.head||n.body;"noModule"in r?(r.type="module",c=".mjs"):r.async=!0,r.defer=!0,r.src=remark\_config.host+"/web/"+e\[o\]+c,d.appendChild(r)}}(remark\_config.components||\["embed"\],document); }, { root: null, rootMargin: '0px 0px 400px 0px', }); observer.observe(document.getElementById('remark42'));

## Ces clients ont profité de notre expertise
