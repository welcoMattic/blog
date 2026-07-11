# Plan de migration : Hugo (PaperMod) → Astro

> Objectifs : **reprise exacte de tous les contenus** (blog, veille, talks, oss, page d'accueil),
> **conservation des URLs**, et **changement de thème** (propositions en fin de document).

## 1. État des lieux

Stack actuelle : Hugo + thème PaperMod (submodule git), déployé sur Clever Cloud via `git push`
(`.clever.json`), site en français, `baseURL = https://blog.welcomattic.com`.

### Contenus (89 fichiers Markdown, tous à reprendre à l'identique)

| Section | Nombre | Front matter | Particularités |
|---|---|---|---|
| `content/blog/` | 23 | `title`, `date`, `description`, `tags` | 5 shortcodes `{{</* youtube */>}}`, images dans `static/img/` |
| `content/veille/` | 52 | + `author`, `categories` | Images OG dédiées dans `static/tcard/*.png` (générées par tcardgen) |
| `content/talks/` | 12 | `title`, `date`, `description`, `tags` | Liens slides/vidéos, 1 PDF dans `static/pdf/` |
| `content/oss/` | 1 | `title`, `date`, `description` | Page simple (liste de projets) |
| `content/_index.md` | 1 | `heading`, `handle`, `subheading` | Front matter hérité d'un ancien thème ; la home réelle utilise `params.homeInfoParams` de `hugo.toml` ("Hi, I'm Mathieu" + photo de profil + icônes sociales Bluesky/GitHub) |

Aucun `slug:`, `url:`, `aliases:` ou `draft: true` dans les front matters → les URLs découlent
uniquement des noms de fichiers, ce qui simplifie énormément la préservation des permaliens.

### Fonctionnalités à reprendre (parité)

- Menu : 🏡 / blog / talks / oss / veille
- Thème clair/sombre avec toggle (`defaultTheme = auto`)
- Temps de lecture, boutons de partage
- Pagination par 5 (`pagerSize = 5`)
- Pages de tags (`/tags/<tag>/`) et de catégories (`/categories/<cat>/`)
- Flux RSS : `/index.xml` + un flux par section (`/blog/index.xml`, `/veille/index.xml`, …)
- Sitemap + `robots.txt`
- Coloration syntaxique (style monokai, numéros de ligne)
- Liens externes ouverts dans un nouvel onglet (override `render-link.html`)
- Meta OG/Twitter cards ; pour la veille, `og:image` pointe vers `/tcard/<fichier>.png`
- Favicons (déjà dans `static/`)
- Format de date « 2 Jan 2006 » en français

### Outillage périphérique

- `new-veille.sh` + `veille-template.md` : création d'un nouveau billet de veille
- `pre_build.sh` + `Makefile` : régénération des images OG (tcardgen) au déploiement
- Déploiement Clever Cloud (app statique, build Hugo actuellement)

## 2. Architecture Astro cible

- **Astro 5** (Content Layer API), TypeScript, zéro JS côté client sauf le toggle de thème
  (et la recherche si activée).
- **Content collections** : `blog`, `veille`, `talks`, `oss` — les fichiers Markdown sont déplacés
  **sans modification de contenu** vers `src/content/<collection>/`, avec un schéma zod calqué sur
  le front matter existant :

```ts
// src/content.config.ts (schéma commun, identique au front matter Hugo actuel)
const post = z.object({
  title: z.string(),
  date: z.coerce.date(),
  description: z.string().nullable().optional(),
  tags: z.array(z.string()).default([]),
  author: z.string().optional(),        // veille
  categories: z.array(z.string()).default([]), // veille
});
```

### Préservation des URLs (exigence forte)

| Hugo aujourd'hui | Astro demain | Action |
|---|---|---|
| `/blog/2019-04-09-how-to-deploy-ghost-on-clevercloud/` | identique | slug = nom de fichier (comportement par défaut d'Astro, trailing slash à configurer `trailingSlash: 'always'` + `build.format: 'directory'`) |
| `/veille/…/`, `/talks/…/`, `/oss/` | identique | idem |
| `/tags/symfony/`, `/categories/news-du-jour/` | identique | pages dynamiques `getStaticPaths` |
| `/blog/page/2/` (pagination Hugo) | `/blog/page/[n]/` | route de pagination personnalisée pour coller au schéma Hugo (Astro produit `/blog/2/` par défaut → à surcharger) |
| `/index.xml`, `/blog/index.xml`, … | identiques | endpoints `@astrojs/rss` nommés `index.xml.ts` à la racine et par section (les abonnés RSS ne cassent pas) |
| `/sitemap.xml` | `@astrojs/sitemap` génère `sitemap-index.xml` | ajouter une redirection/alias ou un endpoint custom `sitemap.xml` |
| `/img/…`, `/tcard/…`, `/pdf/…`, favicons | identiques | `static/` → `public/` tel quel |

**Validation automatisée** : script qui construit l'ancien site (`hugo`) et le nouveau
(`astro build`), extrait la liste des URLs des deux sitemaps et échoue au moindre écart.
C'est le garde-fou de la « reprise exacte ».

## 3. Phases

### Phase 0 — Préparation (½ j)
- Geler le contenu (pas de nouveau billet pendant la migration, ou rebase à la fin).
- Générer le site Hugo de référence (`hugo`) et archiver `public/` : liste d'URLs + HTML de
  référence pour comparaison.

### Phase 1 — Squelette Astro (½ j)
- `npm create astro@latest` à la racine de la branche (le temps de la migration, l'arbo Hugo et
  l'arbo Astro cohabitent ; nettoyage en phase 6).
- Config : `site`, `trailingSlash: 'always'`, `build.format: 'directory'`, intégrations
  `@astrojs/rss`, `@astrojs/sitemap`, `@astrojs/mdx` (uniquement si on convertit les 5 posts à
  shortcode YouTube en `.mdx`), Shiki thème `monokai`.

### Phase 2 — Migration des contenus (1 j)
- Déplacer `content/{blog,veille,talks,oss}` → `src/content/…` **à l'iso-octet** près, sauf :
  - les 5 `{{</* youtube ID */>}}` → composant `<YouTube id="…" />` (fichier passé en `.mdx`)
    ou embed `lite-youtube` via un plugin remark — seule transformation de contenu autorisée ;
  - `content/_index.md` → contenu de la home portée dans `src/pages/index.astro`
    (reprendre le rendu réel actuel : homeInfoParams de `hugo.toml`, pas le front matter obsolète).
- `static/` → `public/` (img, tcard, pdf, favicons, safari-pinned-tab).
- Liens externes en `target="_blank"` : plugin `rehype-external-links` (équivalent exact de
  l'override `render-link.html`).

### Phase 3 — Thème & gabarits (1 à 2 j selon le thème retenu, cf. §5)
- Layout de base (head/SEO : canonical, OG, Twitter cards, schema.org — reprendre la logique des
  partials custom, notamment `og:image` → `/tcard/<slug>.png` pour la veille).
- Pages : home, listes de section paginées (5/page), page article, tags, catégories, 404.
- Dark/light avec toggle, temps de lecture (plugin remark `reading-time`), boutons de partage.
- Dates formatées en français (`Intl.DateTimeFormat('fr')`).

### Phase 4 — Flux, sitemap, robots (½ j)
- Endpoints RSS iso-URL (`/index.xml` + par section), limités comme Hugo aux sections principales.
- Sitemap + `robots.txt` (`enableRobotsTXT` → fichier statique dans `public/`).

### Phase 5 — Validation « reprise exacte » (½ j)
- Script de diff d'URLs Hugo vs Astro (phase 0) → zéro URL manquante.
- Pour chaque page : titre, description, date et corps présents (crawl + assertions).
- Vérifier les 5 embeds YouTube, le PDF des slides, toutes les images (`img`, `tcard`).
- Valider les flux RSS (W3C validator) et tester dans un lecteur.
- Lighthouse (le score ne doit pas régresser vs Hugo).

### Phase 6 — Bascule & nettoyage (½ j)
- Supprimer : `hugo.toml`, `layouts/`, `archetypes/`, `assets/scss/`, `resources/`,
  le submodule `themes/PaperMod` (+ `.gitmodules`), `pre_build.sh` (les tcards existants sont
  committés dans `public/tcard/`, plus besoin de tcardgen au build).
- Adapter `new-veille.sh` (chemin `src/content/veille/`) et le `Makefile`.
- **Clever Cloud** : passer l'app statique d'un build Hugo à un build Node
  (`npm ci && npm run build`, dossier publié `dist/` au lieu de `public/`) — variables
  `CC_*` à ajuster ; tester sur un déploiement de staging avant de pousser sur `master`.

### Phase 7 — Post-migration (optionnel)
- Recherche full-text avec **Pagefind** (le site actuel a la config fuse.js mais pas de page
  `/search/` active — c'est donc un ajout, pas une parité).
- Génération d'images OG à la volée (`astro-og-canvas`/satori) pour blog & talks, en remplacement
  moderne de tcardgen.
- `astro:assets` pour l'optimisation des images.

**Estimation totale : 4 à 6 jours** répartis sur les phases ci-dessus (borne haute si thème
sur-mesure).

## 4. Points de vigilance

1. **Pagination `/page/N/`** : Astro ne produit pas ce schéma par défaut — route custom obligatoire
   sinon les URLs paginées changent (impact SEO faible mais l'exigence est la reprise exacte).
2. **`sitemap.xml` vs `sitemap-index.xml`** : prévoir l'alias.
3. **Dates avec timezones hétérogènes** (`+01:00`, `Z`, `.000Z`) : `z.coerce.date()` les absorbe,
   mais vérifier que la date *affichée* ne glisse pas d'un jour (rendu en Europe/Paris).
4. **`renderer.unsafe = true`** côté Hugo : du HTML inline existe dans le Markdown (ex. `</br>`
   dans `_index.md`) — Astro rend le HTML inline nativement, rien à faire, mais à vérifier au diff.
5. **Flux RSS** : garder les mêmes `<guid>`/liens qu'aujourd'hui pour ne pas faire réapparaître
   89 articles comme « non lus » chez les abonnés.
6. **Trailing slashes** : Hugo sert `/blog/xxx/` ; configurer Astro en `directory` + redirections
   Clever Cloud inchangées.

## 5. Propositions de thèmes

Direction retenue après itérations : un design **pro et « aesthetic »** pour un blog technique —
propre, typographie soignée, inspirant. (Les pistes « animées » type Fuwari/AntfuStyle et les
minimalistes type AstroPaper/Cactus ont été écartées.)

### Option A — [astro-erudite](https://github.com/jktrn/astro-erudite) ⭐ recommandé
La référence du blog technique haut de gamme (821 ⭐, très activement maintenu, v2.0.1 juin 2026).
Typographie fluide (Utopia), blocs de code **Expressive Code** (les plus beaux de l'écosystème :
titres de fichiers, surlignage de lignes, diff), callouts façon GitHub, TOC avec scrollspy,
dark/light natif, tags, RSS, sitemap, multi-auteurs. Zéro framework CSS — sobre, dense, précis.
Démo : <https://astro-erudite.vercel.app> · en production : <https://enscribe.dev>.
Effort : **moyen** (adapter aux 4 collections).

### Option B — [Dante](https://github.com/JustGoodUI/dante-astro-theme)
Par le studio JustGoodUI : esthétique **éditoriale** épurée et élégante (grandes marges, typo
sérif/sans mixée), blog + portfolio, dark/light, tags, RSS, formulaire d'abonnement. Le plus
« magazine » des trois — inspirant et intemporel.
Démo : <https://dante-astro-theme.netlify.app>. Effort : **moyen**.

### Option C — [Nordlys](https://astro.build/themes/details/nordlys/)
Minimal et très propre, pensé blog + projets : blocs de code avec en-têtes personnalisés,
thèmes de couleurs intégrés, dark/light. Bon équilibre sobriété/personnalité pour un blog dev.
Effort : **moyen**.

### Option D — [Litos](https://github.com/Dnzzk2/Litos)
Design system poli inspiré de shadcn/ui, animations fluides discrètes, layouts d'articles
multiples, Astro 5 + React 19 + Tailwind 4. Très beau mais jeune (140 ⭐, v1.0.0 févr. 2026) —
choix plus risqué en maintenance. Démo : <https://litos.vercel.app>. Effort : **moyen**.

### Option E — Premium : [The Void](https://the-void.cosmicthemes.com/) (Cosmic Themes, 79 $)
Qualité « agence » : blog sleek et minimaliste, animations soignées, i18n, SEO, support pro.
Alternative : [Blogsmith Pro](https://blogsmith-pro.cosmicthemes.com/) (49 $).
Effort : **faible à moyen**, coût licence en sus.

### Option F — Sur-mesure guidé par références
Design custom Tailwind inspiré des meilleurs blogs techniques (leerob.com, joshwcomeau.com,
rauno.me, paco.me) : 2-3 maquettes HTML de la home + d'une page article à valider avant
implémentation. Identité unique, aucune dette envers un thème tiers. Effort : **+1 à 2 jours**.

Dans tous les cas le thème n'affecte que la phase 3 ; les phases contenus/URLs/flux sont
indépendantes du choix.

## 6. Checklist de validation finale

- [ ] 89 contenus présents, corps identiques (diff HTML normalisé Hugo vs Astro)
- [ ] Zéro URL perdue (diff des sitemaps)
- [ ] RSS iso-URLs et guids stables
- [ ] Images, PDF, favicons, tcards servis aux mêmes chemins
- [ ] Dark/light, temps de lecture, partage, pagination par 5
- [ ] Déploiement Clever Cloud vert sur staging puis production
- [ ] Suppression complète de Hugo (submodule inclus)
