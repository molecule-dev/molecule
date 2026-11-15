/**
 * The package's public surface: every runtime export and every type export of
 * the root entry and the `./command-metadata` and `./settings-metadata`
 * subpaths, compared with `export-surface.json`.
 *
 * molecule-dev and other hosts import these names; moving a module into a
 * framework-neutral package (and re-exporting it) must leave the list exactly
 * as it is. A deliberate addition or removal updates the JSON in the same commit:
 * `UPDATE_EXPORT_SURFACE=1 npx vitest run src/__tests__/export-surface.test.ts`.
 *
 * @module
 */

import { readFileSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

import ts from 'typescript'
import { describe, expect, it } from 'vitest'

const HERE = dirname(fileURLToPath(import.meta.url))
const SRC = join(HERE, '..')
const SURFACE_FILE = join(HERE, 'export-surface.json')

/** The entries a host can import, by subpath. */
const ENTRIES: Record<string, string> = {
  '.': 'index.ts',
  './command-metadata': 'command-metadata.ts',
  './settings-metadata': 'settings-metadata.ts',
}

/** One entry's exported names. */
interface EntrySurface {
  /** Names with a runtime value (functions, constants, components). */
  values: string[]
  /** Names that exist only as types (interfaces, type aliases). */
  types: string[]
}

/**
 * Reads every entry's exports with the TypeScript checker, through the same module
 * resolution a consumer's compiler uses.
 *
 * @returns Subpath → its value and type names, sorted.
 */
const readSurface = (): Record<string, EntrySurface> => {
  const configPath = join(SRC, '..', 'tsconfig.json')
  const config = ts.parseJsonConfigFileContent(
    ts.readConfigFile(configPath, ts.sys.readFile).config,
    ts.sys,
    dirname(configPath),
  )
  const files = Object.values(ENTRIES).map((file) => join(SRC, file))
  const program = ts.createProgram(files, { ...config.options, noEmit: true })
  const checker = program.getTypeChecker()
  const surface: Record<string, EntrySurface> = {}
  for (const [subpath, file] of Object.entries(ENTRIES)) {
    const source = program.getSourceFile(join(SRC, file))
    const moduleSymbol = source && checker.getSymbolAtLocation(source)
    if (!moduleSymbol) throw new Error(`export-surface: no module symbol for ${file}`)
    const values: string[] = []
    const types: string[] = []
    for (const symbol of checker.getExportsOfModule(moduleSymbol)) {
      const target = symbol.flags & ts.SymbolFlags.Alias ? checker.getAliasedSymbol(symbol) : symbol
      // A value reached through `export type` is a type to the importer: it has no runtime binding.
      const typeOnly = checker.getTypeOnlyAliasDeclaration(symbol) !== undefined
      if (target.flags & ts.SymbolFlags.Value && !typeOnly) values.push(symbol.name)
      else types.push(symbol.name)
    }
    surface[subpath] = { values: values.sort(), types: types.sort() }
  }
  return surface
}

describe('export surface', () => {
  it(
    'equals export-surface.json for the root entry and both subpaths',
    { timeout: 120_000 },
    () => {
      const surface = readSurface()
      if (process.env.UPDATE_EXPORT_SURFACE) {
        writeFileSync(SURFACE_FILE, `${JSON.stringify(surface, null, 2)}\n`)
        return
      }
      const expected: Record<string, EntrySurface> = JSON.parse(readFileSync(SURFACE_FILE, 'utf8'))
      expect(surface).toEqual(expected)
    },
  )

  it(
    'every value the checker reports is a runtime export of the root entry',
    { timeout: 120_000 },
    async () => {
      const expected: Record<string, EntrySurface> = JSON.parse(readFileSync(SURFACE_FILE, 'utf8'))
      const runtime = Object.keys(await import('../index.js')).sort()
      expect(runtime).toEqual(expected['.']!.values)
    },
  )
})
