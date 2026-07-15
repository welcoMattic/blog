import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import satori from 'satori';
import { html } from 'satori-html';
import { Resvg } from '@resvg/resvg-js';
import { formatDate } from './utils';

// process.cwd() is the project root during astro build; import.meta.url would
// point inside dist/.prerender once bundled.
const fontsDir = resolve(process.cwd(), 'src/assets/fonts');
const fontRegular = readFileSync(resolve(fontsDir, 'KintoSans-Regular.ttf'));
const fontBold = readFileSync(resolve(fontsDir, 'KintoSans-Bold.ttf'));

// Card design tokens, aligned with the site theme (light palette).
const BG = '#faf9f7';
const TEXT = '#1c1c1e';
const MUTED = '#6b6b70';
const ACCENT = '#8c2f39';
const HAIRLINE = '#e4e2dd';

// Satori has no emoji font loaded: strip pictographs from card text.
function stripEmoji(text: string): string {
  return text
    .replace(/[\p{Extended_Pictographic}\u{FE0F}\u{200D}]/gu, '')
    .replace(/\s+/g, ' ')
    .trim();
}

export interface OgCardInput {
  eyebrow: string;
  title: string;
  date?: Date;
  lang?: 'fr' | 'en';
}

export async function renderOgCard({ eyebrow, title, date, lang = 'fr' }: OgCardInput): Promise<Buffer> {
  const safeTitle = stripEmoji(title);
  const meta = date ? formatDate(date, lang) : 'blog.welcomattic.com';

  const markup = html(`
    <div style="display: flex; flex-direction: column; justify-content: space-between; width: 1200px; height: 630px; background-color: ${BG}; padding: 72px; border-bottom: 16px solid ${ACCENT};">
      <div style="display: flex; flex-direction: column;">
        <div style="display: flex; text-transform: uppercase; letter-spacing: 4px; font-size: 28px; font-weight: 700; color: ${ACCENT};">${eyebrow}</div>
        <div style="display: flex; margin-top: 28px; font-size: ${safeTitle.length > 70 ? 56 : 68}px; font-weight: 700; line-height: 1.2; color: ${TEXT};">${safeTitle}</div>
      </div>
      <div style="display: flex; justify-content: space-between; align-items: center; border-top: 2px solid ${HAIRLINE}; padding-top: 32px;">
        <div style="display: flex; font-size: 30px; color: ${MUTED};">${meta}</div>
        <div style="display: flex; font-size: 30px; font-weight: 700; color: ${TEXT};">welcomattic<span style="color: ${ACCENT};">.com</span></div>
      </div>
    </div>
  `);

  const svg = await satori(markup, {
    width: 1200,
    height: 630,
    fonts: [
      { name: 'Kinto Sans', data: fontRegular, weight: 400, style: 'normal' },
      { name: 'Kinto Sans', data: fontBold, weight: 700, style: 'normal' },
    ],
  });

  return new Resvg(svg, { fitTo: { mode: 'width', value: 1200 } }).render().asPng();
}
