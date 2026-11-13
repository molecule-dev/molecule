/**
 * Solid.js primitive for async-capable state management.
 *
 * @module
 */
import { createSignal } from 'solid-js'

import { liveStateTuple } from './reactive-tuple.js'

/**
 * Return type for createAsyncState.
 */
export interface CreateAsyncStateReturn<T> {
  state: () => T
  setState: (value: T | ((prev: T) => T) | Promise<T | ((prev: T) => T)>) => void
  extendState: (
    partial:
      Partial<T> | ((prev: T) => Partial<T>) | Promise<Partial<T> | ((prev: T) => Partial<T>)>,
  ) => void
}

/**
 * Primitive like createSignal but accepts Promises and supports partial state extension.
 *
 * @param initialState - Initial state value
 *
 * @example
 * ```tsx
 * import { createAsyncState } from '@molecule/app-solid'
 *
 * interface State {
 *   foo: string
 *   bar: string
 * }
 *
 * function MyComponent() {
 *   const { state, setState, extendState } = createAsyncState<State>({
 *     foo: 'foo',
 *     bar: 'bar',
 *   })
 *
 *   // Synchronous usage
 *   setState({ foo: 'Hello', bar: 'World!' })
 *   setState((prev) => ({ ...prev, foo: prev.foo.toUpperCase() }))
 *
 *   // Async usage
 *   setState(fetchData())
 *
 *   // Partial updates
 *   extendState({ foo: 'Hello' })
 *   extendState(fetchPartialData())
 *
 *   return <div>{state().foo} {state().bar}</div>
 * }
 * ```
 * @returns The created instance.
 */
export function createAsyncState<T>(initialState: T): CreateAsyncStateReturn<T> {
  const [state, setSignal] = createSignal<T>(initialState)

  const setState = async (
    nextState: T | ((prev: T) => T) | Promise<T | ((prev: T) => T)>,
  ): Promise<void> => {
    try {
      if (nextState instanceof Promise) {
        nextState = await nextState
      }

      setSignal((prev) => {
        if (typeof nextState === 'function') {
          return (nextState as (prev: T) => T)(prev)
        }
        return nextState as T
      })
    } catch (_error) {
      // Silently swallow errors from resolved Promises to avoid unhandled rejections
    }
  }

  const extendState = async (
    partial:
      Partial<T> | ((prev: T) => Partial<T>) | Promise<Partial<T> | ((prev: T) => Partial<T>)>,
  ): Promise<void> => {
    try {
      if (partial instanceof Promise) {
        partial = await partial
      }

      setSignal((prev) => {
        let resolved: Partial<T>

        if (typeof partial === 'function') {
          resolved = (partial as (prev: T) => Partial<T>)(prev)
        } else {
          resolved = partial as Partial<T>
        }

        return { ...prev, ...resolved }
      })
    } catch (_error) {
      // Silently swallow errors from resolved Promises to avoid unhandled rejections
    }
  }

  return { state, setState, extendState }
}

/**
 * Async-capable setState function: a value, an updater, or a promise of
 * either (React's `useAsyncState` shape).
 *
 * @template T - The state type.
 */
export type AsyncSetState<T> = (
  value: T | ((prev: T) => T) | Promise<T | ((prev: T) => T)>,
) => Promise<void>

/**
 * Async-capable extendState function for partial updates (React's shape).
 *
 * @template T - The state type.
 */
export type AsyncExtendState<T> = (
  partial: Partial<T> | ((prev: T) => Partial<T>) | Promise<Partial<T> | ((prev: T) => Partial<T>)>,
) => Promise<void>

/**
 * Like `createSignal` but accepting Promises and partial updates, under
 * React's hook name: a `[state, setState, extendState]` tuple where `setState`
 * replaces, `extendState` merges, and both accept a value, an updater or a
 * promise of either. There is deliberately no latest-wins guard: whatever
 * settles last wins, so a promise settling after a newer synchronous set
 * overwrites it.
 *
 * @param initialState - Initial state value.
 * @returns The tuple: the live state, the replacing setter, the merging setter.
 * @example
 * ```tsx
 * const [state, setState, extendState] = useAsyncState<State>({ foo: 'foo' })
 * setState({ foo: 'Hello' })
 * setState(fetchData())
 * extendState({ bar: 'bar' })
 * ```
 */
export function useAsyncState<T>(initialState: T): [T, AsyncSetState<T>, AsyncExtendState<T>] {
  const [state, setStateSignal] = createSignal<T>(initialState)

  const asyncSetState = async (
    nextState: T | ((prev: T) => T) | Promise<T | ((prev: T) => T)>,
  ): Promise<void> => {
    try {
      let resolved = nextState
      if (resolved instanceof Promise) {
        resolved = await resolved
      }
      setStateSignal((prev) =>
        typeof resolved === 'function' ? (resolved as (prev: T) => T)(prev) : (resolved as T),
      )
    } catch (_error) {
      // Silently swallow errors from resolved Promises to avoid unhandled
      // rejections; the state keeps its current value.
    }
  }

  const asyncExtendState = async (
    partial:
      Partial<T> | ((prev: T) => Partial<T>) | Promise<Partial<T> | ((prev: T) => Partial<T>)>,
  ): Promise<void> => {
    try {
      let resolved = partial
      if (resolved instanceof Promise) {
        resolved = await resolved
      }
      setStateSignal((prev) => {
        const next =
          typeof resolved === 'function'
            ? (resolved as (prev: T) => Partial<T>)(prev)
            : (resolved as Partial<T>)
        return { ...prev, ...next }
      })
    } catch (_error) {
      // Silently swallow errors from resolved Promises to avoid unhandled
      // rejections; the state keeps its current value.
    }
  }

  return liveStateTuple(() => state(), [asyncSetState, asyncExtendState]) as [
    T,
    AsyncSetState<T>,
    AsyncExtendState<T>,
  ]
}
