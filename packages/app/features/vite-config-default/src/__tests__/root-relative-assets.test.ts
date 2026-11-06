import { execFile } from 'node:child_process'
import { mkdir, mkdtemp, readFile, rm, symlink, writeFile } from 'node:fs/promises'
import { createRequire } from 'node:module'
import { tmpdir } from 'node:os'
import { dirname, join, resolve } from 'node:path'
import { promisify } from 'node:util'

import { build, createLogger, type Plugin, type UserConfig } from 'vite'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { createDefaultViteConfig } from '../config.js'

const exec = promisify(execFile)
const require = createRequire(import.meta.url)
const viteRoot = dirname(require.resolve('vite/package.json'))
const installation = resolve(viteRoot, '..')
const sourceConfig = resolve(import.meta.dirname, '../config.ts')
const branding = { APP_NAME: 'Fixture', APP_DESCRIPTION: 'Fixture app', BRAND_COLOR: '#123456' }
const fixtures: string[] = []
const svg = '<svg xmlns="http://www.w3.org/2000/svg" width="1" height="1"/>'

async function fixture(files: Record<string, string>): Promise<string> {
  const root = await mkdtemp(join(tmpdir(), 'root-relative-assets-'))
  fixtures.push(root)
  await symlink(installation, join(root, 'node_modules'), 'dir')
  for (const [name, content] of Object.entries({
    'package.json': '{"name":"asset-fixture","private":true,"type":"module"}',
    'index.html': '<div id="app"></div><script type="module" src="/src/main.ts"></script>',
    ...files,
  })) {
    await mkdir(dirname(join(root, name)), { recursive: true })
    await writeFile(join(root, name), content)
  }
  return root
}

function config(root: string, overrides: UserConfig = {}): UserConfig {
  const defaults = createDefaultViteConfig(branding)
  return {
    ...defaults,
    root,
    configFile: false,
    logLevel: 'silent',
    ...overrides,
  }
}

function diagnostic(file: string, line: number, path: string): string {
  return `${file}:${line} names ${JSON.stringify(path)}, but the build output has no such file, so the browser gets the index.html fallback. Put it at public${path}, or import it from src.`
}

afterEach(async () => {
  await Promise.all(fixtures.splice(0).map((root) => rm(root, { recursive: true, force: true })))
})

describe('root-relative assets in real Vite builds', () => {
  it('fails the CLI build at the original TypeScript line for a missing fallback avatar', async () => {
    const root = await fixture({
      'src/main.ts':
        'import { DEFAULT_AVATAR } from "./lib/types"; document.body.innerHTML = `<img src="${DEFAULT_AVATAR}">`',
      'src/lib/types.ts':
        'export interface Person { image?: string }\n\n// The fallback must ship too.\nexport const DEFAULT_AVATAR: string = "/default-avatar.svg"\n',
      'vite.config.ts': `import { createDefaultViteConfig } from ${JSON.stringify(sourceConfig)}\nexport default createDefaultViteConfig(${JSON.stringify(branding)})\n`,
    })
    let result: { code: number; output: string }
    try {
      const built = await exec(
        process.execPath,
        [join(viteRoot, 'bin/vite.js'), 'build', '--configLoader', 'runner'],
        { cwd: root },
      )
      result = { code: 0, output: built.stdout + built.stderr }
    } catch (error) {
      const failed = error as Error & { code: number; stdout: string; stderr: string }
      result = { code: failed.code, output: failed.stdout + failed.stderr }
    }
    expect(result.output).toContain(diagnostic('src/lib/types.ts', 4, '/default-avatar.svg'))
    expect(result.code).toBe(1)
  }, 30_000)

  it('rejects a missing clinic logo in a non-social app', async () => {
    const root = await fixture({ 'src/main.ts': 'document.body.dataset.logo = "/logo-clinic.png"' })
    await expect(build(config(root))).rejects.toThrow(
      diagnostic('src/main.ts', 1, '/logo-clinic.png'),
    )
  })

  it('passes public files, imports, proxy paths, external URLs, dynamic templates and comments without guard output', async () => {
    const root = await fixture({
      'src/main.ts': [
        'import imported from "/src/imported.svg"',
        'const base = location.origin',
        '// "/comment-missing.png"',
        '/* `/block-comment.gif` */',
        'const pattern = /"\\/regex.png"/',
        'document.body.dataset.assets = JSON.stringify([imported, "/present.svg", `/template.webp`, "/api/x.png", "/socket.io/x.png", "/health/x.png", "https://example.invalid/x.png", "//example.invalid/x.png", `${base}/x.png`, pattern.source])',
      ].join('\n'),
      'src/imported.svg': svg,
      'public/present.svg': svg,
      'public/template.webp': 'image',
    })
    const logger = createLogger('silent')
    const warn = vi.spyOn(logger, 'warn')
    const error = vi.spyOn(logger, 'error')
    await build(config(root, { customLogger: logger }))
    expect(await readFile(join(root, 'dist/present.svg'), 'utf8')).toBe(svg)
    expect([...warn.mock.calls, ...error.mock.calls].flat().join('\n')).not.toContain(
      'molecule:root-relative-assets',
    )
  })

  it.each(['svg', 'png', 'jpg', 'jpeg', 'gif', 'webp', 'avif', 'ico'])(
    'rejects a missing .%s literal',
    async (extension) => {
      const path = `/missing.${extension}`
      const root = await fixture({ 'src/main.ts': `document.body.dataset.image = '${path}'` })
      await expect(build(config(root))).rejects.toThrow(diagnostic('src/main.ts', 1, path))
    },
  )

  it('rejects a static template literal and reports each missing path only once', async () => {
    const root = await fixture({
      'src/main.ts':
        'document.body.dataset.assets = JSON.stringify([`/missing.webp`, "/second.jpg", "/missing.webp"])',
    })
    const error = await build(config(root)).then(
      () => undefined,
      (error: Error) => error,
    )
    expect(error?.message.split('\n')).toEqual([
      diagnostic('src/main.ts', 1, '/missing.webp'),
      diagnostic('src/main.ts', 1, '/second.jpg'),
    ])
  })

  it('accepts files emitted during generateBundle, writeBundle and closeBundle', async () => {
    const root = await fixture({
      'src/main.ts':
        'document.body.dataset.assets = JSON.stringify(["/generated.png", "/written.jpg", "/pwa.png"])',
    })
    const emitter: Plugin = {
      name: 'fixture-emitter',
      generateBundle() {
        this.emitFile({ type: 'asset', fileName: 'generated.png', source: 'image' })
      },
      async writeBundle() {
        await writeFile(join(root, 'dist/written.jpg'), 'image')
      },
      closeBundle: {
        order: 'post',
        sequential: true,
        async handler() {
          await writeFile(join(root, 'dist/pwa.png'), 'image')
        },
      },
    }
    const defaults = config(root)
    await build({ ...defaults, plugins: [...(defaults.plugins ?? []), emitter] })
    expect(await readFile(join(root, 'dist/pwa.png'), 'utf8')).toBe('image')
  })

  it('uses the resolved publicDir and outDir, strips queries/fragments and decodes URL paths', async () => {
    const root = await fixture({
      'src/main.ts':
        'document.body.dataset.assets = JSON.stringify(["/images/a%20b.svg?version=1#icon", "/UPPER.PNG"])',
      'static/images/a b.svg': svg,
      'static/UPPER.PNG': 'image',
    })
    await build(config(root, { publicDir: 'static', build: { outDir: 'output' } }))
    expect(await readFile(join(root, 'output/images/a b.svg'), 'utf8')).toBe(svg)
  })

  it('checks the output rather than assuming public files were copied', async () => {
    const root = await fixture({
      'src/main.ts': 'document.body.dataset.image = "/present.svg"',
      'public/present.svg': svg,
    })
    await expect(build(config(root, { build: { copyPublicDir: false } }))).rejects.toThrow(
      '/present.svg',
    )
  })

  it('keeps the file and line diagnostic when the URL contains a literal percent sign', async () => {
    const root = await fixture({
      'src/main.ts': 'document.body.dataset.image = "/missing-10%.png"',
    })
    await expect(build(config(root))).rejects.toThrow(
      diagnostic('src/main.ts', 1, '/missing-10%.png'),
    )
  })

  it('uses custom proxy prefixes and regular-expression proxy keys', async () => {
    const root = await fixture({
      'src/main.ts':
        'document.body.dataset.assets = JSON.stringify(["/uploads/a.png", "/remote/image.svg"])',
    })
    await build(
      config(root, {
        server: {
          proxy: { '/uploads': 'http://localhost:4000', '^/remote/': 'http://localhost:4000' },
        },
      }),
    )
  })

  it('ignores dependency modules and unreferenced source files', async () => {
    const root = await fixture({
      'src/main.ts': 'import image from "fixture-dependency"; document.body.dataset.image = image',
      'src/unused.ts': 'export const image = "/unused-missing.svg"',
      'dependencies/node_modules/fixture-dependency/index.js':
        'export default "/dependency-missing.svg"',
    })
    await build(
      config(root, {
        resolve: {
          alias: {
            'fixture-dependency': join(
              root,
              'dependencies/node_modules/fixture-dependency/index.js',
            ),
          },
        },
      }),
    )
  })
})
