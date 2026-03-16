/**
 * Tests for the keyboard shortcut system's pure logic.
 *
 * Covers key serialization, normalization, and focus-detection helpers.
 * These are the core functions that determine whether a shortcut fires —
 * a bug here silently breaks all IDE shortcuts.
 *
 * @module
 */

import { describe, expect, it } from 'vitest'

import {
  isInputFocused,
  isMonacoFocused,
  normalizeKeys,
  serializeEvent,
} from '../hooks/useKeyboardShortcuts.js'

// ---------------------------------------------------------------------------
// Helpers — minimal KeyboardEvent-like objects for testing
// ---------------------------------------------------------------------------

function makeEvent(overrides: Partial<KeyboardEvent> & { key: string }): KeyboardEvent {
  return {
    metaKey: false,
    ctrlKey: false,
    altKey: false,
    shiftKey: false,
    target: null,
    ...overrides,
  } as unknown as KeyboardEvent
}

function makeEventWithTarget(
  key: string,
  target: Partial<HTMLElement> & { tagName: string },
): KeyboardEvent {
  return {
    metaKey: false,
    ctrlKey: false,
    altKey: false,
    shiftKey: false,
    key,
    target: target as unknown as EventTarget,
  } as unknown as KeyboardEvent
}

// ---------------------------------------------------------------------------
// serializeEvent
// ---------------------------------------------------------------------------

describe('serializeEvent', () => {
  describe('on Mac (isMac = true)', () => {
    const mac = true

    it('serializes Cmd+P as mod+p', () => {
      const e = makeEvent({ key: 'p', metaKey: true })
      expect(serializeEvent(e, mac)).toBe('mod+p')
    })

    it('serializes Cmd+Shift+F as mod+shift+f', () => {
      const e = makeEvent({ key: 'f', metaKey: true, shiftKey: true })
      expect(serializeEvent(e, mac)).toBe('mod+shift+f')
    })

    it('serializes Cmd+Shift+P as mod+shift+p', () => {
      const e = makeEvent({ key: 'p', metaKey: true, shiftKey: true })
      expect(serializeEvent(e, mac)).toBe('mod+shift+p')
    })

    it('serializes Cmd+/ as mod+/', () => {
      const e = makeEvent({ key: '/', metaKey: true })
      expect(serializeEvent(e, mac)).toBe('mod+/')
    })

    it('serializes Ctrl+key as ctrl+ (not mod) on Mac', () => {
      const e = makeEvent({ key: 'c', ctrlKey: true })
      expect(serializeEvent(e, mac)).toBe('ctrl+c')
    })

    it('serializes Alt+key correctly', () => {
      const e = makeEvent({ key: 'z', altKey: true })
      expect(serializeEvent(e, mac)).toBe('alt+z')
    })

    it('serializes a plain key with no modifiers', () => {
      const e = makeEvent({ key: 'Escape' })
      expect(serializeEvent(e, mac)).toBe('escape')
    })

    it('serializes Cmd+Alt+Shift combo in correct order', () => {
      const e = makeEvent({ key: 'k', metaKey: true, altKey: true, shiftKey: true })
      expect(serializeEvent(e, mac)).toBe('mod+alt+shift+k')
    })

    it('lowercases uppercase key names', () => {
      const e = makeEvent({ key: 'F', metaKey: true, shiftKey: true })
      expect(serializeEvent(e, mac)).toBe('mod+shift+f')
    })
  })

  describe('on non-Mac (isMac = false)', () => {
    const nonMac = false

    it('serializes Ctrl+P as mod+p', () => {
      const e = makeEvent({ key: 'p', ctrlKey: true })
      expect(serializeEvent(e, nonMac)).toBe('mod+p')
    })

    it('serializes Ctrl+Shift+F as mod+shift+f', () => {
      const e = makeEvent({ key: 'f', ctrlKey: true, shiftKey: true })
      expect(serializeEvent(e, nonMac)).toBe('mod+shift+f')
    })

    it('does not treat Meta as mod on non-Mac', () => {
      const e = makeEvent({ key: 'p', metaKey: true })
      expect(serializeEvent(e, nonMac)).toBe('p')
    })
  })
})

// ---------------------------------------------------------------------------
// normalizeKeys
// ---------------------------------------------------------------------------

describe('normalizeKeys', () => {
  it('lowercases the input', () => {
    expect(normalizeKeys('Mod+Shift+F')).toBe('mod+shift+f')
  })

  it('trims whitespace around parts', () => {
    expect(normalizeKeys('mod + p')).toBe('mod+p')
  })

  it('handles single key', () => {
    expect(normalizeKeys('escape')).toBe('escape')
  })

  it('preserves special characters like /', () => {
    expect(normalizeKeys('mod+/')).toBe('mod+/')
  })

  it('normalizes already-normalized input unchanged', () => {
    expect(normalizeKeys('mod+shift+p')).toBe('mod+shift+p')
  })
})

// ---------------------------------------------------------------------------
// serializeEvent + normalizeKeys agreement
// ---------------------------------------------------------------------------

describe('serializeEvent and normalizeKeys produce matching strings', () => {
  const cases: Array<{
    label: string
    definition: string
    event: Partial<KeyboardEvent> & { key: string }
    isMac: boolean
  }> = [
    {
      label: 'mod+p on Mac',
      definition: 'mod+p',
      event: { key: 'p', metaKey: true },
      isMac: true,
    },
    {
      label: 'mod+p on Windows/Linux',
      definition: 'mod+p',
      event: { key: 'p', ctrlKey: true },
      isMac: false,
    },
    {
      label: 'mod+shift+f on Mac',
      definition: 'mod+shift+f',
      event: { key: 'f', metaKey: true, shiftKey: true },
      isMac: true,
    },
    {
      label: 'mod+shift+p on Mac',
      definition: 'Mod+Shift+P',
      event: { key: 'P', metaKey: true, shiftKey: true },
      isMac: true,
    },
    {
      label: 'mod+/ on Mac',
      definition: 'mod+/',
      event: { key: '/', metaKey: true },
      isMac: true,
    },
  ]

  for (const { label, definition, event, isMac } of cases) {
    it(`matches for ${label}`, () => {
      const serialized = serializeEvent(makeEvent(event), isMac)
      const normalized = normalizeKeys(definition)
      expect(serialized).toBe(normalized)
    })
  }
})

// ---------------------------------------------------------------------------
// isInputFocused
// ---------------------------------------------------------------------------

describe('isInputFocused', () => {
  it('returns true for INPUT elements', () => {
    const e = makeEventWithTarget('p', { tagName: 'INPUT', isContentEditable: false })
    expect(isInputFocused(e)).toBe(true)
  })

  it('returns true for TEXTAREA elements', () => {
    const e = makeEventWithTarget('p', { tagName: 'TEXTAREA', isContentEditable: false })
    expect(isInputFocused(e)).toBe(true)
  })

  it('returns true for SELECT elements', () => {
    const e = makeEventWithTarget('p', { tagName: 'SELECT', isContentEditable: false })
    expect(isInputFocused(e)).toBe(true)
  })

  it('returns true for contentEditable elements', () => {
    const e = makeEventWithTarget('p', { tagName: 'DIV', isContentEditable: true })
    expect(isInputFocused(e)).toBe(true)
  })

  it('returns false for regular DIV elements', () => {
    const e = makeEventWithTarget('p', { tagName: 'DIV', isContentEditable: false })
    expect(isInputFocused(e)).toBe(false)
  })

  it('returns false when target is null', () => {
    const e = makeEvent({ key: 'p' })
    expect(isInputFocused(e)).toBe(false)
  })
})

// ---------------------------------------------------------------------------
// isMonacoFocused
// ---------------------------------------------------------------------------

describe('isMonacoFocused', () => {
  it('returns true when target is inside .monaco-editor', () => {
    const e = makeEventWithTarget('p', {
      tagName: 'TEXTAREA',
      isContentEditable: false,
      closest: ((selector: string) =>
        selector === '.monaco-editor' ? ({} as Element) : null) as HTMLElement['closest'],
    })
    expect(isMonacoFocused(e)).toBe(true)
  })

  it('returns false when target is not inside .monaco-editor', () => {
    const e = makeEventWithTarget('p', {
      tagName: 'TEXTAREA',
      isContentEditable: false,
      closest: (() => null) as HTMLElement['closest'],
    })
    expect(isMonacoFocused(e)).toBe(false)
  })

  it('returns false when target is null', () => {
    const e = makeEvent({ key: 'p' })
    expect(isMonacoFocused(e)).toBe(false)
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
