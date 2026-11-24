/// <reference types="vitest/config" />
import { existsSync, readdirSync, readFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import { dirname, resolve } from 'node:path'
import process from 'node:process'

import {
  normalizePath,
  type Plugin,
  type PluginOption,
  type UserConfig,
  version as viteVersion,
} from 'vite'
import type { VitePluginPWAAPI, VitePWAOptions } from 'vite-plugin-pwa'

import { releaseNotesPlugin } from '@molecule/app-version/build'

import { moleculeDistWithoutSourcemap } from './molecule-dist-sourcemap.js'
import { vitePwa } from './optional-pwa.js'
import { moleculePushServiceWorkerPlugin, PUSH_SW_FILENAME } from './push-sw.js'
import { rootRelativeAssetsPlugin } from './root-relative-assets.js'
import {
  svelteKitPrecache,
  svelteKitPwaPlugins,
  svelteKitStaticSite,
  type SvelteKitStaticSiteOptions,
} from './sveltekit.js'

/** Branding strings used in the PWA manifest. */
export interface DefaultViteConfigBranding {
  APP_NAME: string
  APP_DESCRIPTION: string
  BRAND_COLOR: string
}

/**
 * What a SvelteKit app adds: kit writes its own pages, so the preview-only parts are
 * removed from the finished site rather than from Vite's HTML.
 */
export type FrameworkViteConfigSvelteKit = Pick<
  SvelteKitStaticSiteOptions,
  'transformPage' | 'finishSite'
>

/** Options of {@link createFrameworkViteConfig}. */
export interface FrameworkViteConfigOptions {
  /**
   * The UI framework's Vite plugin and, when the app's styling needs one, its build
   * plugin: `[vue(), tailwindcss()]`, `[sveltekit({ … })]`, `[solid(), tailwindcss()]`.
   */
  plugins: PluginOption[]
  /** Set for a SvelteKit app; its hooks run on the site the adapter writes. */
  svelteKit?: FrameworkViteConfigSvelteKit
  /**
   * Files the dev server transforms before the first request. Defaults to a React
   * app's entry, root component and bonds.
   */
  warmup?: string[]
}

/** One entry of the service worker's precache manifest. */
type PrecacheEntry = Parameters<
  NonNullable<NonNullable<VitePWAOptions['workbox']>['manifestTransforms']>[number]
>[0][number]

/** The dev server's default warmup: a React app's entry, root component and bonds. */
const REACT_WARMUP = ['src/main.tsx', 'src/App.tsx', 'src/bonds/*.ts']

/**
 * The framework packages that hold state per module copy: two copies in one app split React's
 * hook dispatcher and contexts, Vue's current instance and injections, Svelte's and Solid's
 * reactive owners, and Angular's injector. Each is resolved from the app's root (`resolve.dedupe`),
 * whichever install path an importer reaches it through. Listing one the app does not install
 * changes nothing.
 */
const FRAMEWORK_RUNTIME_PACKAGES = [
  'react',
  'react-dom',
  'react-router',
  'react-router-dom',
  'vue',
  'vue-router',
  'svelte',
  'solid-js',
  '@solidjs/router',
  '@angular/core',
  '@angular/common',
  '@angular/router',
  '@angular/platform-browser',
  'rxjs',
]

const PWA_REGISTRATION = "import { registerPWA } from '@molecule/app-pwa-default'; registerPWA()"

/**
 * Schedule the app's registrar from the built HTML, independently of the app
 * entry. Existing config consumers without the optional registrar keep their
 * existing worker and can provide their own registration. SvelteKit never calls
 * `transformIndexHtml` (and warns about every plugin that has one), so a kit app
 * gets the registrar appended to kit's client entry instead.
 *
 * @param svelteKit - Whether the app is a SvelteKit app.
 * @param onPwa - Receives the vite-plugin-pwa API once the config is resolved.
 * @returns Build-only plugin for the main document.
 */
function pwaRegistrationPlugin(
  svelteKit: boolean,
  onPwa: (pwa: VitePluginPWAAPI | undefined) => void,
): Plugin {
  let pwa: VitePluginPWAAPI | undefined
  return {
    name: 'molecule:pwa-registration',
    apply: 'build',
    configResolved(config) {
      if (isInstalled('@molecule/app-pwa-default', config.root)) {
        pwa = config.plugins.find((plugin) => plugin.name === 'vite-plugin-pwa')?.api
      }
      onPwa(pwa)
    },
    ...(svelteKit
      ? {
          transform(code, id) {
            if (pwa?.disabled !== false || this.environment.config.consumer !== 'client') return
            // Kit's client bootstrap input for this build, which exists even without
            // user client hooks.
            const { input } = this.environment.config.build.rollupOptions
            const entry =
              typeof input === 'string'
                ? input
                : Array.isArray(input)
                  ? undefined
                  : (input?.['entry/start'] ?? input?.bundle)
            if (entry && id === normalizePath(entry)) {
              return { code: `${code}\n${PWA_REGISTRATION}\n`, map: null }
            }
          },
        }
      : {
          transformIndexHtml: {
            // Run before Vite processes the HTML imports so the registrar is bundled
            // in the precached page entry, even when the app replaces its own entry.
            order: 'pre' as const,
            handler() {
              if (pwa?.disabled !== false) return
              return [{ tag: 'script', attrs: { type: 'module' }, children: PWA_REGISTRATION }]
            },
          },
        }),
  }
}

/**
 * Records the client files a first page load runs: the scripts and stylesheets the built
 * HTML references, each chunk those import statically (followed through), and the CSS the
 * chunks import. Read from the bundle because Rolldown names shared and runtime chunks
 * freely (`app-*.js`, `rolldown-runtime-*.js`): a precache that matched
 * `assets/index-*.js` by name left them out, and offline the entry's import of them
 * failed and the page stayed blank.
 *
 * @param shell - Filled with the files, relative to the build output.
 * @returns Build-only plugin.
 */
function pageLoadFilesPlugin(shell: Set<string>): Plugin {
  return {
    name: 'molecule:precache-page-load',
    apply: 'build',
    generateBundle: {
      // After Vite writes the HTML into the bundle.
      order: 'post',
      handler(_options, bundle) {
        if (this.environment && this.environment.config.consumer !== 'client') return
        shell.clear()
        const visit = (fileName: string): void => {
          if (shell.has(fileName)) return
          const output = bundle[fileName]
          if (!output) return
          shell.add(fileName)
          if (output.type !== 'chunk') return
          for (const css of output.viteMetadata?.importedCss ?? []) shell.add(css)
          for (const imported of output.imports) visit(imported)
        }
        for (const output of Object.values(bundle)) {
          if (output.type === 'chunk' && output.isEntry) visit(output.fileName)
          if (output.type === 'asset' && output.fileName.endsWith('.html')) {
            const html = String(output.source)
            for (const match of html.matchAll(/\s(?:src|href)="\/?([^"?#]+\.(?:js|css))"/g)) {
              visit(match[1])
            }
          }
        }
      },
    },
  }
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
 * Whether a value is a list of strings.
 *
 * @param value - The value to check.
 * @returns True for an array whose every item is a string.
 */
const isStringList = (value: unknown): value is string[] =>
  Array.isArray(value) && value.every((item) => typeof item === 'string')

/**
 * The vitest setup files the app's declared `@molecule/*` packages name in their package.json
 * (`"molecule": { "vitestSetupFiles": ["@molecule/app-vue/testing/setup"] }`), in the order the
 * app declares them. Each manifest is read where Node resolves the package from the app (the
 * nearest `node_modules/<name>` on the way up), and only the app's own dependencies count: a
 * workspace installs every framework's binding beside a React app.
 *
 * @param appRoot - The app's directory.
 * @param packages - The `@molecule/*` names the app's package.json declares.
 * @returns The setup files, each once.
 * @throws {Error} When a package's `molecule.vitestSetupFiles` is not a list of module specifiers,
 *   or its package.json does not parse.
 */
function declaredTestSetupFiles(appRoot: string, packages: string[]): string[] {
  const files: string[] = []
  for (const name of packages) {
    let dir = resolve(appRoot)
    for (let i = 0; i < 8; i++) {
      const manifest = resolve(dir, 'node_modules', name, 'package.json')
      if (existsSync(manifest)) {
        let declared: unknown
        try {
          declared = (
            JSON.parse(readFileSync(manifest, 'utf8')) as {
              molecule?: { vitestSetupFiles?: unknown }
            }
          ).molecule?.vitestSetupFiles
        } catch (error) {
          throw new Error(`[vite-config-default] could not read ${manifest}.`, { cause: error })
        }
        if (declared === undefined) break
        if (!isStringList(declared))
          throw new Error(
            `[vite-config-default] ${name}'s package.json molecule.vitestSetupFiles must be a list of module specifiers.`,
          )
        for (const file of declared) if (!files.includes(file)) files.push(file)
        break
      }
      const parent = dirname(dir)
      if (parent === dir) break
      dir = parent
    }
  }
  return files
}

/**
 * The Vite config every Molecule app uses, for any UI framework: the framework's
 * plugins plus the PWA, push worker, release notes and root-relative asset plugins,
 * molecule-package pre-bundle exclusion, one module identity per package, the dev
 * server and `vite preview` proxy for `/api`, `/health` and `/socket.io` (ws), and the
 * standard env conventions. A SvelteKit app passes `svelteKit`, and the PWA steps run on
 * the site kit's adapter writes.
 *
 * ```ts
 * import vue from '@vitejs/plugin-vue'
 * import { defineConfig } from 'vite'
 * import { createFrameworkViteConfig } from '@molecule/app-vite-config-default/framework'
 * import { APP_DESCRIPTION, APP_NAME, BRAND_COLOR } from './src/branding.js'
 *
 * export default defineConfig(
 *   createFrameworkViteConfig({ APP_NAME, APP_DESCRIPTION, BRAND_COLOR }, { plugins: [vue()] }),
 * )
 * ```
 *
 * @param branding - The PWA manifest's name, description and theme color.
 * @param options - The framework's plugins, SvelteKit hooks and the dev server warmup.
 * @returns The config; pass it to `defineConfig`, or `mergeConfig` it with the app's own.
 */
export function createFrameworkViteConfig(
  branding: DefaultViteConfigBranding,
  options: FrameworkViteConfigOptions,
): UserConfig {
  const appRoot = process.cwd()
  // Discover the @molecule/* packages to exclude from Vite's dep
  // pre-bundling — bond state uses module-level singletons, and
  // pre-bundling would create duplicate instances that break the bond
  // system. npm workspaces hoist @molecule/* to the workspace-root
  // node_modules, so `node_modules/@molecule` doesn't exist next to the
  // consuming app's config — walk up from the app, as the React aliases
  // and declared locale dependencies below do. This package may itself be
  // symlinked into a store whose dependency closure is not the app's install.
  let moleculePackages: string[] = []
  const findMoleculeDir = (): string | null => {
    let dir = resolve(appRoot)
    for (let i = 0; i < 8; i++) {
      try {
        const candidate = resolve(dir, 'node_modules/@molecule')
        // An EMPTY @molecule dir (left by npm-workspaces hoisting) must not stop
        // the walk: an empty exclusion list pre-bundles every @molecule package
        // the app imports, which gives each a second module identity (duplicate
        // bond registries and React contexts).
        if (readdirSync(candidate).length > 0) return candidate
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
  let declaredMoleculePackages: string[] = []
  try {
    const appPkg = JSON.parse(readFileSync(resolve(appRoot, 'package.json'), 'utf8')) as {
      dependencies?: Record<string, string>
      devDependencies?: Record<string, string>
    }
    localePackages = Object.keys(appPkg.dependencies ?? {}).filter(isLocaleBondPackage)
    declaredMoleculePackages = [
      ...Object.keys(appPkg.dependencies ?? {}),
      ...Object.keys(appPkg.devDependencies ?? {}),
    ].filter((name) => name.startsWith('@molecule/'))
  } catch (_error) {
    /* no readable package.json in cwd — keep every @molecule package excluded */
  }
  const testSetupFiles = declaredTestSetupFiles(appRoot, declaredMoleculePackages)

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

  const svelteKit = options.svelteKit
  const pageLoad = new Set<string>()
  // Workbox fetches each precache entry in order before the worker can serve the shell.
  // Apple launch artwork is linked in the HTML and loaded by the device as needed.
  const launchArtwork = 'icons/splash-+([0-9])x+([0-9]).svg'
  const pwaOptions = {
    registerType: 'prompt' as const,
    // The default package owns controller changes so the first claim leaves
    // the initial page and its in-flight navigation alone.
    injectRegister: false as const,
    includeAssets: ['icons/*.svg', `!${launchArtwork}`, 'favicon.svg', 'og-image.svg'],
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
      // Install the worker without a serial Workbox runtime fetch on a cold visit.
      inlineWorkboxRuntime: true,
      // vite-plugin-pwa defaults this to 2 MiB; apps that bundle heavy
      // deps (e.g. a Monaco-based code editor) ship a >2 MiB entry chunk
      // and fail the build outright. 5 MiB gives the fleet headroom.
      maximumFileSizeToCacheInBytes: 10 * 1024 * 1024,
      // Pull the shared push handler (emitted by
      // moleculePushServiceWorkerPlugin) into the generated worker —
      // generateSW ships no 'push' listener of its own, so without this a
      // delivered web-push displays nothing.
      importScripts: [PUSH_SW_FILENAME],
      // Precache the SHELL only: the HTML, the icons, and the scripts and styles a
      // first page load runs (`pageLoadFilesPlugin`). Everything the router splits
      // out (page and locale chunks) and the font files are fetched on demand and
      // served from the HTTP cache; precaching them made a fresh install download
      // the whole app (249 entries, 2.2 MB, plus ~5 MB of fonts) before the worker
      // could even take control.
      globPatterns: ['**/*.{html,ico,png,svg}', 'assets/**/*.{js,css}'],
      globIgnores: ['**/node_modules/**/*', launchArtwork],
      manifestTransforms: [
        (entries: PrecacheEntry[]) => ({
          manifest: entries.filter(
            (entry) => !/^assets\/.*\.(?:js|css)$/.test(entry.url) || pageLoad.has(entry.url),
          ),
          warnings: [],
        }),
      ],
      // OAuth and other server routes still go to the network on document loads.
      navigateFallbackDenylist: [/^\/(?:api|health|socket\.io)(?:\/|\?|$)/],
      // SvelteKit's hashed files live under _app/immutable/, and its shell is several
      // files rather than one entry: precache the ones a page load needs.
      ...(svelteKit ? svelteKitPrecache() : {}),
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
  const apiTarget =
    process.env.VITE_API_URL?.replace(/\/api$/, '') ||
    `http://localhost:${process.env.PORT || 4000}`
  const apiProxy = {
    '/api': { target: apiTarget, changeOrigin: true },
    '/health': { target: apiTarget, changeOrigin: true },
    // Realtime shares the API port at /socket.io — the API attaches its
    // socket.io server to the same HTTP server (see
    // @molecule/api-realtime-socketio deferAttach). ws: true proxies the
    // websocket upgrade.
    '/socket.io': { target: apiTarget, changeOrigin: true, ws: true },
  }

  // SvelteKit writes its pages itself and its adapter writes the site after every bundle
  // closes, so vite-plugin-pwa's HTML hooks and its service-worker step move to
  // `svelteKitStaticSite`, which runs on the site the adapter wrote: it applies the app's
  // page and site hooks, adds the manifest link, generates the worker, and makes `vite
  // preview` answer from the site as the deployed front does.
  // Without vite-plugin-pwa installed (an optional peer) the app has no web manifest or service
  // worker, and the registration and SvelteKit site steps see no PWA.
  let pwa: VitePluginPWAAPI | undefined
  const pwaPlugins = vitePwa
    ? svelteKit
      ? svelteKitPwaPlugins(vitePwa.VitePWA(pwaOptions))
      : vitePwa.VitePWA(pwaOptions)
    : []

  // Origin-isolate this app so a buggy/looping build can't freeze the IDE that
  // previews it. The IDE and this dev server are the same site (localhost/
  // 127.0.0.1), which by default puts them in the same browser renderer
  // process — `Origin-Agent-Cluster: ?1` gives this origin its own agent
  // cluster (separate event loop), isolating the app's main thread from the
  // IDE's. Set on both servers: a browser ignores an origin whose value is
  // inconsistent. Harmless when the app runs standalone.
  const isolation = { 'Origin-Agent-Cluster': '?1' }

  return {
    plugins: [
      ...options.plugins,
      pwaPlugins,
      pwaRegistrationPlugin(Boolean(svelteKit), (api) => (pwa = api)),
      // SvelteKit precaches its own shell (`svelteKitPrecache`).
      ...(svelteKit ? [] : [pageLoadFilesPlugin(pageLoad)]),
      moleculePushServiceWorkerPlugin(),
      // release-notes.json + the build-time stamp behind the update banner's
      // one-line summary of what a waiting update brings.
      releaseNotesPlugin(),
      rootRelativeAssetsPlugin(),
      // @molecule dist files without the maps that name src files a package does not ship.
      moleculeDistWithoutSourcemap(),
      ...(svelteKit
        ? [
            svelteKitStaticSite({
              ...svelteKit,
              pwa: () => pwa,
              previewPassThrough: Object.keys(apiProxy),
            }),
          ]
        : []),
    ],
    // Vite's default cacheDir (node_modules/.vite) resolves THROUGH a
    // workspace-symlinked node_modules to a cache shared by every app on the
    // machine — concurrent dev servers with different optimizeDeps configs
    // thrash/corrupt it. VITE_CACHE_DIR gives each app/test run its own.
    ...(process.env.VITE_CACHE_DIR ? { cacheDir: process.env.VITE_CACHE_DIR } : {}),
    resolve: {
      preserveSymlinks: true,
      // One module identity per @molecule package. `preserveSymlinks` keeps the
      // path each importer used, so the same install reached two ways — a
      // `node_modules/node_modules` self-link, a nested copy, a bind-mounted
      // workspace — becomes TWO module instances, and bond state is per module:
      // `setProvider()` in the app's copy is invisible to `getQueryClient()` in
      // the other ("No provider bonded" right after a setup that ran), and React
      // contexts duplicate the same way. Dedupe resolves every listed package
      // from the project root through Vite's ordinary package resolution, so
      // `exports` maps, conditions and subpaths still apply (unlike an alias
      // that rewrites the specifier to a directory). Every installed @molecule
      // package is listed, not a hand-picked few: which one an app's bond
      // packages import varies per app. The framework's own runtime packages
      // are deduped the same way (FRAMEWORK_RUNTIME_PACKAGES). React keeps an
      // absolute alias below — dedupe alone did not stop an app-local React copy.
      dedupe: [...FRAMEWORK_RUNTIME_PACKAGES, ...moleculePackages],
      alias: singleReactAliases(appRoot),
    },
    optimizeDeps: {
      // Locale bond packages are pre-bundled (see above) — exclude wins over
      // include in Vite, so they are filtered OUT of the exclusion list.
      exclude: moleculePackages.filter((name) => !isLocaleBondPackage(name)),
      // CJS-only transitive deps that ESM importers (i18next, etc.) pull
      // in. Vite's auto-discovery sometimes misses these inside excluded
      // workspace packages, surfacing as "does not provide an export
      // named 'default'" runtime errors. Force-include them so vite
      // pre-bundles with proper CJS→ESM interop. Only installed ones are
      // listed, so an app without React lists none of React's.
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
      ].filter((spec) => localePackages.includes(spec) || isInstalled(spec, appRoot)),
    },
    // `vite preview` serves the production bundle (dist/) with the same API routes as the
    // dev server, so a production-only bug can be tested before a deploy (X1 flash-m42 found
    // one only on the deployed URL: "vite preview has no API proxy").
    preview: {
      port: parseInt(process.env.VITE_PREVIEW_PORT || '4173'),
      host: serverHost,
      allowedHosts: serverAllowedHosts,
      headers: isolation,
      proxy: apiProxy,
    },
    server: {
      port: parseInt(process.env.VITE_PORT || '3000'),
      host: serverHost,
      allowedHosts: serverAllowedHosts,
      open: process.env.VITE_OPEN !== 'false' && process.env.BROWSER !== 'none',
      headers: isolation,
      // Sandbox-only: `fs.strict: false` lets the dev server serve modules
      // through workspace symlinks that resolve outside the project root.
      // Standalone keeps Vite's default (strict), which confines /@fs/ to
      // the project root + workspace — see the host-exposure block above.
      ...(inMoleculeSandbox ? { fs: { strict: false } } : {}),
      // Sandbox-only, for the same reason: a replaced directory cannot kill a
      // stat-based watcher (see the watcher-hardening block above).
      ...(watchPolling ? { watch: { usePolling: true, interval: 500, binaryInterval: 1000 } } : {}),
      proxy: apiProxy,
      warmup: { clientFiles: options.warmup ?? REACT_WARMUP },
    },
    build: {
      outDir: 'dist',
      sourcemap: true,
      // Rolldown's chunk placement must not reorder ESM initialization. A shared context's
      // initializer can otherwise be called before its chunk assigns it, leaving a build
      // that succeeds and then throws on page load. Older Vite versions use Rollup.
      ...(Number(viteVersion.split('.')[0]) >= 8
        ? { rolldownOptions: { output: { strictExecutionOrder: true } } }
        : {}),
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
      // Vitest's own default, stated: vite-plugin-solid switches a Solid app's tests
      // to jsdom otherwise, which no scaffold installs. A test file that needs a DOM
      // names its environment in a `@vitest-environment` comment.
      environment: 'node',
      // The setup a declared framework binding needs for its component tests
      // (@molecule/app-vue's event timing), from its package.json.
      ...(testSetupFiles.length ? { setupFiles: testSetupFiles } : {}),
      // A test resolves @molecule packages the way the build does. Left external, Node
      // loads each one from its real path and takes the framework from whatever
      // node_modules sits beside it (a workspace's nested install, a linked package's own
      // copy), so `resolve.dedupe` and the React alias above never apply and a hook or an
      // injection reads another copy's state ("Invalid hook call"). `preserveSymlinks` keeps
      // the path an app reached the package through, so a linked package matches as well.
      server: { deps: { inline: [/[\\/]node_modules[\\/]@molecule[\\/]/] } },
    },
  }
}
