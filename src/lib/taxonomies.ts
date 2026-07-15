import { getCollection } from 'astro:content';
import { slugifyTag, excerpt, veilleDescription } from './utils';
import type { Entry } from '../components/EntryList.astro';

export interface TaxonomyIndex {
  // slug -> { label, entries }
  [slug: string]: { label: string; entries: Entry[] };
}

async function allEntries(): Promise<Array<Entry & { tags: string[]; categories: string[] }>> {
  const [blog, veille, talks] = await Promise.all([
    getCollection('blog'),
    getCollection('veille'),
    getCollection('talks'),
  ]);

  return [
    ...blog.map((e) => ({
      href: `/blog/${e.id}/`,
      title: e.data.title,
      date: e.data.date,
      eyebrow: 'blog',
      excerpt: e.data.description ?? excerpt(e.body, 120),
      lang: e.data.lang,
      tags: e.data.tags,
      categories: [] as string[],
    })),
    ...veille.map((e) => ({
      href: `/veille/${e.id}/`,
      title: e.data.title,
      date: e.data.date,
      eyebrow: 'veille',
      excerpt: veilleDescription(e.body, e.data.date),
      lang: 'fr' as const,
      tags: e.data.tags,
      categories: e.data.categories,
    })),
    ...talks.map((e) => ({
      href: `/talks/${e.id}/`,
      title: e.data.title,
      date: e.data.date,
      eyebrow: 'talks',
      excerpt: e.data.description ?? excerpt(e.body, 120),
      lang: e.data.lang,
      tags: e.data.tags,
      categories: [] as string[],
    })),
  ].sort((a, b) => b.date.valueOf() - a.date.valueOf());
}

function buildIndex(
  items: Awaited<ReturnType<typeof allEntries>>,
  pick: (item: Awaited<ReturnType<typeof allEntries>>[number]) => string[]
): TaxonomyIndex {
  const index: TaxonomyIndex = {};
  for (const item of items) {
    for (const label of pick(item)) {
      const slug = slugifyTag(label);
      index[slug] ??= { label, entries: [] };
      index[slug].entries.push(item);
    }
  }
  return index;
}

export async function tagsIndex(): Promise<TaxonomyIndex> {
  return buildIndex(await allEntries(), (i) => i.tags);
}

export async function categoriesIndex(): Promise<TaxonomyIndex> {
  return buildIndex(await allEntries(), (i) => i.categories);
}
