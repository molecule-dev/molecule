// hotkeys-js is a global singleton; the provider binds into it. Importing it
// here lets us fully reset global bindings + scope between tests.
import hotkeys from 'hotkeys-js'
import { afterEach, describe, expect, it, vi } from 'vitest'

import type { KeyboardShortcutsProvider } from '@molecule/app-keyboard-shortcuts'

import { createProvider, provider } from '../index.js'

/**
 * Dispatches a real `keydown` (and matching `keyup`) so hotkeys-js's document
 * listener runs its combo matching against the registered shortcuts.
 *
 * @param init - KeyboardEvent init (e.g. `{ key: 's', ctrlKey: true }`).
 * @param target - Element to dispatch from (defaults to `document`). Dispatching
 *   from an `<input>` exercises hotkeys-js's built-in input guard.
 * @returns The dispatched keydown event (inspect `defaultPrevented`).
 */
function pressKey(init: KeyboardEventInit, target: EventTarget = document): KeyboardEvent {
  const keydown = new KeyboardEvent('keydown', {
    bubbles: true,
    cancelable: true,
    ...init,
  })
  target.dispatchEvent(keydown)
  target.dispatchEvent(new KeyboardEvent('keyup', { bubbles: true, cancelable: true, ...init }))
  return keydown
}

afterEach(() => {
  // Clear every hotkeys-js binding and restore the default scope so global
  // singleton state never leaks between tests.
  hotkeys.unbind()
  hotkeys.setScope('all')
  document.body.innerHTML = ''
})

describe('@molecule/app-keyboard-shortcuts-hotkeys', () => {
  describe('provider', () => {
    it('should export a default provider instance', () => {
      expect(provider).toBeDefined()
      expect(provider.name).toBe('hotkeys')
    })

    it('should conform to KeyboardShortcutsProvider interface', () => {
      const p: KeyboardShortcutsProvider = provider
      expect(typeof p.register).toBe('function')
      expect(typeof p.registerMany).toBe('function')
      expect(typeof p.unregister).toBe('function')
      expect(typeof p.unregisterAll).toBe('function')
      expect(typeof p.getAll).toBe('function')
      expect(typeof p.isPressed).toBe('function')
      expect(typeof p.enable).toBe('function')
      expect(typeof p.disable).toBe('function')
    })
  })

  describe('createProvider', () => {
    it('should create a provider with default config', () => {
      const p = createProvider()
      expect(p.name).toBe('hotkeys')
    })

    it('should create a provider with custom config', () => {
      const p = createProvider({ defaultScope: 'editor', enabled: false })
      expect(p.name).toBe('hotkeys')
    })
  })

  describe('shortcut management', () => {
    it('should register a shortcut and return unregister function', () => {
      const p = createProvider()
      const unregister = p.register({
        keys: 'ctrl+s',
        handler: () => {},
        description: 'Save',
      })
      expect(p.getAll()).toHaveLength(1)
      expect(p.getAll()[0].keys).toBe('ctrl+s')

      unregister()
      expect(p.getAll()).toHaveLength(0)
    })

    it('should register many shortcuts and return unregister function', () => {
      const p = createProvider()
      const unregister = p.registerMany([
        { keys: 'ctrl+s', handler: () => {}, description: 'Save' },
        { keys: 'ctrl+z', handler: () => {}, description: 'Undo' },
        { keys: 'ctrl+y', handler: () => {}, description: 'Redo' },
      ])
      expect(p.getAll()).toHaveLength(3)

      unregister()
      expect(p.getAll()).toHaveLength(0)
    })

    it('should unregister by keys', () => {
      const p = createProvider()
      p.register({ keys: 'ctrl+s', handler: () => {} })
      p.register({ keys: 'ctrl+z', handler: () => {} })
      expect(p.getAll()).toHaveLength(2)

      p.unregister('ctrl+s')
      expect(p.getAll()).toHaveLength(1)
      expect(p.getAll()[0].keys).toBe('ctrl+z')
    })

    it('should unregister all shortcuts', () => {
      const p = createProvider()
      p.register({ keys: 'ctrl+s', handler: () => {} })
      p.register({ keys: 'ctrl+z', handler: () => {} })
      p.unregisterAll()
      expect(p.getAll()).toHaveLength(0)
    })

    it('should return registered shortcuts with metadata', () => {
      const p = createProvider()
      p.register({
        keys: 'ctrl+s',
        handler: () => {},
        description: 'Save file',
        scope: 'editor',
      })

      const all = p.getAll()
      expect(all[0].keys).toBe('ctrl+s')
      expect(all[0].description).toBe('Save file')
      expect(all[0].scope).toBe('editor')
      expect(all[0].enabled).toBe(true)
    })
  })

  // The core bug this bond fixes: it stored shortcuts in a Map but never
  // attached a key listener, so a registered handler could NEVER fire. These
  // tests dispatch REAL KeyboardEvents (jsdom) and assert the handler runs.
  describe('key event dispatch (handler firing)', () => {
    it('invokes the handler when the registered key combo is pressed', () => {
      const p = createProvider()
      const handler = vi.fn()
      p.register({ keys: 'ctrl+s', handler })

      pressKey({ key: 's', ctrlKey: true })

      expect(handler).toHaveBeenCalledTimes(1)
      expect(handler.mock.calls[0][0]).toBeInstanceOf(KeyboardEvent)
    })

    it('does not invoke the handler for a different key combo', () => {
      const p = createProvider()
      const handler = vi.fn()
      p.register({ keys: 'ctrl+s', handler })

      pressKey({ key: 'z', ctrlKey: true })

      expect(handler).not.toHaveBeenCalled()
    })

    it('stops firing after unregister', () => {
      const p = createProvider()
      const handler = vi.fn()
      const unregister = p.register({ keys: 'ctrl+s', handler })

      pressKey({ key: 's', ctrlKey: true })
      expect(handler).toHaveBeenCalledTimes(1)

      unregister()
      pressKey({ key: 's', ctrlKey: true })
      expect(handler).toHaveBeenCalledTimes(1)
    })

    it('stops firing after unregisterAll', () => {
      const p = createProvider()
      const save = vi.fn()
      const undo = vi.fn()
      p.registerMany([
        { keys: 'ctrl+s', handler: save },
        { keys: 'ctrl+z', handler: undo },
      ])

      p.unregisterAll()
      pressKey({ key: 's', ctrlKey: true })
      pressKey({ key: 'z', ctrlKey: true })

      expect(save).not.toHaveBeenCalled()
      expect(undo).not.toHaveBeenCalled()
    })

    it('calls preventDefault by default (suppresses the browser action)', () => {
      const p = createProvider()
      p.register({ keys: 'ctrl+s', handler: () => {} })

      const event = pressKey({ key: 's', ctrlKey: true })

      expect(event.defaultPrevented).toBe(true)
    })

    it('does not call preventDefault when preventDefault is false', () => {
      const p = createProvider()
      const handler = vi.fn()
      p.register({ keys: 'ctrl+s', handler, preventDefault: false })

      const event = pressKey({ key: 's', ctrlKey: true })

      expect(handler).toHaveBeenCalledTimes(1)
      expect(event.defaultPrevented).toBe(false)
    })

    it('does not fire while an input element is focused, but fires elsewhere', () => {
      const p = createProvider()
      const handler = vi.fn()
      p.register({ keys: 'ctrl+s', handler })

      const input = document.createElement('input')
      document.body.appendChild(input)

      // Bubbles up to hotkeys-js's document listener, but its default filter
      // rejects the INPUT target.
      pressKey({ key: 's', ctrlKey: true }, input)
      expect(handler).not.toHaveBeenCalled()

      // Same combo from a non-input target fires normally.
      pressKey({ key: 's', ctrlKey: true })
      expect(handler).toHaveBeenCalledTimes(1)
    })

    it('re-registering the same combo replaces the handler (no double-fire)', () => {
      const p = createProvider()
      const first = vi.fn()
      const second = vi.fn()
      p.register({ keys: 'ctrl+s', handler: first })
      p.register({ keys: 'ctrl+s', handler: second })

      pressKey({ key: 's', ctrlKey: true })

      expect(first).not.toHaveBeenCalled()
      expect(second).toHaveBeenCalledTimes(1)
      expect(p.getAll()).toHaveLength(1)
    })
  })

  describe('enable/disable', () => {
    it('should disable all shortcuts', () => {
      const p = createProvider()
      p.register({ keys: 'ctrl+s', handler: () => {} })
      p.disable()
      expect(p.getAll()[0].enabled).toBe(false)
    })

    it('should re-enable all shortcuts', () => {
      const p = createProvider()
      p.register({ keys: 'ctrl+s', handler: () => {} })
      p.disable()
      p.enable()
      expect(p.getAll()[0].enabled).toBe(true)
    })

    it('disable() suppresses firing; enable() restores it', () => {
      const p = createProvider()
      const handler = vi.fn()
      p.register({ keys: 'ctrl+s', handler })

      p.disable()
      pressKey({ key: 's', ctrlKey: true })
      expect(handler).not.toHaveBeenCalled()

      p.enable()
      pressKey({ key: 's', ctrlKey: true })
      expect(handler).toHaveBeenCalledTimes(1)
    })

    it('starts disabled when configured with enabled: false', () => {
      const p = createProvider({ enabled: false })
      const handler = vi.fn()
      p.register({ keys: 'ctrl+s', handler })

      pressKey({ key: 's', ctrlKey: true })
      expect(handler).not.toHaveBeenCalled()
      expect(p.getAll()[0].enabled).toBe(false)
    })
  })

  describe('isPressed', () => {
    it('should return false for unpressed keys', () => {
      const p = createProvider()
      expect(p.isPressed('shift')).toBe(false)
    })

    it('reflects a key that is currently held down', () => {
      const p = createProvider()
      // Attach a binding so hotkeys-js installs its document listener.
      p.register({ keys: 'ctrl+s', handler: () => {} })

      document.dispatchEvent(new KeyboardEvent('keydown', { key: 'a', bubbles: true }))
      expect(p.isPressed('a')).toBe(true)

      document.dispatchEvent(new KeyboardEvent('keyup', { key: 'a', bubbles: true }))
      expect(p.isPressed('a')).toBe(false)
    })
  })
})
