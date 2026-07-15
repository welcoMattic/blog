import { defineCollection, z } from 'astro:content';
import { glob } from 'astro/loaders';

const blog = defineCollection({
  loader: glob({ pattern: '*.md', base: './content/blog' }),
  schema: z.object({
    title: z.string(),
    date: z.coerce.date(),
    description: z.string().nullable().optional(),
    tags: z.array(z.string()).default([]),
    lang: z.enum(['fr', 'en']).default('fr'),
    noindex: z.boolean().default(false),
    origin: z.object({ url: z.string().url(), site: z.string() }).optional()
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
