/**
 * The undeclared-import gate: every bare-specifier import in a package's
 * shipped source must be declared in its own package.json, or it breaks for
 * consumers on pnpm / Yarn PnP (npm workspaces hoist it and hide the gap).
 */
import { describe, expect, it } from 'vitest'

import {
  extractImports,
  findUndeclared,
  isTestFile,
  packageNameOf,
  scanFleet,
} from '../check-undeclared-imports.mjs'

describe('extractImports', () => {
  it('finds runtime and type-only imports, re-exports, dynamic import and require', () => {
    const src = [
      "import express, { Router } from 'express'",
      "import type { Request } from 'express-serve-static-core'",
      "import { type A, type B } from 'only-types'",
      "import { type C, d } from 'mixed'",
      "import 'side-effect'",
      "export * from 'reexported'",
      "export type { T } from 'reexported-types'",
      "const a = await import('dynamic')",
      "const b = require('required')",
      "type X = import('type-position').X",
      "declare module 'augmented' { interface Y { z: string } }",
    ].join('\n')
    expect(extractImports(src, 'x.ts')).toEqual([
      { specifier: 'express', typeOnly: false },
      { specifier: 'express-serve-static-core', typeOnly: true },
      { specifier: 'only-types', typeOnly: true },
      { specifier: 'mixed', typeOnly: false },
      { specifier: 'side-effect', typeOnly: false },
      { specifier: 'reexported', typeOnly: false },
      { specifier: 'reexported-types', typeOnly: true },
      { specifier: 'dynamic', typeOnly: false },
      { specifier: 'required', typeOnly: false },
      { specifier: 'type-position', typeOnly: true },
      { specifier: 'augmented', typeOnly: true },
    ])
  })

  it('ignores imports inside comments, JSDoc examples and template literals', () => {
    const src = [
      '/**',
      ' * @example',
      " * import { thing } from 'from-jsdoc'",
      ' */',
      "// import x from 'from-line-comment'",
      "const code = `import y from 'from-template'`",
    ].join('\n')
    expect(extractImports(src, 'x.ts')).toEqual([])
  })

  it('treats every import in a .d.ts as type-only and parses TSX', () => {
    expect(extractImports("import x from 'lib'", 'shim.d.ts')).toEqual([
      { specifier: 'lib', typeOnly: true },
    ])
    expect(
      extractImports("import { t } from 'i18n'\nconst el = <div>{t('k')}</div>", 'C.tsx'),
    ).toEqual([{ specifier: 'i18n', typeOnly: false }])
  })
})

describe('packageNameOf', () => {
  it('maps specifiers to the package that must be declared', () => {
    expect(packageNameOf('express')).toBe('express')
    expect(packageNameOf('lodash/merge')).toBe('lodash')
    expect(packageNameOf('@molecule/app-i18n')).toBe('@molecule/app-i18n')
    expect(packageNameOf('@scope/pkg/sub/path.js')).toBe('@scope/pkg')
  })

  it('needs no declaration for relative paths, builtins and URL-like specifiers', () => {
    expect(packageNameOf('./local.js')).toBeNull()
    expect(packageNameOf('../up.js')).toBeNull()
    expect(packageNameOf('node:fs')).toBeNull()
    expect(packageNameOf('fs')).toBeNull()
    expect(packageNameOf('fs/promises')).toBeNull()
    expect(packageNameOf('virtual:pwa-register')).toBeNull()
  })
})

describe('isTestFile', () => {
  it('skips tests and mocks, keeps shipped source', () => {
    expect(isTestFile('__tests__/a.ts')).toBe(true)
    expect(isTestFile('nested/__mocks__/b.ts')).toBe(true)
    expect(isTestFile('c.test.ts')).toBe(true)
    expect(isTestFile('d.spec.tsx')).toBe(true)
    expect(isTestFile('provider.ts')).toBe(false)
    expect(isTestFile('testing.ts')).toBe(false)
  })
})

describe('findUndeclared', () => {
  const pkg = {
    name: '@molecule/api-example',
    dependencies: { zod: '4.4.3' },
    peerDependencies: { '@molecule/api-logger': '^1.0.1' },
    optionalDependencies: { sharp: '0.34.0' },
    devDependencies: { express: '5.2.1', '@types/express-serve-static-core': '5.1.3' },
  }
  const imp = (specifier: string, typeOnly = false) => ({ specifier, typeOnly, file: 'src/a.ts' })

  it('accepts runtime imports from dependencies, peers and optional dependencies', () => {
    expect(
      findUndeclared(pkg, [imp('zod'), imp('@molecule/api-logger'), imp('sharp'), imp('./x.js')]),
    ).toEqual([])
  })

  it('accepts a self-import', () => {
    expect(findUndeclared(pkg, [imp('@molecule/api-example')])).toEqual([])
  })

  it('rejects a runtime import declared only as a devDependency', () => {
    expect(findUndeclared(pkg, [imp('express')])).toEqual([
      { name: 'express', typeOnly: false, files: ['src/a.ts'] },
    ])
  })

  it('accepts a type-only import from devDependencies or an @types package', () => {
    expect(
      findUndeclared(pkg, [imp('express', true), imp('express-serve-static-core', true)]),
    ).toEqual([])
  })

  it('rejects an import declared nowhere, merging files and type-onlyness', () => {
    expect(
      findUndeclared(pkg, [
        { specifier: 'uuid', typeOnly: true, file: 'src/b.ts' },
        { specifier: 'uuid', typeOnly: false, file: 'src/a.ts' },
      ]),
    ).toEqual([{ name: 'uuid', typeOnly: false, files: ['src/a.ts', 'src/b.ts'] }])
  })
})

describe('the fleet', () => {
  // Parses every source file of ~1000 packages: seconds locally, longer on a loaded CI runner.
  it('declares every package its shipped source imports', { timeout: 120_000 }, () => {
    expect(scanFleet()).toEqual([])
  })
})
