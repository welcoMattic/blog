#!/usr/bin/env node
// Publie les brouillons Obsidian (vault iCloud) vers content/.
//
// Flux : écrire dans <vault>/Blog/drafts/*.md avec `publish: true` en front matter,
// puis lancer `npm run publish:obsidian` (ou --dry-run). Le script normalise la note
// (wikilinks, embeds d'images, front matter) vers content/<section>/{date}-{slug}.md
// et déplace la note dans <vault>/Blog/published/ pour que le statut se synchronise
// sur tous les appareils via iCloud.
import { readFileSync, writeFileSync, mkdirSync, readdirSync, copyFileSync, renameSync, existsSync, statSync } from 'node:fs';
import { resolve, join, basename, extname } from 'node:path';
import { homedir } from 'node:os';

const REPO = resolve(import.meta.dirname, '..');
const VAULT = process.env.OBSIDIAN_VAULT
  ?? join(homedir(), 'Library/Mobile Documents/iCloud~md~obsidian/Documents/msantostefano-notes');
const DRAFTS = join(VAULT, 'Blog/drafts');
const PUBLISHED = join(VAULT, 'Blog/published');
const DRY = process.argv.includes('--dry-run');
const SECTIONS = new Set(['blog', 'veille', 'talks']);

if (!existsSync(DRAFTS)) {
  console.error(`Dossier introuvable : ${DRAFTS}\nCrée <vault>/Blog/drafts ou définis OBSIDIAN_VAULT.`);
  process.exit(1);
}

// Index des fichiers du vault pour résoudre les embeds ![[fichier]] où qu'ils soient.
function indexVault(dir, index = new Map()) {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    if (entry.name.startsWith('.')) continue;
    const full = join(dir, entry.name);
    if (entry.isDirectory()) indexVault(full, index);
    else index.set(entry.name.toLowerCase(), full);
  }
  return index;
}

function parseFrontMatter(text) {
  const m = /^---\n([\s\S]*?)\n---\n?/.exec(text);
  if (!m) return { fm: {}, body: text, raw: '' };
  const fm = {};
  for (const line of m[1].split('\n')) {
    const kv = /^(\w[\w-]*):\s*(.*)$/.exec(line);
    if (kv) fm[kv[1]] = kv[2].replace(/^["']|["']$/g, '').trim();
    const item = /^\s*-\s+(.+)$/.exec(line);
    if (item && fm.__lastKey) (fm[fm.__lastKey] = Array.isArray(fm[fm.__lastKey]) ? fm[fm.__lastKey] : []).push(item[1].trim());
    if (kv && kv[2] === '') fm.__lastKey = kv[1];
  }
  delete fm.__lastKey;
  return { fm, body: text.slice(m[0].length), raw: m[1] };
}

function slugify(title) {
  return title
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

const vaultIndex = indexVault(VAULT);
const drafts = readdirSync(DRAFTS).filter((f) => f.endsWith('.md'));
let published = 0;

for (const file of drafts) {
  const path = join(DRAFTS, file);
  const { fm, body } = parseFrontMatter(readFileSync(path, 'utf-8'));

  if (String(fm.publish) !== 'true') {
    console.log(`[skip] ${file} (publish != true)`);
    continue;
  }

  const title = fm.title ?? basename(file, '.md');
  const section = SECTIONS.has(fm.section) ? fm.section : 'blog';
  const date = fm.date?.slice(0, 10) ?? new Date().toISOString().slice(0, 10);
  const lang = fm.lang === 'en' ? 'en' : 'fr';
  const slug = fm.slug ?? slugify(title);
  const filename = `${date}-${slug}.md`;
  const tags = Array.isArray(fm.tags) ? fm.tags : (fm.tags ? fm.tags.replace(/[[\]]/g, '').split(',').map((t) => t.trim()).filter(Boolean) : []);

  let content = body;

  // Embeds d'images Obsidian : ![[fichier.png]] -> copie dans static/img/<slug>/
  const assets = [];
  content = content.replace(/!\[\[([^\]|]+?)(?:\|[^\]]*)?\]\]/g, (_, name) => {
    const clean = name.trim();
    const src = vaultIndex.get(clean.toLowerCase()) ?? vaultIndex.get(basename(clean).toLowerCase());
    if (!src) {
      console.warn(`  [warn] embed introuvable dans le vault : ${clean}`);
      return `![](${clean})`;
    }
    const target = basename(src);
    assets.push({ src, target });
    return `![](/img/${slug}/${target})`;
  });

  // Wikilinks : [[Note|label]] -> label ; [[Note]] -> Note
  content = content.replace(/\[\[([^\]|]+)\|([^\]]+)\]\]/g, '$2').replace(/\[\[([^\]]+)\]\]/g, '$1');

  const outFm = [
    '---',
    `title: ${JSON.stringify(title)}`,
    `date: ${date}T09:00:00.000Z`,
    `description: ${JSON.stringify(fm.description ?? '')}`,
    'tags:',
    ...tags.map((t) => `  - ${t}`),
    `lang: ${lang}`,
    '---',
    '',
  ].join('\n');

  const outPath = join(REPO, 'content', section, filename);
  console.log(`[publish] ${file} -> content/${section}/${filename} (${assets.length} images)${DRY ? ' [dry-run]' : ''}`);

  if (DRY) continue;

  if (existsSync(outPath)) {
    console.error(`  [abort] ${outPath} existe déjà, renomme le brouillon ou ajoute un champ slug.`);
    continue;
  }
  if (assets.length) mkdirSync(join(REPO, 'static/img', slug), { recursive: true });
  for (const { src, target } of assets) copyFileSync(src, join(REPO, 'static/img', slug, target));
  writeFileSync(outPath, outFm + content.trim() + '\n');
  mkdirSync(PUBLISHED, { recursive: true });
  renameSync(path, join(PUBLISHED, file));
  published += 1;
}

console.log(DRY ? 'Dry-run terminé.' : `${published} article(s) publié(s). Pense à relire, builder et committer.`);
