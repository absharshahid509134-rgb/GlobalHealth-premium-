import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import {defineConfig} from 'vite';

export default defineConfig(() => {
  return {
    plugins: [react(), tailwindcss()],
    // The app intentionally ships several large, data-rich clinical modules.
    // Keep the build warning useful without treating known content bundles as
    // a failed build; route-level lazy loading still protects initial load.
    build: {
      chunkSizeWarningLimit: 12000,
    },
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    server: {
      // Allow tunnel/preview proxy hosts (e.g. e2b.app previews).
      allowedHosts: true as true,
      // HMR is disabled in AI Studio via DISABLE_HMR env var.
      // Do not modifyâfile watching is disabled to prevent flickering during agent edits.
      hmr: process.env.DISABLE_HMR !== 'true',
      // Disable file watching when DISABLE_HMR is true to save CPU during agent edits.
      // Otherwise ignore the paths that change for reasons unrelated to app source:
      // the server rewrites its own persisted state on a timer, the standalone
      // Astro site builds into its own dist/, and `npm run build` writes dist/.
      // Watching them makes the dev server reload the page on every persistence
      // flush and every site rebuild, which destabilises the live preview.
      watch: process.env.DISABLE_HMR === 'true'
        ? null
        : { ignored: ['**/data/runtime/**', '**/site/**', '**/dist/**'] },
    },
  };
});
