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

## Déploiement

Vers le bucket Cellar `blog.welcomattic.com` :

- **CI** : push sur `master` déclenche `.github/workflows/deploy.yml`
  (secrets `CELLAR_KEY_ID` / `CELLAR_KEY_SECRET`).
- **Local** : `npm run deploy` (identifiants via `clever addon env <addon>`,
  `aws` natif ou conteneur Docker `amazon/aws-cli` en repli).

Le DNS (`blog.welcomattic.com` CNAME `cellar-c2.services.clever-cloud.com`) est géré chez OVH.
