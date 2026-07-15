// Snapshot du scan GitHub (github.com/welcoMattic) du 15/07/2026, curaté à la main.

export interface OssProject {
  name: string;
  url: string;
  description: string;
  stars?: number;
  language?: string;
  unmaintained?: boolean;
  // Défaut : open source. Passer à false pour un projet propriétaire (ex. Sleepr).
  openSource?: boolean;
}

export const contributions: OssProject[] = [
  {
    name: 'Symfony',
    url: 'https://github.com/symfony/symfony',
    description: 'Le framework PHP Symfony. Membre de la Core Team (composants Translation, Intl, Emoji).',
    language: 'PHP',
  },
  {
    name: 'Symfony UX',
    url: 'https://github.com/symfony/ux',
    description: 'Initiative pour des interfaces modernes avec un minimum de JavaScript (Stimulus, Turbo, composants).',
    language: 'PHP',
  },
  {
    name: 'Symfony AI',
    url: 'https://github.com/symfony/ai',
    description: 'Composants et bundles Symfony pour intégrer l’IA dans les applications PHP.',
    language: 'PHP',
  },
];

// Bridges et providers dont Mathieu est l'auteur (vérifiés via ses PR mergées).
export const bridges: OssProject[] = [
  {
    name: 'Translation Provider · Loco',
    url: 'https://github.com/symfony/loco-translation-provider',
    description: 'Auteur initial du système de Translation Providers de Symfony, livré avec le provider Loco.',
    language: 'PHP',
  },
  {
    name: 'Translation Provider · Lokalise',
    url: 'https://github.com/symfony/lokalise-translation-provider',
    description: 'Provider de traduction Lokalise pour Symfony Translation.',
    language: 'PHP',
  },
  {
    name: 'Mailer · Sweego',
    url: 'https://github.com/symfony/sweego-mailer',
    description: 'Bridge Symfony Mailer pour Sweego (e-mail).',
    language: 'PHP',
  },
  {
    name: 'Notifier · Sweego',
    url: 'https://github.com/symfony/sweego-notifier',
    description: 'Bridge Symfony Notifier pour Sweego (SMS).',
    language: 'PHP',
  },
  {
    name: 'Mailer · Resend',
    url: 'https://github.com/symfony/resend-mailer',
    description: 'Bridge Symfony Mailer pour Resend.',
    language: 'PHP',
  },
  {
    name: 'Symfony AI · Docker Model Runner',
    url: 'https://github.com/symfony/ai/tree/main/src/platform/src/Bridge/DockerModelRunner',
    description: 'Bridge de plateforme Symfony AI pour Docker Model Runner.',
    language: 'PHP',
  },
  {
    name: 'Symfony AI · Perplexity',
    url: 'https://github.com/symfony/ai/tree/main/src/platform/src/Bridge/Perplexity',
    description: 'Bridge de plateforme Symfony AI pour Perplexity.',
    language: 'PHP',
  },
];

export const projects: OssProject[] = [
  {
    name: 'Sleepr',
    url: 'https://sleepr.app/',
    description: 'App macOS qui ramène le sleep timer disparu de Ventura. 100 % Swift/SwiftUI.',
    language: 'Swift',
    openSource: false,
  },
  {
    name: 'has-attribute',
    url: 'https://github.com/welcoMattic/has-attribute',
    description: 'La fonction has_attribute manquante de PHP.',
    stars: 12,
    language: 'PHP',
  },
  {
    name: 'openapi-enricher',
    url: 'https://github.com/welcoMattic/openapi-enricher',
    description: 'Enrichit une spec OpenAPI d’exemples de réponses pour un mocking efficace.',
    stars: 7,
    language: 'JavaScript',
  },
  {
    name: 'clevercloud-php-sdk',
    url: 'https://github.com/welcoMattic/clevercloud-php-sdk',
    description: 'SDK PHP pour les APIs Clever Cloud (v2 et v4).',
    stars: 4,
    language: 'PHP',
  },
  {
    name: 'symfony-skills',
    url: 'https://github.com/welcoMattic/symfony-skills',
    description: 'Skills pour agents de code IA dédiés à l’utilisation du framework Symfony.',
    stars: 4,
    language: 'Shell',
  },
];

export const archived: OssProject[] = [
  {
    name: 'KYMSU',
    url: 'https://github.com/welcoMattic/kymsu',
    description: 'Keep Your macOS Stuff Updated : brew, npm, gems et plus en une commande.',
    stars: 130,
    language: 'Shell',
  },
  {
    name: 'spotify-control-rust',
    url: 'https://github.com/welcoMattic/spotify-control-rust',
    description: 'CLI pour contrôler Spotify via D-Bus.',
    stars: 15,
    language: 'Rust',
  },
  {
    name: 'dotfiles-linux',
    url: 'https://github.com/welcoMattic/dotfiles-linux',
    description: 'Dotfiles ArchLinux gérés avec chezmoi.',
    stars: 3,
    language: 'Shell',
  },
  {
    name: 'ecowatt-ios-widget',
    url: 'https://github.com/welcoMattic/ecowatt-ios-widget',
    description: 'Votre météo de l’électricité d’un coup d’œil, en widget iOS.',
    stars: 1,
    language: 'JavaScript',
  },
  {
    name: 'whenTheSunGoesDown',
    url: 'https://github.com/welcoMattic/whenTheSunGoesDown',
    description: 'Script Python qui adapte l’interface macOS au coucher du soleil.',
    stars: 1,
    language: 'Python',
  },
];
