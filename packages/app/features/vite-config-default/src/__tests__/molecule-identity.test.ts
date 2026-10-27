/**
 * One module identity per `@molecule` package, whichever install path an
 * importer reaches it through.
 *
 * Bond state (`registry.ts` in `@molecule/app-bond`) and the query client in
 * `@molecule/app-query` are module-level singletons. `preserveSymlinks: true`
 * keeps the path an importer used, so the same install reached through two
 * paths loads twice and the two copies hold separate registries: the app's
 * `setProvider()` bonds one, `getQueryClient()` in a package that resolved the
 * other throws "No provider bonded" (X1 xr-molecule-flash-l148 reproduced it
 * against a `node_modules/node_modules` self-link).
 *
 * These tests build that topology on disk and ask Vite's REAL dev resolver
 * what each importer gets: the old resolve block produces the duplicated id,
 * the config this factory emits produces one id through the package's exports
 * map. No mocks of the resolver.
 */
import { mkdirSync, mkdtempSync, rmSync, symlinkSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join } from 'node:path'

import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest'

// Plugins load native binaries and are not under test (as in index.test.ts).
vi.mock('@tailwindcss/vite', () => ({ default: () => ({ name: 'tailwindcss' }) }))
vi.mock('@vitejs/plugin-react', () => ({ default: () => ({ name: 'react' }) }))
vi.mock('vite-plugin-pwa', () => ({ VitePWA: () => ({ name: 'pwa' }) }))

import { createServer } from 'vite'

import { createDefaultViteConfig } from '../config.js'

/** The resolve block every emitted config had before Molecule packages were deduped. */
const REACT_ONLY_DEDUPE = ['react', 'react-dom', 'react-router', 'react-router-dom']

let appRoot: string
let importer: string
let servers: Array<Awaited<ReturnType<typeof createServer>>> = []

const packageJson = (name: string, exports: Record<string, unknown>): string =>
  JSON.stringify({ name, version: '1.0.0', type: 'module', main: 'dist/index.js', exports })

/**
 * Writes one package into the fixture's `node_modules`.
 *
 * @param name - The bare package name, scoped or not.
 * @param files - Relative file path to contents.
 */
const writePackage = (name: string, files: Record<string, string>): void => {
  const dir = join(appRoot, 'node_modules', ...name.split('/'))
  for (const [rel, contents] of Object.entries(files)) {
    mkdirSync(join(dir, dirname(rel)), { recursive: true })
    writeFileSync(join(dir, rel), contents)
  }
}

const resolveWith = async (
  server: Awaited<ReturnType<typeof createServer>>,
  spec: string,
): Promise<string | undefined> => {
  const resolved = await server.pluginContainer.resolveId(spec, importer)
  return resolved?.id.split('?')[0]
}

const startServer = async (dedupe: string[]): Promise<Awaited<ReturnType<typeof createServer>>> => {
  const server = await createServer({
    configFile: false,
    root: appRoot,
    logLevel: 'silent',
    appType: 'custom',
    server: { middlewareMode: true },
    resolve: {
      preserveSymlinks: true,
      dedupe,
      alias: {},
    },
    // The emitted config excludes every @molecule package from pre-bundling
    // (bond state cannot survive a pre-bundle); these are the two under test.
    optimizeDeps: { noDiscovery: true, exclude: ['@molecule/app-query', '@molecule/app-version'] },
  })
  servers.push(server)
  return server
}

beforeAll(() => {
  appRoot = mkdtempSync(join(tmpdir(), 'molecule-identity-'))
  writeFileSync(
    join(appRoot, 'package.json'),
    JSON.stringify({ name: 'identity-app', private: true, type: 'module' }),
  )

  // A package already installed in node_modules that imports @molecule/app-query
  // itself — an app's bond packages arrive this way.
  importer = join(appRoot, 'node_modules', 'bond-pkg', 'index.js')
  mkdirSync(dirname(importer), { recursive: true })
  writeFileSync(
    join(dirname(importer), 'package.json'),
    JSON.stringify({
      name: 'bond-pkg',
      version: '1.0.0',
      type: 'module',
      exports: { '.': './index.js' },
    }),
  )
  writeFileSync(importer, "export * from '@molecule/app-query'\n")

  writePackage('@molecule/app-query', {
    'package.json': packageJson('@molecule/app-query', {
      '.': { types: './dist/index.d.ts', import: './dist/index.js' },
    }),
    'dist/index.js': 'export const marker = "query"\n',
  })
  writePackage('@molecule/app-version', {
    'package.json': packageJson('@molecule/app-version', {
      '.': { types: './dist/index.d.ts', import: './dist/index.js' },
      './build': { types: './dist/build/index.d.ts', import: './dist/build/index.js' },
    }),
    'dist/index.js': 'export const marker = "version"\n',
    'dist/build/index.js': 'export const marker = "version-build"\n',
  })

  // The recorded topology: <app>/node_modules/node_modules -> <app>/node_modules.
  // A package at <app>/node_modules/<pkg> resolving its own dependency walks to
  // <app>/node_modules/node_modules/@molecule/... and gets a second copy.
  symlinkSync('.', join(appRoot, 'node_modules', 'node_modules'), 'dir')
})

afterAll(async () => {
  await Promise.all(servers.map((server) => server.close()))
  servers = []
  rmSync(appRoot, { recursive: true, force: true })
})

describe('Molecule module identity across install paths', () => {
  it('duplicates the package through a node_modules self-link without dedupe (the recorded failure)', async () => {
    const server = await startServer(REACT_ONLY_DEDUPE)
    expect(await resolveWith(server, '@molecule/app-query')).toBe(
      join(appRoot, 'node_modules', 'node_modules', '@molecule', 'app-query', 'dist', 'index.js'),
    )
  })

  it('resolves one canonical copy from the emitted config resolve block', async () => {
    const config = createDefaultViteConfig({
      APP_NAME: 'Identity',
      APP_DESCRIPTION: 'identity fixture',
      BRAND_COLOR: '#000000',
    })
    expect(config.resolve?.dedupe).toContain('@molecule/app-query')
    expect(config.resolve?.dedupe).toContain('@molecule/app-version')

    const server = await startServer(config.resolve?.dedupe as string[])
    expect(await resolveWith(server, '@molecule/app-query')).toBe(
      join(appRoot, 'node_modules', '@molecule', 'app-query', 'dist', 'index.js'),
    )
  })

  it('honours a subpath export instead of rewriting the specifier to a directory', async () => {
    const config = createDefaultViteConfig({
      APP_NAME: 'Identity',
      APP_DESCRIPTION: 'identity fixture',
      BRAND_COLOR: '#000000',
    })
    const server = await startServer(config.resolve?.dedupe as string[])
    // Dedupe goes through Vite's package resolution, so `./build` is the entry
    // the exports map names — not `<package dir>/build`.
    expect(await resolveWith(server, '@molecule/app-version/build')).toBe(
      join(appRoot, 'node_modules', '@molecule', 'app-version', 'dist', 'build', 'index.js'),
    )
  })

  it('still fails for a subpath the package does not export (negative control)', async () => {
    const config = createDefaultViteConfig({
      APP_NAME: 'Identity',
      APP_DESCRIPTION: 'identity fixture',
      BRAND_COLOR: '#000000',
    })
    const server = await startServer(config.resolve?.dedupe as string[])
    await expect(resolveWith(server, '@molecule/app-query/not-a-subpath')).rejects.toThrow(
      /is not exported/,
    )
  })

  it('leaves the app-local React copy pinned by the alias', () => {
    const config = createDefaultViteConfig({
      APP_NAME: 'Identity',
      APP_DESCRIPTION: 'identity fixture',
      BRAND_COLOR: '#000000',
    })
    // The alias is the factory's existing single-React mechanism; adding
    // Molecule packages to dedupe must not replace or widen it.
    expect(Object.keys(config.resolve?.alias as Record<string, string>).sort()).toEqual([
      'react',
      'react-dom',
    ])
  })
})
