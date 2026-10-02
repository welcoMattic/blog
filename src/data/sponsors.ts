// GitHub Sponsors, maintenu à la main. La source de vérité reste la page
// github.com/sponsors/welcomattic : paliers relevés le 02/10/2026, à recopier ici
// à chaque changement de grille.

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
  perk: Record<Lang, string>;
}

export const tiers: Tier[] = [
  {
    amount: 1,
    frequency: 'monthly',
    id: 67207,
    perk: {
      en: 'You appreciate my open source work and want to show it. Thank you!',
      fr: 'Vous appréciez mon travail open source et voulez le montrer. Merci !',
    },
  },
  {
    amount: 5,
    frequency: 'monthly',
    id: 67208,
    perk: {
      en: 'My open source work helps you build your software. Thanks a lot!',
      fr: 'Mon travail open source vous aide à construire votre logiciel. Merci beaucoup !',
    },
  },
  {
    amount: 25,
    frequency: 'monthly',
    id: 662810,
    name: 'Developer',
    perk: {
      en: 'You build on my work and want to give back. Your name goes into the SPONSORS.md of my projects.',
      fr: 'Vous construisez sur mon travail et voulez rendre la pareille. Votre nom entre dans le SPONSORS.md de mes projets.',
    },
  },
  {
    amount: 42,
    frequency: 'monthly',
    id: 396316,
    perk: {
      en: 'Because 42 is the Answer to the Ultimate Question of Life, the Universe, and Everything.',
      fr: 'Parce que 42 est la réponse à la grande question sur la vie, l’univers et le reste.',
    },
  },
  {
    amount: 100,
    frequency: 'monthly',
    id: 662811,
    name: 'Company',
    featured: true,
    perk: {
      en: 'Your product runs on Symfony, and my Security, Mailer, Notifier or Translation work is part of your stack. Your logo and a link appear in the sidebar of the articles on this blog and in the README of my projects.',
      fr: 'Votre produit tourne sur Symfony, et mon travail sur Security, Mailer, Notifier ou Translation fait partie de votre stack. Votre logo et un lien apparaissent dans la colonne latérale des articles de ce blog et dans le README de mes projets.',
    },
  },
  {
    amount: 250,
    frequency: 'monthly',
    id: 662812,
    name: 'Partner',
    featured: true,
    perk: {
      en: 'Everything in Company, plus your logo on the slides of the talks I give at French and international conferences: several hundred PHP developers, tech experts and CTOs per event, in the room and later on the recording.',
      fr: 'Tout le palier Company, plus votre logo sur les slides des talks que je donne en conférence, en France et à l’international : plusieurs centaines de développeurs PHP, d’experts techniques et de CTO par événement, dans la salle puis sur l’enregistrement.',
    },
  },
  {
    amount: 500,
    frequency: 'monthly',
    id: 662813,
    name: 'Sustaining partner',
    featured: true,
    perk: {
      en: 'Everything in Partner, plus a monthly video call where we go through your authentication and authorization questions on Symfony: OAuth2, OIDC, the Security component.',
      fr: 'Tout le palier Partner, plus une visio mensuelle pour passer en revue vos questions d’authentification et d’autorisation sous Symfony : OAuth2, OIDC, l’utilisation du composant Security.',
    },
  },
  {
    amount: 2,
    frequency: 'one-time',
    id: 116864,
    perk: {
      en: 'To thank me for a particular contribution.',
      fr: 'Pour me remercier d’une contribution en particulier.',
    },
  },
  {
    amount: 10,
    frequency: 'one-time',
    id: 229111,
    perk: {
      en: 'To thank me for a contribution that proved particularly useful to your project.',
      fr: 'Pour une contribution qui s’est révélée particulièrement utile à votre projet.',
    },
  },
  {
    amount: 100,
    frequency: 'one-time',
    id: 395027,
    perk: {
      en: 'One of my contributions helped your team build your application, and you want to say so.',
      fr: 'Une de mes contributions a aidé votre équipe à construire votre application, et vous voulez le dire.',
    },
  },
  {
    amount: 750,
    frequency: 'one-time',
    id: 422240,
    name: 'Bridge',
    featured: true,
    contact: true,
    perk: {
      en: 'I write the Symfony bridge for your service, Mailer, Notifier or Translation: design, code, tests and docs, then the pull request on symfony/symfony, carried through review. What I can promise is the code and the pull request. The merge itself is the core team’s call, and nobody can sell you otherwise. Write to me first, so we scope the work together.',
      fr: 'J’écris le bridge Symfony de votre service, Mailer, Notifier ou Translation : conception, code, tests et documentation, puis la pull request sur symfony/symfony, que je porte jusqu’au bout de la revue. Ce que je peux promettre, c’est le code et la pull request. Le merge reste la décision de la core team, et personne ne peut vous vendre le contraire. Écrivez-moi d’abord, pour cadrer le travail ensemble.',
    },
  },
];

export const tierUrl = (tier: Tier): string => `${SPONSORS_URL}/sponsorships?tier_id=${tier.id}`;

export interface Sponsor {
  name: string;
  url: string;
  amount: number;
  frequency: Frequency;
  // Nom de fichier dans static/img/sponsors/ (pas d'URL distante : la CSP
  // prévue n'autorise les images que depuis le site). Obligatoire à partir du
  // palier Company, voir hasLogoTier.
  logo?: string;
}

// N'ajouter que les sponsors publics : un sponsor GitHub en mode privé ne doit
// apparaître nulle part.
export const sponsors: Sponsor[] = [
  // Palier non visible sans le mode sudo de GitHub. L'objectif mensuel étant à
  // 0 %, ce n'est pas un palier à logo : nom seul, en attendant le vrai montant.
  { name: 'Sweego', url: 'https://www.sweego.io/', amount: 0, frequency: 'one-time' },
];

// Le palier Company (100 $ par mois) et ceux au-dessus promettent un logo et un
// lien dans la colonne des articles. Le palier ponctuel à 100 $ ne promet rien
// de tel, d'où le test sur la fréquence et pas seulement sur le montant.
export const hasLogoTier = (sponsor: Sponsor): boolean => sponsor.frequency === 'monthly' && sponsor.amount >= 100;

for (const sponsor of sponsors) {
  if (hasLogoTier(sponsor) && !sponsor.logo) {
    throw new Error(`Sponsor « ${sponsor.name} » : son palier promet un logo, ajoutez-le dans static/img/sponsors/.`);
  }
}

const byAmount = (a: Sponsor, b: Sponsor) => b.amount - a.amount;

export const logoSponsors = sponsors.filter(hasLogoTier).sort(byAmount);
export const otherSponsors = sponsors.filter((sponsor) => !hasLogoTier(sponsor)).sort(byAmount);
