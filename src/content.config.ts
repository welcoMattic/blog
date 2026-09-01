import { defineCollection, z } from 'astro:content';
import { glob } from 'astro/loaders';
import { includeDrafts } from './lib/publish';

// `npm run dev:drafts` (INCLUDE_DRAFTS=1) charge aussi les brouillons locaux de
// drafts/ dans la collection blog, pour les prévisualiser sans les déplacer dans
// content/. drafts/ est gitignoré et la variable n'est jamais positionnée par
// `npm run build` ni par la CI : un build de production ne peut donc pas les
// publier. Le même drapeau lève le filtre de publication programmée, voir
// src/lib/publish.ts.

// L'id (donc l'URL) reste le nom de fichier sans extension, comme le défaut du
// loader. Les brouillons n'ont pas encore leur préfixe de date : on l'ajoute
// depuis leur front matter pour prévisualiser l'URL définitive.
const blogLoader = includeDrafts
  ? glob({
      pattern: ['content/blog/*.md', 'drafts/*.md'],
      base: '.',
      generateId: ({ entry, data }) => {
        const name = entry.split('/').pop()!.replace(/\.md$/, '');
        if (!entry.startsWith('drafts/')) return name;
        const date = new Date(data.date as string | Date).toISOString().slice(0, 10);
        return name.startsWith(date) ? name : `${date}-${name}`;
      },
    })
  : glob({ pattern: '*.md', base: './content/blog' });

const blog = defineCollection({
  loader: blogLoader,
  schema: z.object({
    title: z.string(),
    date: z.coerce.date(),
    description: z.string().nullable().optional(),
    tags: z.array(z.string()).default([]),
    lang: z.enum(['fr', 'en']).default('fr'),
    noindex: z.boolean().default(false),
    origin: z.object({ url: z.string().url(), site: z.string() }).optional(),
    // Sommaire de série, rendu avant le corps de l'article par SeriesNav.astro.
    // `name` regroupe les articles (une valeur par langue), `order` les classe,
    // `label` est le titre court affiché dans le sommaire, sans le préfixe de
    // série que le titre complet répète déjà.
    series: z
      .object({ name: z.string(), order: z.number().int().positive(), label: z.string() })
      .optional()
  })
});

const veille = defineCollection({
  loader: glob({ pattern: '*.md', base: './content/veille' }),
  schema: z.object({
    title: z.string(),
    date: z.coerce.date(),
    description: z.string().nullable().optional(),
    author: z.string().optional(),
    categories: z.array(z.string()).default([]),
    tags: z.array(z.string()).default([])
  })
});

const talks = defineCollection({
  loader: glob({ pattern: '*.md', base: './content/talks' }),
  schema: z.object({
    title: z.string(),
    date: z.coerce.date(),
    description: z.string().nullable().optional(),
    tags: z.array(z.string()).default([]),
    lang: z.enum(['fr', 'en']).default('fr'),
    type: z.enum(['conference', 'podcast', 'lightning-talk']).default('conference'),
    pdf: z.string().optional()
  })
});

export const collections = { blog, veille, talks };
