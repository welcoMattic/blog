# Plan de migration : Hugo (PaperMod) vers Astro

> Rédigé le 15 juillet 2026. Blog : https://blog.welcomattic.com
> Objectifs : contenu repris à l'identique, réintégration des articles JoliCode, nouveau thème,
> SEO/GEO, hébergement Cellar (Clever Cloud) à coût quasi nul, optimisation agressive au build.

## 0. Décisions actées (validées par Mathieu le 15/07/2026)

| Sujet | Décision |
|---|---|
| Framework | Astro 7.x, output `static`, zéro JS par défaut |
| Thème | **Custom, sur mesure**, d'après le brief de design tiré des 3 inspirations (section 3). Les thèmes existants évalués (Cactus, AstroPaper, erudite...) ne plaisent pas ; ils restent listés en 3.3 comme socle technique éventuel à re-skinner |
| JoliCode, SEO | **`noindex, follow`** + lien d'attribution visible dofollow, canonical self-référent, exclu du sitemap. PAS de canonical cross-domain (contradictoire avec noindex, déconseillé par Google, voir 4.2) |
| JoliCode, périmètre | **Les 15 articles solo** réintégrés en contenu complet ; les 24 co-écrits restent en stubs noindex |
| Hébergement | **Cellar uniquement** (pas d'app payante). Un spike de validation en Phase 0 tranche les limites connues de Cellar ; repli à coût nul défini (section 7) |
| URLs | Préservées à 100 % à l'identique, zéro redirection |
| RSS | Résumés (statu quo), passage en contenu intégral possible plus tard |
| Veille | Format liste de liens conservé ; évolution vers liens commentés (GEO) au fil de l'eau, pas un prérequis |

## 1. État des lieux (site actuel)

- **Stack** : Hugo 0.152.2 + PaperMod (submodule git), déployé sur une app Clever Cloud
  (`.clever.json`, push git, proxy Sozu). Analytics : Plausible auto-hébergé
  (`plausible.lab.welcomattic.com`).
- **Contenu** : 89 fichiers markdown en 4 sections :
  - `content/blog` : 24 entrées (2014 à 2023), dont 19 stubs "cross-post" d'une ligne vers jolicode.com
  - `content/veille` : 52 numéros de "Veille matinale" (listes de liens, description dupliquée "News du jour")
  - `content/talks` : 12 talks (slides Speakerdeck, vidéos)
  - `content/oss` : 1 page
  - `content/_index.md` : bio de la home
- **URLs** : `/{section}/{YYYY-MM-DD-slug}/` avec trailing slash obligatoire (308 sans slash vers avec slash,
  301 http vers https). 233 URLs dans le sitemap (articles + tags + catégories). La date fait partie
  du nom de fichier, donc du slug.
- **Personnalisations Hugo à reproduire** :
  - `head.html` : `robotsNoIndex` (meta robots par page) et `canonicalURL` (canonical par page),
    mécanismes présents mais utilisés par AUCUN contenu aujourd'hui.
  - `render-link.html` : liens externes en `target="_blank"`.
  - `home_info.html`, `share_icons.html` (Bluesky), `rel=me` Mastodon (`phpc.social/@welcomattic`), Plausible.
- **Assets** : `static/img` (856 Ko), `static/pdf` (23 Mo), `static/tcard` (3,9 Mo, og:images de la veille
  générées par tcardgen, servies sous `/tcard/*.png`), favicons complets.
- **Flux** : RSS `/index.xml` (résumés ~70 mots) + flux par section (`/blog/index.xml`, `/veille/index.xml`,
  `/talks/index.xml`) et par tag, tous actifs en prod.
- **Bugs actuels notables** (audit SEO technique complet en section 5) :
  - `<html lang="en">` partout alors que le site est majoritairement francophone
    (clé `language = "fr"` non reconnue par Hugo, il faudrait `languageCode`) ; se propage au RSS.
  - Meta description vide sur la home (cascade sur og:description, twitter, JSON-LD).
  - Titres de section auto-pluralisés : "Blogs", "Veilles".
  - Aucun en-tête de sécurité (HSTS, CSP, etc.).
  - 19 stubs cross-post indexés comme contenu fin, sans aucun signal vers jolicode.com.

## 2. Architecture cible (Astro)

- **Astro 7.x** (stable depuis juin 2026 : Rolldown, compilateur Rust, builds 15 à 61 % plus rapides,
  gains max sur les sites markdown-heavy). Node 22+. `output: 'static'`, zéro JS hors îles
  (recherche Pagefind, toggle thème).
- **Collections typées** (`src/content.config.ts`) :

  | Collection | Schéma zod (principaux champs) |
  |---|---|
  | `blog` | title, date, description, tags, `lang: 'fr' \| 'en'`, `origin?: { url, site }` (JoliCode), `noindex?` |
  | `veille` | title, date, description, tags, categories |
  | `talks` | title, date, description, tags, slides?, video?, event? |
  | `oss` | page Astro simple (ou collection si envie de fiches projet) |

  Le champ `lang` par article corrige le bug de langue actuel : `<html lang>` par page,
  fr par défaut, en pour les contenus anglophones (Sleepr, talks 2025/2026, articles EN JoliCode).
- **Préservation EXACTE des URLs** : conserver les noms de fichiers markdown à l'identique
  (le slug Astro par défaut = nom de fichier, date incluse), `trailingSlash: 'always'`,
  `build.format: 'directory'` (un `index.html` par dossier). Pages `/tags/[tag]/` régénérées.
  `/categories/` (utilisé par la veille) reconduit. Résultat attendu : zéro redirection.
  Filet de sécurité : diff automatisé ancien sitemap vs nouveau (section 10).
- **Reprise intégrale du contenu** : copie des markdown tels quels (front matter YAML compatible).
  Vigilance : `</br>` dans `_index.md` (à rendre dans un composant), pas de shortcodes Hugo détectés,
  adapter `new-veille.sh` au nouveau chemin.
- **RSS** : `@astrojs/rss` avec endpoints aux chemins historiques : `/index.xml`, `/blog/index.xml`,
  `/veille/index.xml`, `/talks/index.xml` (+ par tag si peu coûteux). Choix à documenter :
  rester en résumé (comportement actuel) ou passer en contenu intégral. GUID = URL (stables).
- **Sitemap** : `@astrojs/sitemap` avec `filter` excluant les pages noindex et `serialize`
  pour un `lastmod` fiable (dérivé du front matter, sinon omis).
- **404**, favicons (mêmes chemins ET mêmes binaires), `/tcard/*.png` aux mêmes URLs, `rel=me`,
  Plausible en `defer` : repris à l'identique.
- **Liens externes** : plugin rehype (`rehype-external-links`) pour `target="_blank"` +
  `rel="noopener"` (équivalent du render-link.html actuel).

## 3. Thème : custom, d'après le brief tiré des 3 inspirations

Décision : aucun thème existant ne convient ; on construit un thème sur mesure. Un blog Astro
custom, c'est 5 à 6 gabarits ; l'effort (~2-3 j) est comparable à l'adaptation profonde d'un
thème existant, pour un résultat exactement voulu.

### 3.1 Ce que disent les 3 inspirations (analyse visuelle + structurelle)

| Trait | maudet.cloud | karanbansal.in | lecodeestdanslepre.fr |
|---|---|---|---|
| Fond | écru chaud | blanc froid | zinc neutre |
| Titres | serif éditorial | sans (Inter) gras | sans, gras |
| Méta (date, lecture) | petites capitales espacées | monospace discret | date alignée au titre |
| Eyebrow catégorie | oui, bordeaux uppercase | non | oui, uppercase avec accent dégradé |
| Liste d'accueil | rangées + vignettes + vedette | grille de cartes épurées | rangées denses, 12/page |
| Dark mode | non (clair chaleureux) | non observé | complet, avec toggle |
| Nav | horizontale simple + recherche | horizontale multi-sections (About/OSS/Blog/Talks/Resume) | horizontale + recherche + filtres |
| Images de contenu | oui (vignettes) | non | non |
| JS | minimal | minimal | quasi nul, badge EcoIndex |

### 3.2 Les similitudes structurantes (le brief)

1. **Le contenu d'abord** : une seule colonne de lecture centrée (~68-72ch), aucune sidebar,
   la page de section EST la liste d'articles.
2. **La liste d'articles comme épine dorsale** : une entrée = eyebrow catégorie (uppercase,
   letter-spacing, couleur d'accent) + titre fort + extrait de 2-3 lignes + méta discrète
   (date, temps de lecture) + tags en pills. Rangées séparées par des hairlines, pas de grosses cartes.
3. **Hiérarchie par la typographie, pas par la décoration** : gros titres contrastés, corps
   sobre, méta en petit (mono ou petites capitales). Pas d'images décoratives obligatoires
   (2 des 3 inspirations n'en ont pas) ; cover facultative par article.
4. **Palette neutre + UN seul accent** : fond neutre, texte quasi noir, un accent unique pour
   eyebrows/liens/focus (bordeaux chez maudet, dégradé chez lecodeestdanslepre).
5. **Nav horizontale multi-sections** qui mappe la structure du site (exactement le besoin :
   blog / veille / talks / oss + recherche + toggle thème). C'est le pattern karanbansal.
6. **Dark mode complet** (toggle + `prefers-color-scheme`), palette zinc en sombre
   (pattern lecodeestdanslepre).
7. **Sobriété revendiquée** : quasi zéro JS, perf affichée (EcoIndex chez lecodeestdanslepre) ;
   cohérent avec l'objectif 6 du projet.

Synthèse de température : les 3 inspirations tirent chacune vers un pôle (éditorial chaud /
minimal froid / dense neutre). Point d'équilibre proposé, à ajuster sur maquette :
fond neutre très légèrement chaud, **titres serif** (le caractère de maudet), **corps sans-serif**
(Inter ou équivalent), **méta en mono** (le détail karanbansal), **eyebrow uppercase à accent
bordeaux/terracotta**, **rangées denses** (la densité lecodeestdanslepre), dark mode zinc.

### 3.3 Mise en oeuvre

- Partir du template blog officiel d'Astro (`npm create astro -- --template blog`) comme socle
  technique nu (collections, RSS, sitemap déjà câblés), et écrire tout le CSS custom
  (design tokens : couleurs, typo, espacements ; ~300-400 lignes suffisent pour ce brief).
- Îles JS limitées à : toggle thème (script inline de quelques lignes) et recherche Pagefind
  (chargée à la demande). Tout le reste en HTML/CSS.
- Étape recommandée avant d'écrire le CSS final : une maquette rapide (une page de liste +
  une page article, en HTML statique) pour valider la température choisie.
- Pour mémoire, thèmes évalués et écartés sur goût (utilisables comme référence de code,
  tous MIT sauf mention) : Astro Cactus, AstroPaper, astro-erudite, Astro Micro,
  Nordlys (GPL-3.0). Écartés d'office : Blogster (mort), Nano/Sphere/Citrus/Cody (stagnants),
  Spectre (sans licence), Fuwari (Svelte, animations).

## 4. Réintégration des articles JoliCode

### 4.1 Inventaire (vérifié article par article sur jolicode.com, JSON-LD + bloc "Auteurs & autrices")

- **39 articles** de Mathieu entre 2015-11-19 et 2024-05-22 : **15 en auteur seul, 24 co-écrits**
  (récaps de conférences surtout).
- **19 ont un stub local** (jusqu'à 2020-12-08), **20 n'ont aucun stub** (tout ce qui suit avril 2021),
  dont 8 articles solo : Symfony 5.3, Symfony Messenger + systemd, workspaces terminal, Prism,
  OpenAPI mocking, DateTime tip, Webhook/RemoteEvent (fr + en), DbToolsBundle.
- Canonique JoliCode : `https://jolicode.com/blog/<slug>` (sans www, sans date, sans trailing slash).
- Pièges vérifiés : pas de page auteur sur jolicode.com ; `notre-retour-du-symfony-live-2018`
  le mentionne comme speaker mais PAS comme auteur (exclu) ; 5 slugs cités dans la veille ne sont
  pas de lui (exclus). Liste complète des 39 URLs dans le rapport d'inventaire (voir tableau
  de l'agent, à convertir en `data/jolicode.json` au moment du script).
- **Décision actée : réintégrer les 15 solo en contenu complet.** Concrètement :
  6 stubs existants remplacés par le contenu complet + 9 fichiers créés (les solo post-2021).
  Les 24 co-écrits restent en stubs (les 13 existants passent en noindex ; en option,
  créer les 11 stubs manquants pour compléter la frise, mêmes règles noindex).

### 4.2 Mécanisme SEO : écart justifié avec la demande initiale

La demande initiale était "noindex + canonical vers jolicode.com". **L'audit SEO conclut que
combiner les deux sur la même page est contradictoire et déconseillé par Google** : le canonical
dit "consolide les signaux vers la cible", le noindex dit "ne montre jamais cette page" ;
combinés, Google peut ignorer le canonical ou, pire, propager le noindex au cluster de
duplication (donc potentiellement affecter jolicode.com, l'inverse de l'effet recherché).

**Décision actée : `noindex, follow`** (surtout pas `nofollow` : il couperait la transmission
de signal vers JoliCode), canonical self-référent ou absent, **lien d'attribution visible et
dofollow** en tête d'article ("Publié à l'origine sur jolicode.com"). Garantit que le blog
n'entre jamais en concurrence avec JoliCode. Pages exclues du sitemap ; incluses dans le RSS.
S'applique aux 15 articles réintégrés ET aux stubs co-écrits restants.

Le composant `<BaseHead>` Astro gère `noindex` et `canonicalURL` par entrée de collection
(reprise du mécanisme head.html actuel, en corrigeant `noindex, nofollow` en `noindex, follow`).

### 4.3 Récupération du contenu (script one-shot, vérifié faisable)

- Contenu 100 % server-side (curl suffit) : extraire le fragment entre le `<h1>` et la section
  "Auteurs & autrices" dans `<article lang="xx">` sous `<main id="main">`.
- Conversion HTML vers markdown (turndown ou pandoc). Blocs de code en `<pre><code>` SANS classe
  de langage : langage à inférer ou à poser à la main en relecture.
- Images du contenu en URLs relatives `/media/cache/content/<année>/...` : à télécharger
  (préfixe `https://jolicode.com`) et rapatrier dans le repo ; ignorer avatars/logos (chrome de page).
- Métadonnées : JSON-LD par article (`datePublished`, `inLanguage`, auteurs) pour valider dates et langue.
- Relecture manuelle article par article avant merge (39 max, volume raisonnable).
- Étiquetage : conserver les tags `cross-post`/`jolicode` + `origin: { url, site: 'JoliCode' }`
  en front matter.

## 5. SEO : à préserver, à corriger

### À préserver à l'identique (verrous de non-régression)

1. Format d'URL `/{section}/{YYYY-MM-DD-slug}/` + trailing slash (redirection 308/301 sans slash).
2. `robots.txt` (tout autorisé + Sitemap), `/sitemap.xml`, `/index.xml` + flux par section et par tag.
3. Chemins ET binaires des favicons. (Exception volontaire : les og:images `/tcard/*.png`
   ne sont PAS préservées, régénération complète de toutes les cartes, voir section 9.)
4. Meta OG/Twitter (og:type article, published_time, etc.), canonical self-référent par défaut.
5. 404 réels (pas de soft-404), SSG pur sans dépendance JS pour le contenu.
6. Cache long sur assets fingerprintés, compression des réponses, viewport.

### À corriger dans la version Astro (issus de l'audit)

- **Critique** : lang HTML/RSS (fr par défaut, en par article) ; meta description de la home ;
  traitement des 19 stubs cross-post (section 4.2) ; en-têtes de sécurité (HSTS, CSP compatible
  Plausible, X-Content-Type-Options, Referrer-Policy, Permissions-Policy) : impossibles à poser
  sur Cellar pur (limitation assumée, voir section 7) ; posés via Response Header Transform
  Rules si le spike aboutit au repli Cloudflare.
- **Élevé** : 52 descriptions "News du jour" dupliquées (générer une description unique par numéro,
  ex. à partir des premiers sujets) ; canonical des pages de pagination (auto-référent, pas vers
  la page 1) ; supprimer le hreflang auto-référent erroné (pas de hreflang du tout tant qu'il
  n'existe pas de paires de traduction).
- **Moyen** : titres de section ("Blog", "Veille") ; descriptions de section qualitatives ;
  `wordCount` en Number dans BlogPosting ; logo d'entité >= 112x112 (pas le favicon) ;
  image par défaut dans BlogPosting (résolu par les OG cards, section 9) ; `<language>` du RSS.
- **Faible/opportunités** : IndexNow ; audit des pages tags "thin" (139 pages tags pour ~90 contenus :
  consolider ou noindexer les tags à 1 article) ; documenter le choix RSS résumé vs intégral.

## 6. GEO (visibilité moteurs IA)

Priorisé pour être intégré dès la conception :

- **P0 (faible effort, dès l'architecture)** :
  - Entité auteur = **"Mathieu Santostefano"** partout (avec `alternateName: "welcomattic"`),
    pas le pseudo seul : c'est l'entité reliable à la Symfony Core Team et aux confs.
  - JSON-LD `Person` complet avec `sameAs` (GitHub, LinkedIn, Mastodon, Bluesky,
    symfony.com/contributors) injecté home + page auteur + articles (référence `@id`, pas dupliqué).
  - `robots.txt` avec position explicite par crawler IA (GPTBot, OAI-SearchBot, ClaudeBot,
    PerplexityBot, Google-Extended autorisés ; décision consciente pour CCBot et crawlers
    d'entraînement pur).
  - `llms.txt` + `llms-full.txt` générés au build depuis les collections
    (`src/pages/llms.txt.ts`) : bio, expertise, index des sections + dump markdown.
  - Déclaration de licence (RSL 1.0 / `link rel=license`) : choix exprimé plutôt que subi.
  - Rester SSG pur (acquis).
- **P1 (impact fort)** :
  - Page auteur dédiée `/author/mathieu-santostefano/` (bio, Core Team, historique de confs,
    sameAs), rétro-liée depuis chaque article.
  - `BlogPosting` avec dates fiables et `author.url` vers la page auteur.
  - Gabarit de rédaction "réponse directe" pour les futurs articles (réponse en 40-60 mots
    en tête de section, titres H2/H3 en questions, passages auto-suffisants de ~150 mots).
- **P2 (continu, post-lancement)** :
  - Transcriptions texte sous les vidéos de talks (seul le texte est citable ; commencer par
    les talks Symfony les plus vus).
  - Veille : 1-2 phrases de commentaire par lien (passage citable et attribuable) ;
    à décider si le format évolue.
  - `humans.txt` / `security.txt` ; cohérence LinkedIn / fiche symfony.com avec le sameAs.

## 7. Hébergement : Cellar uniquement (décision actée, avec spike de validation)

Décision : pas d'app payante (la pico à ~4,56 €/mois est écartée). Objectif coût : quasi nul.

### Faits vérifiés (juillet 2026, API de facturation Clever Cloud + tests empiriques)

- **Prix Cellar** : stockage gratuit < 100 Mo (le blog fait ~30-50 Mo, donc 0 €), puis ~0,02 €/Go/mois.
  Trafic sortant : **0,09 €/Go, aucun palier gratuit**. Trafic entrant gratuit, pas de frais fixes.
  Coût mensuel attendu pour ce blog : **~0,20 à 0,90 €** selon trafic.
- **Limite vérifiée sur l'endpoint bucket** (`<bucket>.cellar-c2.services...`) : Cellar
  (Ceph RadosGW) ne fournit pas de website endpoint S3. `GET /` renvoie 403 (pas de résolution
  `index.html`), pas d'error document, pas de redirects, HTTP/1.1 seul, aucune compression.
- **Non testé à ce jour** : le comportement via **domaine custom** (le proxy Clever devant les
  buckets peut différer ; la doc évoque un mapping route vers fichier `.html` sans résolution
  d'index). C'est LE point qui conditionne la faisabilité : à trancher par le spike ci-dessous.
- **Domaine custom + HTTPS** : le bucket doit s'appeler exactement `blog.welcomattic.com`,
  CNAME vers `cellar-c2.services.clever-cloud.com.`. Let's Encrypt automatique
  (vérifié : un cert valide pour blog.welcomattic.com est déjà servi par les frontends Cellar).
- **Headers par objet** : Content-Type et Cache-Control posés à l'upload (métadonnées S3), OK.
  En revanche impossible d'ajouter HSTS/CSP/X-Content-Type-Options par objet : les en-têtes de
  sécurité sont une **limitation assumée** de l'option Cellar pur (CSP possible en `<meta>` si voulu).

### Spike Phase 0 (~30 min, AVANT toute implémentation)

1. Créer l'add-on Cellar + un bucket de test nommé `cellar-test.welcomattic.com`,
   policy publique `s3:GetObject`, CNAME `cellar-test` vers `cellar-c2.services.clever-cloud.com.`.
2. Uploader : `index.html`, `blog/test/index.html`, et un objet dont la clé est littéralement
   `blog/test/` (clé à slash final, Content-Type text/html ; RadosGW l'accepte).
3. Tester via le domaine custom : `GET /`, `GET /blog/test/`, `GET /blog/test`, une URL
   inexistante (comportement 404), HTTPS.

Issues possibles, dans l'ordre de préférence :
- **A. Le proxy résout `index.html`** (racine et dossiers) : Cellar pur suffit, rien d'autre à faire.
- **B. Pas de résolution d'index, mais les clés à slash final sont servies** : Cellar pur
  reste viable via le déploiement en double clé (`blog/slug/index.html` + `blog/slug/`,
  simple boucle dans le script de deploy). Il reste à vérifier le cas de la racine `/`
  (clé vide impossible en S3 : si la racine ne répond pas, passer en C).
- **C. Ni l'un ni l'autre (la home ou les pretty URLs sont cassées)** : repli à coût nul,
  **Cloudflare plan free devant Cellar** (URL rewrite `/` et `/chemin/` vers `index.html`,
  cache edge qui réduit aussi le trafic sortant facturé, brotli, HTTP/3, headers de sécurité).
  Contrainte : migration des nameservers de welcomattic.com. Ce repli résout au passage les
  limitations 404/compression/headers ; il ne coûte rien mais ajoute un tiers dans la boucle.

### Déploiement (commun à toutes les issues)

1. Bucket final `blog.welcomattic.com`, policy publique `s3:GetObject` (s3cmd setpolicy).
2. CI GitHub Actions : build Astro puis `aws s3 sync dist/ s3://blog.welcomattic.com
   --endpoint-url https://cellar-c2.services.clever-cloud.com` en deux passes de Cache-Control :
   assets `_astro/*` en `max-age=31536000, immutable`, HTML/XML en `max-age=0, must-revalidate`
   (+ passe "double clé" si issue B). Credentials `CELLAR_ADDON_KEY_ID/SECRET` en secrets GitHub.
   Persister `node_modules/.astro` (cache images/fonts) via actions/cache.
3. Bascule DNS de `blog`, vérifications (section 10), puis suppression de l'ancienne app Clever
   (économie nette : le coût actuel de l'app disparaît).

Limitations assumées en Cellar pur (issues A/B) : 404 en XML S3 brut, pas de compression à la
volée (acceptable : HTML de ~10-30 Ko ; option agressive possible mais fragile : objets HTML
pré-compressés avec `Content-Encoding: gzip` fixe), pas d'en-têtes de sécurité, HTTP/1.1.

## 8. Optimisation agressive au build (état de l'art Astro 7, tout stable)

```js
// astro.config.mjs
import { defineConfig, fontProviders } from 'astro/config';
import sitemap from '@astrojs/sitemap';

export default defineConfig({
  site: 'https://blog.welcomattic.com',
  trailingSlash: 'always',
  build: { format: 'directory', inlineStylesheets: 'always' }, // CSS attendu < 10 Ko : zéro requête CSS
  prefetch: { prefetchAll: true, defaultStrategy: 'viewport' }, // navigation quasi instantanée
  image: {
    layout: 'constrained',
    responsiveStyles: true, // srcset/sizes auto, stable depuis 5.10
    service: {
      entrypoint: 'astro/assets/services/sharp',
      config: { avif: { effort: 4 }, webp: { effort: 5 }, jpeg: { mozjpeg: true }, png: { compressionLevel: 9 } },
    },
  },
  fonts: [ /* Fonts API stable (Astro 6+) : self-hosting auto, subsetting latin, fallbacks anti-CLS */ ],
  vite: { css: { transformer: 'lightningcss' }, build: { cssMinify: 'lightningcss' } },
  integrations: [sitemap({ /* filter noindex + serialize lastmod */ })],
});
```

- **Images** : `<Picture formats={['avif','webp']}>` pour les images de contenu ; les images
  markdown locales passent par sharp automatiquement. `avif.effort` modéré (4) pour contenir
  le temps de build. Cache `node_modules/.astro` persisté en CI.
- **HTML** : `compressHTML` optimal par défaut en v7, rien à faire.
- **JS** : zéro île sauf Pagefind (chargé sur la page recherche uniquement) et toggle thème
  (script inline de quelques lignes). Pas de `<ClientRouter />` : si envie de transitions,
  `@view-transition { navigation: auto; }` en CSS pur (zéro JS, dégradation gracieuse).
- **Compression finale** : Cellar ne négocie pas le contenu, donc pas de précompression `.br`/`.gz`
  classique (elle exigerait un serveur qui choisit le bon fichier). Si le spike aboutit au repli
  Cloudflare (issue C), la compression se fait à l'edge, rien à faire au build.
  `@playform/compress` (successeur d'astro-compress) en fin de chaîne pour le gain HTML/SVG
  résiduel, seulement si un audit le justifie.
- **Fonts** : API Fonts d'Astro (stable) avec `subsets: ['latin']`, preload, fallbacks métriques
  anti-CLS ; provider local ou fontsource.
- **Mesure** : Lighthouse CI (`staticDistDir: './dist'`) + `budget.json` en CI pour bloquer les
  régressions ; taille via la sortie de build.

## 9. Refonte de la génération des OG cards (intégrée au build Astro)

### Existant (à remplacer)

- `tcardgen` v0.9.0 (binaire Go, projet peu actif), téléchargé par `pre_build.sh` à chaque
  déploiement, exécuté HORS du build Hugo (aussi via `make tcard`).
- Template = un PNG de fond figé (`og-picture-assets/og-picture-template.png`) + polices locales.
- Couvre uniquement `content/veille` : 52 PNG committés dans `static/tcard`, référencés en og:image.
  Le blog, les talks et les pages de section n'ont aucune image OG dédiée.

### Cible : endpoint d'images au build

- **Stack : Satori + @resvg/resvg-js** (le moteur de Vercel OG, standard actuel) : le template
  se décrit en HTML/CSS (via `satori-html`), Satori le rend en SVG, resvg le rasterise en PNG.
  Le design vit dans le code et partage les design tokens du thème (section 3) : accent,
  typo, dark ; plus de PNG de fond à retoucher.
  - Alternative clé en main si on veut moins de code : `astro-og-canvas` (canvaskit).
    Non retenue : moins de contrôle sur le design, dépendance wasm plus lourde.
- **Intégration Astro native** : un endpoint statique `src/pages/og/[collection]/[...slug].png.ts`
  avec `getStaticPaths()` sur les collections ; en output `static`, chaque carte est générée
  au build comme n'importe quelle page. `<BaseHead>` pointe `og:image`/`twitter:image` vers
  `/og/<collection>/<slug>.png` (+ `og:image:width/height` 1200x630).
- **Couverture étendue** : blog, veille, talks (et carte générique pour home, sections, page
  auteur, tags). Contenu de la carte : eyebrow de section, titre, date, temps de lecture,
  "Mathieu Santostefano · welcomattic" + accent du thème. Ceci fournit aussi le champ `image`
  des `BlogPosting` (corrige le point "image par défaut" de la section 5).
- **Polices et glyphes** : réutiliser les fontes de `og-picture-assets/fonts` (Satori charge du
  TTF/OTF ; vérifier la couverture latin étendu pour les accents français). Les emojis présents
  dans certains titres ("Symfony Messenger 💛 systemd") ne sont pas rendus nativement par
  Satori : brancher twemoji via `graphemeImages` (sinon carrés vides).
- **Décision : régénération complète, pas d'héritage.** Toutes les cartes de tous les contenus
  (y compris les 52 numéros de veille) sont régénérées sous `/og/...` avec le nouveau design ;
  `static/tcard` n'est pas repris dans le nouveau site. Conséquence assumée : les aperçus déjà
  en cache chez les réseaux sociaux pointant `/tcard/*.png` retomberont en 404 (pas de
  redirection possible sur Cellar pur) ; impact faible (anciens numéros de veille) et re-scrape
  automatique au prochain partage. À la bascule : suppression de `static/tcard`,
  `pre_build.sh`, `Makefile` et du template PNG ; les fontes de `og-picture-assets/fonts`
  migrent dans le projet Astro (`src/assets/fonts`) pour Satori.
- **Temps de build** : ~100 cartes à 50-150 ms pièce, négligeable. Si le corpus grossit :
  memoïsation disque keyée par hash (titre + date + version du template) dans
  `node_modules/.astro`, déjà persisté en CI.
- **Vérification** : aperçu des cartes en dev (`/og/...png` navigable), contrôle au lancement
  avec les débogueurs sociaux (opengraph.xyz, validateurs Bluesky/LinkedIn).

## 10. Phasage

1. **Phase 0** (~0,5 j) : spike Cellar (section 7, tranche entre les issues A/B/C) +
   maquette rapide du thème (une liste + un article) pour valider la température du brief 3.2 +
   gel du contenu.
2. **Phase 1, squelette** (~1 j) : init Astro 7 (template blog officiel comme socle nu),
   collections, copie des 89 markdown, config URLs. Vérif : script de diff sitemap ancien vs
   nouveau (chaque URL doit exister en 200).
3. **Phase 2, thème custom + gabarits** (~2,5-3,5 j) : design tokens et CSS du brief (section 3),
   home/bio, listes de sections, page article (avec `lang`), tags, 404, RSS aux chemins
   historiques, sitemap, BaseHead complet (canonical, OG, Twitter, JSON-LD
   Person/BlogPosting/BreadcrumbList), page auteur, llms.txt, robots.txt, Pagefind,
   pipeline OG cards Satori (section 9, ~0,5 j inclus).
4. **Phase 3, JoliCode** (~1-2 j + relecture au fil de l'eau) : script de rapatriement
   (fetch, turndown, images), front matter `origin`/`noindex`, bandeau d'attribution,
   application du même traitement aux 19 stubs existants.
5. **Phase 4, SEO/GEO fin** (~0,5-1 j) : corrections de la section 5 (descriptions veille,
   sections, wordCount, logo), validations Rich Results Test par gabarit.
6. **Phase 5, optimisation** (~0,5 j) : config section 8, fonts, budget Lighthouse en CI.
7. **Phase 6, hébergement** (~0,5 j + délais DNS) : bucket final + CI de déploiement +
   bascule selon l'issue du spike (section 7). Pas de fenêtre de coexistence des deux versions.
8. **Phase 7, post-lancement** : Search Console (sitemap, couverture 2-4 semaines), crawl complet
   anti-404/redirections en chaîne, vérif pages noindex exclues, securityheaders.com,
   PageSpeed/CrUX, lecture des flux RSS dans un lecteur tiers, IndexNow (optionnel).
   Puis suppression de l'ancienne app. En continu : transcriptions talks, commentaires veille.

Total estimé : **6,5 à 9,5 jours** de travail effectif.

## 11. Journal des décisions

Toutes les décisions structurantes sont actées (voir tableau section 0, validé le 15/07/2026) :
thème custom d'après le brief 3.2, `noindex, follow` sans canonical cross-domain, 15 articles
solo réintégrés, Cellar sans app payante, RSS en résumés, format veille conservé.

Deux points se résolvent en cours de route, avec issue par défaut définie :
1. **Spike Cellar (Phase 0)** : choisit mécaniquement entre Cellar pur (issues A/B) et le repli
   à coût nul Cellar + Cloudflare free (issue C). Aucun de ces chemins ne remet le reste du plan
   en cause.
2. **Température visuelle du thème** : le brief fixe la structure ; la maquette de Phase 0
   ajuste le curseur chaud/froid (serif/sans, écru/blanc/zinc, choix de l'accent) avant
   d'écrire le CSS final.
