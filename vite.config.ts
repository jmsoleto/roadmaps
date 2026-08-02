/// <reference types="vitest/config" />
import { defineConfig } from 'vite';
import { svelte } from '@sveltejs/vite-plugin-svelte';
import { VitePWA } from 'vite-plugin-pwa';

// Tauri exports TAURI_ENV_* to its beforeBuildCommand, so the desktop build
// identifies itself without any extra flag. The service worker is web-only:
// inside the Tauri shell the assets are already local and persistence goes
// through SQLite, so a cache layer there would only add staleness.
const isTauriBuild = Boolean(process.env.TAURI_ENV_PLATFORM);

// GitHub Pages serves the app from /<repo>/, so assets need that prefix.
// Dev, preview and Tauri all serve from the root.
const base = process.env.BASE_PATH ?? '/';

// Fixed port so the future Tauri shell can point at a stable dev URL.
export default defineConfig({
  base,
  plugins: [
    svelte(),
    ...(isTauriBuild
      ? []
      : [
          VitePWA({
            registerType: 'autoUpdate',
            includeAssets: ['favicon.png', 'apple-touch-icon.png'],
            manifest: {
              name: 'Roadmaps',
              short_name: 'Roadmaps',
              description: 'Planificador de roadmaps tipo Gantt, offline-first.',
              lang: 'es',
              start_url: base,
              scope: base,
              display: 'standalone',
              // The dark preset's `bg` (see theme/presets.ts). The manifest is
              // static, so this is the install-time color; once running, the app
              // keeps `<meta name="theme-color">` in step with the active theme.
              background_color: '#0b0d10',
              theme_color: '#0b0d10',
              icons: [
                { src: 'pwa-192x192.png', sizes: '192x192', type: 'image/png' },
                { src: 'pwa-512x512.png', sizes: '512x512', type: 'image/png' },
                {
                  src: 'pwa-512x512.png',
                  sizes: '512x512',
                  type: 'image/png',
                  purpose: 'maskable',
                },
              ],
            },
          }),
        ]),
  ],
  clearScreen: false,
  server: {
    port: 1420,
    strictPort: true,
  },
  test: {
    environment: 'node',
    include: ['src/**/*.{test,spec}.ts'],
  },
});
