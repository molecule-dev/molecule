/**
 * Angular utility for async-capable state management.
 *
 * @module
 */
import { BehaviorSubject, type Observable } from 'rxjs'

/**
 * Async state manager.
 */
export interface AsyncStateManager<T> {
  state$: Observable<T>
  getState: () => T
  setState: (value: T | ((prev: T) => T) | Promise<T | ((prev: T) => T)>) => void
  extendState: (
    partial:
      | Partial<T>
      | ((prev: T) => Partial<T>)
      | Promise<Partial<T> | ((prev: T) => Partial<T>)>,
  ) => void
  destroy: () => void
}

/**
 * Creates an async-capable state manager.
 *
 * @param initialState - Initial state value
 *
 * @example
 * ```typescript
 * interface AppState {
 *   count: number
 *   name: string
 * }
 *
 * const { state$, setState, extendState, destroy } = createAsyncState<AppState>({
 *   count: 0,
 *   name: 'world',
 * })
 *
 * state$.subscribe(state => console.log(state))
 *
 * // Sync
 * setState({ count: 1, name: 'hello' })
 * setState(prev => ({ ...prev, count: prev.count + 1 }))
 *
 * // Async
 * setState(fetchState())
 *
 * // Partial updates
 * extendState({ count: 42 })
 * extendState(fetchPartialState())
 * ```
 * @returns The created instance.
 */
export const createAsyncState = <T>(initialState: T): AsyncStateManager<T> => {
  const subject = new BehaviorSubject<T>(initialState)
  let destroyed = false

  const getState = (): T => subject.getValue()

  const setState = (value: T | ((prev: T) => T) | Promise<T | ((prev: T) => T)>): void => {
    if (value instanceof Promise) {
      value.then(
        (resolved) => {
          if (destroyed) return

          if (typeof resolved === 'function') {
            subject.next((resolved as (prev: T) => T)(subject.getValue()))
          } else {
            subject.next(resolved)
          }
        },
        () => {
          // Silently swallow errors from resolved Promises to avoid unhandled rejections
        },
      )
      return
    }

    if (destroyed) return

    if (typeof value === 'function') {
      subject.next((value as (prev: T) => T)(subject.getValue()))
    } else {
      subject.next(value)
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
          if (destroyed) return

          let resolvedPartial: Partial<T>

          if (typeof resolved === 'function') {
            resolvedPartial = (resolved as (prev: T) => Partial<T>)(subject.getValue())
          } else {
            resolvedPartial = resolved
          }

          subject.next({ ...subject.getValue(), ...resolvedPartial })
        },
        () => {
          // Silently swallow errors from resolved Promises to avoid unhandled rejections
        },
      )
      return
    }

    if (destroyed) return

    let resolvedPartial: Partial<T>

    if (typeof partial === 'function') {
      resolvedPartial = (partial as (prev: T) => Partial<T>)(subject.getValue())
    } else {
      resolvedPartial = partial
    }

    subject.next({ ...subject.getValue(), ...resolvedPartial })
  }

  const destroy = (): void => {
    destroyed = true
    subject.complete()
  }

  return {
    state$: subject.asObservable(),
    getState,
    setState,
    extendState,
    destroy,
  }
}
