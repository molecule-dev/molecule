// @vitest-environment jsdom
// Solid's compiled components register their delegated events on `document` when they load.
/**
 * Tests for the keyboard shortcut hook's wiring, ported from
 * `@molecule/app-ide-react`'s own suite: the hook is in the barrels, and the
 * package re-exports the matching helpers from `@molecule/app-ide-panel-logic`
 * (their own tests live there).
 *
 * @module
 */

import { readFile } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'

import { describe, expect, it } from 'vitest'

import * as logic from '@molecule/app-ide-panel-logic'

import * as ide from '../index.js'

describe('matching helpers', () => {
  it('are the ones @molecule/app-ide-panel-logic exports', () => {
    for (const name of [
      'IS_MAC',
      'serializeEvent',
      'normalizeKeys',
      'isInputFocused',
      'isMonacoFocused',
      'isShortcutBlockedByFocus',
      'findKeyboardShortcut',
    ] as const) {
      expect(ide[name]).toBe(logic[name])
    }
  })
})

// ---------------------------------------------------------------------------
// Source contract — ensure hook is wired in the barrel export
// ---------------------------------------------------------------------------

/**
 * Reads one of the package's source files. Under jsdom the global `URL` is jsdom's, which Node's `fs`
 * does not take as a file URL, so the path goes through `fileURLToPath` as a string.
 *
 * @param relative - The file, relative to this test.
 * @returns Its text.
 */
const readSource = (relative: string): Promise<string> =>
  readFile(fileURLToPath(new URL(relative, import.meta.url).href), 'utf-8')

describe('barrel exports', () => {
  it('hooks/index.ts re-exports useKeyboardShortcuts', async () => {
    const source = await readSource('../hooks/index.ts')
    expect(source).toContain("from './useKeyboardShortcuts.js'")
  })

  it('top-level index.ts re-exports hooks', async () => {
    const source = await readSource('../index.ts')
    expect(source).toContain("from './hooks/index.js'")
  })
})
