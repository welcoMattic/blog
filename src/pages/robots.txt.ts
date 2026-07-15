// Explicit AI crawler policy (plan section 6, GEO P0): search/citation crawlers
// welcome, training-only crawlers allowed as a conscious choice for visibility.

const body = `User-agent: *
Disallow:

# AI search and citation crawlers, explicitly welcome
User-agent: GPTBot
Allow: /

User-agent: OAI-SearchBot
Allow: /

User-agent: ClaudeBot
Allow: /

User-agent: PerplexityBot
Allow: /

User-agent: Google-Extended
Allow: /

Sitemap: https://blog.welcomattic.com/sitemap.xml
`;

export function GET() {
  return new Response(body, {
    headers: { 'Content-Type': 'text/plain; charset=utf-8' },
  });
}
