/**
 * Svelte store for async-capable state management.
 *
 * @module
 */
import { type Writable, writable } from 'svelte/store'

/**
 * Async state store.
 */
export interface AsyncStateStore<T> extends Writable<T> {
  setState: (value: T | ((prev: T) => T) | Promise<T | ((prev: T) => T)>) => void
  extendState: (
    partial:
      | Partial<T>
      | ((prev: T) => Partial<T>)
      | Promise<Partial<T> | ((prev: T) => Partial<T>)>,
  ) => void
}

/**
 * Creates a writable store with async-capable setState and extendState.
 *
 * @param initialValue - The initial state value
 *
 * @example
 * ```svelte
 * <script>
 * import { createAsyncState } from '`@molecule/app-svelte`'
 *
 * const state = createAsyncState({ count: 0, name: 'world' })
 *
 * // Sync update
 * state.setState({ count: 1, name: 'hello' })
 *
 * // Function update
 * state.setState(prev => ({ ...prev, count: prev.count + 1 }))
 *
 * // Async update
 * state.setState(fetch('/api/state').then(r => r.json()))
 *
 * // Partial merge
 * state.extendState({ count: 5 })
 *
 * // Async partial merge
 * state.extendState(fetch('/api/partial').then(r => r.json()))
 * </script>
 *
 * <p>{$state.count} - {$state.name}</p>
 * ```
 * @returns The created instance.
 */
export const createAsyncState = <T>(initialValue: T): AsyncStateStore<T> => {
  const store = writable<T>(initialValue)

  const setState = (value: T | ((prev: T) => T) | Promise<T | ((prev: T) => T)>): void => {
    if (value instanceof Promise) {
      value.then(
        (resolved) => {
          if (typeof resolved === 'function') {
            store.update(resolved as (prev: T) => T)
          } else {
            store.set(resolved)
          }
        },
        () => {
          // Silently swallow promise errors
        },
      )
    } else if (typeof value === 'function') {
      store.update(value as (prev: T) => T)
    } else {
      store.set(value)
    }
  }

  const extendState = (
    partial:
      | Partial<T>
      | ((prev: T) => Partial<T>)
      | Promise<Partial<T> | ((prev: T) => Partial<T>)>,
  ): void => {
    if (partial instanceof Promise) {
      partial.then(
        (resolved) => {
          if (typeof resolved === 'function') {
            store.update((prev) => ({ ...prev, ...(resolved as (prev: T) => Partial<T>)(prev) }))
          } else {
            store.update((prev) => ({ ...prev, ...resolved }))
          }
        },
        () => {
          // Silently swallow promise errors
        },
      )
    } else if (typeof partial === 'function') {
      store.update((prev) => ({ ...prev, ...(partial as (prev: T) => Partial<T>)(prev) }))
    } else {
      store.update((prev) => ({ ...prev, ...partial }))
    }
  }

  return {
    subscribe: store.subscribe,
    set: store.set,
    update: store.update,
    setState,
    extendState,
  }
}
