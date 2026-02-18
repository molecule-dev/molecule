import { beforeEach, describe, expect, it, vi } from 'vitest'

import {
  atom,
  combineAtoms,
  createAsyncAtom,
  createAtom,
  createAtomFamily,
  createDerivedAtom,
  createJotaiStore,
  createJotaiStoreInstance,
  createPersistentAtom,
  createProvider,
  createStore,
  createWritableDerivedAtom,
  defaultStore,
  provider,
} from '../index.js'

describe('@molecule/app-state-jotai', () => {
  // Test state interfaces
  interface CounterState {
    count: number
  }

  interface UserState {
    name: string
    email: string
    age: number
  }

  describe('createStore', () => {
    it('should create a store with initial state', () => {
      const store = createStore<CounterState>({
        initialState: { count: 0 },
      })

      expect(store.getState()).toEqual({ count: 0 })
    })

    it('should update state with partial object', () => {
      const store = createStore<UserState>({
        initialState: { name: 'John', email: 'john@example.com', age: 30 },
      })

      store.setState({ name: 'Jane' })

      expect(store.getState()).toEqual({
        name: 'Jane',
        email: 'john@example.com',
        age: 30,
      })
    })

    it('should update state with updater function', () => {
      const store = createStore<CounterState>({
        initialState: { count: 0 },
      })

      store.setState((state) => ({ count: state.count + 1 }))

      expect(store.getState().count).toBe(1)
    })

    it('should handle multiple sequential updates', () => {
      const store = createStore<CounterState>({
        initialState: { count: 0 },
      })

      store.setState({ count: 1 })
      store.setState({ count: 2 })
      store.setState({ count: 3 })

      expect(store.getState().count).toBe(3)
    })

    it('should subscribe to state changes', () => {
      const store = createStore<CounterState>({
        initialState: { count: 0 },
      })
      const listener = vi.fn()

      store.subscribe(listener)
      store.setState({ count: 5 })

      expect(listener).toHaveBeenCalledTimes(1)
      // Note: Jotai doesn't track previous state, so both arguments are the new state
      expect(listener).toHaveBeenCalledWith({ count: 5 }, { count: 5 })
    })

    it('should unsubscribe correctly', () => {
      const store = createStore<CounterState>({
        initialState: { count: 0 },
      })
      const listener = vi.fn()

      const unsubscribe = store.subscribe(listener)
      store.setState({ count: 1 })
      expect(listener).toHaveBeenCalledTimes(1)

      unsubscribe()
      store.setState({ count: 2 })
      expect(listener).toHaveBeenCalledTimes(1)
    })

    it('should support multiple subscribers', () => {
      const store = createStore<CounterState>({
        initialState: { count: 0 },
      })
      const listener1 = vi.fn()
      const listener2 = vi.fn()

      store.subscribe(listener1)
      store.subscribe(listener2)
      store.setState({ count: 10 })

      expect(listener1).toHaveBeenCalledTimes(1)
      expect(listener2).toHaveBeenCalledTimes(1)
    })

    it('should have a destroy method that clears listeners', () => {
      const store = createStore<CounterState>({
        initialState: { count: 0 },
      })
      const listener = vi.fn()

      store.subscribe(listener)
      store.destroy()
      store.setState({ count: 100 })

      // After destroy, listeners should not be called
      expect(listener).not.toHaveBeenCalled()
    })

    it('should handle complex nested state', () => {
      interface NestedState {
        user: { name: string; profile: { bio: string } }
        settings: { theme: string }
      }

      const store = createStore<NestedState>({
        initialState: {
          user: { name: 'Test', profile: { bio: 'Hello' } },
          settings: { theme: 'dark' },
        },
      })

      store.setState({ settings: { theme: 'light' } })

      expect(store.getState()).toEqual({
        user: { name: 'Test', profile: { bio: 'Hello' } },
        settings: { theme: 'light' },
      })
    })

    it('should use external Jotai store when provided', () => {
      const externalStore = createJotaiStoreInstance()
      const store = createStore<CounterState>({
        initialState: { count: 42 },
        jotaiStore: externalStore,
      })

      expect(store.getState()).toEqual({ count: 42 })
    })
  })

  describe('createStore with middleware', () => {
    it('should apply a single middleware', () => {
      const middlewareFn = vi.fn(
        (
          set: (
            partial: Partial<CounterState> | ((state: CounterState) => Partial<CounterState>),
          ) => void,
          _get: () => CounterState,
        ) => {
          return (
            partial: Partial<CounterState> | ((state: CounterState) => Partial<CounterState>),
          ) => {
            middlewareFn()
            set(partial)
          }
        },
      )

      const store = createStore<CounterState>({
        initialState: { count: 0 },
        middleware: [middlewareFn],
      })

      store.setState({ count: 5 })

      expect(middlewareFn).toHaveBeenCalled()
      expect(store.getState().count).toBe(5)
    })

    it('should apply multiple middleware in order', () => {
      const order: string[] = []

      type SetCounter = (
        partial: Partial<CounterState> | ((state: CounterState) => Partial<CounterState>),
      ) => void
      type GetCounter = () => CounterState

      const middleware1 = (set: SetCounter, _get: GetCounter): SetCounter => {
        return (partial) => {
          order.push('middleware1-before')
          set(partial)
          order.push('middleware1-after')
        }
      }

      const middleware2 = (set: SetCounter, _get: GetCounter): SetCounter => {
        return (partial) => {
          order.push('middleware2-before')
          set(partial)
          order.push('middleware2-after')
        }
      }

      const store = createStore<CounterState>({
        initialState: { count: 0 },
        middleware: [middleware1, middleware2],
      })

      store.setState({ count: 1 })

      // Middleware is applied in reverse order (last to first),
      // so the call order is middleware1 wrapping middleware2
      expect(order).toContain('middleware1-before')
      expect(order).toContain('middleware2-before')
    })

    it('should allow middleware to modify state', () => {
      type SetCounter = (
        partial: Partial<CounterState> | ((state: CounterState) => Partial<CounterState>),
      ) => void
      type GetCounter = () => CounterState

      const doubleMiddleware = (set: SetCounter, get: GetCounter): SetCounter => {
        return (
          partial: Partial<CounterState> | ((state: CounterState) => Partial<CounterState>),
        ) => {
          const current = get()
          const updates = typeof partial === 'function' ? partial(current) : partial
          if (updates.count !== undefined) {
            set({ count: updates.count * 2 })
          } else {
            set(partial)
          }
        }
      }

      const store = createStore<CounterState>({
        initialState: { count: 0 },
        middleware: [doubleMiddleware],
      })

      store.setState({ count: 5 })

      expect(store.getState().count).toBe(10)
    })

    it('should allow middleware to access current state via get', () => {
      type SetCounter = (
        partial: Partial<CounterState> | ((state: CounterState) => Partial<CounterState>),
      ) => void
      type GetCounter = () => CounterState

      const logMiddleware = vi.fn((set: SetCounter, get: GetCounter) => {
        return (
          partial: Partial<CounterState> | ((state: CounterState) => Partial<CounterState>),
        ) => {
          const prevState = get()
          set(partial)
          const nextState = get()
          logMiddleware(prevState, nextState)
        }
      })

      const store = createStore<CounterState>({
        initialState: { count: 0 },
        middleware: [logMiddleware],
      })

      store.setState({ count: 5 })

      expect(logMiddleware).toHaveBeenCalledWith({ count: 0 }, { count: 5 })
    })
  })

  describe('createProvider', () => {
    it('should create a state provider', () => {
      const stateProvider = createProvider()

      expect(stateProvider).toBeDefined()
      expect(stateProvider.createStore).toBeInstanceOf(Function)
    })

    it('should create stores via the provider', () => {
      const stateProvider = createProvider()
      const store = stateProvider.createStore<CounterState>({
        initialState: { count: 0 },
      })

      expect(store.getState()).toEqual({ count: 0 })
      store.setState({ count: 10 })
      expect(store.getState().count).toBe(10)
    })
  })

  describe('provider (default export)', () => {
    it('should be a valid state provider', () => {
      expect(provider).toBeDefined()
      expect(provider.createStore).toBeInstanceOf(Function)
    })

    it('should create working stores', () => {
      const store = provider.createStore<CounterState>({
        initialState: { count: 42 },
      })

      expect(store.getState().count).toBe(42)
    })
  })

  describe('createJotaiStoreInstance', () => {
    it('should create a new Jotai store instance', () => {
      const store = createJotaiStoreInstance()

      expect(store).toBeDefined()
      expect(store.get).toBeInstanceOf(Function)
      expect(store.set).toBeInstanceOf(Function)
      expect(store.sub).toBeInstanceOf(Function)
    })

    it('should create independent store instances', () => {
      const store1 = createJotaiStoreInstance()
      const store2 = createJotaiStoreInstance()
      const testAtom = atom(0)

      store1.set(testAtom, 10)
      store2.set(testAtom, 20)

      expect(store1.get(testAtom)).toBe(10)
      expect(store2.get(testAtom)).toBe(20)
    })
  })

  describe('defaultStore', () => {
    it('should be a valid Jotai store', () => {
      expect(defaultStore).toBeDefined()
      expect(defaultStore.get).toBeInstanceOf(Function)
      expect(defaultStore.set).toBeInstanceOf(Function)
      expect(defaultStore.sub).toBeInstanceOf(Function)
    })

    it('should work with atoms', () => {
      const testAtom = atom(100)
      const value = defaultStore.get(testAtom)

      expect(value).toBe(100)
    })
  })

  describe('createAtom', () => {
    it('should create a primitive atom with initial value', () => {
      const countAtom = createAtom(0)
      const store = createJotaiStoreInstance()

      expect(countAtom.get(store)).toBe(0)
    })

    it('should set atom value directly', () => {
      const countAtom = createAtom(0)
      const store = createJotaiStoreInstance()

      countAtom.set(store, 10)

      expect(countAtom.get(store)).toBe(10)
    })

    it('should set atom value with updater function', () => {
      const countAtom = createAtom(5)
      const store = createJotaiStoreInstance()

      countAtom.set(store, (prev) => prev * 2)

      expect(countAtom.get(store)).toBe(10)
    })

    it('should expose the underlying atom', () => {
      const countAtom = createAtom(0)
      const store = createJotaiStoreInstance()

      store.set(countAtom.atom, 42)

      expect(countAtom.get(store)).toBe(42)
    })

    it('should work with complex objects', () => {
      const userAtom = createAtom({ name: 'John', age: 30 })
      const store = createJotaiStoreInstance()

      expect(userAtom.get(store)).toEqual({ name: 'John', age: 30 })

      userAtom.set(store, { name: 'Jane', age: 25 })

      expect(userAtom.get(store)).toEqual({ name: 'Jane', age: 25 })
    })

    it('should work with arrays', () => {
      const itemsAtom = createAtom<string[]>([])
      const store = createJotaiStoreInstance()

      itemsAtom.set(store, (prev) => [...prev, 'item1'])
      itemsAtom.set(store, (prev) => [...prev, 'item2'])

      expect(itemsAtom.get(store)).toEqual(['item1', 'item2'])
    })
  })

  describe('createDerivedAtom', () => {
    it('should create a read-only derived atom', () => {
      const countAtom = createAtom(5)
      const doubleAtom = createDerivedAtom((get) => get(countAtom.atom) * 2)
      const store = createJotaiStoreInstance()

      expect(store.get(doubleAtom)).toBe(10)
    })

    it('should update when source atom changes', () => {
      const countAtom = createAtom(5)
      const doubleAtom = createDerivedAtom((get) => get(countAtom.atom) * 2)
      const store = createJotaiStoreInstance()

      countAtom.set(store, 10)

      expect(store.get(doubleAtom)).toBe(20)
    })

    it('should combine multiple atoms', () => {
      const firstNameAtom = createAtom('John')
      const lastNameAtom = createAtom('Doe')
      const fullNameAtom = createDerivedAtom(
        (get) => `${get(firstNameAtom.atom)} ${get(lastNameAtom.atom)}`,
      )
      const store = createJotaiStoreInstance()

      expect(store.get(fullNameAtom)).toBe('John Doe')

      firstNameAtom.set(store, 'Jane')

      expect(store.get(fullNameAtom)).toBe('Jane Doe')
    })

    it('should handle complex derivations', () => {
      const todosAtom = createAtom([
        { id: 1, text: 'Task 1', completed: true },
        { id: 2, text: 'Task 2', completed: false },
        { id: 3, text: 'Task 3', completed: true },
      ])
      const completedCountAtom = createDerivedAtom(
        (get) => get(todosAtom.atom).filter((t) => t.completed).length,
      )
      const store = createJotaiStoreInstance()

      expect(store.get(completedCountAtom)).toBe(2)
    })
  })

  describe('createWritableDerivedAtom', () => {
    it('should create a writable derived atom', () => {
      const celsiusAtom = createAtom(0)
      const fahrenheitAtom = createWritableDerivedAtom(
        (get) => (get(celsiusAtom.atom) * 9) / 5 + 32,
        (get, set, newFahrenheit: number) => {
          set(celsiusAtom.atom, ((newFahrenheit - 32) * 5) / 9)
        },
      )
      const store = createJotaiStoreInstance()

      expect(store.get(fahrenheitAtom)).toBe(32) // 0C = 32F

      store.set(fahrenheitAtom, 212) // 212F = 100C

      expect(celsiusAtom.get(store)).toBe(100)
      expect(store.get(fahrenheitAtom)).toBe(212)
    })

    it('should sync bidirectionally', () => {
      const baseAtom = createAtom(10)
      const doubleAtom = createWritableDerivedAtom(
        (get) => get(baseAtom.atom) * 2,
        (get, set, newValue: number) => {
          set(baseAtom.atom, newValue / 2)
        },
      )
      const store = createJotaiStoreInstance()

      // Update via base
      baseAtom.set(store, 5)
      expect(store.get(doubleAtom)).toBe(10)

      // Update via derived
      store.set(doubleAtom, 40)
      expect(baseAtom.get(store)).toBe(20)
    })
  })

  describe('createAsyncAtom', () => {
    it('should create an async atom', async () => {
      const fetchDataAtom = createAsyncAtom(async () => {
        return 'async result'
      })
      const store = createJotaiStoreInstance()

      const result = await store.get(fetchDataAtom)

      expect(result).toBe('async result')
    })

    it('should handle async operations with delay', async () => {
      const delayedAtom = createAsyncAtom(async () => {
        await new Promise((resolve) => setTimeout(resolve, 10))
        return 42
      })
      const store = createJotaiStoreInstance()

      const result = await store.get(delayedAtom)

      expect(result).toBe(42)
    })

    it('should handle async errors', async () => {
      const errorAtom = createAsyncAtom(async () => {
        throw new Error('Async error')
      })
      const store = createJotaiStoreInstance()

      await expect(store.get(errorAtom)).rejects.toThrow('Async error')
    })
  })

  describe('createPersistentAtom', () => {
    let mockStorage: Storage

    beforeEach(() => {
      mockStorage = {
        getItem: vi.fn(),
        setItem: vi.fn(),
        removeItem: vi.fn(),
        clear: vi.fn(),
        length: 0,
        key: vi.fn(),
      }
    })

    it('should create an atom with initial value', () => {
      const themeAtom = createPersistentAtom('theme', 'light', mockStorage)
      const store = createJotaiStoreInstance()

      expect(themeAtom.get(store)).toBe('light')
    })

    it('should load value from storage on creation', () => {
      ;(mockStorage.getItem as ReturnType<typeof vi.fn>).mockReturnValue('"dark"')

      const themeAtom = createPersistentAtom('theme', 'light', mockStorage)
      const store = createJotaiStoreInstance()

      expect(mockStorage.getItem).toHaveBeenCalledWith('theme')
      expect(themeAtom.get(store)).toBe('dark')
    })

    it('should persist value to storage on set', () => {
      const themeAtom = createPersistentAtom('theme', 'light', mockStorage)
      const store = createJotaiStoreInstance()

      themeAtom.set(store, 'dark')

      expect(mockStorage.setItem).toHaveBeenCalledWith('theme', '"dark"')
    })

    it('should persist value with updater function', () => {
      const countAtom = createPersistentAtom('count', 0, mockStorage)
      const store = createJotaiStoreInstance()

      countAtom.set(store, (prev) => prev + 10)

      expect(mockStorage.setItem).toHaveBeenCalledWith('count', '10')
    })

    it('should handle storage errors gracefully on read', () => {
      ;(mockStorage.getItem as ReturnType<typeof vi.fn>).mockImplementation(() => {
        throw new Error('Storage error')
      })

      const themeAtom = createPersistentAtom('theme', 'light', mockStorage)
      const store = createJotaiStoreInstance()

      // Should fall back to initial value
      expect(themeAtom.get(store)).toBe('light')
    })

    it('should handle storage errors gracefully on write', () => {
      ;(mockStorage.setItem as ReturnType<typeof vi.fn>).mockImplementation(() => {
        throw new Error('Storage quota exceeded')
      })

      const themeAtom = createPersistentAtom('theme', 'light', mockStorage)
      const store = createJotaiStoreInstance()

      // Should not throw
      expect(() => themeAtom.set(store, 'dark')).not.toThrow()
      expect(themeAtom.get(store)).toBe('dark')
    })

    it('should handle invalid JSON in storage', () => {
      ;(mockStorage.getItem as ReturnType<typeof vi.fn>).mockReturnValue('invalid json{')

      const themeAtom = createPersistentAtom('theme', 'light', mockStorage)
      const store = createJotaiStoreInstance()

      // Should fall back to initial value
      expect(themeAtom.get(store)).toBe('light')
    })

    it('should persist complex objects', () => {
      const userAtom = createPersistentAtom('user', { name: '', email: '' }, mockStorage)
      const store = createJotaiStoreInstance()

      userAtom.set(store, { name: 'John', email: 'john@example.com' })

      expect(mockStorage.setItem).toHaveBeenCalledWith(
        'user',
        JSON.stringify({ name: 'John', email: 'john@example.com' }),
      )
    })
  })

  describe('createAtomFamily', () => {
    it('should create parameterized atoms', () => {
      const userByIdAtom = createAtomFamily((id: string) => ({
        id,
        name: '',
        email: '',
      }))

      const store = createJotaiStoreInstance()
      const user1 = userByIdAtom('user-1')
      const user2 = userByIdAtom('user-2')

      expect(user1.get(store)).toEqual({ id: 'user-1', name: '', email: '' })
      expect(user2.get(store)).toEqual({ id: 'user-2', name: '', email: '' })
    })

    it('should cache and return the same atom for same parameter', () => {
      const counterFamily = createAtomFamily((id: number) => ({ id, count: 0 }))

      const atom1 = counterFamily(1)
      const atom2 = counterFamily(1)

      expect(atom1).toBe(atom2)
    })

    it('should allow independent updates per parameter', () => {
      const counterFamily = createAtomFamily((id: number) => ({ id, count: 0 }))
      const store = createJotaiStoreInstance()

      const counter1 = counterFamily(1)
      const counter2 = counterFamily(2)

      counter1.set(store, { id: 1, count: 10 })
      counter2.set(store, { id: 2, count: 20 })

      expect(counter1.get(store)).toEqual({ id: 1, count: 10 })
      expect(counter2.get(store)).toEqual({ id: 2, count: 20 })
    })

    it('should work with string parameters', () => {
      const configFamily = createAtomFamily((key: string) => ({
        key,
        value: null as string | null,
      }))

      const store = createJotaiStoreInstance()
      const config1 = configFamily('api_url')
      const config2 = configFamily('api_key')

      config1.set(store, { key: 'api_url', value: 'https://api.example.com' })
      config2.set(store, { key: 'api_key', value: 'secret123' })

      expect(config1.get(store).value).toBe('https://api.example.com')
      expect(config2.get(store).value).toBe('secret123')
    })
  })

  describe('combineAtoms', () => {
    it('should combine multiple atoms into a single object', () => {
      const countAtom = createAtom(0)
      const nameAtom = createAtom('John')

      const combinedAtom = combineAtoms({
        count: countAtom.atom,
        name: nameAtom.atom,
      })

      const store = createJotaiStoreInstance()

      expect(store.get(combinedAtom)).toEqual({
        count: 0,
        name: 'John',
      })
    })

    it('should update when any source atom changes', () => {
      const countAtom = createAtom(0)
      const nameAtom = createAtom('John')

      const combinedAtom = combineAtoms({
        count: countAtom.atom,
        name: nameAtom.atom,
      })

      const store = createJotaiStoreInstance()

      countAtom.set(store, 10)

      expect(store.get(combinedAtom)).toEqual({
        count: 10,
        name: 'John',
      })

      nameAtom.set(store, 'Jane')

      expect(store.get(combinedAtom)).toEqual({
        count: 10,
        name: 'Jane',
      })
    })

    it('should work with derived atoms', () => {
      const countAtom = createAtom(5)
      const doubleAtom = createDerivedAtom((get) => get(countAtom.atom) * 2)

      const combinedAtom = combineAtoms({
        count: countAtom.atom,
        double: doubleAtom,
      })

      const store = createJotaiStoreInstance()

      expect(store.get(combinedAtom)).toEqual({
        count: 5,
        double: 10,
      })
    })

    it('should handle multiple atoms of different types', () => {
      const stringAtom = createAtom('hello')
      const numberAtom = createAtom(42)
      const booleanAtom = createAtom(true)
      const arrayAtom = createAtom([1, 2, 3])

      const combinedAtom = combineAtoms({
        str: stringAtom.atom,
        num: numberAtom.atom,
        bool: booleanAtom.atom,
        arr: arrayAtom.atom,
      })

      const store = createJotaiStoreInstance()

      expect(store.get(combinedAtom)).toEqual({
        str: 'hello',
        num: 42,
        bool: true,
        arr: [1, 2, 3],
      })
    })
  })

  describe('Re-exports', () => {
    it('should export atom from jotai/vanilla', () => {
      expect(atom).toBeInstanceOf(Function)

      const testAtom = atom(0)
      const store = createJotaiStoreInstance()

      expect(store.get(testAtom)).toBe(0)
    })

    it('should export createJotaiStore from jotai/vanilla', () => {
      expect(createJotaiStore).toBeInstanceOf(Function)

      const store = createJotaiStore()
      const testAtom = atom('test')

      expect(store.get(testAtom)).toBe('test')
    })
  })

  describe('Integration Tests', () => {
    it('should work end-to-end: provider -> store -> actions -> subscribe', () => {
      const stateProvider = createProvider()
      const store = stateProvider.createStore<CounterState>({
        initialState: { count: 0 },
      })

      const states: CounterState[] = []
      store.subscribe((state) => states.push(state))

      store.setState({ count: 1 })
      store.setState({ count: 2 })
      store.setState((s) => ({ count: s.count + 10 }))

      expect(states).toHaveLength(3)
      expect(states[0].count).toBe(1)
      expect(states[1].count).toBe(2)
      expect(states[2].count).toBe(12)
    })

    it('should work with atoms and molecule store together', () => {
      const jotaiStore = createJotaiStoreInstance()

      // Create atoms for granular state
      const userAtom = createAtom({ name: 'Guest', isLoggedIn: false })
      const themeAtom = createAtom<'light' | 'dark'>('light')

      // Create molecule store using the same Jotai store
      const appStore = createStore({
        initialState: { count: 0 },
        jotaiStore,
      })

      // Use atoms directly
      userAtom.set(jotaiStore, { name: 'John', isLoggedIn: true })
      themeAtom.set(jotaiStore, 'dark')

      // Use molecule store
      appStore.setState({ count: 42 })

      expect(userAtom.get(jotaiStore)).toEqual({ name: 'John', isLoggedIn: true })
      expect(themeAtom.get(jotaiStore)).toBe('dark')
      expect(appStore.getState()).toEqual({ count: 42 })
    })

    it('should work with derived atoms for computed state', () => {
      const store = createJotaiStoreInstance()

      // Base atoms
      const itemsAtom = createAtom([
        { id: 1, name: 'Item 1', price: 10 },
        { id: 2, name: 'Item 2', price: 20 },
        { id: 3, name: 'Item 3', price: 30 },
      ])
      const taxRateAtom = createAtom(0.1)

      // Derived atoms
      const subtotalAtom = createDerivedAtom((get) =>
        get(itemsAtom.atom).reduce((sum, item) => sum + item.price, 0),
      )
      const taxAtom = createDerivedAtom((get) => get(subtotalAtom) * get(taxRateAtom.atom))
      const totalAtom = createDerivedAtom((get) => get(subtotalAtom) + get(taxAtom))

      expect(store.get(subtotalAtom)).toBe(60)
      expect(store.get(taxAtom)).toBe(6)
      expect(store.get(totalAtom)).toBe(66)

      // Update tax rate
      taxRateAtom.set(store, 0.2)

      expect(store.get(taxAtom)).toBe(12)
      expect(store.get(totalAtom)).toBe(72)
    })

    it('should handle rapid successive updates correctly', () => {
      const store = createStore<CounterState>({
        initialState: { count: 0 },
      })

      const updates: number[] = []
      store.subscribe((state) => updates.push(state.count))

      for (let i = 1; i <= 100; i++) {
        store.setState({ count: i })
      }

      expect(store.getState().count).toBe(100)
      expect(updates).toHaveLength(100)
      expect(updates[99]).toBe(100)
    })

    it('should work with atom family for managing collections', () => {
      const store = createJotaiStoreInstance()

      // Create a family for todo items
      const todoFamily = createAtomFamily((id: number) => ({
        id,
        text: '',
        completed: false,
      }))

      // Track todo IDs
      const todoIdsAtom = createAtom<number[]>([])

      // Add todos
      const addTodo = (id: number, text: string): void => {
        const todoAtom = todoFamily(id)
        todoAtom.set(store, { id, text, completed: false })
        todoIdsAtom.set(store, (prev) => [...prev, id])
      }

      // Toggle completion
      const toggleTodo = (id: number): void => {
        const todoAtom = todoFamily(id)
        todoAtom.set(store, (prev) => ({ ...prev, completed: !prev.completed }))
      }

      addTodo(1, 'Learn Jotai')
      addTodo(2, 'Build app')
      addTodo(3, 'Deploy')

      expect(todoIdsAtom.get(store)).toEqual([1, 2, 3])
      expect(todoFamily(1).get(store).text).toBe('Learn Jotai')

      toggleTodo(1)
      expect(todoFamily(1).get(store).completed).toBe(true)
      expect(todoFamily(2).get(store).completed).toBe(false)
    })

    it('should handle middleware with async operations', async () => {
      const logs: string[] = []
      interface AsyncState {
        data: string | null
        loading: boolean
        error: string | null
      }

      type SetAsync = (
        partial: Partial<AsyncState> | ((state: AsyncState) => Partial<AsyncState>),
      ) => void
      type GetAsync = () => AsyncState

      const loggingMiddleware = (set: SetAsync, _get: GetAsync): SetAsync => {
        return (partial) => {
          logs.push(`setState called: ${JSON.stringify(partial)}`)
          set(partial)
        }
      }

      const store = createStore<AsyncState>({
        initialState: { data: null, loading: false, error: null },
        middleware: [loggingMiddleware],
      })

      // Simulate async operation
      store.setState({ loading: true })
      await new Promise((resolve) => setTimeout(resolve, 10))
      store.setState({ data: 'Loaded!', loading: false })

      expect(store.getState()).toEqual({
        data: 'Loaded!',
        loading: false,
        error: null,
      })
      expect(logs).toHaveLength(2)
    })
  })
})
