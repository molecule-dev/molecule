// @vitest-environment jsdom
/**
 * Tests for the keyboard shortcut system's pure logic.
 *
 * Covers key serialization, normalization, focus detection and which shortcut a
 * keydown triggers. These are the core functions that determine whether a
 * shortcut fires — a bug here silently breaks all IDE shortcuts. The events are
 * real `KeyboardEvent`s dispatched from real elements (jsdom).
 *
 * @module
 */

import { afterEach, describe, expect, it, vi } from 'vitest'

import {
  findKeyboardShortcut,
  isInputFocused,
  isMonacoFocused,
  isShortcutBlockedByFocus,
  normalizeKeys,
  serializeEvent,
} from '../keyboard-shortcut-utilities.js'
import type { KeyboardShortcut } from '../types.js'

// ---------------------------------------------------------------------------
// Helpers — real keydown events, dispatched from a chosen element
// ---------------------------------------------------------------------------

/** What a test sets on a keydown: the key and its modifiers. */
type KeyInit = KeyboardEventInit & { key: string }

/**
 * A keydown event that was never dispatched (no target).
 *
 * @param init - The key and modifiers.
 * @returns The event.
 */
function makeEvent(init: KeyInit): KeyboardEvent {
  return new KeyboardEvent('keydown', init)
}

/**
 * Dispatches a keydown from an element placed in the page, as a browser does
 * for the focused element.
 *
 * @param target - The element the key is pressed in.
 * @param init - The key and modifiers.
 * @returns The dispatched event (its `target` is `target`).
 */
function pressIn(target: HTMLElement, init: KeyInit = { key: 'p' }): KeyboardEvent {
  if (!target.isConnected) document.body.append(target.closest('.monaco-editor') ?? target)
  const event = new KeyboardEvent('keydown', { ...init, bubbles: true, cancelable: true })
  target.dispatchEvent(event)
  return event
}

/**
 * Monaco's hidden `<textarea>`, inside its `.monaco-editor` root.
 *
 * @returns The textarea keys are pressed in.
 */
function monacoTextarea(): HTMLTextAreaElement {
  const root = document.createElement('div')
  root.className = 'monaco-editor'
  const textarea = document.createElement('textarea')
  root.append(document.createElement('div'), textarea)
  return textarea
}

afterEach(() => {
  document.body.replaceChildren()
})

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
    event: KeyInit
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
    expect(isInputFocused(pressIn(document.createElement('input')))).toBe(true)
  })

  it('returns true for TEXTAREA elements', () => {
    expect(isInputFocused(pressIn(document.createElement('textarea')))).toBe(true)
  })

  it('returns true for SELECT elements', () => {
    expect(isInputFocused(pressIn(document.createElement('select')))).toBe(true)
  })

  it('returns true for contentEditable elements', () => {
    const div = document.createElement('div')
    div.contentEditable = 'true'
    // jsdom does not compute isContentEditable; a browser does, from the attribute.
    Object.defineProperty(div, 'isContentEditable', { value: true })
    expect(isInputFocused(pressIn(div))).toBe(true)
  })

  it('returns false for regular DIV elements', () => {
    expect(isInputFocused(pressIn(document.createElement('div')))).toBe(false)
  })

  it('returns false when target is null', () => {
    expect(isInputFocused(makeEvent({ key: 'p' }))).toBe(false)
  })
})

// ---------------------------------------------------------------------------
// isMonacoFocused
// ---------------------------------------------------------------------------

describe('isMonacoFocused', () => {
  it('returns true when target is inside .monaco-editor', () => {
    expect(isMonacoFocused(pressIn(monacoTextarea()))).toBe(true)
  })

  it('returns false when target is not inside .monaco-editor', () => {
    expect(isMonacoFocused(pressIn(document.createElement('textarea')))).toBe(false)
  })

  it('returns false when target is null', () => {
    expect(isMonacoFocused(makeEvent({ key: 'p' }))).toBe(false)
  })
})

// ---------------------------------------------------------------------------
// isShortcutBlockedByFocus
// ---------------------------------------------------------------------------

describe('isShortcutBlockedByFocus', () => {
  const flags = [
    {},
    { allowInInput: true },
    { allowInEditor: true },
    { allowInInput: true, allowInEditor: true },
  ] as const

  it('never blocks a key pressed outside a text field and the editor', () => {
    for (const shortcut of flags)
      expect(isShortcutBlockedByFocus(shortcut, pressIn(document.createElement('button')))).toBe(
        false,
      )
  })

  it('in a text field, blocks unless allowInInput', () => {
    expect(
      flags.map((shortcut) =>
        isShortcutBlockedByFocus(shortcut, pressIn(document.createElement('input'))),
      ),
    ).toEqual([true, false, true, false])
  })

  it('in the Monaco editor, only allowInEditor decides: its textarea is not a text field', () => {
    expect(
      flags.map((shortcut) => isShortcutBlockedByFocus(shortcut, pressIn(monacoTextarea()))),
    ).toEqual([true, true, false, false])
  })
})

// ---------------------------------------------------------------------------
// findKeyboardShortcut
// ---------------------------------------------------------------------------

describe('findKeyboardShortcut', () => {
  const shortcut = (keys: string, extra: Partial<KeyboardShortcut> = {}): KeyboardShortcut => ({
    keys,
    handler: vi.fn(),
    ...extra,
  })

  it('finds the shortcut whose keys match the combo, on each platform', () => {
    const save = shortcut('Mod+S')
    const shortcuts = [shortcut('mod+p'), save]
    const button = document.createElement('button')
    expect(
      findKeyboardShortcut(shortcuts, pressIn(button, { key: 's', ctrlKey: true }), false),
    ).toBe(save)
    expect(
      findKeyboardShortcut(shortcuts, pressIn(button, { key: 's', metaKey: true }), true),
    ).toBe(save)
    expect(
      findKeyboardShortcut(shortcuts, pressIn(button, { key: 's', metaKey: true }), false),
    ).toBeUndefined()
  })

  it('returns nothing for a key no shortcut has, or an empty list', () => {
    const button = document.createElement('button')
    expect(findKeyboardShortcut([shortcut('mod+p')], pressIn(button, { key: 'p' }), false)).toBe(
      undefined,
    )
    expect(findKeyboardShortcut([], pressIn(button, { key: 'p', ctrlKey: true }), false)).toBe(
      undefined,
    )
  })

  it('takes the first match; one the focus rules out lets a later one fire', () => {
    const first = shortcut('mod+k')
    const inInput = shortcut('mod+k', { allowInInput: true })
    const shortcuts = [first, shortcut('mod+k'), inInput]
    const key = { key: 'k', ctrlKey: true }
    expect(
      findKeyboardShortcut(shortcuts, pressIn(document.createElement('div'), key), false),
    ).toBe(first)
    expect(
      findKeyboardShortcut(shortcuts, pressIn(document.createElement('input'), key), false),
    ).toBe(inInput)
  })

  it("fires a shortcut that allows only the editor from Monaco's textarea", () => {
    const save = shortcut('mod+s', { allowInEditor: true })
    expect(
      findKeyboardShortcut([save], pressIn(monacoTextarea(), { key: 's', ctrlKey: true }), false),
    ).toBe(save)
  })
})
