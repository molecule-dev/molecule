import { describe, expect, it, vi } from 'vitest'

import {
  createAsyncAction,
  createProvider,
  createReduxStore,
  createSelector,
  createSlice,
  createStore,
  provider,
} from '../index.js'

describe('@molecule/app-state-redux', () => {
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

    it('should destroy the store and stop subscriptions', () => {
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

    it('should use preloaded state when provided', () => {
      const store = createStore<CounterState>({
        initialState: { count: 0 },
        preloadedState: { count: 100 },
      })

      expect(store.getState()).toEqual({ count: 100 })
    })

    it('should allow custom store name', () => {
      const store = createStore<CounterState>({
        initialState: { count: 0 },
        name: 'myCounter',
      })

      expect(store.getState()).toEqual({ count: 0 })
    })

    it('should support devTools configuration', () => {
      const store = createStore<CounterState>({
        initialState: { count: 0 },
        devTools: false,
      })

      expect(store.getState()).toEqual({ count: 0 })
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

  describe('createSlice', () => {
    it('should create a slice with name and initial state', () => {
      const counterSlice = createSlice({
        name: 'counter',
        initialState: { count: 0 },
        reducers: {
          increment: (state) => {
            state.count += 1
          },
          decrement: (state) => {
            state.count -= 1
          },
        },
      })

      expect(counterSlice.name).toBe('counter')
      expect(counterSlice.initialState).toEqual({ count: 0 })
    })

    it('should create action creators for reducers', () => {
      const counterSlice = createSlice({
        name: 'counter',
        initialState: { count: 0 },
        reducers: {
          increment: (state) => {
            state.count += 1
          },
          setCount: (state, action: { type: string; payload: number }) => {
            state.count = action.payload
          },
        },
      })

      expect(counterSlice.actions.increment).toBeInstanceOf(Function)
      expect(counterSlice.actions.setCount).toBeInstanceOf(Function)
    })

    it('should create a working reducer', () => {
      const counterSlice = createSlice({
        name: 'counter',
        initialState: { count: 0 },
        reducers: {
          increment: (state) => {
            state.count += 1
          },
          decrement: (state) => {
            state.count -= 1
          },
          setCount: (state, action: { type: string; payload: number }) => {
            state.count = action.payload
          },
        },
      })

      // Test initial state
      let state = counterSlice.reducer(undefined, { type: 'INIT' })
      expect(state).toEqual({ count: 0 })

      // Test increment
      state = counterSlice.reducer(state, counterSlice.actions.increment())
      expect(state).toEqual({ count: 1 })

      // Test decrement
      state = counterSlice.reducer(state, counterSlice.actions.decrement())
      expect(state).toEqual({ count: 0 })

      // Test setCount with payload
      state = counterSlice.reducer(state, counterSlice.actions.setCount(100))
      expect(state).toEqual({ count: 100 })
    })

    it('should handle actions with different payload types', () => {
      interface UserSliceState {
        name: string
        age: number
      }

      const userSlice = createSlice({
        name: 'user',
        initialState: { name: '', age: 0 } as UserSliceState,
        reducers: {
          setName: (state, action: { type: string; payload: string }) => {
            state.name = action.payload
          },
          setAge: (state, action: { type: string; payload: number }) => {
            state.age = action.payload
          },
        },
      })

      let state = userSlice.reducer(undefined, { type: 'INIT' })
      state = userSlice.reducer(state, userSlice.actions.setName('John'))
      state = userSlice.reducer(state, userSlice.actions.setAge(30))

      expect(state).toEqual({ name: 'John', age: 30 })
    })
  })

  describe('createReduxStore', () => {
    it('should create a Redux store from slices', () => {
      const counterSlice = createSlice({
        name: 'counter',
        initialState: { count: 0 },
        reducers: {
          increment: (state) => {
            state.count += 1
          },
        },
      })

      const reduxStore = createReduxStore({
        slices: [counterSlice],
      })

      expect(reduxStore.getState()).toEqual({
        counter: { count: 0 },
      })
    })

    it('should combine multiple slices', () => {
      const counterSlice = createSlice({
        name: 'counter',
        initialState: { count: 0 },
        reducers: {
          increment: (state) => {
            state.count += 1
          },
        },
      })

      const userSlice = createSlice({
        name: 'user',
        initialState: { name: 'Guest' },
        reducers: {
          setName: (state, action: { type: string; payload: string }) => {
            state.name = action.payload
          },
        },
      })

      const reduxStore = createReduxStore({
        slices: [counterSlice, userSlice],
      })

      expect(reduxStore.getState()).toEqual({
        counter: { count: 0 },
        user: { name: 'Guest' },
      })
    })

    it('should dispatch actions and update state', () => {
      const counterSlice = createSlice({
        name: 'counter',
        initialState: { count: 0 },
        reducers: {
          increment: (state) => {
            state.count += 1
          },
          decrement: (state) => {
            state.count -= 1
          },
        },
      })

      const reduxStore = createReduxStore({
        slices: [counterSlice],
      })

      reduxStore.dispatch(counterSlice.actions.increment())
      expect(reduxStore.getState().counter).toEqual({ count: 1 })

      reduxStore.dispatch(counterSlice.actions.increment())
      expect(reduxStore.getState().counter).toEqual({ count: 2 })

      reduxStore.dispatch(counterSlice.actions.decrement())
      expect(reduxStore.getState().counter).toEqual({ count: 1 })
    })

    it('should support preloaded state', () => {
      const counterSlice = createSlice({
        name: 'counter',
        initialState: { count: 0 },
        reducers: {},
      })

      const reduxStore = createReduxStore({
        slices: [counterSlice],
        preloadedState: {
          counter: { count: 100 },
        },
      })

      expect(reduxStore.getState().counter).toEqual({ count: 100 })
    })

    it('should support devTools configuration', () => {
      const counterSlice = createSlice({
        name: 'counter',
        initialState: { count: 0 },
        reducers: {},
      })

      const reduxStore = createReduxStore({
        slices: [counterSlice],
        devTools: false,
      })

      expect(reduxStore.getState()).toBeDefined()
    })

    it('should subscribe to state changes', () => {
      const counterSlice = createSlice({
        name: 'counter',
        initialState: { count: 0 },
        reducers: {
          increment: (state) => {
            state.count += 1
          },
        },
      })

      const reduxStore = createReduxStore({
        slices: [counterSlice],
      })

      const listener = vi.fn()
      reduxStore.subscribe(listener)

      reduxStore.dispatch(counterSlice.actions.increment())

      expect(listener).toHaveBeenCalled()
    })
  })

  describe('createSelector', () => {
    it('should create a selector that extracts state', () => {
      const selectCount = createSelector((state: CounterState) => state.count)

      const state = { count: 5 }
      expect(selectCount(state)).toBe(5)
    })

    it('should memoize the result for same arguments', () => {
      let computeCount = 0
      const selectDoubleCount = createSelector(
        (state: CounterState) => state.count,
        (count) => {
          computeCount++
          return count * 2
        },
      )

      const state = { count: 5 }
      selectDoubleCount(state)
      selectDoubleCount(state)
      selectDoubleCount(state)

      expect(computeCount).toBe(1)
    })

    it('should recompute when arguments change', () => {
      let computeCount = 0
      const selectDoubleCount = createSelector(
        (state: CounterState) => state.count,
        (count) => {
          computeCount++
          return count * 2
        },
      )

      selectDoubleCount({ count: 5 })
      selectDoubleCount({ count: 10 })

      expect(computeCount).toBe(2)
    })

    it('should support multiple input selectors', () => {
      interface CombinedState {
        count: number
        multiplier: number
      }

      const selectMultiplied = createSelector(
        (state: CombinedState) => state.count,
        (state: CombinedState) => state.multiplier,
        (count, multiplier) => count * multiplier,
      )

      expect(selectMultiplied({ count: 5, multiplier: 3 })).toBe(15)
    })

    it('should work with complex derived state', () => {
      const selectCompletedTodos = createSelector(
        (state: TodoState) => state.todos,
        (todos) => todos.filter((t) => t.completed),
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

    it('should memoize based on input selector results', () => {
      let computeCount = 0
      interface AppState {
        items: number[]
      }

      const selectSum = createSelector(
        (state: AppState) => state.items,
        (items) => {
          computeCount++
          return items.reduce((a, b) => a + b, 0)
        },
      )

      const items = [1, 2, 3]
      selectSum({ items })
      selectSum({ items }) // Same array reference

      expect(computeCount).toBe(1)
    })
  })

  describe('createAsyncAction', () => {
    it('should create an async action creator', () => {
      const fetchData = createAsyncAction<string, number>('data/fetch', async (id) => {
        return `data-${id}`
      })

      expect(fetchData.pending).toBe('data/fetch/pending')
      expect(fetchData.fulfilled).toBe('data/fetch/fulfilled')
      expect(fetchData.rejected).toBe('data/fetch/rejected')
    })

    it('should dispatch pending action on start', async () => {
      const dispatchedActions: unknown[] = []
      const dispatch = (action: unknown): void => {
        dispatchedActions.push(action)
      }
      const getState = (): Record<string, never> => ({})

      const fetchData = createAsyncAction<string, number>('data/fetch', async (id) => {
        return `data-${id}`
      })

      await fetchData(123)(dispatch, getState)

      expect(dispatchedActions[0]).toEqual({
        type: 'data/fetch/pending',
        payload: 123,
      })
    })

    it('should dispatch fulfilled action on success', async () => {
      const dispatchedActions: unknown[] = []
      const dispatch = (action: unknown): void => {
        dispatchedActions.push(action)
      }
      const getState = (): Record<string, never> => ({})

      const fetchData = createAsyncAction<string, number>('data/fetch', async (id) => {
        return `data-${id}`
      })

      await fetchData(123)(dispatch, getState)

      expect(dispatchedActions[1]).toEqual({
        type: 'data/fetch/fulfilled',
        payload: 'data-123',
      })
    })

    it('should dispatch rejected action on error', async () => {
      const dispatchedActions: unknown[] = []
      const dispatch = (action: unknown): void => {
        dispatchedActions.push(action)
      }
      const getState = (): Record<string, never> => ({})

      const fetchData = createAsyncAction<string, number>('data/fetch', async () => {
        throw new Error('Network error')
      })

      await expect(fetchData(123)(dispatch, getState)).rejects.toThrow('Network error')

      expect(dispatchedActions[1]).toEqual({
        type: 'data/fetch/rejected',
        payload: 'Network error',
      })
    })

    it('should provide thunkAPI with dispatch, getState, and signal', async () => {
      const dispatchedActions: unknown[] = []
      const dispatch = (action: unknown): void => {
        dispatchedActions.push(action)
      }
      const mockState = { user: { name: 'Test' } }
      const getState = (): typeof mockState => mockState

      let receivedThunkAPI: {
        dispatch: (action: unknown) => void
        getState: () => unknown
        signal: AbortSignal
      }

      const fetchData = createAsyncAction<string, void>('data/fetch', async (_, thunkAPI) => {
        receivedThunkAPI = thunkAPI
        return 'done'
      })

      await fetchData()(dispatch, getState)

      expect(receivedThunkAPI.dispatch).toBeDefined()
      expect(receivedThunkAPI.getState()).toBe(mockState)
      expect(receivedThunkAPI.signal).toBeInstanceOf(AbortSignal)
    })

    it('should return the result on success', async () => {
      const dispatch = vi.fn()
      const getState = (): Record<string, never> => ({})

      const fetchData = createAsyncAction<{ data: string }, string>('data/fetch', async (id) => {
        return { data: `result-${id}` }
      })

      const result = await fetchData('test')(dispatch, getState)

      expect(result).toEqual({ data: 'result-test' })
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

    it('should work with createSlice and createReduxStore', () => {
      const todoSlice = createSlice({
        name: 'todos',
        initialState: {
          items: [] as Array<{ id: number; text: string; completed: boolean }>,
          filter: 'all' as 'all' | 'completed' | 'active',
        },
        reducers: {
          addTodo: (state, action: { type: string; payload: string }) => {
            state.items.push({
              id: state.items.length + 1,
              text: action.payload,
              completed: false,
            })
          },
          toggleTodo: (state, action: { type: string; payload: number }) => {
            const todo = state.items.find((t) => t.id === action.payload)
            if (todo) {
              todo.completed = !todo.completed
            }
          },
          setFilter: (state, action: { type: string; payload: 'all' | 'completed' | 'active' }) => {
            state.filter = action.payload
          },
        },
      })

      const reduxStore = createReduxStore({ slices: [todoSlice] })

      reduxStore.dispatch(todoSlice.actions.addTodo('Task 1'))
      reduxStore.dispatch(todoSlice.actions.addTodo('Task 2'))

      expect(reduxStore.getState().todos.items).toHaveLength(2)

      reduxStore.dispatch(todoSlice.actions.toggleTodo(1))

      const selectFilteredTodos = createSelector(
        (state: { todos: typeof todoSlice.initialState }) => state.todos.items,
        (state: { todos: typeof todoSlice.initialState }) => state.todos.filter,
        (items, filter) => {
          switch (filter) {
            case 'completed':
              return items.filter((t) => t.completed)
            case 'active':
              return items.filter((t) => !t.completed)
            default:
              return items
          }
        },
      )

      reduxStore.dispatch(todoSlice.actions.setFilter('completed'))
      expect(selectFilteredTodos(reduxStore.getState())).toHaveLength(1)

      reduxStore.dispatch(todoSlice.actions.setFilter('active'))
      expect(selectFilteredTodos(reduxStore.getState())).toHaveLength(1)

      reduxStore.dispatch(todoSlice.actions.setFilter('all'))
      expect(selectFilteredTodos(reduxStore.getState())).toHaveLength(2)
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

    it('should work with middleware and async actions together', async () => {
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
