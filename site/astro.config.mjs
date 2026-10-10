// @ts-check
import { defineConfig } from 'astro/config';
import tailwindcss from '@tailwindcss/vite';

// GlobalHealth — public website.
// Static-first: every route is pre-rendered at build time, so the shipped
// payload is HTML + CSS + a couple of tiny ES modules. No runtime framework.
export default defineConfig({
  site: process.env.PUBLIC_SITE_URL || 'https://globalhealth.health',
  trailingSlash: 'always',
  output: 'static',
  compressHTML: true,
  build: {
    // Inline small stylesheets so first paint needs zero extra round-trips.
    inlineStylesheets: 'auto',
  },
  prefetch: {
    prefetchAll: false,
    defaultStrategy: 'hover',
  },
  devToolbar: { enabled: false },
  // The live-preview tunnel (and any staging host) is reached by a hostname we
  // cannot know in advance, so both servers accept arbitrary Host headers.
  server: { host: true, port: 4321, allowedHosts: true },
  vite: {
    // @tailwindcss/vite ships its own Vite 7 plugin type while Astro's config
    // type is still on Vite 6, so the cast keeps `astro check` quiet.
    plugins: [/** @type {any} */ (tailwindcss())],
    server: {
      allowedHosts: true,
    },
    // `astro preview` runs Vite's preview server; the same host rule applies.
    preview: {
      host: true,
      port: 4321,
      allowedHosts: true,
    },
  },
});
