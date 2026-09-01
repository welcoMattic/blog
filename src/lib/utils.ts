// Hugo `urlize` equivalent: lowercase, spaces to hyphens, accents kept.
export function slugifyTag(tag: string): string {
  return tag.trim().toLowerCase().replace(/\s+/g, '-');
}

export function formatDate(date: Date, lang: 'fr' | 'en' = 'fr'): string {
  return new Intl.DateTimeFormat(lang === 'fr' ? 'fr-FR' : 'en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  }).format(date);
}

export function readingMinutes(body: string | undefined): number {
  const words = (body ?? '').split(/\s+/).filter(Boolean).length;
  return Math.max(1, Math.round(words / 200));
}

export function langFlag(lang: 'fr' | 'en' = 'fr'): string {
  return lang === 'en' ? '🇬🇧' : '🇫🇷';
}

// Typographie française : la ponctuation double (: ; ! ?) et les guillemets
// prennent une espace fine insécable. Avec une espace normale, le navigateur y
// voit une occasion de couper la ligne et laisse le signe orphelin en tête de
// la ligne suivante, ce qui saute aux yeux sur un titre d'article.
// Appliqué à l'affichage seulement : les sources gardent des espaces normales,
// plus simples à taper et à relire.
const NARROW_NO_BREAK_SPACE = '\u202F';

export function frenchPunctuation(text: string, lang: 'fr' | 'en' = 'fr'): string {
  if (lang !== 'fr') return text;

  return text
    .replace(/ +([;:!?»])/g, `${NARROW_NO_BREAK_SPACE}$1`)
    .replace(/(«) +/g, `$1${NARROW_NO_BREAK_SPACE}`);
}

// Display label for a section slug. The talks collection lives at /talks/ (URL
// parity) but is surfaced as "speaking" everywhere it's shown.
const SECTION_LABELS: Record<string, string> = {
  blog: 'blog',
  veille: 'veille',
  talks: 'speaking',
  oss: 'oss',
};

export function sectionLabel(slug: string): string {
  return SECTION_LABELS[slug] ?? slug;
}

// Sub-group labels for talks entries, keyed by their `type` front matter field.
export const TALK_TYPE_LABELS: Record<string, string> = {
  conference: 'Conférences',
  podcast: 'Podcasts',
  'lightning-talk': 'Lightning talks',
};

export const TALK_TYPE_SINGULAR: Record<string, string> = {
  conference: 'Conférence',
  podcast: 'Podcast',
  'lightning-talk': 'Lightning talk',
};

export const TALK_TYPE_ORDER = ['conference', 'podcast', 'lightning-talk'] as const;

// Markdown body to plain-text excerpt (Hugo .Summary equivalent) for meta descriptions.
export function excerpt(body: string | undefined, max = 155): string {
  if (!body) return '';
  const text = body
    .replace(/```[\s\S]*?```/g, ' ')
    .replace(/^#.*$/gm, ' ')
    .replace(/!\[[^\]]*\]\([^)]*\)/g, ' ')
    .replace(/\[([^\]]*)\]\([^)]*\)/g, '$1')
    .replace(/[#>*_`|-]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  if (text.length <= max) return text;
  return `${text.slice(0, max).replace(/\s\S*$/, '')}…`;
}

// Unique per-issue description for veille entries, built from the first link labels
// (fixes the 52x duplicated "News du jour" meta description, plan section 5).
export function veilleDescription(body: string | undefined, date: Date): string {
  const labels = [...(body ?? '').matchAll(/\[([^\]]+)\]\(/g)]
    .map((m) => m[1].trim())
    .filter(Boolean)
    .slice(0, 3);
  const day = formatDate(date, 'fr');
  if (labels.length === 0) return `Veille du ${day}.`;
  return excerpt(`Veille du ${day} : ${labels.join(' · ')}`, 180);
}
