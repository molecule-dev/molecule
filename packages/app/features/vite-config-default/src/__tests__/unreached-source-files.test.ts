import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { dirname, join } from 'node:path'

import tailwind from '@tailwindcss/vite'
import { build, createBuilder, createLogger, type PluginOption } from 'vite'
import { afterEach, describe, expect, it } from 'vitest'

import { rootRelativeAssetsPlugin } from '../root-relative-assets.js'

const roots: string[] = []
afterEach(async () => {
  for (const root of roots.splice(0)) await rm(root, { recursive: true, force: true })
})

async function buildSite(
  files: Record<string, string>,
  mode: 'client' | 'prerender' | 'environments' = 'client',
  plugins: PluginOption[] = [],
): Promise<string[]> {
  const root = await mkdtemp(join(tmpdir(), 'source-graph-'))
  roots.push(root)
  for (const [name, contents] of Object.entries(files)) {
    const file = join(root, name)
    await mkdir(dirname(file), { recursive: true })
    await writeFile(file, contents)
  }
  const diagnostics: string[] = []
  const logger = createLogger('silent')
  logger.warn = (message) => diagnostics.push(message)
  const config = {
    root,
    configFile: false,
    customLogger: logger,
    plugins: [...plugins, rootRelativeAssetsPlugin({ prerender: mode === 'prerender' })],
    build: { minify: false as const },
  }
  const ssr = { ssr: join(root, 'src/document.ts'), outDir: 'server' }
  if (mode === 'environments') {
    const builder = await createBuilder({
      ...config,
      environments: { ssr: { build: ssr } },
      builder: {
        async buildApp(app) {
          await app.build(app.environments.ssr)
          await app.build(app.environments.client)
        },
      },
    })
    await builder.buildApp()
  } else {
    await build(config)
    if (mode === 'prerender') await build({ ...config, build: { ...config.build, ...ssr } })
  }
  return diagnostics.filter((line) => line.includes('[molecule:unreached-source]'))
}

const svg = '<svg xmlns="http://www.w3.org/2000/svg" width="8" height="8"/>'
const workshop = {
  'index.html':
    '<link rel="stylesheet" href="/src/linked.css"><img src="/src/mark.svg"><script type="module" src="/src/main.ts"></script>',
  'src/main.ts': `import './styles.css'
    console.log(import.meta.glob('./locales/*.json'))
    document.addEventListener('click', () => import('./pages/session'))
    new Worker(new URL('./worker.ts', import.meta.url))
  `,
  'src/styles.css':
    "@import './palette.css'; @font-face { font-family: notes; src: url('./notes.woff2'); }",
  'src/palette.css': "body { background: url('./paper.svg') }",
  'src/notes.woff2': 'font',
  'src/paper.svg': svg,
  'src/mark.svg': svg,
  'src/linked.css': 'main { margin: auto }',
  'src/locales/en.json': '{"book":"Book"}',
  'src/pages/session.ts': 'document.body.append("Workshop session")',
  'src/worker.ts': "import './queue'",
  'src/queue.ts': 'console.log("workshop queue")',
  'src/schema.d.ts': 'declare const flag: boolean',
  'src/locales/types.ts': 'export type Locale = Record<string, string>',
  'src/entry.test.ts': 'throw new Error("not an app entry")',
  'src/__fixtures__/orphan.json': '{}',
  'src/tool.config.ts': 'throw new Error("not an app entry")',
  'public/unlinked.svg': svg,
}

describe('unreached app source', () => {
  it('names stylesheet, component, font, image and locale files outside the production graph', async () => {
    const warnings = await buildSite({
      ...workshop,
      'src/extra.css': 'body { color: navy }',
      'src/extra.woff2': 'font',
      'src/extra.svg': svg,
      'src/pages/Extra.tsx': 'export const title = "extra"',
      'src/messages/de.json': '{"book":"Buchen"}',
    })
    expect(warnings.map((line) => line.match(/"src\/[^"]+"/)?.[0])).toEqual([
      '"src/extra.css"',
      '"src/extra.svg"',
      '"src/extra.woff2"',
      '"src/messages/de.json"',
      '"src/pages/Extra.tsx"',
    ])
    expect(warnings.every((line) => line.includes('src/main.ts'))).toBe(true)
  })

  it('stays silent for real HTML, CSS, dynamic route, locale, worker and test inputs', async () => {
    expect(await buildSite(workshop)).toEqual([])
  })

  it('counts CSS inlined by Tailwind and explicitly inlined URLs', async () => {
    const warnings = await buildSite(
      {
        'index.html': '<script type="module" src="/src/main.ts"></script>',
        'src/main.ts': "import './styles.css'",
        'src/styles.css': "@import 'tailwindcss';\n@import './theme/entry.css';",
        'src/theme/entry.css': "@import './layout.css';",
        'src/theme/layout.css': "img { width: 1rem; background: url('./paper.svg?inline') }",
        'src/theme/paper.svg': svg,
      },
      'client',
      [tailwind({ optimize: false })],
    )
    expect(warnings).toEqual([])
  })

  it.each(['prerender', 'environments'] as const)(
    'checks the union of server and browser graphs for %s',
    async (mode) => {
      const warnings = await buildSite(
        {
          ...workshop,
          'src/document.ts': "import './render'",
          'src/render.ts': 'console.log("server-rendered session")',
          'src/unused.ts': 'export const unused = true',
        },
        mode,
      )
      expect(warnings).toHaveLength(1)
      expect(warnings[0]).toContain('"src/unused.ts"')
    },
  )
})
