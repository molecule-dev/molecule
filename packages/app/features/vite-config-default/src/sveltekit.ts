/**
 * Builds a SvelteKit app into the same deployable site a Vite app builds: one static
 * directory (`dist/`) holding `index.html`, the hashed assets, the web manifest and the
 * service worker, served by a front that serves existing files and answers every other
 * page request with `index.html`.
 *
 * SvelteKit writes its pages itself (it never calls Vite's `transformIndexHtml`), and its
 * adapter writes the site in a `buildApp` hook after every environment has built. So
 * vite-plugin-pwa's HTML hooks (the manifest link) and its `closeBundle` (the service
 * worker) never see the finished site: {@link svelteKitPwaPlugins} takes them out and
 * {@link svelteKitStaticSite} does both on the site the adapter wrote.
 *
 * @module
 */

import { existsSync, readdirSync, readFileSync, statSync, writeFileSync } from 'node:fs'
import { resolve, sep } from 'node:path'

import type { Plugin } from 'vite'
import type { VitePluginPWAAPI, VitePWAOptions } from 'vite-plugin-pwa'

/** The site directory a molecule deploy serves, for a SvelteKit app as for any Vite app. */
export const SVELTEKIT_SITE_DIR = 'dist'

/** Where SvelteKit's client build writes Vite's manifest of the client chunks. */
export const SVELTEKIT_CLIENT_MANIFEST = '.svelte-kit/output/client/.vite/manifest.json'

/** One chunk of Vite's build manifest (`build.manifest`), the fields read here. */
interface ManifestChunk {
  file: string
  name?: string
  isEntry?: boolean
  imports?: string[]
  dynamicImports?: string[]
  css?: string[]
}

/**
 * The client files a full page load fetches before the app can render any route: kit's
 * entries, every route's node and everything those import statically, with their CSS.
 * Kit's `entry/start` loads kit's own client runtime with `import()`, so that one hop is
 * followed too; the app's own `import()` chunks (locales, lazily loaded features) are left
 * out, as a Vite app's route-split chunks are.
 *
 * @param clientManifest - Vite's client manifest written by kit's build.
 * @returns The files, relative to the site directory (`_app/immutable/…`).
 */
export function svelteKitShellFiles(clientManifest = SVELTEKIT_CLIENT_MANIFEST): Set<string> {
  const manifest: Record<string, ManifestChunk> = JSON.parse(readFileSync(clientManifest, 'utf8'))
  const files = new Set<string>()
  const seen = new Set<string>()
  const visit = (key: string): void => {
    if (seen.has(key)) return
    seen.add(key)
    const chunk = manifest[key]
    if (!chunk) return
    files.add(chunk.file)
    for (const css of chunk.css ?? []) files.add(css)
    for (const imported of chunk.imports ?? []) visit(imported)
    if (chunk.name === 'entry/start') for (const lazy of chunk.dynamicImports ?? []) visit(lazy)
  }
  for (const [key, chunk] of Object.entries(manifest)) if (chunk.isEntry) visit(key)
  return files
}

/** The workbox options {@link svelteKitPrecache} sets. */
export type SvelteKitPrecache = Pick<
  NonNullable<VitePWAOptions['workbox']>,
  'globPatterns' | 'dontCacheBustURLsMatching' | 'manifestTransforms'
>

/**
 * The service worker's precache for a SvelteKit site: the HTML and icons, and of kit's
 * hashed files under `_app/immutable/` only the shell ({@link svelteKitShellFiles}). The
 * hashed files are precached without a revision, since their names change with their
 * content. Spread it into vite-plugin-pwa's `workbox` options.
 *
 * @param clientManifest - Vite's client manifest written by kit's build.
 * @returns The workbox options.
 */
export function svelteKitPrecache(clientManifest = SVELTEKIT_CLIENT_MANIFEST): SvelteKitPrecache {
  return {
    globPatterns: ['**/*.{html,ico,png,svg}', '_app/immutable/**/*.{js,css}'],
    dontCacheBustURLsMatching: /^_app\/immutable\//,
    manifestTransforms: [
      (entries) => {
        const shell = svelteKitShellFiles(clientManifest)
        return {
          manifest: entries.filter(
            (entry) => !entry.url.startsWith('_app/immutable/') || shell.has(entry.url),
          ),
          warnings: [],
        }
      },
    ],
  }
}

/**
 * vite-plugin-pwa's plugins for a SvelteKit app: every `transformIndexHtml` hook removed
 * (kit never calls them, and warns `transform_index_html_unsupported` for each), and the
 * build plugin's `closeBundle` removed (it would write a service worker before the adapter
 * has written the site). {@link svelteKitStaticSite} adds the manifest link and generates
 * the worker instead. The removed dev hooks do nothing while `devOptions.enabled` and
 * `pwaAssets` are unset, as they are in a molecule scaffold.
 *
 * @param plugins - What `VitePWA(options)` returned.
 * @returns The same plugins without those hooks.
 */
export function svelteKitPwaPlugins(plugins: Plugin[]): Plugin[] {
  return plugins.map((plugin) => {
    const { transformIndexHtml: _html, ...withoutHtml } = plugin
    if (plugin.name !== 'vite-plugin-pwa:build') return withoutHtml
    const { closeBundle: _worker, ...rest } = withoutHtml
    return rest
  })
}

/** Options of {@link svelteKitStaticSite}. */
export interface SvelteKitStaticSiteOptions {
  /** The directory the adapter writes the site to (its `pages` and `assets`). Defaults to `dist`. */
  siteDir?: string
  /** Vite's client manifest written by kit's build. */
  clientManifest?: string
  /** The vite-plugin-pwa API, read when the site is finished; `undefined` when the app has no PWA. */
  pwa?: () => VitePluginPWAAPI | undefined
  /** Rewrites each built page before the worker precaches it (removing preview-only scripts). */
  transformPage?: (html: string) => string
  /** Runs on the finished site before the service worker is generated (removing preview-only files). */
  finishSite?: (siteDir: string) => void
  /**
   * Path prefixes `vite preview` forwards to the API (`/api`, `/health`, `/socket.io`).
   * Every other request that names no file of the site is answered with `index.html`, as the
   * deployed front answers it.
   */
  previewPassThrough?: readonly string[]
  /** The service worker's file name, checked once it is generated. Defaults to `sw.js`. */
  serviceWorker?: string
}

/**
 * Whether `file` names a regular file inside `dir`.
 *
 * @param dir - The site directory.
 * @param file - An absolute path.
 * @returns `true` for a file of the site.
 */
function isSiteFile(dir: string, file: string): boolean {
  return file.startsWith(`${dir}${sep}`) && existsSync(file) && statSync(file).isFile()
}

/**
 * The plugin that finishes a SvelteKit app's site after kit's adapter has written it:
 * rewrites every page ({@link SvelteKitStaticSiteOptions.transformPage}), adds the
 * `<link rel="manifest">` vite-plugin-pwa adds to a Vite `index.html`, runs
 * {@link SvelteKitStaticSiteOptions.finishSite}, then generates the service worker from the
 * files really there. It refuses a build whose site has no `index.html` (the adapter wrote
 * somewhere else), since the deploy would have no page. It also makes `vite preview` answer
 * from the site, as the deployed front does, rather than from kit's server build.
 *
 * Use it with `@sveltejs/adapter-static`'s fallback page (`adapter({ pages: 'dist', assets:
 * 'dist', fallback: 'index.html' })`), {@link svelteKitPwaPlugins} and
 * {@link svelteKitPrecache}. `enforce: 'post'` with a `post` `buildApp` hook puts it after
 * kit's adapter wherever it sits in `plugins`.
 *
 * @param options - The site directory and the app's own page and site steps.
 * @returns The Vite plugin.
 */
export function svelteKitStaticSite(options: SvelteKitStaticSiteOptions = {}): Plugin {
  const siteDir = options.siteDir ?? SVELTEKIT_SITE_DIR
  const serviceWorker = options.serviceWorker ?? 'sw.js'
  return {
    name: 'molecule:sveltekit-static-site',
    enforce: 'post',
    buildApp: {
      order: 'post',
      async handler() {
        const dir = resolve(siteDir)
        const pages = existsSync(dir)
          ? readdirSync(dir, { recursive: true, encoding: 'utf8' }).filter((name) =>
              name.endsWith('.html'),
            )
          : []
        if (!pages.includes('index.html')) {
          throw new Error(
            `${siteDir}/index.html was not written, so the deployed app would have no page: SvelteKit's adapter must write its fallback page there (adapter({ pages: '${siteDir}', assets: '${siteDir}', fallback: 'index.html' })).`,
          )
        }
        const pwa = options.pwa?.()
        const enabled = pwa !== undefined && !pwa.disabled
        const manifestLink = enabled ? pwa.webManifestData()?.toLinkTag() : undefined
        for (const page of pages) {
          const file = resolve(dir, page)
          let html = readFileSync(file, 'utf8')
          if (options.transformPage) html = options.transformPage(html)
          if (manifestLink && !html.includes('rel="manifest"')) {
            html = html.replace('</head>', `${manifestLink}</head>`)
          }
          writeFileSync(file, html)
        }
        options.finishSite?.(dir)
        if (!enabled) return
        await pwa.generateSW()
        if (!isSiteFile(dir, resolve(dir, serviceWorker))) {
          throw new Error(
            `${siteDir}/${serviceWorker} was not generated: vite-plugin-pwa must write the service worker into the site (build.outDir '${siteDir}').`,
          )
        }
      },
    },
    configurePreviewServer(server) {
      const dir = resolve(siteDir)
      const passThrough = options.previewPassThrough ?? []
      server.middlewares.use((req, _res, next) => {
        let path: string
        try {
          path = decodeURIComponent((req.url ?? '/').split('?')[0] ?? '/')
        } catch (_error) {
          // A malformed escape names no file of the site; Vite's own handler answers it.
          next()
          return
        }
        const forwarded = passThrough.some((p) => path === p || path.startsWith(`${p}/`))
        if (
          (req.method === 'GET' || req.method === 'HEAD') &&
          !forwarded &&
          !isSiteFile(dir, resolve(dir, `.${path}`))
        ) {
          req.url = '/index.html'
        }
        next()
      })
    },
  }
}
