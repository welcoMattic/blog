import rss from '@astrojs/rss';
import { getCollection } from 'astro:content';
import { excerpt } from '../../lib/utils';

export async function GET(context: { site: URL }) {
  const talks = await getCollection('talks');

  const items = talks
    .sort((a, b) => b.data.date.getTime() - a.data.date.getTime())
    .map((entry) => ({
    title: entry.data.title,
    pubDate: entry.data.date,
      description: entry.data.description ?? excerpt(entry.body),
      link: `/talks/${entry.id}/`,
    }));

  return rss({
    title: 'speaking | welcomattic',
    description: 'Conférences, podcasts et lightning talks de Mathieu Santostefano (welcomattic)',
    site: context.site,
    items,
    customData: '<language>fr</language>',
  });
}
