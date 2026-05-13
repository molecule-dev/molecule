import { readdirSync } from 'node:fs'
import process from 'node:process'

import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import type { UserConfig } from 'vite'
import { VitePWA } from 'vite-plugin-pwa'

/** Branding strings used in the PWA manifest. */
export interface DefaultViteConfigBranding {
  APP_NAME: string
  APP_DESCRIPTION: string
  BRAND_COLOR: string
}

/**
 * Returns the canonical Vite config used by every fleet app — react +
 * tailwind + VitePWA plugins, molecule-package pre-bundle exclusion,
 * dev server proxy for `/api` + `/health`, and the standard env
 * conventions.
 *
 * Replaces the 105-line per-app `vite.config.ts` shipped by 110 fleet
 * apps. Per-app vite.config.ts shrinks to:
 *
 * ```ts
 * import { defineConfig } from 'vite'
 * import { createDefaultViteConfig } from '@molecule/app-vite-config-default'
 * import { APP_DESCRIPTION, APP_NAME, BRAND_COLOR } from './src/branding.js'
 *
 * export default defineConfig(createDefaultViteConfig({ APP_NAME, APP_DESCRIPTION, BRAND_COLOR }))
 * ```
 */
export function createDefaultViteConfig(branding: DefaultViteConfigBranding): UserConfig {
  let moleculePackages: string[] = []
  try {
    moleculePackages = readdirSync('node_modules/@molecule').map((name) => `@molecule/${name}`)
  } catch {
    // node_modules not yet available (e.g. during build tooling check)
  }

  const pwaOptions = {
    registerType: 'prompt' as const,
    includeAssets: ['icons/*.svg', 'favicon.svg', 'og-image.svg'],
    manifest: {
      name: branding.APP_NAME,
      short_name: branding.APP_NAME,
      description: branding.APP_DESCRIPTION,
      theme_color: branding.BRAND_COLOR,
      background_color: '#ffffff',
      display: 'standalone' as const,
      start_url: '/',
      icons: [
        { src: '/icons/icon-192.svg', sizes: '192x192', type: 'image/svg+xml' },
        { src: '/icons/icon-512.svg', sizes: '512x512', type: 'image/svg+xml' },
        {
          src: '/icons/icon-512.svg',
          sizes: '512x512',
          type: 'image/svg+xml',
          purpose: 'maskable' as const,
        },
      ],
    },
    workbox: {
      globPatterns: ['**/*.{js,css,html,ico,png,svg,woff,woff2}'],
      runtimeCaching: [
        {
          urlPattern: /^https:\/\/.*\/api\/.*/i,
          handler: 'NetworkFirst' as const,
          options: { cacheName: 'api-cache', expiration: { maxEntries: 50, maxAgeSeconds: 300 } },
        },
      ],
    },
  }

  return {
    plugins: [react(), tailwindcss(), VitePWA(pwaOptions)],
    resolve: {
      preserveSymlinks: true,
      dedupe: ['react', 'react-dom', 'react-router-dom', 'react-router'],
    },
    optimizeDeps: {
      exclude: moleculePackages,
      // CJS-only transitive deps that ESM importers (i18next, etc.) pull
      // in. Vite's auto-discovery sometimes misses these inside excluded
      // workspace packages, surfacing as "does not provide an export
      // named 'default'" runtime errors. Force-include them so vite
      // pre-bundles with proper CJS→ESM interop.
      include: [
        'void-elements',
        'html-parse-stringify',
        'use-sync-external-store',
        'use-sync-external-store/shim',
        'use-sync-external-store/shim/with-selector',
      ],
    },
    server: {
      port: parseInt(process.env.VITE_PORT || '3000'),
      host: process.env.VITE_HOST || '0.0.0.0',
      allowedHosts: true,
      open: process.env.VITE_OPEN !== 'false' && process.env.BROWSER !== 'none',
      fs: { strict: false },
      proxy: {
        '/api': {
          target:
            process.env.VITE_API_URL?.replace(/\/api$/, '') ||
            `http://localhost:${process.env.PORT || 4000}`,
          changeOrigin: true,
        },
        '/health': {
          target:
            process.env.VITE_API_URL?.replace(/\/api$/, '') ||
            `http://localhost:${process.env.PORT || 4000}`,
          changeOrigin: true,
        },
      },
      warmup: {
        clientFiles: ['src/main.tsx', 'src/App.tsx', 'src/bonds/*.ts'],
      },
    },
    build: {
      outDir: 'dist',
      sourcemap: true,
    },
    envPrefix: 'VITE_',
  }
}
