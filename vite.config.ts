import { readFileSync } from 'node:fs';
import { defineConfig } from 'vite';
import { VitePWA } from 'vite-plugin-pwa';

const pkg = JSON.parse(readFileSync(new URL('./package.json', import.meta.url), 'utf8')) as { version: string };

/**
 * Basis-Pfad der App.
 * - lokal und mit `npm run handy`: "/"
 * - GitHub Pages: "/<repository-name>/" – setzt der Workflow über BASE_PATH
 */
const base = process.env.BASE_PATH || '/';

export default defineConfig({
  base,
  define: {
    __APP_VERSION__: JSON.stringify(pkg.version),
  },
  server: {
    host: true, // im WLAN erreichbar (npm run dev → Adresse „Network")
  },
  preview: {
    host: true,
  },
  build: {
    target: 'es2020',
  },
  plugins: [
    VitePWA({
      registerType: 'autoUpdate',
      injectRegister: false, // Registrierung erfolgt in src/main.ts
      includeAssets: ['icons/favicon.svg', 'icons/apple-touch-icon.png'],
      manifest: {
        id: base,
        name: 'Intervall-Trainer',
        short_name: 'Intervalle',
        description: 'Intervalle lernen mit Merkliedern – funktioniert offline.',
        lang: 'de',
        dir: 'ltr',
        start_url: base,
        scope: base,
        display: 'standalone',
        orientation: 'any',
        background_color: '#f4efe6',
        theme_color: '#2a2623',
        categories: ['education', 'music'],
        icons: [
          { src: 'icons/icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'icons/icon-512.png', sizes: '512x512', type: 'image/png' },
          { src: 'icons/icon-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{html,js,css,svg,png,webmanifest}'],
        navigateFallback: 'index.html',
        cleanupOutdatedCaches: true,
        // neue Version sofort aktivieren und die offene Seite gleich übernehmen
        skipWaiting: true,
        clientsClaim: true,
        // keine Laufzeit-Regeln für fremde Server: die App lädt nie etwas aus dem Netz
        runtimeCaching: [],
      },
      devOptions: {
        enabled: false,
      },
    }),
  ],
});
