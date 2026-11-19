import { createRequire } from 'node:module'
import { fileURLToPath } from 'node:url'

import ts from 'typescript'
import { describe, expect, it } from 'vitest'

const packageName = '@molecule/app-routing-vue-router'
const entrySpecifiers = [packageName]
// These are the JavaScript modules in the published 1.1.0 tarball. With no exports
// map, CommonJS consumers could require both the directory and extensionless paths.
const deepSpecifiers = [
  `${packageName}/dist`,
  ...['composables', 'define-route', 'history', 'index', 'provider', 'types', 'utilities'].flatMap(
    (name) => [`${packageName}/dist/${name}`, `${packageName}/dist/${name}.js`],
  ),
]

const declarationModules = [
  'ListRouteNav',
  'MoleculeRouterProvider',
  'composables',
  'context',
  'define-route',
  'history',
  'index',
  'lazyPage',
  'link-params',
  'list-types',
  'provider',
  'types',
  'useConsumedSearchParam',
  'useListRoute',
  'useMoleculeNavigate',
  'useMoleculeQuery',
  'utilities',
]

describe('1.1.0 consumer resolution', () => {
  it.each([...entrySpecifiers, ...deepSpecifiers])('resolves %s through require', (specifier) => {
    const require = createRequire(import.meta.url)

    expect(require.resolve(specifier)).toMatch(/[\\/]dist[\\/].*\.js$/)
  })

  it.each([...entrySpecifiers, ...deepSpecifiers])('loads %s through import', async (specifier) => {
    await expect(import(specifier)).resolves.toBeTypeOf('object')
  })

  it.each(['bundler', 'node16'] as const)('resolves published declarations with %s', (mode) => {
    const containingFile = fileURLToPath(new URL('consumer.ts', import.meta.url))
    const options = {
      module: mode === 'bundler' ? ts.ModuleKind.ESNext : ts.ModuleKind.Node16,
      moduleResolution:
        mode === 'bundler' ? ts.ModuleResolutionKind.Bundler : ts.ModuleResolutionKind.Node16,
    }

    for (const name of declarationModules) {
      const specifier = `${packageName}/dist/${name}.d.ts`
      const resolved = ts.resolveModuleName(
        specifier,
        containingFile,
        options,
        ts.sys,
      ).resolvedModule
      expect(resolved?.resolvedFileName, specifier).toMatch(/[\\/]dist[\\/].*\.d\.ts$/)
    }
  })

  it.each(declarationModules)('resolves the published declaration map for %s', (name) => {
    const require = createRequire(import.meta.url)
    const specifier = `${packageName}/dist/${name}.d.ts.map`

    expect(require.resolve(specifier)).toMatch(/[\\/]dist[\\/].*\.d\.ts\.map$/)
  })
})
