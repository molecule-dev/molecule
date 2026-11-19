/**
 * Angular utility for tracking async function state.
 *
 * @module
 */

import { BehaviorSubject, type Observable } from 'rxjs'

import type { PromiseState } from '@molecule/app-utilities'

/**
 * Promise state manager.
 *
 * @template T - The resolved value's type.
 * @template Args - The tracked function's parameters.
 */
export interface PromiseStateManager<T, Args extends unknown[] = unknown[]> {
  state$: Observable<PromiseState<T>>
  getState: () => PromiseState<T>
  call: (...args: Args) => Promise<T>
  cancel: (message?: string) => void
  reset: () => void
  destroy: () => void
}

const createIdleState = <T>(): PromiseState<T> => ({
  status: 'idle',
  value: null,
  error: null,
})

/**
 * Creates a promise state manager for tracking async function state.
 *
 * @template Args - The tracked function's parameters.
 * @template T - The tracked function's resolved value.
 * @param asyncFn - The async function to track
 * @returns Promise state manager with observable state
 *
 * @example
 * ```typescript
 * const { state$, call, cancel, reset, destroy } = createPromiseState(
 *   (id: string) => fetch(`/api/users/${id}`).then(r => r.json())
 * )
 *
 * state$.subscribe(state => {
 *   console.log(state.status, state.value, state.error)
 * })
 *
 * await call('123')
 * ```
 */
export const createPromiseState = <Args extends unknown[], T>(
  asyncFn: (...args: Args) => Promise<T>,
): PromiseStateManager<T, Args> => {
  type V = T

  const subject = new BehaviorSubject<PromiseState<V>>(createIdleState<V>())
  let callId = 0
  let destroyed = false

  const getState = (): PromiseState<V> => subject.getValue()

  const call = (...args: Args): Promise<V> => {
    callId += 1
    const thisCallId = callId

    if (!destroyed) {
      subject.next({ status: 'pending', value: null, error: null })
    }

    const promise = asyncFn(...args)

    return promise.then(
      (resolved: V) => {
        if (thisCallId === callId && !destroyed) {
          subject.next({ status: 'resolved', value: resolved, error: null })
        }
        return resolved
      },
      (err: unknown) => {
        const rejection = err instanceof Error ? err : new Error(String(err))

        if (thisCallId === callId && !destroyed) {
          subject.next({ status: 'rejected', value: null, error: rejection })
        }

        throw rejection
      },
    )
  }

  const cancel = (message?: string): void => {
    callId += 1

    if (!destroyed) {
      subject.next({
        status: 'rejected',
        value: null,
        error: message ? new Error(message) : null,
      })
    }
  }

  const reset = (): void => {
    if (!destroyed) {
      subject.next(createIdleState<V>())
    }
  }

  const destroy = (): void => {
    destroyed = true
    subject.complete()
  }

  return {
    state$: subject.asObservable(),
    getState,
    call,
    cancel,
    reset,
    destroy,
  }
}
