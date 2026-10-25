/// <reference types="vitest/config" />
import { existsSync, readdirSync, readFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import { dirname, resolve } from 'node:path'
import process from 'node:process'
import { fileURLToPath } from 'node:url'

import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import type { UserConfig } from 'vite'
import { VitePWA } from 'vite-plugin-pwa'

import { releaseNotesPlugin } from '@molecule/app-version/build'

import { moleculePushServiceWorkerPlugin, PUSH_SW_FILENAME } from './push-sw.js'

/** Branding strings used in the PWA manifest. */
export interface DefaultViteConfigBranding {
  APP_NAME: string
  APP_DESCRIPTION: string
  BRAND_COLOR: string
}

/**
 * `react` and `react-dom` pinned to the one copy this app resolves. An install
 * inside the app gives it its own React beside the workspace's, the
 * `@molecule/*` packages still resolve the workspace's, and the preview went
 * blank with "Invalid hook call" until an alias like this one was written by
 * hand. `dedupe` alone did not prevent it.
 *
 * @param appRoot - The app directory (where its package.json is).
 * @returns Alias entries for the copies that resolve; none when React is absent.
 */
export function singleReactAliases(appRoot: string): Record<string, string> {
  const req = createRequire(resolve(appRoot, 'package.json'))
  const aliases: Record<string, string> = {}
  for (const name of ['react', 'react-dom']) {
    try {
      aliases[name] = dirname(req.resolve(`${name}/package.json`))
    } catch (_error) {
      // Not installed for this app: nothing to pin.
    }
  }
  return aliases
}

/**
 * Whether the package a specifier names is installed for this app. An
 * `optimizeDeps.include` entry that is not installed makes Vite log "Failed to
 * resolve dependency" and re-scan on every discovery, which can drop the dev
 * server mid-reoptimize. Checked by directory, not `require.resolve`, so an
 * ESM-only package or a subpath export still counts.
 *
 * @param spec - A bare specifier, e.g. `react/jsx-runtime` or `@scope/pkg/sub`.
 * @param appRoot - The app directory to search upward from.
 * @returns `true` when `node_modules/<package>` exists at or above `appRoot`.
 */
export function isInstalled(spec: string, appRoot: string): boolean {
  const parts = spec.split('/')
  const name = spec.startsWith('@') ? parts.slice(0, 2).join('/') : parts[0]
  let dir = resolve(appRoot)
  for (;;) {
    if (existsSync(resolve(dir, 'node_modules', name, 'package.json'))) return true
    const parent = dirname(dir)
    if (parent === dir) return false
    dir = parent
  }
}

/**
 * Returns the canonical Vite config used by every fleet app — react +
 * tailwind + VitePWA plugins, molecule-package pre-bundle exclusion,
 * dev server proxy for `/api` + `/health` + `/socket.io` (ws), and the
 * standard env conventions.
 *
 * Replaces the per-app copy of this config that every flagship app used to
 * ship. A per-app vite.config.ts shrinks to:
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
      } catch (error) {
        // A skipped package.json silently drops whatever CJS deps it declared,
        // and the consequence is a WHITE SCREEN: the library gets served raw, the
        // bond's `import { X } from 'lib'` throws "does not provide an export
        // named X", setupProviders() never returns, and React never renders. Every
        // test then fails with no network traffic and nothing anywhere pointing at
        // the cause — that is exactly how meditation-app and music-daw lost their
        // entire suites (0/68 and 160/176) to a missing `howler` entry.
        //
        // Not every @molecule dir has a parseable package.json (.bin, partial
        // installs), so this stays non-fatal — but it must not be silent. A
        // concurrent install relinking node_modules/@molecule is enough to hit it.
        console.warn(
          `[vite-config-default] could not read @molecule/${entry}/package.json — any ` +
            `molecule.viteOptimizeInclude it declares will be MISSING from optimizeDeps.`,
          error,
        )
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
      // In `prompt` mode the new worker activates when the update banner posts
      // SKIP_WAITING; without clientsClaim it never takes control of the open
      // page, so `controllerchange` never fires and the reload never happens —
      // the banner sticks on "Updating…". Claim clients so activation drives the
      // one reload in registerPWA.
      clientsClaim: true,
      // vite-plugin-pwa defaults this to 2 MiB; apps that bundle heavy
      // deps (e.g. a Monaco-based code editor) ship a >2 MiB entry chunk
      // and fail the build outright. 5 MiB gives the fleet headroom.
      maximumFileSizeToCacheInBytes: 10 * 1024 * 1024,
      // Pull the shared push handler (emitted by
      // moleculePushServiceWorkerPlugin) into the generated worker —
      // generateSW ships no 'push' listener of its own, so without this a
      // delivered web-push displays nothing.
      importScripts: [PUSH_SW_FILENAME],
      // Precache the SHELL only: the HTML, the entry JS/CSS and the icons.
      // Everything the router splits out (page and locale chunks) and the
      // font files are fetched on demand and served from the HTTP cache;
      // precaching them made a fresh install download the whole app (249
      // entries, 2.2 MB, plus ~5 MB of fonts) before the worker could even
      // take control.
      globPatterns: ['**/*.{html,ico,png,svg}', 'assets/index-*.js', 'assets/index-*.css'],
      // No runtime API caching. The old rule matched every /api/ request with
      // NetworkFirst, which tried to cache SSE/streaming GETs (EventSource,
      // text/event-stream) and threw "Cache.put() encountered a network error",
      // and parked authenticated API responses in shared cache. Let /api/ pass
      // straight through to the network.
      runtimeCaching: [],
    },
  }

  // ── Dev-server host exposure: molecule sandbox vs standalone machine ──
  //
  // Inside a molecule preview container the dev server MUST be reachable
  // from outside the container (the IDE preview iframe runs on the host)
  // under whatever Host header the platform's proxy presents (IP literals,
  // internal hostnames), and it serves modules through workspace symlinks
  // that resolve outside the project root — so sandbox mode keeps
  // `host: '0.0.0.0'`, `allowedHosts: true`, and `fs.strict: false`.
  //
  // On a developer's machine those same three settings are the classic
  // LAN-exposure + DNS-rebinding + `/@fs/` arbitrary-file-read triad: any
  // peer on the network can reach the server, a rebinding domain passes the
  // Host check, and `/@fs/..` escapes the project. Standalone mode
  // therefore binds `localhost`, keeps Vite's Host allowlist (localhost
  // variants plus an env-overridable extension list), and leaves
  // `fs.strict` at Vite's protective default.
  //
  // Detection: the platform marker directory `/etc/mol` exists in every
  // molecule sandbox, and an explicit `VITE_HOST` is the operator saying
  // "bind this" — either selects sandbox behavior.
  const inMoleculeSandbox = existsSync('/etc/mol') || process.env.VITE_HOST !== undefined

  // ── Watcher hardening (sandbox only) ──
  //
  // chokidar's inotify watch is pinned to the INODE of each directory it walks. Replace a
  // directory inside the served tree (`rm -rf src` + recreate — a restore, a checkout, a
  // tool that rewrites a tree, and in a molecule sandbox the platform's own operations) and
  // that watch points at a dead inode: writes, touches and brand-new files then produce NO
  // event, chokidar reports NO error, and it never re-arms. The dev server keeps serving the
  // modules it transformed before the swap while the files on disk are current, and nothing
  // in its log says so (reproduced against vite 8.1.5 on 2026-10-16: with the app's own
  // `src/` replaced under a live server, the next edit was served as the PRE-edit module
  // forever). An executor whose edits silently stop hot-reloading then debugs its own code:
  // X1 flash-m79 lost 3.5 minutes and a 1.6-minute Playwright run to it, flash-m38 the same
  // class. A stat-based polling watcher has no inode to lose, so in a sandbox it is the
  // correct trade — the tree walked is the app's own source (`node_modules`, `.git`, `dist`
  // and `test-results` stay excluded), a few hundred stats per interval. A developer's
  // machine keeps the inotify watcher; `VITE_WATCH_POLLING=0|1` overrides either way.
  const watchPolling =
    process.env.VITE_WATCH_POLLING === undefined
      ? inMoleculeSandbox
      : process.env.VITE_WATCH_POLLING !== '0' && process.env.VITE_WATCH_POLLING !== 'false'

  // Extra Host values allowed in standalone mode, comma-separated via
  // VITE_ALLOWED_HOSTS (e.g. 'myapp.test,dev.lan'). `*` disables Host
  // checking entirely — same trust level as sandbox mode, opt-in only.
  const extraAllowedHosts = (process.env.VITE_ALLOWED_HOSTS ?? '')
    .split(',')
    .map((host) => host.trim())
    .filter((host) => host.length > 0)

  const serverHost = process.env.VITE_HOST || (inMoleculeSandbox ? '0.0.0.0' : 'localhost')
  const serverAllowedHosts: string[] | true =
    inMoleculeSandbox || extraAllowedHosts.includes('*')
      ? true
      : ['localhost', '.localhost', ...extraAllowedHosts]

  // The API routes the dev server and `vite preview` both proxy.
  const apiProxy = {
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
  }

  return {
    plugins: [
      react(),
      tailwindcss(),
      VitePWA(pwaOptions),
      moleculePushServiceWorkerPlugin(),
      // release-notes.json + the build-time stamp behind the update banner's
      // one-line summary of what a waiting update brings.
      releaseNotesPlugin(),
    ],
    // Vite's default cacheDir (node_modules/.vite) resolves THROUGH a
    // workspace-symlinked node_modules to a cache shared by every app on the
    // machine — concurrent dev servers with different optimizeDeps configs
    // thrash/corrupt it. VITE_CACHE_DIR gives each app/test run its own.
    ...(process.env.VITE_CACHE_DIR ? { cacheDir: process.env.VITE_CACHE_DIR } : {}),
    resolve: {
      preserveSymlinks: true,
      dedupe: ['react', 'react-dom', 'react-router', 'react-router-dom'],
      alias: singleReactAliases(process.cwd()),
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
      ].filter((spec) => localePackages.includes(spec) || isInstalled(spec, process.cwd())),
    },
    // `vite preview` serves the production bundle (dist/) with the same API routes as the
    // dev server, so a production-only bug can be tested before a deploy (X1 flash-m42 found
    // one only on the deployed URL: "vite preview has no API proxy").
    preview: {
      port: parseInt(process.env.VITE_PREVIEW_PORT || '4173'),
      host: serverHost,
      allowedHosts: serverAllowedHosts,
      proxy: apiProxy,
    },
    server: {
      port: parseInt(process.env.VITE_PORT || '3000'),
      host: serverHost,
      allowedHosts: serverAllowedHosts,
      open: process.env.VITE_OPEN !== 'false' && process.env.BROWSER !== 'none',
      // Origin-isolate this app so a buggy/looping build can't freeze the IDE that
      // previews it. The IDE and this dev server are the same site (localhost/
      // 127.0.0.1), which by default puts them in the same browser renderer
      // process — `Origin-Agent-Cluster: ?1` gives this origin its own agent
      // cluster (separate event loop), isolating the app's main thread from the
      // IDE's. Harmless when the app runs standalone.
      headers: { 'Origin-Agent-Cluster': '?1' },
      // Sandbox-only: `fs.strict: false` lets the dev server serve modules
      // through workspace symlinks that resolve outside the project root.
      // Standalone keeps Vite's default (strict), which confines /@fs/ to
      // the project root + workspace — see the host-exposure block above.
      ...(inMoleculeSandbox ? { fs: { strict: false } } : {}),
      // Sandbox-only, for the same reason: a replaced directory cannot kill a
      // stat-based watcher (see the watcher-hardening block above).
      ...(watchPolling ? { watch: { usePolling: true, interval: 500, binaryInterval: 1000 } } : {}),
      proxy: apiProxy,
      warmup: {
        clientFiles: ['src/main.tsx', 'src/App.tsx', 'src/bonds/*.ts'],
      },
    },
    build: {
      outDir: 'dist',
      sourcemap: true,
    },
    envPrefix: 'VITE_',
    test: {
      // Playwright owns `e2e/` (every scaffold's playwright.config.ts sets
      // testDir './e2e'), and its *.spec.ts files match vitest's default
      // include — so without this, `npm test` (vitest run) collects them and
      // each fails with "Playwright Test did not expect test.describe() to be
      // called here". `exclude` REPLACES vitest's defaults, so those are
      // re-listed here rather than lost.
      exclude: ['**/node_modules/**', '**/.git/**', '**/dist/**', '**/e2e/**'],
    },
  }
}
