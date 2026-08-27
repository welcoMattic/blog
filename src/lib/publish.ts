// Publication programmee : un article porte sa date de sortie dans son front
// matter, et le build masque tout ce qui n'est pas encore du. La mise en ligne
// effective a lieu au rebuild quotidien declenche par le cron de la CI, pas a
// l'heure exacte inscrite dans le front matter (le site est statique).
//
// `INCLUDE_DRAFTS=1` (via `npm run dev:drafts`) leve le filtre, pour pouvoir
// relire en local un article programme. La variable n'est jamais positionnee par
// `npm run build` ni par la CI.
export const includeDrafts = process.env.INCLUDE_DRAFTS === '1';

const TIME_ZONE = 'Europe/Paris';

// Comparaison au jour calendaire, pas a l'horodatage : un article date du
// 1er septembre sort le matin du 1er septembre, quelle que soit l'heure ecrite
// dans son front matter. Comparer a l'horodatage ferait rater sa journee a tout
// article date d'une heure posterieure au passage du cron.
function today(): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: TIME_ZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date());
}

// Le jour de l'article est lu tel qu'ecrit dans le front matter (UTC), et
// `en-CA` formate en YYYY-MM-DD : les deux chaines se comparent directement.
export function isPublished(entry: { data: { date: Date } }): boolean {
  if (includeDrafts) return true;

  return entry.data.date.toISOString().slice(0, 10) <= today();
}
