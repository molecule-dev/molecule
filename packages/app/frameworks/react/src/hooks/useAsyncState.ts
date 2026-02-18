/**
 * React hook for async-capable state management.
 *
 * @module
 */
import { useCallback, useState } from 'react'

/**
 * Async-capable setState function.
 * @param value - The new state value, an updater function receiving previous state, or a Promise resolving to either.
 */
export type AsyncSetState<T> = (value: T | ((prev: T) => T) | Promise<T | ((prev: T) => T)>) => void

/**
 * Async-capable extendState function for partial updates.
 */
export type AsyncExtendState<T> = (
  partial: Partial<T> | ((prev: T) => Partial<T>) | Promise<Partial<T> | ((prev: T) => Partial<T>)>,
) => void

/**
 * Hook like useState but accepts Promises and supports partial state extension.
 *
 * @param initialState - Initial state value
 * @returns Tuple of [state, asyncSetState, asyncExtendState]
 *
 * @example
 * ```tsx
 * interface State {
 *   foo: string
 *   bar: string
 * }
 *
 * const [state, setState, extendState] = useAsyncState<State>({
 *   foo: 'foo',
 *   bar: 'bar',
 * })
 *
 * // Synchronous usage
 * setState({ foo: 'Hello', bar: 'World!' })
 * setState((prev) => ({ ...prev, foo: prev.foo.toUpperCase() }))
 *
 * // Async usage
 * setState(fetchData())
 *
 * // Partial updates
 * extendState({ foo: 'Hello' })
 * extendState(fetchPartialData())
 * ```
 */
export const useAsyncState = <T>(initialState: T): [T, AsyncSetState<T>, AsyncExtendState<T>] => {
  const [state, setState] = useState<T>(initialState)

  const asyncSetState = useCallback<AsyncSetState<T>>(async (nextState) => {
    try {
      if (nextState instanceof Promise) {
        nextState = await nextState
      }

      setState((prev) => {
        if (typeof nextState === 'function') {
          return (nextState as (prev: T) => T)(prev)
        }
        return nextState as T
      })
    } catch {
      // Silently swallow errors from resolved Promises to avoid unhandled rejections
    }
  }, [])

  const asyncExtendState = useCallback<AsyncExtendState<T>>(async (partial) => {
    try {
      if (partial instanceof Promise) {
        partial = await partial
      }

      setState((prev) => {
        let resolved: Partial<T>

        if (typeof partial === 'function') {
          resolved = (partial as (prev: T) => Partial<T>)(prev)
        } else {
          resolved = partial as Partial<T>
        }

        return { ...prev, ...resolved }
      })
    } catch {
      // Silently swallow errors from resolved Promises to avoid unhandled rejections
    }
  }, [])

  return [state, asyncSetState, asyncExtendState]
}
