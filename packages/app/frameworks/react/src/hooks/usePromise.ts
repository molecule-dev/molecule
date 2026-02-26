/**
 * React hook for tracking async function state.
 *
 * @module
 */

/* eslint-disable @typescript-eslint/no-explicit-any */
import { useEffect, useMemo, useRef, useState } from 'react'

import type { PromiseStatus } from '@molecule/app-utilities'

/**
 * Extended promise state with actions.
 */
export interface UsePromiseState<T> {
  status: PromiseStatus
  value: T | null
  error: Error | null
  cancel: (message?: string) => void
  reset: () => void
}

/**
 * Hook that wraps an async function with state tracking.
 *
 * @param asyncFn - The async function to wrap
 * @returns Tuple of [state, wrappedFunction]
 *
 * @example
 * ```tsx
 * const [state, fetchUser] = usePromise((id: string) => api.getUser(id))
 *
 * return (
 *   <div>
 *     <button onClick={() => fetchUser('123')} disabled={state.status === 'pending'}>
 *       {state.status === 'pending' ? 'Loading...' : 'Fetch User'}
 *     </button>
 *     {state.value && <div>{state.value.name}</div>}
 *     {state.error && <div>Error: {state.error.message}</div>}
 *   </div>
 * )
 * ```
 */
export const usePromise = <T extends (...args: any[]) => Promise<any>>(
  asyncFn: T,
): [
  UsePromiseState<Awaited<ReturnType<T>>>,
  (...args: Parameters<T>) => Promise<Awaited<ReturnType<T>>>,
] => {
  type V = Awaited<ReturnType<T>>

  const [status, setStatus] = useState<PromiseStatus>('idle')
  const [value, setValue] = useState<V | null>(null)
  const [error, setError] = useState<Error | null>(null)

  const isUnmounted = useRef(false)
  const callIdRef = useRef(0)
  const cancelledRef = useRef(false)

  useEffect(() => {
    isUnmounted.current = false
    return () => {
      isUnmounted.current = true
    }
  }, [])

  const cancel = useMemo(
    () => (message?: string) => {
      cancelledRef.current = true
      callIdRef.current += 1

      if (!isUnmounted.current) {
        setStatus('rejected')
        setError(message ? new Error(message) : null)
      }
    },
    [],
  )

  const reset = useMemo(
    () => () => {
      cancelledRef.current = false

      if (!isUnmounted.current) {
        setStatus('idle')
        setValue(null)
        setError(null)
      }
    },
    [],
  )

  const callAsyncFn = useMemo(
    () =>
      (...args: Parameters<T>): Promise<V> => {
        cancelledRef.current = false
        callIdRef.current += 1
        const thisCallId = callIdRef.current

        if (!isUnmounted.current) {
          setStatus('pending')
          setError(null)
        }

        const promise = asyncFn(...args)

        return promise.then(
          (resolved: V) => {
            if (thisCallId === callIdRef.current && !isUnmounted.current) {
              setStatus('resolved')
              setValue(resolved)
              setError(null)
            }
            return resolved
          },
          (err: unknown) => {
            const rejection = err instanceof Error ? err : new Error(String(err))

            if (thisCallId === callIdRef.current && !isUnmounted.current) {
              setStatus('rejected')
              setError(rejection)
            }

            throw rejection
          },
        )
      },
    [asyncFn],
  )

  const state = useMemo<UsePromiseState<V>>(
    () => ({
      status,
      value,
      error,
      cancel,
      reset,
    }),
    [status, value, error, cancel, reset],
  )

  return [state, callAsyncFn]
}
