import { getCollection } from 'astro:content';
import { isPublished } from '../lib/publish';
import { tagsIndex, categoriesIndex } from '../lib/taxonomies';

// Custom sitemap kept at Hugo's historical path /sitemap.xml (parity requirement).
// Excludes noindex entries, carries real lastmod dates from front matter.

const SITE = 'https://blog.welcomattic.com';

interface UrlEntry {
  loc: string;
  lastmod?: Date;
}

export async function GET() {
  const [blog, veille, talks, tags, categories] = await Promise.all([
    getCollection('blog', isPublished),
    getCollection('veille'),
    getCollection('talks'),
    tagsIndex(),
    categoriesIndex(),
  ]);

  const indexableBlog = blog.filter((e) => !e.data.noindex);

  const maxDate = (dates: Date[]) =>
    dates.length ? new Date(Math.max(...dates.map((d) => d.valueOf()))) : undefined;

  const urls: UrlEntry[] = [
    { loc: '/', lastmod: maxDate([...blog, ...veille, ...talks].map((e) => e.data.date)) },
    { loc: '/blog/', lastmod: maxDate(indexableBlog.map((e) => e.data.date)) },
    { loc: '/veille/', lastmod: maxDate(veille.map((e) => e.data.date)) },
    { loc: '/talks/', lastmod: maxDate(talks.map((e) => e.data.date)) },
    { loc: '/oss/' },
    { loc: '/tags/' },
    { loc: '/categories/' },
    ...indexableBlog.map((e) => ({ loc: `/blog/${e.id}/`, lastmod: e.data.date })),
    ...veille.map((e) => ({ loc: `/veille/${e.id}/`, lastmod: e.data.date })),
    ...talks.map((e) => ({ loc: `/talks/${e.id}/`, lastmod: e.data.date })),
    ...Object.entries(tags).map(([slug, { entries }]) => ({
      loc: `/tags/${slug}/`,
      lastmod: maxDate(entries.map((e) => e.date)),
    })),
    ...Object.entries(categories).map(([slug, { entries }]) => ({
      loc: `/categories/${slug}/`,
      lastmod: maxDate(entries.map((e) => e.date)),
    })),
  ];

  const body = `<?xml version="1.0" encoding="utf-8" standalone="yes"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls
  .map(
    (u) =>
      `  <url>\n    <loc>${SITE}${u.loc}</loc>${
        u.lastmod ? `\n    <lastmod>${u.lastmod.toISOString()}</lastmod>` : ''
      }\n  </url>`
  )
  .join('\n')}
</urlset>
`;

  return new Response(body, {
    headers: { 'Content-Type': 'application/xml; charset=utf-8' },
  });
}
