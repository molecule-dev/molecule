/**
 * A `@molecule` package publishes only `dist`, and the maps `tsc` writes beside each file name
 * the `src` file it came from. Vite reads a map when it serves a file, so the dev server and a
 * test run warned "Sourcemap for ... points to missing source files" for each package file
 * they transformed: 19 lines in one registry-installed app's test run once `@molecule`
 * packages were inlined (2026-11-22), and "outside its package" for each workspace link. The
 * shared config's plugin serves those files without their map; every other file keeps its own.
 *
 * @module
 */
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join } from 'node:path'

import { createLogger, createServer, type Plugin, type ViteDevServer } from 'vite'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'

import {
  isMoleculePackageScript,
  moleculeDistWithoutSourcemap,
} from '../molecule-dist-sourcemap.js'

let root: string
const servers: ViteDevServer[] = []

const write = (path: string, text: string): void => {
  mkdirSync(dirname(path), { recursive: true })
  writeFileSync(path, text)
}

/**
 * Writes a compiled file and the map `tsc` writes beside it, naming `../src/index.ts`.
 *
 * @param dir - The package directory.
 * @param withSource - Whether the named source file exists.
 */
const compiled = (dir: string, withSource: boolean): void => {
  write(
    join(dir, 'dist', 'index.js'),
    'export const value = 1\n//# sourceMappingURL=index.js.map\n',
  )
  write(
    join(dir, 'dist', 'index.js.map'),
    JSON.stringify({
      version: 3,
      file: 'index.js',
      sources: ['../src/index.ts'],
      names: [],
      mappings: 'AAAA',
    }),
  )
  if (withSource) write(join(dir, 'src', 'index.ts'), 'export const value = 1\n')
}

beforeAll(() => {
  root = mkdtempSync(join(tmpdir(), 'molecule-dist-sourcemap-'))
  write(join(root, 'package.json'), JSON.stringify({ name: 'app', type: 'module' }))
  compiled(join(root, 'node_modules', '@molecule', 'app-x'), false)
  compiled(join(root, 'node_modules', 'third-party'), true)
  compiled(join(root, 'node_modules', '@molecule', 'app-x', 'node_modules', 'nested'), true)
})

afterAll(async () => {
  await Promise.all(servers.map((server) => server.close()))
  rmSync(root, { recursive: true, force: true })
})

/**
 * Transforms one file on a dev server, as a page request and as a test run's import.
 *
 * @param path - The file, relative to the fixture app.
 * @param plugins - The server's plugins.
 * @returns Vite's warnings and the sources of each transform's map.
 */
const transform = async (
  path: string,
  plugins: Plugin[],
): Promise<{ warnings: string[]; sources: string[][] }> => {
  const warnings: string[] = []
  const logger = createLogger('warn')
  logger.warn = (message) => void warnings.push(message)
  logger.warnOnce = (message) => void warnings.push(message)
  const server = await createServer({
    configFile: false,
    root,
    customLogger: logger,
    appType: 'custom',
    plugins,
    server: { middlewareMode: true, hmr: false, watch: null },
    optimizeDeps: { noDiscovery: true },
  })
  servers.push(server)
  const results = await Promise.all([
    server.environments.client.transformRequest(`/${path}`),
    server.environments.ssr.transformRequest(join(root, path)),
  ])
  const sources = results.map((result) => {
    const map = result?.map as { sources?: (string | null)[] } | null | undefined
    return (map?.sources ?? []).filter((source): source is string => Boolean(source))
  })
  return { warnings, sources }
}

describe('isMoleculePackageScript', () => {
  it("matches an installed @molecule package's JavaScript, on either path separator", () => {
    expect(isMoleculePackageScript('/app/node_modules/@molecule/app-x/dist/index.js')).toBe(true)
    expect(isMoleculePackageScript('C:\\app\\node_modules\\@molecule\\app-x\\dist\\a.mjs')).toBe(
      true,
    )
  })

  it('leaves out maps, other packages, files nested under a @molecule package and app files', () => {
    expect(isMoleculePackageScript('/app/node_modules/@molecule/app-x/dist/index.js.map')).toBe(
      false,
    )
    expect(isMoleculePackageScript('/app/node_modules/third-party/dist/index.js')).toBe(false)
    expect(
      isMoleculePackageScript('/app/node_modules/@molecule/app-x/node_modules/nested/index.js'),
    ).toBe(false)
    expect(isMoleculePackageScript('/app/src/@molecule/index.js')).toBe(false)
  })
})

describe('moleculeDistWithoutSourcemap', () => {
  it('serves a @molecule dist file with no warning about its missing sources', async () => {
    const { warnings } = await transform('node_modules/@molecule/app-x/dist/index.js', [
      moleculeDistWithoutSourcemap(),
    ])
    expect(warnings.filter((warning) => warning.includes('Sourcemap for'))).toEqual([])
  })

  it('without it, Vite warns for the same file (the recorded noise)', async () => {
    const { warnings } = await transform('node_modules/@molecule/app-x/dist/index.js', [])
    expect(warnings.join('\n')).toMatch(/Sourcemap for .*app-x.* points to missing source files/)
  })

  it('counterexample: any other package, nested ones included, keeps its own map', async () => {
    for (const path of [
      'node_modules/third-party/dist/index.js',
      'node_modules/@molecule/app-x/node_modules/nested/dist/index.js',
    ]) {
      const { warnings, sources } = await transform(path, [moleculeDistWithoutSourcemap()])
      expect(warnings, path).toEqual([])
      for (const list of sources) expect(list.join(' '), path).toMatch(/src\/index\.ts/)
    }
  })

  it('applies to the dev server and test runs, never a production build', () => {
    expect(moleculeDistWithoutSourcemap().apply).toBe('serve')
  })
})
