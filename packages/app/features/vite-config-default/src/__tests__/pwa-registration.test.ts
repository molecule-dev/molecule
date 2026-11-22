import { execFileSync } from 'node:child_process'
import { mkdir, mkdtemp, readdir, readFile, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

import { build } from 'vite'
import { describe, expect, it } from 'vitest'

import { createDefaultViteConfig } from '../index.js'

describe('the flagship production build', () => {
  it('serves launch artwork on demand and installs Workbox with the offline shell', async () => {
    const root = await mkdtemp(join(tmpdir(), 'flagship-launch-artwork-'))
    try {
      const icons = join(root, 'public/icons')
      await mkdir(icons, { recursive: true })
      for (const name of ['splash-640x1136.svg', 'splash-legend.svg', 'icon-192.svg']) {
        await writeFile(join(icons, name), '<svg xmlns="http://www.w3.org/2000/svg"/>')
      }
      await writeFile(join(root, 'index.html'), '<head></head><body>Equipment console</body>')

      await build({
        ...createDefaultViteConfig({
          APP_NAME: 'Equipment console',
          APP_DESCRIPTION: 'A maintenance dashboard',
          BRAND_COLOR: '#332288',
        }),
        configFile: false,
        root,
        logLevel: 'silent',
      })

      const worker = await readFile(join(root, 'dist/sw.js'), 'utf8')
      expect((await readdir(join(root, 'dist'))).filter((name) => /^workbox-/.test(name))).toEqual(
        [],
      )
      expect(worker).toContain('push-sw.js')
      expect(worker).toContain('index.html')
      expect(worker).toContain('icons/icon-192.svg')
      expect(worker).toContain('icons/splash-legend.svg')
      expect(worker).not.toContain('icons/splash-640x1136.svg')
      expect(await readFile(join(root, 'dist/icons/splash-640x1136.svg'), 'utf8')).toContain('<svg')
    } finally {
      await rm(root, { recursive: true, force: true })
    }
  }, 30_000)

  it('precaches every script the first page load runs, and no lazily loaded chunk', async () => {
    const root = await mkdtemp(join(tmpdir(), 'flagship-page-load-'))
    try {
      // `shared.js` is imported by the entry and by a lazily loaded page, so the bundler
      // gives it its own chunk, which the entry imports statically.
      await writeFile(
        join(root, 'index.html'),
        '<head></head><body><script type="module" src="/entry.js"></script></body>',
      )
      await writeFile(
        join(root, 'entry.js'),
        "import { render } from './shared.js'\nrender('home')\nwindow.open = () => import('./lazy.js')\n",
      )
      await writeFile(
        join(root, 'shared.js'),
        'export function render(page) { document.body.dataset.page = page }\n',
      )
      await writeFile(
        join(root, 'lazy.js'),
        "import { render } from './shared.js'\nrender('lazy')\n",
      )
      const config = createDefaultViteConfig({
        APP_NAME: 'Equipment console',
        APP_DESCRIPTION: 'A maintenance dashboard',
        BRAND_COLOR: '#332288',
      })
      await build({ ...config, configFile: false, root, logLevel: 'silent' })

      const worker = await readFile(join(root, 'dist/sw.js'), 'utf8')
      // Minified (`url:"…"`) or not (`"url": "…"`), as the build mode decides.
      const precached = new Set(
        [...worker.matchAll(/"?url"?:\s*"([^"]+)"/g)].map((match) => match[1]),
      )
      const html = await readFile(join(root, 'dist/index.html'), 'utf8')
      const entry = html.match(/<script type="module"[^>]* src="\/([^"]+)"/)?.[1]
      expect(entry).toBeDefined()
      const pageLoad = new Set<string>()
      const follow = async (file: string): Promise<void> => {
        if (pageLoad.has(file)) return
        pageLoad.add(file)
        const source = await readFile(join(root, 'dist', file), 'utf8')
        for (const match of source.matchAll(/(?:^|;|\n)import[^'"()]*["']\.\/([^"']+)["']/g)) {
          await follow(`assets/${match[1]}`)
        }
      }
      await follow(entry!)
      // The entry, the shared chunk and the bundler's runtime chunk, at least.
      expect(pageLoad.size).toBeGreaterThan(1)
      expect([...pageLoad].filter((file) => !precached.has(file))).toEqual([])
      const lazy = (await readdir(join(root, 'dist/assets'))).filter((name) =>
        /^lazy-.*\.js$/.test(name),
      )
      expect(lazy).toHaveLength(1)
      expect(precached.has(`assets/${lazy[0]}`)).toBe(false)
    } finally {
      await rm(root, { recursive: true, force: true })
    }
  }, 30_000)

  it.each([true, false])(
    'runs the app registrar only with VitePWA enabled (%s)',
    async (pwa) => {
      const root = await mkdtemp(join(tmpdir(), 'flagship-pwa-'))
      try {
        const registrar = join(root, 'node_modules/@molecule/app-pwa-default')
        await mkdir(registrar, { recursive: true })
        await writeFile(join(registrar, 'package.json'), '{"type":"module","exports":"./index.js"}')
        await writeFile(
          join(registrar, 'index.js'),
          'export function registerPWA() { console.log("package registrar ran") }\n',
        )
        await writeFile(join(root, 'package.json'), '{"type":"module"}')
        await writeFile(
          join(root, 'index.html'),
          '<head></head><script type="module" src="/entry.js"></script>',
        )
        await writeFile(join(root, 'entry.js'), 'console.log("replacement entry ran")\n')

        const config = createDefaultViteConfig({
          APP_NAME: 'Equipment console',
          APP_DESCRIPTION: 'A maintenance dashboard',
          BRAND_COLOR: '#332288',
        })
        if (!pwa) {
          config.plugins = config.plugins?.filter(
            (plugin) =>
              !Array.isArray(plugin) ||
              !plugin.some(
                (member) => member && 'name' in member && member.name === 'vite-plugin-pwa',
              ),
          )
        }
        await build({
          ...config,
          configFile: false,
          root,
          logLevel: 'silent',
          build: { ...config.build, modulePreload: false },
        })
        const html = await readFile(join(root, 'dist/index.html'), 'utf8')
        const entry = html.match(/<script type="module"[^>]* src="\/([^"]+)"/)?.[1]
        expect(entry).toBeDefined()
        const output = execFileSync(process.execPath, [join(root, 'dist', entry!)], {
          encoding: 'utf8',
        })
        expect(output).toContain('replacement entry ran')
        expect(output.includes('package registrar ran')).toBe(pwa)
      } finally {
        await rm(root, { recursive: true, force: true })
      }
    },
    30_000,
  )
})
