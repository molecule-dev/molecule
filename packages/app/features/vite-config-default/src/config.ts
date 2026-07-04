import { readdirSync, readFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import process from 'node:process'
import { fileURLToPath } from 'node:url'

import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import type { UserConfig } from 'vite'
import { VitePWA } from 'vite-plugin-pwa'

import { moleculePushServiceWorkerPlugin, PUSH_SW_FILENAME } from './push-sw.js'

/** Branding strings used in the PWA manifest. */
export interface DefaultViteConfigBranding {
  APP_NAME: string
  APP_DESCRIPTION: string
  BRAND_COLOR: string
}

/**
 * Returns the canonical Vite config used by every fleet app — react +
 * tailwind + VitePWA plugins, molecule-package pre-bundle exclusion,
 * dev server proxy for `/api` + `/health` + `/socket.io` (ws), and the
 * standard env conventions.
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
  // Discover the @molecule/* packages to exclude from Vite's dep
  // pre-bundling — bond state uses module-level singletons, and
  // pre-bundling would create duplicate instances that break the bond
  // system. npm workspaces hoist @molecule/* to the workspace-root
  // node_modules, so `node_modules/@molecule` doesn't exist next to the
  // consuming app's config — walk up from this file until one is found.
  // Works for both the hoisted workspace layout and a standalone
  // scaffolded app.
  let moleculePackages: string[] = []
  const findMoleculeDir = (): string | null => {
    let dir = dirname(fileURLToPath(import.meta.url))
    for (let i = 0; i < 8; i++) {
      try {
        const candidate = resolve(dir, 'node_modules/@molecule')
        readdirSync(candidate)
        return candidate
      } catch (_error) {
        /* keep walking — readdirSync throws when the candidate path does not exist, which is expected on every parent dir until @molecule is found */
      }
      const parent = dirname(dir)
      if (parent === dir) break
      dir = parent
    }
    return null
  }
  const moleculeDir = findMoleculeDir()

  // EXCEPTION to the exclusion: locale bond packages ARE pre-bundled. They
  // are pure data (translation dictionaries — no bond singletons, so the
  // duplicate-instance concern does not apply), and each one eagerly
  // re-exports ~81 language modules. Served unbundled, a dev-mode first load
  // fans out into thousands of individual module requests (~2,400 for a
  // typical fleet app) — slow everywhere, and inside the molecule.dev
  // preview iframe (which loads alongside the IDE's own module traffic) it
  // can exhaust the browser's request budget
  // (net::ERR_INSUFFICIENT_RESOURCES), permanently failing the app's ES
  // module graph. Pre-bundling collapses each locale package to one chunk.
  // Only the consuming app's DECLARED locale dependencies are included so
  // Vite never optimizes packages the app doesn't use.
  const isLocaleBondPackage = (name: string): boolean => name.startsWith('@molecule/app-locales-')
  let localePackages: string[] = []
  try {
    const appPkg = JSON.parse(readFileSync(resolve(process.cwd(), 'package.json'), 'utf8')) as {
      dependencies?: Record<string, string>
    }
    localePackages = Object.keys(appPkg.dependencies ?? {}).filter(isLocaleBondPackage)
  } catch (_error) {
    /* no readable package.json in cwd — keep every @molecule package excluded */
  }

  // Collect per-package `molecule.viteOptimizeInclude` declarations from
  // every installed @molecule/* package.json. Each package that depends
  // on a CJS-shim library (one whose dist uses `module.exports.default =
  // X`) declares it here so Vite pre-bundles it for downstream apps and
  // the "does not provide an export named 'default'" runtime crash
  // can't recur. Example:
  //   { "molecule": { "viteOptimizeInclude": ["quill", "quill-delta"] } }
  const declaredOptimizeIncludes = new Set<string>()
  if (moleculeDir) {
    const entries = readdirSync(moleculeDir)
    moleculePackages = entries.map((name) => `@molecule/${name}`)
    for (const entry of entries) {
      try {
        const pkgPath = resolve(moleculeDir, entry, 'package.json')
        const pkg = JSON.parse(readFileSync(pkgPath, 'utf8')) as {
          molecule?: { viteOptimizeInclude?: string[] }
        }
        for (const dep of pkg.molecule?.viteOptimizeInclude ?? []) {
          declaredOptimizeIncludes.add(dep)
        }
      } catch (_error) {
        /* missing/invalid package.json — skip; not all @molecule dirs have a parseable package.json */
      }
    }
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
      // vite-plugin-pwa defaults this to 2 MiB; apps that bundle heavy
      // deps (e.g. a Monaco-based code editor) ship a >2 MiB entry chunk
      // and fail the build outright. 5 MiB gives the fleet headroom.
      maximumFileSizeToCacheInBytes: 10 * 1024 * 1024,
      // Pull the shared push handler (emitted by
      // moleculePushServiceWorkerPlugin) into the generated worker —
      // generateSW ships no 'push' listener of its own, so without this a
      // delivered web-push displays nothing.
      importScripts: [PUSH_SW_FILENAME],
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
    plugins: [react(), tailwindcss(), VitePWA(pwaOptions), moleculePushServiceWorkerPlugin()],
    // Vite's default cacheDir (node_modules/.vite) resolves THROUGH a
    // workspace-symlinked node_modules to a cache shared by every app on the
    // machine — concurrent dev servers with different optimizeDeps configs
    // thrash/corrupt it. VITE_CACHE_DIR gives each app/test run its own.
    ...(process.env.VITE_CACHE_DIR ? { cacheDir: process.env.VITE_CACHE_DIR } : {}),
    resolve: {
      preserveSymlinks: true,
      dedupe: ['react', 'react-dom', 'react-router-dom', 'react-router'],
    },
    optimizeDeps: {
      // Locale bond packages are pre-bundled (see above) — exclude wins over
      // include in Vite, so they are filtered OUT of the exclusion list.
      exclude: moleculePackages.filter((name) => !isLocaleBondPackage(name)),
      // CJS-only transitive deps that ESM importers (i18next, etc.) pull
      // in. Vite's auto-discovery sometimes misses these inside excluded
      // workspace packages, surfacing as "does not provide an export
      // named 'default'" runtime errors. Force-include them so vite
      // pre-bundles with proper CJS→ESM interop.
      include: [
        // The app's declared pure-data locale bond packages (see above).
        ...localePackages,
        // react / react-dom are CJS proxy modules (`module.exports =
        // require('./cjs/...')`); vite 8's optimizer needs them listed
        // explicitly to expose named exports like `createRoot` to the
        // excluded (@molecule/*) packages that import them.
        'react',
        'react-dom',
        'react-dom/client',
        'react/jsx-runtime',
        'react/jsx-dev-runtime',
        'void-elements',
        'html-parse-stringify',
        'use-sync-external-store',
        'use-sync-external-store/shim',
        'use-sync-external-store/shim/with-selector',
        // Per-package CJS deps that each @molecule/* package declares
        // via its own `molecule.viteOptimizeInclude` field. Aggregated
        // above. New offenders should be declared on the OWNING package
        // (the one that depends on the CJS library) so the fix lands in
        // the same commit as the dep — not added to this hardcoded list.
        ...declaredOptimizeIncludes,
      ],
    },
    server: {
      port: parseInt(process.env.VITE_PORT || '3000'),
      host: process.env.VITE_HOST || '0.0.0.0',
      allowedHosts: true,
      open: process.env.VITE_OPEN !== 'false' && process.env.BROWSER !== 'none',
      // Origin-isolate this app so a buggy/looping build can't freeze the IDE that
      // previews it. The IDE and this dev server are the same site (localhost/
      // 127.0.0.1), which by default puts them in the same browser renderer
      // process — `Origin-Agent-Cluster: ?1` gives this origin its own agent
      // cluster (separate event loop), isolating the app's main thread from the
      // IDE's. Harmless when the app runs standalone.
      headers: { 'Origin-Agent-Cluster': '?1' },
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
        // Realtime shares the API port at /socket.io — the API attaches its
        // socket.io server to the same HTTP server (see
        // @molecule/api-realtime-socketio deferAttach). ws: true proxies the
        // websocket upgrade.
        '/socket.io': {
          target:
            process.env.VITE_API_URL?.replace(/\/api$/, '') ||
            `http://localhost:${process.env.PORT || 4000}`,
          changeOrigin: true,
          ws: true,
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
