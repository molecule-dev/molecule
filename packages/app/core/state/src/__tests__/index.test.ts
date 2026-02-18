/**
 * Integration tests for `@molecule/app-state` public API.
 *
 * Tests all exports from the main index.ts to ensure the public API
 * is complete and works correctly together.
 */
import { beforeEach, describe, expect, it, vi } from 'vitest'

const mockDebug = vi.hoisted(() => vi.fn())
vi.mock('@molecule/app-logger', () => ({
  getLogger: () => ({
    debug: mockDebug,
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    trace: vi.fn(),
  }),
}))

import type {
  AsyncState,
  EqualityFn,
  GetState,
  Selector,
  SetState,
  StateListener,
  StateProvider,
  Store,
  StoreConfig,
  StoreMiddleware,
} from '../index.js'
// Import all public exports
import {
  // Store utilities
  combineStores,
  // Types (compile-time only, but we test the runtime exports)
  // StoreConfig,
  // StoreMiddleware,
  // SetState,
  // GetState,
  // StateListener,
  // Store,
  // StateProvider,
  // Selector,
  // EqualityFn,
  // Async types and utilities
  // AsyncState,
  // AsyncStateActions,
  createAsyncState,
  // Simple provider
  createSimpleStateProvider,
  createStore,
  getProvider,
  // Middleware
  loggerMiddleware,
  persistMiddleware,
  produce,
  // Provider management
  setProvider,
  // Utilities
  shallowEqual,
  simpleProvider,
} from '../index.js'

describe('@molecule/app-state Public API', () => {
  beforeEach(() => {
    // Set the simple provider for each test (no auto-fallback)
    setProvider(simpleProvider)
  })

  describe('Type Exports', () => {
    it('should export all required types', () => {
      // These are compile-time checks - if this compiles, the types exist
      const config: StoreConfig<{ count: number }> = {
        initialState: { count: 0 },
      }
      expect(config).toBeDefined()

      const middleware: StoreMiddleware<{ count: number }> = (set, _get) => set
      expect(middleware).toBeDefined()

      const setState: SetState<{ count: number }> = () => {}
      expect(setState).toBeDefined()

      const getState: GetState<{ count: number }> = () => ({ count: 0 })
      expect(getState).toBeDefined()

      const listener: StateListener<{ count: number }> = () => {}
      expect(listener).toBeDefined()

      const selector: Selector<{ count: number }, number> = (state) => state.count
      expect(selector).toBeDefined()

      const equalityFn: EqualityFn<number> = (a, b) => a === b
      expect(equalityFn).toBeDefined()

      const asyncState: AsyncState<string> = {
        data: '',
        loading: false,
        error: null,
      }
      expect(asyncState).toBeDefined()
    })
  })

  describe('Utility Exports', () => {
    describe('shallowEqual', () => {
      it('should be exported and functional', () => {
        expect(typeof shallowEqual).toBe('function')
        expect(shallowEqual({ a: 1 }, { a: 1 })).toBe(true)
        expect(shallowEqual({ a: 1 }, { a: 2 })).toBe(false)
      })
    })

    describe('produce', () => {
      it('should be exported and functional', () => {
        expect(typeof produce).toBe('function')
        const result = produce({ count: 0 }, (draft) => {
          draft.count = 5
        })
        expect(result).toEqual({ count: 5 })
      })
    })
  })

  describe('Async State Exports', () => {
    describe('createAsyncState', () => {
      it('should be exported and functional', () => {
        expect(typeof createAsyncState).toBe('function')
        const [state, actions] = createAsyncState<string | null>(null)
        expect(state.data).toBeNull()
        expect(state.loading).toBe(false)
        expect(state.error).toBeNull()
        expect(typeof actions.setData).toBe('function')
        expect(typeof actions.setLoading).toBe('function')
        expect(typeof actions.setError).toBe('function')
        expect(typeof actions.reset).toBe('function')
        expect(typeof actions.execute).toBe('function')
      })
    })
  })

  describe('Middleware Exports', () => {
    describe('loggerMiddleware', () => {
      it('should be exported and functional', () => {
        expect(typeof loggerMiddleware).toBe('function')
        const middleware = loggerMiddleware<{ count: number }>('test')
        expect(typeof middleware).toBe('function')
      })
    })

    describe('persistMiddleware', () => {
      it('should be exported and functional', () => {
        expect(typeof persistMiddleware).toBe('function')
        const mockStorage = {
          getItem: vi.fn(),
          setItem: vi.fn(),
          removeItem: vi.fn(),
          clear: vi.fn(),
          length: 0,
          key: vi.fn(),
        }
        const middleware = persistMiddleware<{ count: number }>('key', mockStorage)
        expect(typeof middleware).toBe('function')
      })
    })
  })

  describe('Provider Exports', () => {
    describe('createSimpleStateProvider', () => {
      it('should be exported and create valid providers', () => {
        expect(typeof createSimpleStateProvider).toBe('function')
        const provider = createSimpleStateProvider()
        expect(provider).toBeDefined()
        expect(typeof provider.createStore).toBe('function')
      })
    })

    describe('simpleProvider', () => {
      it('should be exported as a pre-created provider', () => {
        expect(simpleProvider).toBeDefined()
        expect(typeof simpleProvider.createStore).toBe('function')
      })
    })

    describe('setProvider / getProvider', () => {
      it('should be exported and functional', () => {
        expect(typeof setProvider).toBe('function')
        expect(typeof getProvider).toBe('function')

        const customProvider = createSimpleStateProvider()
        setProvider(customProvider)
        expect(getProvider()).toBe(customProvider)
      })
    })

    describe('createStore', () => {
      it('should be exported and create stores', () => {
        expect(typeof createStore).toBe('function')
        const store = createStore({ initialState: { count: 0 } })
        expect(store.getState()).toEqual({ count: 0 })
      })
    })
  })

  describe('Store Utility Exports', () => {
    describe('combineStores', () => {
      it('should be exported and functional', () => {
        expect(typeof combineStores).toBe('function')

        const provider = createSimpleStateProvider()
        const store1 = provider.createStore({ initialState: { a: 1 } })
        const store2 = provider.createStore({ initialState: { b: 2 } })

        const combined = combineStores<{ first: { a: number }; second: { b: number } }>({
          first: store1,
          second: store2,
        })

        expect(combined.getState()).toEqual({
          first: { a: 1 },
          second: { b: 2 },
        })
      })
    })
  })

  describe('Integration: Full Store Lifecycle', () => {
    interface AppState {
      user: { name: string; loggedIn: boolean }
      settings: { theme: 'light' | 'dark'; notifications: boolean }
    }

    it('should support complete store lifecycle with all features', () => {
      // 1. Create a store with middleware
      mockDebug.mockClear()
      const mockStorage = {
        getItem: vi.fn().mockReturnValue(null),
        setItem: vi.fn(),
        removeItem: vi.fn(),
        clear: vi.fn(),
        length: 0,
        key: vi.fn(),
      }

      const store = createStore<AppState>({
        initialState: {
          user: { name: '', loggedIn: false },
          settings: { theme: 'light', notifications: true },
        },
        middleware: [loggerMiddleware('app'), persistMiddleware('app-state', mockStorage)],
      })

      // 2. Subscribe to changes
      const listener = vi.fn()
      const unsubscribe = store.subscribe(listener)

      // 3. Update state
      store.setState({ user: { name: 'Alice', loggedIn: true } })

      // 4. Verify state updated
      expect(store.getState().user).toEqual({ name: 'Alice', loggedIn: true })

      // 5. Verify listener was called
      expect(listener).toHaveBeenCalledTimes(1)

      // 6. Verify middleware ran (logger logged, persist saved)
      expect(mockDebug).toHaveBeenCalled()
      expect(mockStorage.setItem).toHaveBeenCalled()

      // 7. Use updater function
      store.setState((state) => ({
        settings: { ...state.settings, theme: 'dark' },
      }))
      expect(store.getState().settings.theme).toBe('dark')

      // 8. Unsubscribe
      unsubscribe()
      store.setState({ user: { name: 'Bob', loggedIn: true } })
      expect(listener).toHaveBeenCalledTimes(2) // Only the previous 2 calls

      // 9. Destroy store
      store.destroy()

      mockDebug.mockClear()
    })

    it('should work with combined stores', () => {
      const provider = createSimpleStateProvider()

      const userStore = provider.createStore({
        initialState: { name: '', loggedIn: false },
      })

      const settingsStore = provider.createStore({
        initialState: { theme: 'light' as const, notifications: true },
      })

      const appStore = combineStores<{
        user: { name: string; loggedIn: boolean }
        settings: { theme: 'light' | 'dark'; notifications: boolean }
      }>({
        user: userStore,
        settings: settingsStore,
      })

      const listener = vi.fn()
      appStore.subscribe(listener)

      // Update via child store
      userStore.setState({ name: 'Charlie', loggedIn: true })

      // Verify combined store reflects the update
      expect(appStore.getState().user).toEqual({ name: 'Charlie', loggedIn: true })
      expect(listener).toHaveBeenCalled()

      appStore.destroy()
    })
  })

  describe('Integration: Async State with Store', () => {
    it('should work together for async data management', async () => {
      interface DataState {
        items: string[]
        asyncState: AsyncState<string[]>
      }

      const [asyncState, asyncActions] = createAsyncState<string[]>([])

      const store = createStore<DataState>({
        initialState: {
          items: [],
          asyncState,
        },
      })

      // Simulate async data fetch
      const fetchData = async (): Promise<string[]> => {
        return ['item1', 'item2', 'item3']
      }

      // Execute async operation
      const result = await asyncActions.execute(fetchData)

      // Update store with result
      store.setState({
        items: result,
        asyncState: { ...asyncState },
      })

      expect(store.getState().items).toEqual(['item1', 'item2', 'item3'])
      expect(asyncState.loading).toBe(false)
      expect(asyncState.error).toBeNull()
    })
  })

  describe('Integration: Utilities with Store', () => {
    it('should use shallowEqual for selective updates', () => {
      interface State {
        user: { id: number; name: string }
        count: number
      }

      const store = createStore<State>({
        initialState: {
          user: { id: 1, name: 'Test' },
          count: 0,
        },
      })

      const listener = vi.fn()
      store.subscribe((newState, prevState) => {
        // Only call listener if user changed (using shallowEqual)
        if (!shallowEqual(newState.user, prevState.user)) {
          listener(newState.user)
        }
      })

      // Update count only - listener should not be called
      store.setState({ count: 1 })
      expect(listener).not.toHaveBeenCalled()

      // Update user - listener should be called
      store.setState({ user: { id: 1, name: 'Updated' } })
      expect(listener).toHaveBeenCalledWith({ id: 1, name: 'Updated' })
    })

    it('should use produce for immutable updates', () => {
      interface State {
        items: { id: number; value: string }[]
        meta: { count: number }
      }

      const store = createStore<State>({
        initialState: {
          items: [
            { id: 1, value: 'a' },
            { id: 2, value: 'b' },
          ],
          meta: { count: 2 },
        },
      })

      store.setState((state) =>
        produce(state, (draft) => {
          draft.meta.count = 3
        }),
      )

      expect(store.getState().meta.count).toBe(3)
    })
  })

  describe('Integration: Custom Provider', () => {
    it('should support custom state provider implementation', () => {
      const createCalls: unknown[] = []

      const customProvider: StateProvider = {
        createStore<T>(config: StoreConfig<T>): Store<T> {
          createCalls.push(config)
          // Delegate to simple provider for actual implementation
          return createSimpleStateProvider().createStore(config)
        },
      }

      setProvider(customProvider)

      const store = createStore({ initialState: { value: 42 } })

      expect(createCalls).toHaveLength(1)
      expect(store.getState()).toEqual({ value: 42 })
    })
  })

  describe('Integration: Selector Pattern', () => {
    it('should support selector pattern for derived state', () => {
      interface State {
        items: { price: number; quantity: number }[]
      }

      const store = createStore<State>({
        initialState: {
          items: [
            { price: 10, quantity: 2 },
            { price: 20, quantity: 1 },
          ],
        },
      })

      // Define selectors
      const selectItems: Selector<State, { price: number; quantity: number }[]> = (state) =>
        state.items

      const selectTotal: Selector<State, number> = (state) =>
        state.items.reduce((sum, item) => sum + item.price * item.quantity, 0)

      // Use selectors
      expect(selectItems(store.getState())).toHaveLength(2)
      expect(selectTotal(store.getState())).toBe(40) // 10*2 + 20*1

      // Update state
      store.setState({
        items: [...store.getState().items, { price: 5, quantity: 4 }],
      })

      expect(selectTotal(store.getState())).toBe(60) // 40 + 5*4
    })
  })

  describe('Edge Cases', () => {
    it('should handle empty initial state', () => {
      const store = createStore<Record<string, never>>({
        initialState: {},
      })
      expect(store.getState()).toEqual({})
    })

    it('should handle null values in state', () => {
      const store = createStore<{ value: string | null }>({
        initialState: { value: null },
      })
      expect(store.getState().value).toBeNull()

      store.setState({ value: 'not null' })
      expect(store.getState().value).toBe('not null')

      store.setState({ value: null })
      expect(store.getState().value).toBeNull()
    })

    it('should handle undefined values in state', () => {
      const store = createStore<{ value?: string }>({
        initialState: { value: undefined },
      })
      expect(store.getState().value).toBeUndefined()
    })

    it('should handle deeply nested state', () => {
      interface DeepState {
        level1: {
          level2: {
            level3: {
              value: number
            }
          }
        }
      }

      const store = createStore<DeepState>({
        initialState: {
          level1: {
            level2: {
              level3: {
                value: 0,
              },
            },
          },
        },
      })

      store.setState({
        level1: {
          level2: {
            level3: {
              value: 42,
            },
          },
        },
      })

      expect(store.getState().level1.level2.level3.value).toBe(42)
    })

    it('should handle rapid state updates', () => {
      const store = createStore<{ count: number }>({
        initialState: { count: 0 },
      })

      for (let i = 0; i < 100; i++) {
        store.setState((state) => ({ count: state.count + 1 }))
      }

      expect(store.getState().count).toBe(100)
    })

    it('should handle multiple subscribers', () => {
      const store = createStore<{ count: number }>({
        initialState: { count: 0 },
      })

      const listeners = Array.from({ length: 10 }, () => vi.fn())
      const unsubscribes = listeners.map((l) => store.subscribe(l))

      store.setState({ count: 1 })

      listeners.forEach((listener) => {
        expect(listener).toHaveBeenCalledTimes(1)
      })

      // Unsubscribe half
      unsubscribes.slice(0, 5).forEach((unsub) => unsub())

      store.setState({ count: 2 })

      listeners.slice(0, 5).forEach((listener) => {
        expect(listener).toHaveBeenCalledTimes(1)
      })
      listeners.slice(5).forEach((listener) => {
        expect(listener).toHaveBeenCalledTimes(2)
      })
    })
  })
})
