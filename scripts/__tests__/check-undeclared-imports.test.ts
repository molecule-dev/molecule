/**
 * The undeclared-import gate: every bare-specifier import in a package's
 * shipped source must be declared in its own package.json, or it breaks for
 * consumers on pnpm / Yarn PnP (npm workspaces hoist it and hide the gap).
 */
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join } from 'node:path'

import ts from 'typescript'
import { describe, expect, it } from 'vitest'

import {
  emitOptionsFor,
  extractImports,
  findOptionalPeersLoaded,
  findUndeclared,
  isTestFile,
  loadTimeImports,
  OPTIONAL_PEERS_SUPPLIED_ELSEWHERE,
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

describe('loadTimeImports', () => {
  it('keeps what the emitted JavaScript loads and drops what the compiler elides', () => {
    const src = [
      "import { isConfigNotConfiguredError } from '@molecule/api-payments'",
      "import type { Plan } from 'type-only'",
      "import { Shape } from 'used-as-type-only'",
      "import 'side-effect'",
      "export * from 'star'",
      "export type { T } from 'reexported-types'",
      "const lazy = () => import('dynamic')",
      "const req = () => require('required')",
      '// import x from "in-a-comment"',
      'export const p: Shape = { plan: null as Plan | null, ok: isConfigNotConfiguredError }',
    ].join('\n')
    expect(loadTimeImports(src, 'bondAdapter.ts')).toEqual([
      '@molecule/api-payments',
      'side-effect',
      'star',
    ])
  })

  it('emits nothing for a .d.ts and adds the JSX runtime only when the package compiles JSX to it', () => {
    expect(loadTimeImports("import x from 'lib'\nexport { x }", 'shim.d.ts')).toEqual([])
    const tsx = 'export const El = () => <div />'
    expect(loadTimeImports(tsx, 'El.tsx')).toEqual([])
    expect(
      loadTimeImports(tsx, 'El.tsx', {
        module: ts.ModuleKind.ESNext,
        target: ts.ScriptTarget.ES2022,
        jsx: ts.JsxEmit.ReactJSX,
      }),
    ).toEqual(['react/jsx-runtime'])
  })

  it("reads the JSX settings from the package's own tsconfig", () => {
    const dir = mkdtempSync(join(tmpdir(), 'emit-options-'))
    try {
      writeFileSync(
        join(dir, 'tsconfig.json'),
        '{ // comments are allowed\n "compilerOptions": { "jsx": "react-jsx" } }',
      )
      expect(emitOptionsFor(dir).jsx).toBe(ts.JsxEmit.ReactJSX)
      expect(emitOptionsFor(join(dir, 'missing')).jsx).toBe(ts.JsxEmit.Preserve)
    } finally {
      rmSync(dir, { recursive: true, force: true })
    }
  })
})

describe('findOptionalPeersLoaded', () => {
  // The shape of @molecule/api-payments-stripe 1.2.8: the implemented core is an optional peer
  // but bondAdapter.ts imports values from it, so an app installed without it crashes on start-up.
  const pkg = {
    name: '@molecule/api-payments-stripe',
    peerDependencies: { '@molecule/api-payments': '^1.1.0', '@molecule/api-jwt': '^1.0.1' },
    peerDependenciesMeta: {
      '@molecule/api-payments': { optional: true },
      '@molecule/api-jwt': { optional: true },
    },
  }
  const at = (file: string, text: string) =>
    loadTimeImports(text, file).map((specifier) => ({ specifier, file }))

  it('flags an optional peer the package loads on start-up', () => {
    const imports = [
      ...at('src/bondAdapter.ts', "import { resolve } from '@molecule/api-payments'\nresolve()"),
      ...at('src/types.ts', "import type { Plan } from '@molecule/api-payments'"),
    ]
    expect(findOptionalPeersLoaded(pkg, imports)).toEqual([
      { name: '@molecule/api-payments', files: ['src/bondAdapter.ts'] },
    ])
  })

  it('accepts an optional peer used only for types or loaded lazily', () => {
    const imports = [
      ...at('src/types.ts', "import type { Plan } from '@molecule/api-payments'"),
      ...at('src/auth.ts', "export const load = () => import('@molecule/api-jwt')"),
    ]
    expect(findOptionalPeersLoaded(pkg, imports)).toEqual([])
  })

  it('accepts the same import once the peer is required', () => {
    const required = { ...pkg, peerDependenciesMeta: { '@molecule/api-jwt': { optional: true } } }
    const imports = at('src/bondAdapter.ts', "import { r } from '@molecule/api-payments'\nr()")
    expect(findOptionalPeersLoaded(required, imports)).toEqual([])
  })

  it('exempts only a peer the ledger says is supplied some other way', () => {
    const native = {
      name: '@molecule/app-ui-react-native',
      peerDependencies: { 'react-native': '*', react: '^19.0.0' },
      peerDependenciesMeta: { 'react-native': { optional: true }, react: { optional: true } },
    }
    const imports = at(
      'src/Button.tsx',
      "import { View } from 'react-native'\nimport { useState } from 'react'\nexport const B = () => [View, useState]",
    )
    expect(findOptionalPeersLoaded(native, imports)).toEqual([
      { name: 'react', files: ['src/Button.tsx'] },
    ])
    expect(OPTIONAL_PEERS_SUPPLIED_ELSEWHERE['@molecule/app-ui-react-native']).toHaveProperty(
      'react-native',
    )
    expect(findOptionalPeersLoaded(native, imports, {})).toHaveLength(2)
  })
})

describe('scanFleet', () => {
  it('reports a package that loads an optional peer, from its own tsconfig emit', () => {
    const root = mkdtempSync(join(tmpdir(), 'optional-peer-fleet-'))
    const write = (file: string, text: string) => {
      mkdirSync(dirname(join(root, file)), { recursive: true })
      writeFileSync(join(root, file), text)
    }
    try {
      write(
        'packages/api/bonds/payments/stripe/package.json',
        JSON.stringify({
          name: '@molecule/api-payments-stripe',
          peerDependencies: { '@molecule/api-payments': '^1.1.0' },
          peerDependenciesMeta: { '@molecule/api-payments': { optional: true } },
        }),
      )
      write(
        'packages/api/bonds/payments/stripe/src/bondAdapter.ts',
        "import { resolve } from '@molecule/api-payments'\nexport const go = () => resolve()\n",
      )
      write(
        'packages/api/bonds/payments/fine/package.json',
        JSON.stringify({
          name: '@molecule/api-payments-fine',
          peerDependencies: { '@molecule/api-payments': '^1.1.0' },
          peerDependenciesMeta: { '@molecule/api-payments': { optional: true } },
        }),
      )
      write(
        'packages/api/bonds/payments/fine/src/types.ts',
        "import type { Plan } from '@molecule/api-payments'\nexport type P = Plan\n",
      )
      expect(scanFleet(root)).toEqual([
        {
          package: '@molecule/api-payments-stripe',
          dir: 'packages/api/bonds/payments/stripe',
          missing: [],
          optionalLoaded: [{ name: '@molecule/api-payments', files: ['src/bondAdapter.ts'] }],
        },
      ])
    } finally {
      rmSync(root, { recursive: true, force: true })
    }
  })
})

describe('the fleet', () => {
  // Parses every source file of ~1000 packages: seconds locally, longer on a loaded CI runner.
  it(
    'declares every package its shipped source imports, and loads no optional peer',
    { timeout: 120_000 },
    () => {
      expect(scanFleet()).toEqual([])
    },
  )
})
