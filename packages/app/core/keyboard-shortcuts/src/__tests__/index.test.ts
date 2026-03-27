import { beforeEach, describe, expect, it, vi } from 'vitest'

import type { KeyboardShortcutsProvider, RegisteredShortcut, Shortcut } from '../index.js'
import { getProvider, hasProvider, requireProvider, setProvider } from '../index.js'

describe('@molecule/app-keyboard-shortcuts', () => {
  beforeEach(() => {
    setProvider(null as unknown as KeyboardShortcutsProvider)
  })

  describe('Types compile correctly', () => {
    it('should compile Shortcut type', () => {
      const shortcut: Shortcut = {
        keys: 'ctrl+s',
        handler: () => {},
        description: 'Save',
        scope: 'editor',
        preventDefault: true,
      }
      expect(shortcut.keys).toBe('ctrl+s')
    })

    it('should compile Shortcut with minimal fields', () => {
      const shortcut: Shortcut = {
        keys: 'escape',
        handler: () => {},
      }
      expect(shortcut.keys).toBe('escape')
    })

    it('should compile RegisteredShortcut type', () => {
      const registered: RegisteredShortcut = {
        keys: 'ctrl+s',
        description: 'Save',
        scope: 'editor',
        enabled: true,
      }
      expect(registered.enabled).toBe(true)
    })

    it('should compile KeyboardShortcutsProvider type', () => {
      const provider: KeyboardShortcutsProvider = {
        name: 'test',
        register: () => () => {},
        registerMany: () => () => {},
        unregister: () => {},
        unregisterAll: () => {},
        getAll: () => [],
        isPressed: () => false,
        enable: () => {},
        disable: () => {},
      }
      expect(provider.name).toBe('test')
    })
  })

  describe('Provider management', () => {
    it('should return null when no provider is set', () => {
      expect(getProvider()).toBeNull()
    })

    it('should return false for hasProvider when none set', () => {
      expect(hasProvider()).toBe(false)
    })

    it('should throw on requireProvider when none set', () => {
      expect(() => requireProvider()).toThrow(
        'KeyboardShortcuts provider not configured. Bond a keyboard-shortcuts provider first.',
      )
    })

    it('should set and get a provider', () => {
      const mockProvider: KeyboardShortcutsProvider = {
        name: 'test-shortcuts',
        register: () => () => {},
        registerMany: () => () => {},
        unregister: () => {},
        unregisterAll: () => {},
        getAll: () => [],
        isPressed: () => false,
        enable: () => {},
        disable: () => {},
      }
      setProvider(mockProvider)
      expect(getProvider()).toBe(mockProvider)
      expect(hasProvider()).toBe(true)
    })

    it('should return provider from requireProvider after setting', () => {
      const mockProvider: KeyboardShortcutsProvider = {
        name: 'test-shortcuts',
        register: () => () => {},
        registerMany: () => () => {},
        unregister: () => {},
        unregisterAll: () => {},
        getAll: () => [],
        isPressed: () => false,
        enable: () => {},
        disable: () => {},
      }
      setProvider(mockProvider)
      expect(requireProvider()).toBe(mockProvider)
    })
  })

  describe('Provider operations', () => {
    it('should register and unregister a shortcut', () => {
      const unregisterFn = vi.fn()
      const mockProvider: KeyboardShortcutsProvider = {
        name: 'test',
        register: () => unregisterFn,
        registerMany: () => () => {},
        unregister: () => {},
        unregisterAll: () => {},
        getAll: () => [],
        isPressed: () => false,
        enable: () => {},
        disable: () => {},
      }
      setProvider(mockProvider)

      const unregister = requireProvider().register({
        keys: 'ctrl+s',
        handler: () => {},
      })
      unregister()
      expect(unregisterFn).toHaveBeenCalled()
    })

    it('should return all registered shortcuts', () => {
      const registered: RegisteredShortcut[] = [
        { keys: 'ctrl+s', description: 'Save', enabled: true },
        { keys: 'ctrl+z', description: 'Undo', enabled: true },
      ]
      const mockProvider: KeyboardShortcutsProvider = {
        name: 'test',
        register: () => () => {},
        registerMany: () => () => {},
        unregister: () => {},
        unregisterAll: () => {},
        getAll: () => registered,
        isPressed: () => false,
        enable: () => {},
        disable: () => {},
      }
      setProvider(mockProvider)

      expect(requireProvider().getAll()).toEqual(registered)
    })
  })
})
