import { getCollection } from 'astro:content';
import { isPublished } from '../../lib/publish';
import { renderOgCard, type OgCardInput } from '../../lib/og';

export async function getStaticPaths() {
  const [blog, veille, talks] = await Promise.all([
    getCollection('blog', isPublished),
    getCollection('veille'),
    getCollection('talks'),
  ]);

  const paths: Array<{ params: { route: string }; props: OgCardInput }> = [
    {
      params: { route: 'default' },
      props: { eyebrow: 'blog', title: 'Mathieu Santostefano · Tech Expert, Symfony Core Team' },
    },
  ];

  for (const entry of blog) {
    paths.push({
      params: { route: `blog/${entry.id}` },
      props: { eyebrow: 'blog', title: entry.data.title, date: entry.data.date, lang: entry.data.lang },
    });
  }
  for (const entry of veille) {
    paths.push({
      params: { route: `veille/${entry.id}` },
      props: { eyebrow: 'veille', title: entry.data.title, date: entry.data.date },
    });
  }
  const talkEyebrow: Record<string, string> = {
    conference: 'conférence',
    podcast: 'podcast',
    'lightning-talk': 'lightning talk',
  };
  for (const entry of talks) {
    paths.push({
      params: { route: `talks/${entry.id}` },
      props: {
        eyebrow: talkEyebrow[entry.data.type] ?? 'speaking',
        title: entry.data.title,
        date: entry.data.date,
        lang: entry.data.lang,
      },
    });
  }

  return paths;
}

export async function GET({ props }: { props: OgCardInput }) {
  const png = await renderOgCard(props);
  return new Response(new Uint8Array(png), {
    headers: { 'Content-Type': 'image/png' },
  });
}
