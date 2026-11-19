import { existsSync } from 'node:fs'
import { mkdir, mkdtemp, readFile, rm, symlink, writeFile } from 'node:fs/promises'
import { createServer, type Server } from 'node:http'
import { createRequire } from 'node:module'
import { tmpdir } from 'node:os'
import { dirname, join, resolve } from 'node:path'

import { createBuilder, type InlineConfig, type Plugin, preview } from 'vite'
import { type VitePluginPWAAPI, VitePWA } from 'vite-plugin-pwa'
import { afterEach, describe, expect, it } from 'vitest'

import {
  svelteKitPrecache,
  svelteKitPwaPlugins,
  svelteKitShellFiles,
  svelteKitStaticSite,
} from '../sveltekit.js'

const require = createRequire(import.meta.url)
const installation = resolve(dirname(require.resolve('vite/package.json')), '..')
const fixtures: string[] = []
const servers: Array<{ close(): unknown }> = []

afterEach(async () => {
  await Promise.all(servers.splice(0).map((server) => server.close()))
  await Promise.all(fixtures.splice(0).map((root) => rm(root, { recursive: true, force: true })))
})

async function fixture(files: Record<string, string>): Promise<string> {
  const root = await mkdtemp(join(tmpdir(), 'sveltekit-site-'))
  fixtures.push(root)
  await symlink(installation, join(root, 'node_modules'), 'dir')
  for (const [name, content] of Object.entries(files)) {
    await mkdir(dirname(join(root, name)), { recursive: true })
    await writeFile(join(root, name), content)
  }
  return root
}

// What kit's client build writes: the start entry loads kit's client runtime with
// `import()`, the app entry and a route node import a shared chunk and CSS, and the route
// lazily loads a locale chunk the shell must not include.
const clientManifest = {
  '.svelte-kit/generated/client-optimized/app.js': {
    file: '_app/immutable/entry/app.A1.js',
    name: 'entry/app',
    isEntry: true,
    imports: ['_shared.js'],
  },
  'node_modules/@sveltejs/kit/src/runtime/client/entry.js': {
    file: '_app/immutable/entry/start.B2.js',
    name: 'entry/start',
    isEntry: true,
    dynamicImports: ['node_modules/@sveltejs/kit/src/runtime/client/client.js'],
  },
  'node_modules/@sveltejs/kit/src/runtime/client/client.js': {
    file: '_app/immutable/chunks/client.C3.js',
    imports: ['_shared.js'],
  },
  '.svelte-kit/generated/client-optimized/nodes/0.js': {
    file: '_app/immutable/nodes/0.D4.js',
    isEntry: true,
    imports: ['_shared.js'],
    css: ['_app/immutable/assets/0.E5.css'],
    dynamicImports: ['src/locales/fr.ts'],
  },
  '_shared.js': { file: '_app/immutable/chunks/shared.F6.js' },
  'src/locales/fr.ts': { file: '_app/immutable/chunks/fr.G7.js', imports: ['_shared.js'] },
}
const shell = [
  '_app/immutable/entry/app.A1.js',
  '_app/immutable/chunks/shared.F6.js',
  '_app/immutable/entry/start.B2.js',
  '_app/immutable/chunks/client.C3.js',
  '_app/immutable/nodes/0.D4.js',
  '_app/immutable/assets/0.E5.css',
]
const manifestPath = '.svelte-kit/output/client/.vite/manifest.json'
const kitPage = (body: string): string =>
  `<!doctype html><html><head><meta charset="utf-8"><script src="/__preview__/bridge.js"></script></head><body>${body}</body></html>`

// Stands in for kit's adapter: like adapter-static, a `post` buildApp hook with no
// `enforce`, writing the site once every environment has built. It is listed AFTER the
// plugin under test, so the test also shows the plugin runs after it wherever it sits.
const fakeAdapter = (siteDir: string, write: boolean): Plugin => ({
  name: 'fake-sveltekit-adapter',
  buildApp: {
    order: 'post',
    async handler() {
      if (!write) return
      await mkdir(join(siteDir, '_app/immutable/entry'), { recursive: true })
      await mkdir(join(siteDir, '_app/immutable/chunks'), { recursive: true })
      await mkdir(join(siteDir, '_app/immutable/nodes'), { recursive: true })
      await mkdir(join(siteDir, '_app/immutable/assets'), { recursive: true })
      await mkdir(join(siteDir, 'docs'), { recursive: true })
      for (const file of [...shell, '_app/immutable/chunks/fr.G7.js']) {
        await writeFile(join(siteDir, file), `/* ${file} */`)
      }
      await writeFile(join(siteDir, 'favicon.svg'), '<svg xmlns="http://www.w3.org/2000/svg"/>')
      await writeFile(join(siteDir, 'index.html'), kitPage('fallback'))
      await writeFile(join(siteDir, 'docs/index.html'), kitPage('prerendered'))
    },
  },
})

interface Built {
  root: string
  site: string
  error?: Error
}

async function buildSite({
  adapterWrites = true,
  withPwa = true,
  outDir = withPwa ? 'dist' : '.vite-out',
}: { adapterWrites?: boolean; withPwa?: boolean; outDir?: string } = {}): Promise<Built> {
  const root = await fixture({
    'index.html':
      '<!doctype html><html><head></head><body><script type="module" src="/main.js"></script></body></html>',
    'main.js': 'document.body.dataset.ready = "1"\n',
    [manifestPath]: JSON.stringify(clientManifest),
  })
  const site = join(root, 'dist')
  let pwa: VitePluginPWAAPI | undefined
  const capturePwa: Plugin = {
    name: 'capture-pwa-api',
    configResolved(config) {
      pwa = config.plugins.find((plugin) => plugin.name === 'vite-plugin-pwa')?.api
    },
  }
  const pwaPlugins = withPwa
    ? svelteKitPwaPlugins(
        VitePWA({
          registerType: 'prompt',
          injectRegister: false,
          manifest: { name: 'Fixture', short_name: 'Fixture', start_url: '/' },
          workbox: { ...svelteKitPrecache(join(root, manifestPath)) },
        }),
      )
    : []
  const config: InlineConfig = {
    root,
    configFile: false,
    logLevel: 'silent',
    // Kit builds its client into .svelte-kit/output; the adapter copies it to the site.
    build: { outDir, emptyOutDir: true },
    // Kit builds its own environments in its buildApp hook; the fixture builds the client.
    builder: {
      buildApp: async (builder) => {
        await builder.build(builder.environments.client)
      },
    },
    plugins: [
      ...pwaPlugins,
      capturePwa,
      svelteKitStaticSite({
        siteDir: site,
        pwa: () => pwa,
        transformPage: (html) => html.replace('<script src="/__preview__/bridge.js"></script>', ''),
        finishSite: (dir) => {
          if (existsSync(join(dir, 'sw.js')))
            throw new Error('finishSite ran after the worker was written')
        },
      }),
      fakeAdapter(site, adapterWrites),
    ],
  }
  try {
    const builder = await createBuilder(config)
    await builder.buildApp()
    return { root, site }
  } catch (error) {
    if (error instanceof Error) return { root, site, error }
    throw error
  }
}

describe('svelteKitShellFiles', () => {
  it('keeps the entries, route nodes, their static imports and CSS, and kit’s own runtime', async () => {
    const root = await fixture({ [manifestPath]: JSON.stringify(clientManifest) })
    expect([...svelteKitShellFiles(join(root, manifestPath))].sort()).toEqual([...shell].sort())
  })
})

describe('svelteKitPwaPlugins', () => {
  it('removes every HTML hook and only the build plugin’s closeBundle', () => {
    const original = VitePWA({ registerType: 'prompt', injectRegister: false })
    const adapted = svelteKitPwaPlugins(original)
    expect(original.some((plugin) => plugin.transformIndexHtml)).toBe(true)
    expect(adapted.map((plugin) => plugin.name)).toEqual(original.map((plugin) => plugin.name))
    expect(adapted.filter((plugin) => plugin.transformIndexHtml)).toEqual([])
    for (const [i, plugin] of adapted.entries()) {
      const closesBundle =
        plugin.name !== 'vite-plugin-pwa:build' && Boolean(original[i]?.closeBundle)
      expect(Boolean(plugin.closeBundle)).toBe(closesBundle)
    }
  })
})

describe('svelteKitStaticSite in a real Vite build', { timeout: 60_000 }, () => {
  it('finishes the site the adapter wrote: pages rewritten, manifest linked, worker generated last', async () => {
    const { site, error } = await buildSite()
    expect(error).toBeUndefined()
    for (const page of ['index.html', 'docs/index.html']) {
      const html = await readFile(join(site, page), 'utf8')
      expect(html).not.toContain('/__preview__/')
      expect(html.match(/rel="manifest"/g)).toHaveLength(1)
      expect(html).toContain('<link rel="manifest" href="/manifest.webmanifest"></head>')
    }
    const worker = await readFile(join(site, 'sw.js'), 'utf8')
    for (const file of shell) expect(worker).toContain(`"${file}"`)
    expect(worker).not.toContain('fr.G7.js')
    expect(worker).toContain('"index.html"')
    expect(worker).toContain('favicon.svg')
  })

  it('refuses a build whose adapter wrote no index.html into the site', async () => {
    // As in kit, the client build itself writes no index.html: only the adapter does.
    const { error } = await buildSite({ adapterWrites: false, outDir: '.vite-out' })
    expect(error?.message).toContain(
      '/index.html was not written, so the deployed app would have no page',
    )
  })

  it('refuses a build whose service worker did not land in the site', async () => {
    // vite-plugin-pwa writes the worker into build.outDir, which must be the site.
    const { error } = await buildSite({ outDir: '.vite-out' })
    expect(error?.message).toContain('sw.js was not generated')
  })

  it('without a PWA leaves the pages unlinked and generates no worker', async () => {
    const { site, error } = await buildSite({ withPwa: false })
    expect(error).toBeUndefined()
    expect(await readFile(join(site, 'index.html'), 'utf8')).not.toContain('rel="manifest"')
    expect(existsSync(join(site, 'sw.js'))).toBe(false)
  })
})

describe('svelteKitStaticSite under vite preview', { timeout: 30_000 }, () => {
  it('answers like the deployed front: files, the API, and index.html for every other page', async () => {
    const api: Server = createServer((_req, res) => res.end('from the api'))
    await new Promise<void>((done) => api.listen(0, '127.0.0.1', done))
    servers.push(api)
    const address = api.address()
    if (!address || typeof address === 'string') throw new Error('the API stand-in has no port')
    const root = await fixture({
      'dist/index.html': '<p>the app</p>',
      'dist/robots.txt': 'robots',
    })
    const server = await preview({
      root,
      configFile: false,
      logLevel: 'silent',
      appType: 'mpa',
      build: { outDir: 'dist' },
      plugins: [svelteKitStaticSite({ siteDir: join(root, 'dist'), previewPassThrough: ['/api'] })],
      preview: {
        port: 0,
        host: '127.0.0.1',
        proxy: { '/api': `http://127.0.0.1:${address.port}` },
      },
    })
    servers.push(server)
    const base = server.resolvedUrls?.local[0] ?? ''
    const text = async (path: string): Promise<string> => (await fetch(new URL(path, base))).text()
    expect(await text('/robots.txt')).toBe('robots')
    expect(await text('/settings/profile')).toBe('<p>the app</p>')
    expect(await text('/%E0%A4%A')).not.toBe('<p>the app</p>')
    expect(await text('/api/items')).toBe('from the api')
  })
})
