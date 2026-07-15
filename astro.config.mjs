// @ts-check
import { defineConfig, fontProviders } from 'astro/config';
import { satteri } from '@astrojs/markdown-satteri';
import { defineHastPlugin } from 'satteri';

const externalLinks = defineHastPlugin({
  name: 'external-links',
  element: {
    filter: ['a'],
    visit(node, ctx) {
      const href = node.properties?.href;
      if (typeof href === 'string' && /^https?:\/\//.test(href)) {
        ctx.setProperty(node, 'target', '_blank');
        ctx.setProperty(node, 'rel', 'noopener');
      }
    },
  },
});

// Footnote references imported from JoliCode (`[1](#fn:xxx)`) become superscript.
const footnoteSup = defineHastPlugin({
  name: 'footnote-sup',
  element: {
    filter: ['a'],
    visit(node, ctx) {
      const href = node.properties?.href;
      if (typeof href === 'string' && href.startsWith('#fn:')) {
        ctx.wrapNode(node, { type: 'element', tagName: 'sup', properties: {}, children: [] });
      }
    },
  },
});

// Hugo `{{< youtube ID >}}` shortcodes still present in content/ are rendered
// as privacy-enhanced (nocookie) lazy embeds instead of literal text.
const youtubeShortcodes = defineHastPlugin({
  name: 'youtube-shortcodes',
  text(node, ctx) {
    const match = /^\{\{<\s*youtube\s+([\w-]+)\s*>\}\}$/.exec((node.value ?? '').trim());
    if (!match) return;
    const parent = ctx.parent(node);
    if (!parent || parent.type !== 'element' || parent.tagName !== 'p') return;
    ctx.replaceNode(parent, {
      type: 'element',
      tagName: 'div',
      properties: { className: ['video-embed'] },
      children: [
        {
          type: 'element',
          tagName: 'iframe',
          properties: {
            src: `https://www.youtube-nocookie.com/embed/${match[1]}`,
            title: 'YouTube video player',
            loading: 'lazy',
            allow: 'accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share',
            allowFullScreen: true,
          },
          children: [],
        },
      ],
    });
  },
});

// https://astro.build/config
export default defineConfig({
  site: 'https://blog.welcomattic.com',
  trailingSlash: 'always',
  publicDir: 'static',
  outDir: 'dist',
  build: {
    format: 'directory',
    inlineStylesheets: 'always',
  },
  prefetch: {
    prefetchAll: true,
    defaultStrategy: 'viewport',
  },
  image: {
    layout: 'constrained',
    responsiveStyles: true,
    service: {
      entrypoint: 'astro/assets/services/sharp',
      config: {
        avif: { effort: 4 },
        webp: { effort: 5 },
        jpeg: { mozjpeg: true },
        png: { compressionLevel: 9 },
      },
    },
  },
  vite: {
    css: { transformer: 'lightningcss' },
    build: { cssMinify: 'lightningcss' },
  },
  markdown: {
    processor: satteri({ hastPlugins: [externalLinks, youtubeShortcodes, footnoteSup] }),
    shikiConfig: {
      themes: { light: 'github-light', dark: 'github-dark' },
    },
  },
  fonts: [
    {
      provider: fontProviders.google(),
      name: 'Newsreader',
      cssVariable: '--font-serif',
      weights: [400, 600, 700],
      styles: ['normal', 'italic'],
      subsets: ['latin'],
      fallbacks: ['Georgia', 'Times New Roman', 'serif'],
    },
    {
      provider: fontProviders.google(),
      name: 'Schibsted Grotesk',
      cssVariable: '--font-sans',
      weights: [400, 600, 700],
      subsets: ['latin'],
      fallbacks: ['system-ui', 'sans-serif'],
    },
  ],
  // Sitemap: custom endpoint src/pages/sitemap.xml.ts (Hugo path parity + noindex filter)
});
