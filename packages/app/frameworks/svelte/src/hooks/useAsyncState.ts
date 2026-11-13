/**
 * Svelte hook for async-capable state management, porting React's
 * `useAsyncState`.
 *
 * @module
 */

import { type Readable, type Writable, writable } from 'svelte/store'

/**
 * Async-capable setState function.
 *
 * @param T - The state type.
 */
export type AsyncSetState<T> = (
  value: T | ((prev: T) => T) | Promise<T | ((prev: T) => T)>,
) => Promise<void>

/**
 * Async-capable extendState function for partial updates.
 *
 * @param T - The state type.
 */
export type AsyncExtendState<T> = (
  partial: Partial<T> | ((prev: T) => Partial<T>) | Promise<Partial<T> | ((prev: T) => Partial<T>)>,
) => Promise<void>

/**
 * The store {@link useAsyncState} returns: the current
 * `[state, setState, extendState]` tuple.
 */
export type UseAsyncStateStore<T> = Readable<readonly [T, AsyncSetState<T>, AsyncExtendState<T>]>

/**
 * State that accepts Promises and partial updates, React's `useAsyncState` in
 * Svelte's idiom: a readable store of the `[state, setState, extendState]`
 * tuple.
 *
 * Like React's, this has NO latest-wins guard: a promise that settles after a
 * newer synchronous set overwrites it — whatever settles last wins. Rejections
 * of resolved promises are silently swallowed (React's deliberate behavior),
 * leaving the previous state in place.
 *
 * @param initialState - Initial state value.
 * @returns A readable store of the [state, setState, extendState] tuple.
 * @example
 * ```svelte
 * <script>
 *   import { useAsyncState } from '@molecule/app-svelte'
 *   const state = useAsyncState({ foo: 'foo', bar: 'bar' })
 *   const [value, setState, extendState] = $state
 *
 *   setState({ foo: 'Hello', bar: 'World!' })
 *   setState((prev) => ({ ...prev, foo: prev.foo.toUpperCase() }))
 *   setState(fetchData())          // a promise resolving a value or an updater
 *   extendState({ foo: 'Hello' })  // a partial merge
 * </script>
 * ```
 */
export function useAsyncState<T>(initialState: T): UseAsyncStateStore<T> {
  let current = initialState
  const tuple: Writable<readonly [T, AsyncSetState<T>, AsyncExtendState<T>]> = writable([
    initialState,
    setState,
    extendState,
  ])

  /** Publishes a new state value through the tuple store. */
  function publish(next: T): void {
    current = next
    tuple.set([current, setState, extendState])
  }

  /** Applies a resolved value-or-updater against the previous state. */
  function applyValue(value: T | ((prev: T) => T)): void {
    publish(typeof value === 'function' ? (value as (prev: T) => T)(current) : value)
  }

  /** Applies a resolved partial-or-updater as a merge into the state. */
  function applyPartial(partial: Partial<T> | ((prev: T) => Partial<T>)): void {
    const resolved =
      typeof partial === 'function' ? (partial as (prev: T) => Partial<T>)(current) : partial
    publish({ ...current, ...resolved })
  }

  /** {@link AsyncSetState} — replaces the whole state. */
  async function setState(
    value: T | ((prev: T) => T) | Promise<T | ((prev: T) => T)>,
  ): Promise<void> {
    try {
      const resolved = value instanceof Promise ? await value : value
      applyValue(resolved)
    } catch (_error) {
      // Silently swallow errors from resolved Promises to avoid unhandled
      // rejections, exactly as React's useAsyncState does; the state keeps
      // its previous value.
    }
  }

  /** {@link AsyncExtendState} — merges a partial into the state. */
  async function extendState(
    partial:
      Partial<T> | ((prev: T) => Partial<T>) | Promise<Partial<T> | ((prev: T) => Partial<T>)>,
  ): Promise<void> {
    try {
      const resolved = partial instanceof Promise ? await partial : partial
      applyPartial(resolved)
    } catch (_error) {
      // Silently swallow errors from resolved Promises to avoid unhandled
      // rejections, exactly as React's useAsyncState does; the state keeps
      // its previous value.
    }
  }

  return tuple
}
