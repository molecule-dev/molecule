import { describe, expect, it } from 'vitest'

import { firstCallerOutsideMolecule } from '../caller.js'

/** Builds one V8 stack frame line: `    at fn (file:///path:line:col)`. */
const frame = (fn: string, path: string, line = 1, column = 1): string =>
  `    at ${fn} (${path}:${line}:${column})`

/** Builds a frame for an anonymous module (no function name). */
const anonymousFrame = (path: string, line = 1, column = 1): string =>
  `    at file://${path}:${line}:${column}`

describe('firstCallerOutsideMolecule()', () => {
  it('skips the bond package and every other @molecule frame, returning the app module', () => {
    const stack = [
      'Error',
      frame(
        'requireSingleton',
        'file:///repo/molecule/packages/app/infrastructure/bond/src/registry.ts',
        96,
        11,
      ),
      frame('getClient', 'file:///repo/molecule/packages/app/core/auth/src/provider.ts', 34, 10),
      frame('authState', 'file:///repo/molecule/packages/app/core/auth/src/state.ts', 20, 3),
      frame('Object.<anonymous>', 'file:///workspace/app/src/conduit/session.ts', 85, 20),
    ].join('\n')

    expect(firstCallerOutsideMolecule(stack)).toBe('/workspace/app/src/conduit/session.ts:85:20')
  })

  it('skips an installed @molecule package in node_modules', () => {
    const stack = [
      'Error',
      frame(
        'requireSingleton',
        'file:///workspace/app/node_modules/@molecule/app-bond/dist/registry.js',
        40,
        11,
      ),
      frame(
        'getClient',
        'file:///workspace/app/node_modules/@molecule/app-auth/dist/provider.js',
        12,
        4,
      ),
      frame('Object.<anonymous>', 'file:///workspace/app/src/conduit/session.ts', 85, 20),
    ].join('\n')

    expect(firstCallerOutsideMolecule(stack)).toBe('/workspace/app/src/conduit/session.ts:85:20')
  })

  it('skips a Vite dependency-bundle frame (@molecule_app-auth.js)', () => {
    const stack = [
      'Error',
      frame(
        'requireSingleton',
        'http://localhost:5173/node_modules/.vite/deps/@molecule_app-bond.js?v=1',
        1,
        900,
      ),
      frame(
        'getClient',
        'http://localhost:5173/node_modules/.vite/deps/@molecule_app-auth.js?v=1',
        1,
        412,
      ),
      frame('authState', 'http://localhost:5173/src/conduit/session.ts?t=123', 85, 20),
    ].join('\n')

    expect(firstCallerOutsideMolecule(stack)).toBe(
      'http://localhost:5173/src/conduit/session.ts?t=123:85:20',
    )
  })

  it('unwraps a Vite /@fs/ mount to the real file path', () => {
    const stack = [
      'Error',
      frame(
        'requireSingleton',
        'http://localhost:5173/@fs/repo/molecule/packages/app/infrastructure/bond/src/registry.ts',
        96,
        11,
      ),
      anonymousFrame('/workspace/app/src/main.tsx', 10, 1),
    ].join('\n')

    // The first frame is unwrapped to a monorepo package path and skipped; the
    // second is returned as-is (a file:// frame).
    expect(firstCallerOutsideMolecule(stack)).toBe('/workspace/app/src/main.tsx:10:1')
  })

  it('unwraps /@fs/ on the frame it returns', () => {
    const stack = [
      'Error',
      frame(
        'requireSingleton',
        'file:///repo/molecule/packages/app/infrastructure/bond/src/registry.ts',
        96,
        11,
      ),
      frame(
        'Object.<anonymous>',
        'http://localhost:5173/@fs/workspace/app/src/conduit/session.ts',
        85,
        20,
      ),
    ].join('\n')

    expect(firstCallerOutsideMolecule(stack)).toBe('/workspace/app/src/conduit/session.ts:85:20')
  })

  it('returns the bundle URL when the app is minified into one chunk', () => {
    const stack = [
      'Error',
      frame('requireSingleton', 'https://app.example.com/assets/index-a1b2.js', 1, 2034),
      frame('getClient', 'https://app.example.com/assets/index-a1b2.js', 1, 2041),
    ].join('\n')

    expect(firstCallerOutsideMolecule(stack)).toBe(
      'https://app.example.com/assets/index-a1b2.js:1:2034',
    )
  })

  it('returns undefined when every frame is package code', () => {
    const stack = [
      'Error',
      frame(
        'requireSingleton',
        'file:///repo/molecule/packages/app/infrastructure/bond/src/registry.ts',
        96,
        11,
      ),
      frame('getClient', 'file:///repo/molecule/packages/app/core/auth/src/provider.ts', 34, 10),
    ].join('\n')

    expect(firstCallerOutsideMolecule(stack)).toBeUndefined()
  })

  it('returns undefined for a stack with no parseable frames', () => {
    expect(firstCallerOutsideMolecule('')).toBeUndefined()
    expect(firstCallerOutsideMolecule('Error\n    not a frame line')).toBeUndefined()
  })
})
