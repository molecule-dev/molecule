/**
 * Solid.js primitive for tracking async function state.
 *
 * @module
 */

/* eslint-disable @typescript-eslint/no-explicit-any */
import { batch, createSignal, onCleanup } from 'solid-js'

import type { PromiseState, PromiseStatus } from '@molecule/app-utilities'

import { liveStateTuple } from './reactive-tuple.js'

/**
 * Promise state accessor with actions.
 */
export interface CreatePromiseReturn<T> {
  state: () => PromiseState<T>
  call: (...args: any[]) => Promise<T>
  cancel: (message?: string) => void
  reset: () => void
}

const INITIAL_STATE: PromiseState<never> = {
  status: 'idle' as PromiseStatus,
  value: null,
  error: null,
}

/**
 * Primitive that wraps an async function with reactive state tracking.
 *
 * @param asyncFn - The async function to wrap
 * @returns Object with state accessor, call, cancel, and reset functions
 *
 * @example
 * ```tsx
 * import { createPromise } from '@molecule/app-solid'
 *
 * function UserLoader() {
 *   const { state, call } = createPromise((id: string) => fetchUser(id))
 *
 *   return (
 *     <div>
 *       <button onClick={() => call('123')} disabled={state().status === 'pending'}>
 *         {state().status === 'pending' ? 'Loading...' : 'Fetch User'}
 *       </button>
 *       <Show when={state().value}>
 *         <div>{state().value!.name}</div>
 *       </Show>
 *       <Show when={state().error}>
 *         <div>Error: {state().error!.message}</div>
 *       </Show>
 *     </div>
 *   )
 * }
 * ```
 */
export function createPromise<T extends (...args: any[]) => Promise<any>>(
  asyncFn: T,
): CreatePromiseReturn<Awaited<ReturnType<T>>> {
  type V = Awaited<ReturnType<T>>

  const [state, setState] = createSignal<PromiseState<V>>(INITIAL_STATE as PromiseState<V>)

  let callId = 0
  let cleaned = false

  onCleanup(() => {
    cleaned = true
  })

  const call = (...args: any[]): Promise<V> => {
    callId += 1
    const thisCallId = callId

    batch(() => {
      setState({
        status: 'pending',
        value: null,
        error: null,
      })
    })

    return asyncFn(...args).then(
      (resolved: V) => {
        if (thisCallId === callId && !cleaned) {
          batch(() => {
            setState({
              status: 'resolved',
              value: resolved,
              error: null,
            })
          })
        }
        return resolved
      },
      (err: unknown) => {
        const rejection = err instanceof Error ? err : new Error(String(err))

        if (thisCallId === callId && !cleaned) {
          batch(() => {
            setState({
              status: 'rejected',
              value: null,
              error: rejection,
            })
          })
        }

        throw rejection
      },
    )
  }

  const cancel = (message?: string): void => {
    callId += 1

    if (!cleaned) {
      batch(() => {
        setState({
          status: 'rejected',
          value: null,
          error: message ? new Error(message) : null,
        })
      })
    }
  }

  const reset = (): void => {
    callId += 1

    if (!cleaned) {
      setState(INITIAL_STATE as PromiseState<V>)
    }
  }

  return { state, call, cancel, reset }
}

/**
 * Extended promise state with actions (React's `usePromise` shape).
 *
 * @template T - The resolved value type.
 */
export interface UsePromiseState<T> {
  status: PromiseStatus
  value: T | null
  error: Error | null
  cancel: (message?: string) => void
  reset: () => void
}

/**
 * Wraps an async function with state tracking, under React's hook name: a
 * `[state, wrapped]` tuple. The wrapped function tracks its latest call — a
 * stale resolution or rejection after a newer call started is not shown but
 * still reaches its caller (a rejection rethrows). `cancel` marks the pending
 * call rejected with its message; `reset` returns to idle.
 *
 * @param asyncFn - The async function to wrap.
 * @returns The tuple: the live state and the wrapped function.
 * @example
 * ```tsx
 * const [state, fetchUser] = usePromise((id: string) => api.getUser(id))
 * <button disabled={state().status === 'pending'}>Fetch</button>
 * ```
 */
export const usePromise = <T extends (...args: never[]) => Promise<unknown>>(
  asyncFn: T,
): [
  UsePromiseState<Awaited<ReturnType<T>>>,
  (...args: Parameters<T>) => Promise<Awaited<ReturnType<T>>>,
] => {
  type V = Awaited<ReturnType<T>>

  const [status, setStatus] = createSignal<PromiseStatus>('idle')
  const [value, setValue] = createSignal<V | null>(null)
  const [error, setError] = createSignal<Error | null>(null)

  let isUnmounted = false
  let callId = 0

  onCleanup(() => {
    isUnmounted = true
  })

  const cancel = (message?: string): void => {
    callId += 1

    if (!isUnmounted) {
      setStatus('rejected')
      setError(message ? new Error(message) : null)
    }
  }

  const reset = (): void => {
    if (!isUnmounted) {
      setStatus('idle')
      setValue(() => null)
      setError(null)
    }
  }

  const callAsyncFn = (...args: Parameters<T>): Promise<V> => {
    callId += 1
    const thisCallId = callId

    if (!isUnmounted) {
      setStatus('pending')
      setError(null)
    }

    const promise = asyncFn(...args) as Promise<V>

    return promise.then(
      (resolved: V) => {
        if (thisCallId === callId && !isUnmounted) {
          setStatus('resolved')
          setValue(() => resolved)
          setError(null)
        }
        return resolved
      },
      (err: unknown) => {
        const rejection = err instanceof Error ? err : new Error(String(err))

        if (thisCallId === callId && !isUnmounted) {
          setStatus('rejected')
          setError(rejection)
        }

        throw rejection
      },
    )
  }

  const state = (): UsePromiseState<V> => ({
    status: status(),
    value: value(),
    error: error(),
    cancel,
    reset,
  })

  return liveStateTuple(state, [callAsyncFn]) as [
    UsePromiseState<V>,
    (...args: Parameters<T>) => Promise<V>,
  ]
}
