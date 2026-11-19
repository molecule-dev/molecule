import { createRequire } from 'node:module'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

// A consumer outside an AOT build loads Angular's partially compiled packages through the JIT
// compiler, as every test in this package does.
import '@angular/compiler'
import ts from 'typescript'
import { describe, expect, it } from 'vitest'

const packageName = '@molecule/app-routing-angular-router'
const entrySpecifiers = [packageName]
// These are the JavaScript modules in the published 1.1.0 tarball. With no exports
// map, CommonJS consumers could require both the directory and extensionless paths.
const deepSpecifiers = [
  `${packageName}/dist`,
  ...['define-route', 'index', 'provider', 'providers', 'types'].flatMap((name) => [
    `${packageName}/dist/${name}`,
    `${packageName}/dist/${name}.js`,
  ]),
]

const declarationModules = [
  'define-route',
  'hooks',
  'index',
  'lazy-page',
  'list-route-nav',
  'list-types',
  'provider',
  'providers',
  'router-context',
  'types',
  'use-consumed-search-param',
  'use-list-route',
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
    // Vite rewrites `new URL(path, import.meta.url)` as an asset URL on its dev server.
    const containingFile = join(dirname(fileURLToPath(import.meta.url)), 'consumer.ts')
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
