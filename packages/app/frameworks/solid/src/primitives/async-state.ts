/**
 * Solid.js primitive for async-capable state management.
 *
 * @module
 */
import { createSignal } from 'solid-js'

/**
 * Return type for createAsyncState.
 */
export interface CreateAsyncStateReturn<T> {
  state: () => T
  setState: (value: T | ((prev: T) => T) | Promise<T | ((prev: T) => T)>) => void
  extendState: (
    partial:
      | Partial<T>
      | ((prev: T) => Partial<T>)
      | Promise<Partial<T> | ((prev: T) => Partial<T>)>,
  ) => void
}

/**
 * Primitive like createSignal but accepts Promises and supports partial state extension.
 *
 * @param initialState - Initial state value
 *
 * @example
 * ```tsx
 * import { createAsyncState } from '`@molecule/app-solid`'
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
    } catch {
      // Silently swallow errors from resolved Promises to avoid unhandled rejections
    }
  }

  const extendState = async (
    partial:
      | Partial<T>
      | ((prev: T) => Partial<T>)
      | Promise<Partial<T> | ((prev: T) => Partial<T>)>,
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
    } catch {
      // Silently swallow errors from resolved Promises to avoid unhandled rejections
    }
  }

  return { state, setState, extendState }
}
