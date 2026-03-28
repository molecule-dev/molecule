import { describe, expect, it } from 'vitest'

import type { KeyboardShortcutsProvider } from '@molecule/app-keyboard-shortcuts'

import { createProvider, provider } from '../index.js'

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
  })

  describe('isPressed', () => {
    it('should return false for unpressed keys', () => {
      const p = createProvider()
      expect(p.isPressed('shift')).toBe(false)
    })
  })
})
