import { describe, expect, it, vi } from 'vitest'

import { createSimpleStateProvider, simpleProvider } from '../simple-provider.js'
import type { Store, StoreConfig } from '../types.js'

describe('Simple State Provider', () => {
  describe('createSimpleStateProvider', () => {
    it('should create a valid state provider', () => {
      const provider = createSimpleStateProvider()
      expect(provider).toBeDefined()
      expect(typeof provider.createStore).toBe('function')
    })

    it('should be independent instances', () => {
      const provider1 = createSimpleStateProvider()
      const provider2 = createSimpleStateProvider()
      expect(provider1).not.toBe(provider2)
    })
  })

  describe('simpleProvider', () => {
    it('should be a valid state provider', () => {
      expect(simpleProvider).toBeDefined()
      expect(typeof simpleProvider.createStore).toBe('function')
    })
  })

  describe('Store created by simple provider', () => {
    interface TestState {
      count: number
      name: string
    }

    const createTestStore = (
      initialState: TestState = { count: 0, name: 'test' },
      middleware?: StoreConfig<TestState>['middleware'],
    ): Store<TestState> => {
      const provider = createSimpleStateProvider()
      return provider.createStore<TestState>({
        initialState,
        middleware,
      })
    }

    describe('getState', () => {
      it('should return the current state', () => {
        const store = createTestStore({ count: 5, name: 'hello' })
        expect(store.getState()).toEqual({ count: 5, name: 'hello' })
      })
    })

    describe('setState', () => {
      it('should update state with partial object', () => {
        const store = createTestStore({ count: 0, name: 'test' })

        store.setState({ count: 10 })

        expect(store.getState()).toEqual({ count: 10, name: 'test' })
      })

      it('should update state with updater function', () => {
        const store = createTestStore({ count: 5, name: 'test' })

        store.setState((state) => ({ count: state.count + 1 }))

        expect(store.getState()).toEqual({ count: 6, name: 'test' })
      })

      it('should update multiple properties at once', () => {
        const store = createTestStore({ count: 0, name: 'test' })

        store.setState({ count: 100, name: 'updated' })

        expect(store.getState()).toEqual({ count: 100, name: 'updated' })
      })

      it('should preserve unchanged properties', () => {
        const store = createTestStore({ count: 0, name: 'original' })

        store.setState({ count: 50 })

        expect(store.getState().name).toBe('original')
      })
    })

    describe('subscribe', () => {
      it('should call listener when state changes', () => {
        const store = createTestStore()
        const listener = vi.fn()

        store.subscribe(listener)
        store.setState({ count: 1 })

        expect(listener).toHaveBeenCalledTimes(1)
        expect(listener).toHaveBeenCalledWith(
          { count: 1, name: 'test' },
          { count: 0, name: 'test' },
        )
      })

      it('should call multiple listeners', () => {
        const store = createTestStore()
        const listener1 = vi.fn()
        const listener2 = vi.fn()

        store.subscribe(listener1)
        store.subscribe(listener2)
        store.setState({ count: 1 })

        expect(listener1).toHaveBeenCalledTimes(1)
        expect(listener2).toHaveBeenCalledTimes(1)
      })

      it('should return unsubscribe function', () => {
        const store = createTestStore()
        const listener = vi.fn()

        const unsubscribe = store.subscribe(listener)
        store.setState({ count: 1 })
        expect(listener).toHaveBeenCalledTimes(1)

        unsubscribe()
        store.setState({ count: 2 })
        expect(listener).toHaveBeenCalledTimes(1)
      })

      it('should provide previous state to listener', () => {
        const store = createTestStore({ count: 0, name: 'test' })
        const listener = vi.fn()

        store.subscribe(listener)
        store.setState({ count: 5 })
        store.setState({ count: 10 })

        expect(listener).toHaveBeenNthCalledWith(
          2,
          { count: 10, name: 'test' },
          { count: 5, name: 'test' },
        )
      })
    })

    describe('destroy', () => {
      it('should clear all subscriptions', () => {
        const store = createTestStore()
        const listener = vi.fn()

        store.subscribe(listener)
        store.destroy()
        store.setState({ count: 1 })

        expect(listener).not.toHaveBeenCalled()
      })

      it('should handle multiple destroy calls', () => {
        const store = createTestStore()
        const listener = vi.fn()

        store.subscribe(listener)
        store.destroy()
        store.destroy() // Should not throw

        store.setState({ count: 1 })
        expect(listener).not.toHaveBeenCalled()
      })
    })

    describe('middleware', () => {
      it('should apply middleware to setState', () => {
        const middlewareFn = vi.fn((set, _get) => {
          return (partial: Partial<TestState> | ((state: TestState) => Partial<TestState>)) => {
            set(partial)
          }
        })

        const store = createTestStore({ count: 0, name: 'test' }, [middlewareFn])
        store.setState({ count: 1 })

        expect(middlewareFn).toHaveBeenCalled()
        expect(store.getState().count).toBe(1)
      })

      it('should apply multiple middleware in order', () => {
        const callOrder: string[] = []

        const middleware1 = vi.fn((set, _get) => {
          return (partial: Partial<TestState> | ((state: TestState) => Partial<TestState>)) => {
            callOrder.push('middleware1-before')
            set(partial)
            callOrder.push('middleware1-after')
          }
        })

        const middleware2 = vi.fn((set, _get) => {
          return (partial: Partial<TestState> | ((state: TestState) => Partial<TestState>)) => {
            callOrder.push('middleware2-before')
            set(partial)
            callOrder.push('middleware2-after')
          }
        })

        const store = createTestStore({ count: 0, name: 'test' }, [middleware1, middleware2])
        store.setState({ count: 1 })

        // First middleware is outermost, so middleware1 wraps middleware2
        expect(callOrder).toEqual([
          'middleware1-before',
          'middleware2-before',
          'middleware2-after',
          'middleware1-after',
        ])
      })
    })
  })
})
