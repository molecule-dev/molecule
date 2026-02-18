import { beforeEach, describe, expect, it, vi } from 'vitest'

import { createStore, getProvider, setProvider } from '../provider.js'
import { createSimpleStateProvider } from '../simple-provider.js'
import type { StateProvider, StoreConfig } from '../types.js'

describe('State Provider', () => {
  beforeEach(() => {
    // Reset provider between tests
    setProvider(null as unknown as StateProvider)
  })

  describe('setProvider / getProvider', () => {
    it('should throw when no provider has been set', () => {
      expect(() => getProvider()).toThrow(/No provider set/)
    })

    it('should return the custom provider after setting it', () => {
      const mockProvider: StateProvider = {
        createStore: vi.fn(),
      }

      setProvider(mockProvider)
      const provider = getProvider()

      expect(provider).toBe(mockProvider)
    })

    it('should throw after resetting provider to null', () => {
      const mockProvider: StateProvider = {
        createStore: vi.fn(),
      }

      setProvider(mockProvider)
      expect(getProvider()).toBe(mockProvider)

      // Reset to null — should now throw
      setProvider(null as unknown as StateProvider)
      expect(() => getProvider()).toThrow(/No provider set/)
    })
  })

  describe('createStore', () => {
    it('should create a store using the current provider', () => {
      setProvider(createSimpleStateProvider())

      interface TestState {
        count: number
      }

      const config: StoreConfig<TestState> = {
        initialState: { count: 0 },
      }

      const store = createStore(config)

      expect(store).toBeDefined()
      expect(typeof store.getState).toBe('function')
      expect(typeof store.setState).toBe('function')
      expect(typeof store.subscribe).toBe('function')
      expect(typeof store.destroy).toBe('function')
    })

    it('should create a store with the correct initial state', () => {
      setProvider(createSimpleStateProvider())

      interface TestState {
        name: string
        value: number
      }

      const config: StoreConfig<TestState> = {
        initialState: { name: 'test', value: 42 },
      }

      const store = createStore(config)
      expect(store.getState()).toEqual({ name: 'test', value: 42 })
    })
  })
})
