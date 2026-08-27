import rss from '@astrojs/rss';
import { getCollection } from 'astro:content';
import { isPublished } from '../lib/publish';
import { excerpt, veilleDescription } from '../lib/utils';

export async function GET(context: { site: URL }) {
  const blog = await getCollection('blog', isPublished);
  const veille = await getCollection('veille');
  const talks = await getCollection('talks');

  const allEntries = [
    ...blog.map((entry) => ({ ...entry, collection: 'blog' as const })),
    ...veille.map((entry) => ({ ...entry, collection: 'veille' as const })),
    ...talks.map((entry) => ({ ...entry, collection: 'talks' as const })),
  ];

  const items = allEntries
    .sort((a, b) => b.data.date.getTime() - a.data.date.getTime())
    .map((entry) => {
      const link =
        entry.collection === 'blog'
          ? `/blog/${entry.id}/`
          : entry.collection === 'veille'
          ? `/veille/${entry.id}/`
          : `/talks/${entry.id}/`;

      let description: string;
      if (entry.collection === 'veille') {
        description = veilleDescription(entry.body, entry.data.date);
      } else {
        description = entry.data.description ?? excerpt(entry.body);
      }

      return {
        title: entry.data.title,
        pubDate: entry.data.date,
        description,
        link,
      };
    });

  return rss({
    title: 'welcomattic',
    description: 'Blog de Mathieu Santostefano (welcomattic)',
    site: context.site,
    items,
    customData: '<language>fr</language>',
  });
}
