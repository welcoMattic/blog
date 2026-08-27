import { getCollection } from 'astro:content';
import { isPublished } from '../lib/publish';

const SITE = 'https://blog.welcomattic.com';

export async function GET() {
  const [blog, talks] = await Promise.all([getCollection('blog', isPublished), getCollection('talks')]);

  const byDate = <T extends { data: { date: Date } }>(entries: T[]) =>
    entries.sort((a, b) => b.data.date.valueOf() - a.data.date.valueOf());

  const sections: string[] = [
    '# welcomattic, contenu intégral',
    '',
    '> Blog de Mathieu Santostefano (welcomattic), Tech Expert chez SensioLabs,',
    '> membre de la Symfony Core Team. Dump markdown des articles et talks.',
    '',
  ];

  for (const entry of byDate(blog.filter((e) => !e.data.noindex))) {
    sections.push(
      '---',
      '',
      `# ${entry.data.title}`,
      '',
      `URL: ${SITE}/blog/${entry.id}/`,
      `Date: ${entry.data.date.toISOString().slice(0, 10)}`,
      '',
      entry.body ?? '',
      ''
    );
  }

  for (const entry of byDate(talks)) {
    sections.push(
      '---',
      '',
      `# [Talk] ${entry.data.title}`,
      '',
      `URL: ${SITE}/talks/${entry.id}/`,
      `Date: ${entry.data.date.toISOString().slice(0, 10)}`,
      '',
      entry.body ?? '',
      ''
    );
  }

  return new Response(sections.join('\n'), {
    headers: { 'Content-Type': 'text/plain; charset=utf-8' },
  });
}
