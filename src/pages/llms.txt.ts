import { getCollection } from 'astro:content';

const SITE = 'https://blog.welcomattic.com';

export async function GET() {
  const [blog, veille, talks] = await Promise.all([
    getCollection('blog'),
    getCollection('veille'),
    getCollection('talks'),
  ]);

  const byDate = <T extends { data: { date: Date } }>(entries: T[]) =>
    entries.sort((a, b) => b.data.date.valueOf() - a.data.date.valueOf());

  const lines = [
    '# welcomattic',
    '',
    '> Blog de Mathieu Santostefano (welcomattic), Tech Expert chez SensioLabs,',
    '> membre de la Symfony Core Team, speaker. Sujets : PHP, Symfony, web, IA, open source.',
    '> Contenu en français et en anglais.',
    '',
    `Version complète du contenu : ${SITE}/llms-full.txt`,
    '',
    '## Blog',
    '',
    ...byDate(blog.filter((e) => !e.data.noindex)).map(
      (e) => `- [${e.data.title}](${SITE}/blog/${e.id}/)`
    ),
    '',
    '## Speaking (conférences, podcasts, lightning talks)',
    '',
    ...byDate(talks).map((e) => `- [${e.data.title}](${SITE}/talks/${e.id}/)`),
    '',
    '## Veille',
    '',
    ...byDate(veille).map((e) => `- [${e.data.title}](${SITE}/veille/${e.id}/)`),
    '',
    '## Auteur',
    '',
    `- [Page auteur](${SITE}/)`,
    '- [GitHub](https://github.com/welcomattic)',
    '- [Mastodon](https://phpc.social/@welcomattic)',
    '- [Bluesky](https://bsky.app/profile/welcomattic.com)',
    '',
  ];

  return new Response(lines.join('\n'), {
    headers: { 'Content-Type': 'text/plain; charset=utf-8' },
  });
}
