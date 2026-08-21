/// <reference types="vitest/config" />
import { defineConfig } from 'vite';
import { svelte } from '@sveltejs/vite-plugin-svelte';
import { VitePWA } from 'vite-plugin-pwa';

// GitHub Pages serves the app from /<repo>/, so assets need that prefix.
// Dev and preview serve from the root.
const base = process.env.BASE_PATH ?? '/';

export default defineConfig({
  base,
  plugins: [
    svelte(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.png', 'apple-touch-icon.png'],
      manifest: {
        // The container's identity, not any one application's. Renaming this
        // changes what an existing installation shows in the dock, which is
        // accepted deliberately (see the change's design.md, D1).
        name: 'Tech Lead Hub',
        short_name: 'Tech Lead Hub',
        description:
          'Las aplicaciones del día a día de un tech lead: roadmaps, decisiones y lo que venga. Offline-first.',
        lang: 'es',
        // Left at the base path on purpose. A bare URL carries no hash, which
        // the router resolves to the hub landing — so the installed app opens
        // where the spec says it must, without altering the `start_url` some
        // browsers use to decide whether this is the same installation.
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
  ],
  clearScreen: false,
  // Fixed port so the dev URL stays stable across restarts.
  server: {
    port: 1420,
    strictPort: true,
  },
  test: {
    environment: 'node',
    include: ['src/**/*.{test,spec}.ts'],
  },
});
