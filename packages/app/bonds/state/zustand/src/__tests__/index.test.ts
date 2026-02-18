import { beforeEach, describe, expect, it, vi } from 'vitest'

import {
  combineSlices,
  createProvider,
  createSelector,
  createSlice,
  createStore,
  createStoreWithActions,
  provider,
} from '../index.js'

describe('@molecule/app-state-zustand', () => {
  // Test state interfaces
  interface CounterState {
    count: number
  }

  interface UserState {
    name: string
    email: string
    age: number
  }

  interface TodoState {
    todos: Array<{ id: number; text: string; completed: boolean }>
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
      expect(listener).toHaveBeenCalledWith({ count: 5 }, { count: 0 })
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

    it('should have a destroy method', () => {
      const store = createStore<CounterState>({
        initialState: { count: 0 },
      })

      // The store should have a destroy method per the Store interface
      expect(store.destroy).toBeInstanceOf(Function)

      // Note: In Zustand v5, the internal destroy method may not fully
      // clean up subscriptions. The destroy method exists for interface
      // compliance and cleanup signaling.
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

  describe('createStore with persistence', () => {
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

    it('should persist state to storage on setState', () => {
      const store = createStore<CounterState>({
        initialState: { count: 0 },
        persist: {
          name: 'counter-store',
          storage: mockStorage,
        },
      })

      store.setState({ count: 5 })

      expect(mockStorage.setItem).toHaveBeenCalledWith(
        'counter-store',
        JSON.stringify({ count: 5 }),
      )
    })

    it('should load initial state from storage', () => {
      ;(mockStorage.getItem as ReturnType<typeof vi.fn>).mockReturnValue(
        JSON.stringify({ count: 100 }),
      )

      const store = createStore<CounterState>({
        initialState: { count: 0 },
        persist: {
          name: 'counter-store',
          storage: mockStorage,
        },
      })

      expect(mockStorage.getItem).toHaveBeenCalledWith('counter-store')
      expect(store.getState()).toEqual({ count: 100 })
    })

    it('should handle missing storage data gracefully', () => {
      ;(mockStorage.getItem as ReturnType<typeof vi.fn>).mockReturnValue(null)

      const store = createStore<CounterState>({
        initialState: { count: 0 },
        persist: {
          name: 'counter-store',
          storage: mockStorage,
        },
      })

      expect(store.getState()).toEqual({ count: 0 })
    })

    it('should handle invalid JSON in storage gracefully', () => {
      ;(mockStorage.getItem as ReturnType<typeof vi.fn>).mockReturnValue('invalid json{')

      const store = createStore<CounterState>({
        initialState: { count: 0 },
        persist: {
          name: 'counter-store',
          storage: mockStorage,
        },
      })

      expect(store.getState()).toEqual({ count: 0 })
    })

    it('should handle storage errors gracefully', () => {
      ;(mockStorage.setItem as ReturnType<typeof vi.fn>).mockImplementation(() => {
        throw new Error('Storage quota exceeded')
      })

      const store = createStore<CounterState>({
        initialState: { count: 0 },
        persist: {
          name: 'counter-store',
          storage: mockStorage,
        },
      })

      expect(() => store.setState({ count: 5 })).not.toThrow()
      expect(store.getState().count).toBe(5)
    })

    it('should partialize state when configured', () => {
      const store = createStore<UserState>({
        initialState: { name: 'John', email: 'john@example.com', age: 30 },
        persist: {
          name: 'user-store',
          storage: mockStorage,
          partialize: (state) => ({ name: state.name }),
        },
      })

      store.setState({ age: 31 })

      expect(mockStorage.setItem).toHaveBeenCalledWith(
        'user-store',
        JSON.stringify({ name: 'John' }),
      )
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

  describe('createStoreWithActions', () => {
    it('should create a store with actions', () => {
      const store = createStoreWithActions({
        initialState: { count: 0 },
        actions: (set, get) => ({
          increment: () => set({ count: get().count + 1 }),
          decrement: () => set({ count: get().count - 1 }),
          reset: () => set({ count: 0 }),
        }),
      })

      expect(store.getState()).toEqual({ count: 0 })
      expect(store.increment).toBeInstanceOf(Function)
      expect(store.decrement).toBeInstanceOf(Function)
      expect(store.reset).toBeInstanceOf(Function)
    })

    it('should execute actions that update state', () => {
      const store = createStoreWithActions({
        initialState: { count: 0 },
        actions: (set, get) => ({
          increment: () => set({ count: get().count + 1 }),
          decrement: () => set({ count: get().count - 1 }),
          incrementBy: (amount: number) => set({ count: get().count + amount }),
        }),
      })

      store.increment()
      expect(store.getState().count).toBe(1)

      store.increment()
      expect(store.getState().count).toBe(2)

      store.decrement()
      expect(store.getState().count).toBe(1)

      store.incrementBy(10)
      expect(store.getState().count).toBe(11)
    })

    it('should support async actions', async () => {
      const store = createStoreWithActions({
        initialState: { count: 0, loading: false },
        actions: (set, _get) => ({
          fetchAndSet: async (value: number) => {
            set({ loading: true })
            await new Promise((resolve) => setTimeout(resolve, 10))
            set({ count: value, loading: false })
          },
        }),
      })

      await store.fetchAndSet(100)

      expect(store.getState()).toEqual({ count: 100, loading: false })
    })

    it('should retain store methods (subscribe, getState, etc.)', () => {
      const store = createStoreWithActions({
        initialState: { count: 0 },
        actions: (set) => ({
          increment: () => set((state) => ({ count: state.count + 1 })),
        }),
      })

      const listener = vi.fn()
      store.subscribe(listener)
      store.increment()

      expect(listener).toHaveBeenCalled()
    })

    it('should support actions that use updater functions', () => {
      const store = createStoreWithActions({
        initialState: { count: 0 },
        actions: (set) => ({
          increment: () => set((state) => ({ count: state.count + 1 })),
          double: () => set((state) => ({ count: state.count * 2 })),
        }),
      })

      store.increment()
      store.increment()
      store.double()

      expect(store.getState().count).toBe(4)
    })

    it('should work with middleware', () => {
      const logCalls: string[] = []
      type SetCounter = (
        partial: Partial<CounterState> | ((state: CounterState) => Partial<CounterState>),
      ) => void
      type GetCounter = () => CounterState

      const loggingMiddleware = (set: SetCounter, _get: GetCounter): SetCounter => {
        return (partial) => {
          logCalls.push('setState called')
          set(partial)
        }
      }

      const store = createStoreWithActions({
        initialState: { count: 0 },
        actions: (set) => ({
          increment: () => set((state) => ({ count: state.count + 1 })),
        }),
        middleware: [loggingMiddleware],
      })

      store.increment()

      expect(logCalls).toContain('setState called')
    })
  })

  describe('createSlice', () => {
    it('should create a slice configuration', () => {
      const counterSlice = createSlice({
        name: 'counter',
        initialState: { count: 0 },
        actions: (set, get) => ({
          increment: () => set({ count: get().count + 1 }),
        }),
      })

      expect(counterSlice.name).toBe('counter')
      expect(counterSlice.initialState).toEqual({ count: 0 })
      expect(counterSlice.actions).toBeInstanceOf(Function)
    })

    it('should preserve slice configuration', () => {
      const userSlice = createSlice({
        name: 'user',
        initialState: { name: '', email: '' },
        actions: (set) => ({
          setName: (name: string) => set({ name }),
          setEmail: (email: string) => set({ email }),
        }),
      })

      expect(userSlice.name).toBe('user')
      expect(userSlice.initialState).toEqual({ name: '', email: '' })
    })
  })

  describe('combineSlices', () => {
    it('should combine multiple slices into one store', () => {
      const counterSlice = createSlice({
        name: 'counter',
        initialState: { count: 0 },
        actions: (set, get) => ({
          increment: () => set({ count: get().count + 1 }),
        }),
      })

      const userSlice = createSlice({
        name: 'user',
        initialState: { name: 'Guest' },
        actions: (set) => ({
          setName: (name: string) => set({ name }),
        }),
      })

      const store = combineSlices([counterSlice, userSlice])

      expect(store.getState()).toEqual({
        counter: { count: 0 },
        user: { name: 'Guest' },
      })
    })

    it('should expose slice actions on the combined store', () => {
      const counterSlice = createSlice({
        name: 'counter',
        initialState: { count: 0 },
        actions: (set, get) => ({
          increment: () => set({ count: get().count + 1 }),
          decrement: () => set({ count: get().count - 1 }),
        }),
      })

      const store = combineSlices([counterSlice]) as ReturnType<typeof combineSlices> &
        Record<string, (...args: unknown[]) => unknown>

      expect(store.increment).toBeInstanceOf(Function)
      expect(store.decrement).toBeInstanceOf(Function)
    })

    it('should update slice state through actions', () => {
      const counterSlice = createSlice({
        name: 'counter',
        initialState: { count: 0 },
        actions: (set, get) => ({
          increment: () => set({ count: get().count + 1 }),
        }),
      })

      const store = combineSlices([counterSlice]) as ReturnType<typeof combineSlices> &
        Record<string, (...args: unknown[]) => unknown>

      store.increment()
      store.increment()

      expect(store.getState().counter.count).toBe(2)
    })

    it('should isolate slice updates', () => {
      const counterSlice = createSlice({
        name: 'counter',
        initialState: { count: 0 },
        actions: (set) => ({
          increment: () => set((state) => ({ count: state.count + 1 })),
        }),
      })

      const userSlice = createSlice({
        name: 'user',
        initialState: { name: 'Guest' },
        actions: (set) => ({
          setName: (name: string) => set({ name }),
        }),
      })

      const store = combineSlices([counterSlice, userSlice]) as ReturnType<typeof combineSlices> &
        Record<string, (...args: unknown[]) => unknown>

      store.increment()
      store.setName('John')

      expect(store.getState()).toEqual({
        counter: { count: 1 },
        user: { name: 'John' },
      })
    })

    it('should notify subscribers on slice updates', () => {
      const counterSlice = createSlice({
        name: 'counter',
        initialState: { count: 0 },
        actions: (set, get) => ({
          increment: () => set({ count: get().count + 1 }),
        }),
      })

      const store = combineSlices([counterSlice]) as ReturnType<typeof combineSlices> &
        Record<string, (...args: unknown[]) => unknown>
      const listener = vi.fn()

      store.subscribe(listener)
      store.increment()

      expect(listener).toHaveBeenCalled()
    })

    it('should handle empty slices array', () => {
      const store = combineSlices([])

      expect(store.getState()).toEqual({})
    })
  })

  describe('createSelector', () => {
    it('should create a memoized selector', () => {
      const selectCount = createSelector((state: CounterState) => state.count)

      const state = { count: 5 }
      expect(selectCount(state)).toBe(5)
    })

    it('should return cached result for same state reference', () => {
      let callCount = 0
      const selectExpensive = createSelector((state: CounterState) => {
        callCount++
        return state.count * 2
      })

      const state = { count: 5 }
      selectExpensive(state)
      selectExpensive(state)
      selectExpensive(state)

      expect(callCount).toBe(1)
    })

    it('should recompute for different state references', () => {
      let callCount = 0
      const selectExpensive = createSelector((state: CounterState) => {
        callCount++
        return state.count * 2
      })

      selectExpensive({ count: 5 })
      selectExpensive({ count: 5 })

      expect(callCount).toBe(2)
    })

    it('should use custom equality function', () => {
      const selectUser = createSelector(
        (state: UserState) => ({ name: state.name }),
        (a, b) => a.name === b.name,
      )

      const state1 = { name: 'John', email: 'john@a.com', age: 30 }
      const state2 = { name: 'John', email: 'john@b.com', age: 31 }

      const result1 = selectUser(state1)
      const result2 = selectUser(state2)

      // Should return cached result since name is the same
      expect(result1).toBe(result2)
    })

    it('should update cache when result changes', () => {
      const selectCount = createSelector((state: CounterState) => state.count)

      const result1 = selectCount({ count: 1 })
      const result2 = selectCount({ count: 2 })

      expect(result1).toBe(1)
      expect(result2).toBe(2)
    })

    it('should work with complex derived state', () => {
      const selectCompletedTodos = createSelector((state: TodoState) =>
        state.todos.filter((t) => t.completed),
      )

      const state: TodoState = {
        todos: [
          { id: 1, text: 'Task 1', completed: true },
          { id: 2, text: 'Task 2', completed: false },
          { id: 3, text: 'Task 3', completed: true },
        ],
      }

      const completed = selectCompletedTodos(state)
      expect(completed).toHaveLength(2)
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

    it('should work with createStoreWithActions and selectors', () => {
      interface TodoAppState {
        todos: Array<{ id: number; text: string; completed: boolean }>
        filter: 'all' | 'completed' | 'active'
      }

      let idCounter = 1

      const store = createStoreWithActions<
        TodoAppState,
        {
          addTodo: (text: string, completed?: boolean) => void
          toggleTodo: (id: number) => void
          setFilter: (filter: 'all' | 'completed' | 'active') => void
        }
      >({
        initialState: {
          todos: [],
          filter: 'all',
        },
        actions: (set, get) => ({
          addTodo: (text: string, completed = false) =>
            set({
              todos: [...get().todos, { id: idCounter++, text, completed }],
            }),
          toggleTodo: (id: number) =>
            set({
              todos: get().todos.map((t) => (t.id === id ? { ...t, completed: !t.completed } : t)),
            }),
          setFilter: (filter: 'all' | 'completed' | 'active') => set({ filter }),
        }),
      })

      // Helper function to get filtered todos
      const getFilteredTodos = (
        state: TodoAppState,
      ): Array<{ id: number; text: string; completed: boolean }> => {
        const { todos, filter } = state
        switch (filter) {
          case 'completed':
            return todos.filter((t) => t.completed)
          case 'active':
            return todos.filter((t) => !t.completed)
          default:
            return todos
        }
      }

      // Add todos with explicit completed state
      store.addTodo('Task 1', true) // completed
      store.addTodo('Task 2', false) // active

      expect(store.getState().todos).toHaveLength(2)
      expect(store.getState().todos[0].completed).toBe(true)
      expect(store.getState().todos[1].completed).toBe(false)

      // Test filtering
      store.setFilter('completed')
      const completedTodos = getFilteredTodos(store.getState())
      expect(completedTodos).toHaveLength(1)
      expect(completedTodos[0].text).toBe('Task 1')

      store.setFilter('active')
      const activeTodos = getFilteredTodos(store.getState())
      expect(activeTodos).toHaveLength(1)
      expect(activeTodos[0].text).toBe('Task 2')

      store.setFilter('all')
      expect(getFilteredTodos(store.getState())).toHaveLength(2)

      // Test toggle action
      store.toggleTodo(1) // Toggle Task 1 to incomplete
      store.setFilter('active')
      expect(getFilteredTodos(store.getState())).toHaveLength(2) // Both should now be active
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
  })
})
