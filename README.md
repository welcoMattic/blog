# Blog de welcomattic

Blog personnel de Mathieu Santostefano, construit avec [Astro](https://astro.build/)
et hébergé sur l'object storage [Cellar](https://www.clever.cloud/product/cellar-object-storage/)
de Clever Cloud.

## Développement

```bash
npm install
npm run dev        # serveur de dev
npm run build      # build statique dans dist/
npm run preview    # sert le build de dist/
```

## Contenu

Les articles vivent dans `content/` (collections `blog`, `veille`, `talks`), en Markdown.

### Publication programmée

Un article daté du futur reste invisible du build (page en 404, absent des index,
des flux RSS, du sitemap et des `llms*.txt`). Le filtre est dans `src/lib/publish.ts`
et compare au **jour calendaire** (Europe/Paris) : un article daté du 1er septembre
sort le matin du 1er septembre, quelle que soit l'heure de son front matter.

La mise en ligne a lieu au rebuild quotidien de la CI (cron `30 6 * * *` UTC, soit
8h30 Paris l'été et 7h30 l'hiver), pas à l'heure inscrite dans le front matter.

Pour relire un article programmé avant sa date : `npm run dev:drafts`
(`INCLUDE_DRAFTS=1`), qui lève le filtre et charge en plus les brouillons de
`drafts/` (répertoire local, gitignoré).

## Déploiement

Vers le bucket Cellar `blog.welcomattic.com` :

- **CI** : push sur `master` déclenche `.github/workflows/deploy.yml`
  (secrets `CELLAR_KEY_ID` / `CELLAR_KEY_SECRET`).
- **Local** : `npm run deploy` (identifiants via `clever addon env <addon>`,
  `aws` natif ou conteneur Docker `amazon/aws-cli` en repli).

Le DNS (`blog.welcomattic.com` CNAME `cellar-c2.services.clever-cloud.com`) est géré chez OVH.
