/**
 * Svelte store for async-capable state management.
 *
 * @module
 */
import { type Writable, writable } from 'svelte/store'

import { getLogger } from '@molecule/app-logger'

const logger = getLogger('svelte-async-state')

/**
 * Async state store.
 */
export interface AsyncStateStore<T> extends Writable<T> {
  setState: (value: T | ((prev: T) => T) | Promise<T | ((prev: T) => T)>) => void
  extendState: (
    partial:
      Partial<T> | ((prev: T) => Partial<T>) | Promise<Partial<T> | ((prev: T) => Partial<T>)>,
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
 * import { createAsyncState } from '@molecule/app-svelte'
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
        (error) => {
          // A rejected state promise leaves the previous state in place; record the
          // failure so the stale state is traceable instead of silently stuck.
          logger.warn(
            'createAsyncState: setState promise rejected; state keeps its previous value',
            {
              error,
            },
          )
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
      Partial<T> | ((prev: T) => Partial<T>) | Promise<Partial<T> | ((prev: T) => Partial<T>)>,
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
        (error) => {
          // A rejected partial-update promise leaves the previous state in place;
          // record the failure so the stale state is traceable instead of silently stuck.
          logger.warn(
            'createAsyncState: extendState promise rejected; state keeps its previous value',
            { error },
          )
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
