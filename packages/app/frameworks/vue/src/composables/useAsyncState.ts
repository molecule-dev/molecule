/**
 * Vue composable for async-capable state management.
 *
 * @module
 */
import { type Ref, shallowRef } from 'vue'

/**
 * Return type for the {@link useAsyncState} composable.
 */
export interface UseAsyncStateReturn<T> {
  /** The reactive state value. */
  state: Ref<T>
  /** Set the state to a new value, function updater, or promise. */
  setState: (value: T | ((prev: T) => T) | Promise<T | ((prev: T) => T)>) => void
  /** Merge a partial value into the state (object states only). */
  extendState: (
    partial:
      | Partial<T>
      | ((prev: T) => Partial<T>)
      | Promise<Partial<T> | ((prev: T) => Partial<T>)>,
  ) => void
}

/**
 * Checks if a value is a Promise.
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
 * that accept synchronous values, updater functions, or promises.
 *
 * @param initialValue - The initial state value
 * @returns Reactive state and setter methods
 *
 * @example
 * ```vue
 * <script setup>
 * import { useAsyncState } from '`@molecule/app-vue`'
 *
 * const { state, setState, extendState } = useAsyncState({ name: '', loading: false })
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
 * ```
 */
export function useAsyncState<T>(initialValue: T): UseAsyncStateReturn<T> {
  const state = shallowRef<T>(initialValue) as Ref<T>

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

  const setState = (value: T | ((prev: T) => T) | Promise<T | ((prev: T) => T)>): void => {
    if (isPromise(value)) {
      value
        .then((resolved) => {
          state.value = resolveValue(resolved)
        })
        .catch(() => {
          // Silently catch promise errors
        })
      return
    }

    state.value = resolveValue(value)
  }

  const extendState = (
    partial:
      | Partial<T>
      | ((prev: T) => Partial<T>)
      | Promise<Partial<T> | ((prev: T) => Partial<T>)>,
  ): void => {
    if (isPromise(partial)) {
      partial
        .then((resolved) => {
          const partialValue = resolvePartial(resolved)
          state.value = { ...state.value, ...partialValue }
        })
        .catch(() => {
          // Silently catch promise errors
        })
      return
    }

    const partialValue = resolvePartial(partial)
    state.value = { ...state.value, ...partialValue }
  }

  return {
    state,
    setState,
    extendState,
  }
}
