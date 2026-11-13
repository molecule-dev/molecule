/**
 * Vue composable for async-capable state management.
 *
 * @module
 */
import { shallowRef } from 'vue'

/**
 * Async-capable setState function.
 *
 * @param value - The new state value, an updater function receiving previous state, or a Promise resolving to either.
 */
export type AsyncSetState<T> = (value: T | ((prev: T) => T) | Promise<T | ((prev: T) => T)>) => void

/**
 * Async-capable extendState function for partial updates.
 *
 * @param partial - The partial value, an updater function receiving previous state, or a Promise resolving to either.
 */
export type AsyncExtendState<T> = (
  partial: Partial<T> | ((prev: T) => Partial<T>) | Promise<Partial<T> | ((prev: T) => Partial<T>)>,
) => void

/**
 * The tuple {@link useAsyncState} returns.
 *
 * @deprecated `useAsyncState` now returns `@molecule/app-react`'s tuple shape
 * `[state, setState, extendState]`; this alias names that tuple for callers
 * that import the old type name.
 */
export type UseAsyncStateReturn<T> = [T, AsyncSetState<T>, AsyncExtendState<T>]

/**
 * Checks if a value is a Promise.
 *
 * @param value - The value to check for Promise-like behavior.
 * @returns `true` if the value is a Promise or thenable, `false` otherwise.
 */
function isPromise<T>(value: unknown): value is Promise<T> {
  return (
    value instanceof Promise || (typeof value === 'object' && value !== null && 'then' in value)
  )
}

/**
 * Vue composable for async-capable state management.
 *
 * Provides a reactive state ref with `setState` and `extendState` methods
 * that accept synchronous values, updater functions, or promises. Returns
 * React's tuple shape `[state, setState, extendState]`; element 0 is live at
 * read time (it tracks the settled state, so read it per render).
 *
 * A rejected promise leaves the state unchanged and is swallowed: like
 * React's hook, there is no error surface here and no unhandled rejection.
 * There is also NO latest-wins guard — whatever settles last applies, even
 * over a newer synchronous set (React's hook behaves the same).
 *
 * @param initialValue - The initial state value
 * @returns Tuple of `[state, setState, extendState]`
 *
 * @example
 * ```vue
 * <script setup>
 * import { useAsyncState } from '@molecule/app-vue'
 *
 * const [state, setState, extendState] = useAsyncState({ name: '', loading: false })
 *
 * // Sync update
 * setState({ name: 'Alice', loading: false })
 *
 * // Function updater
 * setState(prev => ({ ...prev, name: prev.name.toUpperCase() }))
 *
 * // Async update
 * setState(fetch('/api/user').then(r => r.json()))
 *
 * // Partial merge
 * extendState({ loading: true })
 * </script>
 *
 * <template>
 *   <p>{{ state.name }}</p>
 * </template>
 * ```
 */
export function useAsyncState<T>(initialValue: T): [T, AsyncSetState<T>, AsyncExtendState<T>] {
  const state = shallowRef<T>(initialValue)

  const resolveValue = (valueOrFn: T | ((prev: T) => T)): T => {
    if (typeof valueOrFn === 'function') {
      return (valueOrFn as (prev: T) => T)(state.value)
    }
    return valueOrFn
  }

  const resolvePartial = (partialOrFn: Partial<T> | ((prev: T) => Partial<T>)): Partial<T> => {
    if (typeof partialOrFn === 'function') {
      return (partialOrFn as (prev: T) => Partial<T>)(state.value)
    }
    return partialOrFn
  }

  const setState: AsyncSetState<T> = async (value) => {
    if (isPromise(value)) {
      value
        .then((resolved) => {
          state.value = resolveValue(resolved)
        })
        .catch((_error) => {
          // A rejected state promise leaves the previous state in place, with no
          // error surface to report it on — swallowed to avoid an unhandled
          // rejection, exactly like React's hook.
        })
      return
    }

    state.value = resolveValue(value)
  }

  const extendState: AsyncExtendState<T> = async (partial) => {
    if (isPromise(partial)) {
      partial
        .then((resolved) => {
          const partialValue = resolvePartial(resolved)
          state.value = { ...state.value, ...partialValue }
        })
        .catch((_error) => {
          // A rejected partial-update promise leaves the previous state in
          // place, with no error surface to report it on — swallowed to avoid
          // an unhandled rejection, exactly like React's hook.
        })
      return
    }

    const partialValue = resolvePartial(partial)
    state.value = { ...state.value, ...partialValue }
  }

  // The tuple's first element reads through to the reactive state, so a
  // consumer destructuring it (`const [state, setState] = useAsyncState(x)`)
  // sees the current state, like React's tuple.
  const tuple = [initialValue, setState, extendState] as [T, AsyncSetState<T>, AsyncExtendState<T>]
  Object.defineProperty(tuple, 0, {
    get: (): T => state.value,
    enumerable: true,
    configurable: true,
  })
  return tuple
}
