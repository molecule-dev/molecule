/**
 * Tests for the keyboard shortcut hook's wiring, ported from
 * `@molecule/app-ide-react`'s own suite: the hook is in the barrels, and the
 * package re-exports the matching helpers from `@molecule/app-ide-panel-logic`
 * (their own tests live there).
 *
 * @module
 */

// Angular's injectables need the JIT compiler outside an AOT build.
import '@angular/compiler'
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

describe('barrel exports', () => {
  it('hooks/index.ts re-exports useKeyboardShortcuts', async () => {
    const fs = await import('node:fs/promises')
    const source = await fs.readFile(new URL('../hooks/index.ts', import.meta.url), 'utf-8')
    expect(source).toContain("from './useKeyboardShortcuts.js'")
  })

  it('top-level index.ts re-exports hooks', async () => {
    const fs = await import('node:fs/promises')
    const source = await fs.readFile(new URL('../index.ts', import.meta.url), 'utf-8')
    expect(source).toContain("from './hooks/index.js'")
  })
})
