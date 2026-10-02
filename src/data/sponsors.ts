// GitHub Sponsors, maintenu à la main. La source de vérité reste la page
// github.com/sponsors/welcomattic : paliers relevés le 02/10/2026, à recopier ici
// à chaque changement de grille. Le texte de chaque palier est dans
// content/sponsors/<lang>.md (tiers.perks).

export type Lang = 'fr' | 'en';
export type Frequency = 'monthly' | 'one-time';

export const SPONSORS_URL = 'https://github.com/sponsors/welcomattic';
export const CONTACT_EMAIL = 'sponsors@welcomattic.com';
export const CONTACT_LINKEDIN = 'https://www.linkedin.com/in/msantostefano/';

// Deux pages, une par langue. Le français est à la racine : c'est la langue du
// lectorat (Plausible, septembre 2026 : 62 % de visiteurs en France, articles
// français 3 à 8 fois plus lus que leur version anglaise). Les routes sont
// src/pages/sponsors/index.astro et src/pages/sponsors/en.astro : inverser les
// langues, c'est échanger ces deux valeurs et renommer les deux fichiers.
export const SPONSORS_PAGE: Record<Lang, string> = {
  fr: '/sponsors/',
  en: '/sponsors/en/',
};

export interface Tier {
  amount: number;
  frequency: Frequency;
  // `tier_id` GitHub : le lien ouvre le checkout avec ce palier présélectionné.
  // Il se lit dans l'URL du bouton « Select » du palier sur GitHub.
  id: number;
  name?: string;
  featured?: boolean;
  // Palier qui demande un échange avant paiement : la carte affiche les moyens
  // de contact.
  contact?: boolean;
}

export const tiers: Tier[] = [
  {
    amount: 1,
    frequency: 'monthly',
    id: 67207,
  },
  {
    amount: 5,
    frequency: 'monthly',
    id: 67208,
  },
  {
    amount: 25,
    frequency: 'monthly',
    id: 662810,
    name: 'Developer',
  },
  {
    amount: 42,
    frequency: 'monthly',
    id: 396316,
  },
  {
    amount: 100,
    frequency: 'monthly',
    id: 662811,
    name: 'Company',
    featured: true,
  },
  {
    amount: 250,
    frequency: 'monthly',
    id: 662812,
    name: 'Partner',
    featured: true,
  },
  {
    amount: 500,
    frequency: 'monthly',
    id: 662813,
    name: 'Sustaining partner',
    featured: true,
  },
  {
    amount: 2,
    frequency: 'one-time',
    id: 116864,
  },
  {
    amount: 10,
    frequency: 'one-time',
    id: 229111,
  },
  {
    amount: 100,
    frequency: 'one-time',
    id: 395027,
  },
  {
    amount: 750,
    frequency: 'one-time',
    id: 422240,
    name: 'Bridge',
    featured: true,
    contact: true,
  },
];

export const tierUrl = (tier: Tier): string => `${SPONSORS_URL}/sponsorships?tier_id=${tier.id}`;

export interface Sponsor {
  name: string;
  url: string;
  // Inconnu pour un sponsor passé dont le montant n'est pas public.
  amount?: number;
  frequency: Frequency;
  // Sponsoring terminé : listé à part sur la page, jamais dans la colonne des
  // articles. La raison affichée est dans content/sponsors/<lang>.md
  // (sponsors.pastNotes), sous le nom du sponsor.
  past?: boolean;
  // Nom de fichier dans static/img/sponsors/ (pas d'URL distante : la CSP
  // prévue n'autorise les images que depuis le site). Obligatoire à partir du
  // palier Company, voir hasLogoTier.
  logo?: string;
}

// N'ajouter que les sponsors publics : un sponsor GitHub en mode privé ne doit
// apparaître nulle part.
export const sponsors: Sponsor[] = [
  { name: 'Sweego', url: 'https://www.sweego.io/', frequency: 'one-time', past: true },
];

// Le palier Company (100 $ par mois) et ceux au-dessus promettent un logo et un
// lien dans la colonne des articles. Le palier ponctuel à 100 $ ne promet rien
// de tel, d'où le test sur la fréquence et pas seulement sur le montant.
export const hasLogoTier = (sponsor: Sponsor): boolean =>
  !sponsor.past && sponsor.frequency === 'monthly' && (sponsor.amount ?? 0) >= 100;

for (const sponsor of sponsors) {
  if (hasLogoTier(sponsor) && !sponsor.logo) {
    throw new Error(`Sponsor « ${sponsor.name} » : son palier promet un logo, ajoutez-le dans static/img/sponsors/.`);
  }
}

const byAmount = (a: Sponsor, b: Sponsor) => (b.amount ?? 0) - (a.amount ?? 0);
const active = sponsors.filter((sponsor) => !sponsor.past);

export const logoSponsors = active.filter(hasLogoTier).sort(byAmount);
export const otherSponsors = active.filter((sponsor) => !hasLogoTier(sponsor)).sort(byAmount);
export const pastSponsors = sponsors.filter((sponsor) => sponsor.past);
