// @vitest-environment jsdom
/**
 * Proves the module-level `@example` in `src/index.ts` (rendered as the README
 * Quick Start) works exactly as written, through the real hotkeys-js bond,
 * pressing the combo with real `KeyboardEvent`s in jsdom.
 *
 * @module
 */
import { describe, expect, it, vi } from 'vitest'

import { t } from '@molecule/app-i18n'
import { provider } from '@molecule/app-keyboard-shortcuts-hotkeys'

import { requireProvider, setProvider } from '../index.js'

/**
 * Dispatches a real keydown + keyup pair on the document.
 *
 * @param init - The keyboard event init (key + modifiers).
 * @returns The dispatched keydown event.
 */
function press(init: KeyboardEventInit): KeyboardEvent {
  const keydown = new KeyboardEvent('keydown', { bubbles: true, cancelable: true, ...init })
  document.dispatchEvent(keydown)
  document.dispatchEvent(new KeyboardEvent('keyup', { bubbles: true, cancelable: true, ...init }))
  return keydown
}

describe('README @example', () => {
  it('fires the registered handler on the real combo until unregistered', () => {
    setProvider(provider)

    const saveDocument = vi.fn()
    const shortcuts = requireProvider()
    const unregister = shortcuts.register({
      keys: 'ctrl+s, command+s',
      handler: () => saveDocument(),
      description: t('common.save', undefined, { defaultValue: 'Save' }),
    })
    expect(shortcuts.getAll().map((s) => s.description)).toEqual(['Save'])

    const event = press({ key: 's', code: 'KeyS', keyCode: 83, ctrlKey: true })
    expect(saveDocument).toHaveBeenCalledTimes(1)
    expect(event.defaultPrevented).toBe(true)

    unregister()
    press({ key: 's', code: 'KeyS', keyCode: 83, ctrlKey: true })
    expect(saveDocument).toHaveBeenCalledTimes(1)
    expect(shortcuts.getAll()).toEqual([])
  })
})
