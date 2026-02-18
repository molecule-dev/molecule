import { beforeEach, describe, expect, it } from 'vitest'

import {
  bondNamed,
  bondSingleton,
  clearProviders,
  configure,
  getAllNamed,
  getNamed,
  getSingleton,
  registry,
  requireNamed,
  requireSingleton,
  reset,
  unbondNamed,
  unbondSingleton,
} from '../registry.js'

describe('registry', () => {
  beforeEach(() => {
    reset()
    configure({ strict: false, verbose: false })
  })

  describe('bondSingleton', () => {
    it('should bond a singleton provider', () => {
      const mockProvider = { name: 'test' }
      bondSingleton('test', mockProvider)
      expect(registry.singletons.get('test')).toBe(mockProvider)
    })

    it('should overwrite existing provider in non-strict mode', () => {
      const provider1 = { name: 'first' }
      const provider2 = { name: 'second' }
      bondSingleton('test', provider1)
      bondSingleton('test', provider2)
      expect(registry.singletons.get('test')).toBe(provider2)
    })

    it('should throw in strict mode when provider already bonded', () => {
      configure({ strict: true })
      const provider1 = { name: 'first' }
      const provider2 = { name: 'second' }
      bondSingleton('test', provider1)
      expect(() => bondSingleton('test', provider2)).toThrow("Provider 'test' is already bonded")
    })
  })

  describe('getSingleton', () => {
    it('should return bonded provider', () => {
      const mockProvider = { name: 'test' }
      bondSingleton('test', mockProvider)
      expect(getSingleton('test')).toBe(mockProvider)
    })

    it('should return undefined if not bonded', () => {
      expect(getSingleton('nonexistent')).toBeUndefined()
    })
  })

  describe('requireSingleton', () => {
    it('should return bonded provider', () => {
      const mockProvider = { name: 'test' }
      bondSingleton('test', mockProvider)
      expect(requireSingleton('test')).toBe(mockProvider)
    })

    it('should throw if not bonded', () => {
      expect(() => requireSingleton('nonexistent')).toThrow("No 'nonexistent' provider bonded")
    })
  })

  describe('bondNamed', () => {
    it('should bond a named provider', () => {
      const mockProvider = { name: 'github' }
      bondNamed('oauth', 'github', mockProvider)
      expect(registry.named.get('oauth')?.get('github')).toBe(mockProvider)
    })

    it('should support multiple named providers of same type', () => {
      const github = { name: 'github' }
      const google = { name: 'google' }
      bondNamed('oauth', 'github', github)
      bondNamed('oauth', 'google', google)
      expect(registry.named.get('oauth')?.get('github')).toBe(github)
      expect(registry.named.get('oauth')?.get('google')).toBe(google)
    })

    it('should throw in strict mode when named provider already bonded', () => {
      configure({ strict: true })
      const provider1 = { name: 'first' }
      const provider2 = { name: 'second' }
      bondNamed('oauth', 'github', provider1)
      expect(() => bondNamed('oauth', 'github', provider2)).toThrow(
        "Provider 'oauth:github' is already bonded",
      )
    })
  })

  describe('getNamed', () => {
    it('should return bonded named provider', () => {
      const mockProvider = { name: 'github' }
      bondNamed('oauth', 'github', mockProvider)
      expect(getNamed('oauth', 'github')).toBe(mockProvider)
    })

    it('should return undefined if type not bonded', () => {
      expect(getNamed('oauth', 'github')).toBeUndefined()
    })

    it('should return undefined if name not bonded', () => {
      bondNamed('oauth', 'github', { name: 'github' })
      expect(getNamed('oauth', 'google')).toBeUndefined()
    })
  })

  describe('getAllNamed', () => {
    it('should return all bonded named providers', () => {
      const github = { name: 'github' }
      const google = { name: 'google' }
      bondNamed('oauth', 'github', github)
      bondNamed('oauth', 'google', google)
      const all = getAllNamed('oauth')
      expect(all.size).toBe(2)
      expect(all.get('github')).toBe(github)
      expect(all.get('google')).toBe(google)
    })

    it('should return empty map if type not bonded', () => {
      const all = getAllNamed('oauth')
      expect(all.size).toBe(0)
    })
  })

  describe('requireNamed', () => {
    it('should return bonded named provider', () => {
      const mockProvider = { name: 'github' }
      bondNamed('oauth', 'github', mockProvider)
      expect(requireNamed('oauth', 'github')).toBe(mockProvider)
    })

    it('should throw if named provider not bonded', () => {
      expect(() => requireNamed('oauth', 'github')).toThrow("No 'oauth:github' provider bonded")
    })
  })

  describe('unbondSingleton', () => {
    it('should unbond a singleton provider', () => {
      bondSingleton('test', { name: 'test' })
      expect(unbondSingleton('test')).toBe(true)
      expect(getSingleton('test')).toBeUndefined()
    })

    it('should return false if not bonded', () => {
      expect(unbondSingleton('nonexistent')).toBe(false)
    })
  })

  describe('unbondNamed', () => {
    it('should unbond a named provider', () => {
      bondNamed('oauth', 'github', { name: 'github' })
      expect(unbondNamed('oauth', 'github')).toBe(true)
      expect(getNamed('oauth', 'github')).toBeUndefined()
    })

    it('should return false if not bonded', () => {
      expect(unbondNamed('oauth', 'github')).toBe(false)
    })
  })

  describe('clearProviders', () => {
    it('should unbond all providers of a type', () => {
      bondSingleton('test', { name: 'singleton' })
      bondNamed('test', 'named1', { name: 'named1' })
      bondNamed('test', 'named2', { name: 'named2' })
      clearProviders('test')
      expect(getSingleton('test')).toBeUndefined()
      expect(getNamed('test', 'named1')).toBeUndefined()
      expect(getNamed('test', 'named2')).toBeUndefined()
    })
  })

  describe('reset', () => {
    it('should clear all bonded providers', () => {
      bondSingleton('logger', { name: 'logger' })
      bondSingleton('email', { name: 'email' })
      bondNamed('oauth', 'github', { name: 'github' })
      reset()
      expect(registry.singletons.size).toBe(0)
      expect(registry.named.size).toBe(0)
    })
  })

  describe('configure', () => {
    it('should update config partially', () => {
      configure({ strict: true })
      bondSingleton('test', { name: 'test' })
      expect(() => bondSingleton('test', { name: 'test2' })).toThrow()
    })
  })
})
