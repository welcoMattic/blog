import rss from '@astrojs/rss';
import { getCollection } from 'astro:content';
import { veilleDescription } from '../../lib/utils';

export async function GET(context: { site: URL }) {
  const veille = await getCollection('veille');

  const items = veille
    .sort((a, b) => b.data.date.getTime() - a.data.date.getTime())
    .map((entry) => ({
      title: entry.data.title,
      pubDate: entry.data.date,
      description: veilleDescription(entry.body, entry.data.date),
      link: `/veille/${entry.id}/`,
    }));

  return rss({
    title: 'veille | welcomattic',
    description: 'Veille de Mathieu Santostefano (welcomattic)',
    site: context.site,
    items,
    customData: '<language>fr</language>',
  });
}
