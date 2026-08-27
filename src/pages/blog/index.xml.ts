import rss from '@astrojs/rss';
import { getCollection } from 'astro:content';
import { isPublished } from '../../lib/publish';
import { excerpt } from '../../lib/utils';

export async function GET(context: { site: URL }) {
  const blog = await getCollection('blog', isPublished);

  const items = blog
    .sort((a, b) => b.data.date.getTime() - a.data.date.getTime())
    .map((entry) => ({
      title: entry.data.title,
      pubDate: entry.data.date,
      description: entry.data.description ?? excerpt(entry.body),
      link: `/blog/${entry.id}/`,
    }));

  return rss({
    title: 'blog | welcomattic',
    description: 'Blog de Mathieu Santostefano (welcomattic)',
    site: context.site,
    items,
    customData: '<language>fr</language>',
  });
}
