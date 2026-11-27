import { execFileSync } from 'node:child_process'
import { join, normalize } from 'node:path'

import ts from 'typescript'
import { expect, it } from 'vitest'

const cwd = join(import.meta.dirname, '..', '..', '..')
const resolveEntries = `
import { accessSync } from 'node:fs'
import { basename } from 'node:path'
import { fileURLToPath } from 'node:url'

const entries = ['', '/components/Tooltip.js', '/elements', '/platform'].map((entry) => {
  const path = fileURLToPath(import.meta.resolve('@molecule/app-ui-react' + entry))
  accessSync(path)
  return basename(path)
})
console.log(JSON.stringify(entries))
`

const browserEntries = ['index.web.js', 'Tooltip.web.js', 'index.js', 'index.js']

it.each([
  { renderer: 'React DOM', conditions: [], entries: browserEntries },
  {
    renderer: 'React Native',
    conditions: ['--conditions=react-native'],
    entries: ['index.native.js', 'Tooltip.native.js', 'native.js', 'native.js'],
  },
  {
    renderer: 'React Native Web',
    conditions: ['--conditions=react-native', '--conditions=browser'],
    entries: browserEntries,
  },
])('resolves the built UI entries for $renderer', ({ conditions, entries }) => {
  const output = execFileSync(
    process.execPath,
    [...conditions, '--input-type=module', '--eval', resolveEntries],
    { cwd, encoding: 'utf8' },
  )
  expect(JSON.parse(output)).toEqual(entries)
})

it('exposes the same public root exports on React DOM and React Native', () => {
  const options = {
    module: ts.ModuleKind.ESNext,
    moduleResolution: ts.ModuleResolutionKind.Bundler,
  }
  const rootImport = (customConditions: string[]): string => {
    const { resolvedModule } = ts.resolveModuleName(
      '@molecule/app-ui-react',
      join(cwd, 'entry-consumer.ts'),
      { ...options, customConditions },
      ts.sys,
    )
    if (!resolvedModule) throw new Error('Missing built React UI declaration')
    return resolvedModule.resolvedFileName
  }
  const webEntry = rootImport([])
  const deviceEntry = rootImport(['react-native'])
  const program = ts.createProgram([webEntry, deviceEntry], options)
  const checker = program.getTypeChecker()
  const entryExports = (entry: string): ts.Symbol[] => {
    const source = program.getSourceFile(entry)
    const entrySymbol = source && checker.getSymbolAtLocation(source)
    if (!entrySymbol) throw new Error('Missing declaration module at ' + entry)
    return checker.getExportsOfModule(entrySymbol)
  }
  const webExports = entryExports(webEntry)
  const deviceExports = entryExports(deviceEntry)
  const exportNames = (symbols: readonly ts.Symbol[]): string[] =>
    symbols.map((symbol) => symbol.name).sort()
  expect(exportNames(deviceExports)).toEqual(exportNames(webExports))

  const fileFieldOwner = (symbols: readonly ts.Symbol[]): string => {
    const field = symbols.find((symbol) => symbol.name === 'FileField')
    if (!field) throw new Error('Missing FileField export')
    const owner = field.flags & ts.SymbolFlags.Alias ? checker.getAliasedSymbol(field) : field
    const declaration = owner.declarations?.[0]
    if (!declaration) throw new Error('Missing FileField declaration')
    return normalize(declaration.getSourceFile().fileName)
  }
  expect([fileFieldOwner(webExports), fileFieldOwner(deviceExports)]).toEqual([
    join(cwd, 'dist/elements/FileField.d.ts'),
    join(cwd, '../react-native-ui/dist/elements/FileField.d.ts'),
  ])
})
