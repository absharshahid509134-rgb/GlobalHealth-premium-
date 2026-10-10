import type { APIRoute } from 'astro';
import { LOCALES, localePath, getLocale, hreflangTag } from '~/i18n';
import { PAGES } from '~/data/pages';

export const prerender = true;

/** Full locale × page sitemap with reciprocal hreflang alternates. */
export const GET: APIRoute = ({ site }) => {
  const origin = (site ?? new URL('https://globalhealth.health')).origin;

  const urls = LOCALES.flatMap((locale) =>
    PAGES.map((page) => {
      const loc = `${origin}${localePath(locale.code, page.path)}`;
      const alternates = LOCALES.map(
        (alt) => `    <xhtml:link rel="alternate" hreflang="${hreflangTag(getLocale(alt.code))}" href="${origin}${localePath(alt.code, page.path)}" />`
      ).join('\n');

      return `  <url>
    <loc>${loc}</loc>
    <changefreq>${page.slug === '' ? 'weekly' : 'monthly'}</changefreq>
    <priority>${page.slug === '' ? '1.0' : page.slug === 'platform' ? '0.9' : '0.7'}</priority>
${alternates}
    <xhtml:link rel="alternate" hreflang="x-default" href="${origin}${localePath('en', page.path)}" />
  </url>`;
    })
  );

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">
${urls.join('\n')}
</urlset>`;

  return new Response(xml, {
    headers: {
      'Content-Type': 'application/xml; charset=utf-8',
      'Cache-Control': 'public, max-age=3600',
    },
  });
};
