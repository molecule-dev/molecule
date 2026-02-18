/**
 * Zustand slice utilities.
 *
 * @module
 */

import { createStore } from './store.js'
import type {
  GetState,
  SetState,
  Slice,
  SliceConfig,
  Store,
  StoreWithActionsConfig,
} from './types.js'

/**
 * Creates a store with actions (Zustand pattern).
 *
 * @example
 * ```typescript
 * const useCounterStore = createStoreWithActions({
 *   initialState: { count: 0 },
 *   actions: (set, get) => ({
 *     increment: () => set({ count: get().count + 1 }),
 *     decrement: () => set({ count: get().count - 1 }),
 *     reset: () => set({ count: 0 }),
 *   }),
 * })
 *
 * const { count, increment, decrement } = useCounterStore.getState()
 * ```
 * @param config - Configuration with `initialState` and an `actions` factory `(set, get) => actionMap`.
 * @returns A molecule `Store` merged with the action functions, so actions can be called directly on the store.
 */
export const createStoreWithActions = <T extends object, A extends object>(
  config: StoreWithActionsConfig<T, A>,
): Store<T> & A => {
  const { initialState, actions, ...rest } = config

  const store = createStore<T>({ initialState, ...rest } as Parameters<typeof createStore<T>>[0])
  const actionFns = actions(store.setState, store.getState)

  return {
    ...store,
    ...actionFns,
  }
}

/**
 * Creates a named slice of state for use with `combineSlices`. A slice defines a `name`,
 * `initialState`, and an `actions` factory that receives scoped `set`/`get` functions.
 *
 * @example
 * ```typescript
 * const counterSlice = createSlice({
 *   name: 'counter',
 *   initialState: { count: 0 },
 *   actions: (set) => ({
 *     increment: () => set((state) => ({ count: state.count + 1 })),
 *   }),
 * })
 * ```
 * @param config - Slice configuration with `name`, `initialState`, and `actions` factory.
 * @returns A `Slice` object (the config itself, used as a descriptor by `combineSlices`).
 */
export const createSlice = <T extends object, A extends object>(
  config: SliceConfig<T, A>,
): Slice<T, A> => config

/**
 * Combines multiple slices into a single Zustand store. Each slice's state is nested under
 * its `name` key, and each slice's actions are exposed as top-level methods on the store.
 *
 * @example
 * ```typescript
 * const store = combineSlices([counterSlice, userSlice])
 * // store.getState() → { counter: { count: 0 }, user: { name: '', email: '' } }
 * ```
 * @param slices - Array of slices created by `createSlice`.
 * @returns A molecule `Store` with combined state and all slice actions merged onto it.
 */
export const combineSlices = <S extends Slice<object, object>[]>(
  slices: S,
): Store<Record<string, unknown>> => {
  const initialState: Record<string, unknown> = {}
  for (const slice of slices) {
    initialState[slice.name] = slice.initialState
  }

  const store = createStore({ initialState } as Parameters<
    typeof createStore<Record<string, unknown>>
  >[0])

  // Expose slice actions
  for (const slice of slices) {
    const sliceSet: SetState<object> = (
      partial: Partial<object> | ((state: object) => Partial<object>),
    ) => {
      store.setState((state: Record<string, unknown>) => {
        const currentSlice = state[slice.name] as object
        const nextPartial = typeof partial === 'function' ? partial(currentSlice) : partial
        return {
          ...state,
          [slice.name]: { ...currentSlice, ...nextPartial },
        }
      })
    }

    const sliceGet: GetState<object> = () => {
      return store.getState()[slice.name] as object
    }

    const actions = slice.actions(sliceSet, sliceGet)
    Object.assign(store, actions)
  }

  return store
}
