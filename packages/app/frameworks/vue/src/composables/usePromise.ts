/**
 * Vue composable for tracking async function state.
 *
 * @module
 */

/* eslint-disable @typescript-eslint/no-explicit-any */
import { getCurrentScope, onScopeDispose, type ShallowRef, shallowRef } from 'vue'

import type { PromiseStatus } from '@molecule/app-utilities'

/**
 * The state of the latest tracked call, as the tuple's first element reads it.
 */
export interface UsePromiseState<T> {
  /** Current status of the async operation. */
  status: PromiseStatus
  /** Resolved value, or null if not resolved. */
  value: T | null
  /** Rejection error, or null if not rejected. */
  error: Error | null
  /** Cancels the tracked call. */
  cancel: (message?: string) => void
  /** Resets to idle. */
  reset: () => void
}

/**
 * The tuple {@link usePromise} returns.
 *
 * @deprecated `usePromise` now returns `@molecule/app-react`'s tuple shape
 * `[state, call]`; this alias names that tuple for callers that import the old
 * type name.
 */
export type UsePromiseReturn<T> = [UsePromiseState<T>, (...args: any[]) => Promise<T>]

/** React-parity state shape the reactive core keeps. */
interface PromiseInternalState<T> {
  status: PromiseStatus
  value: T | null
  error: Error | null
}

/**
 * The reactive core of {@link usePromise}, shared with the auth-flow
 * composables (`useLogin`, `useSignup`, …) that expose its fields as computed
 * refs.
 *
 * @param fn - The async function to track.
 * @returns The state ref plus the `call`/`cancel`/`reset` controls.
 */
export function usePromiseCore<T>(fn: (...args: any[]) => Promise<T>): {
  /** The tracked state; each settle replaces the object wholesale. */
  state: ShallowRef<PromiseInternalState<T>>
  /** Invoke the async function; resolves with its result, rejects with its error. */
  call: (...args: any[]) => Promise<T>
  /** Mark the tracked call rejected; a late result is not shown. */
  cancel: (message?: string) => void
  /** Return to idle with no value and no error. */
  reset: () => void
} {
  const state = shallowRef<PromiseInternalState<T>>({
    status: 'idle',
    value: null,
    error: null,
  })

  let callId = 0
  let disposed = false

  if (getCurrentScope()) {
    onScopeDispose(() => {
      disposed = true
    })
  }

  const call = async (...args: any[]): Promise<T> => {
    const currentId = ++callId

    state.value = {
      status: 'pending',
      value: state.value.value,
      error: null,
    }

    try {
      const result = await fn(...args)

      if (currentId === callId && !disposed) {
        state.value = {
          status: 'resolved',
          value: result,
          error: null,
        }
      }

      return result
    } catch (err) {
      const rejection = err instanceof Error ? err : new Error(String(err))

      if (currentId === callId && !disposed) {
        // The previous value stays: React's tracker does not clear it on a
        // rejection, and a caller reading `value` mid-failure keeps the last
        // good result.
        state.value = {
          status: 'rejected',
          value: state.value.value,
          error: rejection,
        }
      }

      throw rejection
    }
  }

  const cancel = (message?: string): void => {
    callId++
    if (disposed) return
    state.value = {
      status: 'rejected',
      value: state.value.value,
      error: message ? new Error(message) : null,
    }
  }

  const reset = (): void => {
    // No callId bump: like React's tracker, a reset does not stop a pending
    // call's result from landing — only a newer call or a cancel does.
    if (disposed) return
    state.value = {
      status: 'idle',
      value: null,
      error: null,
    }
  }

  return { state, call, cancel, reset }
}

/**
 * Vue composable for tracking async function state.
 *
 * Wraps an async function and provides reactive state tracking for its
 * pending/resolved/rejected status, along with cancellation and reset support.
 * Returns React's tuple shape `[state, wrapped]`; element 0 is live at read
 * time (it tracks the settled state, so read it per render — for a reactive
 * field use `computed(() => state.status)`).
 *
 * The tracker follows the latest call: a result or rejection from a call that
 * a newer call, a `cancel` or an unmount superseded is not shown (its promise
 * still settles with its caller). `reset` alone does NOT supersede a pending
 * call — its late result lands, exactly like React's hook.
 *
 * @param fn - The async function to track
 * @returns Tuple of `[state, call]`
 *
 * @example
 * ```vue
 * <script setup>
 * import { usePromise } from '@molecule/app-vue'
 *
 * const [state, fetchUser] = usePromise((id: string) => {
 *   const response = await fetch(`/api/users/${id}`)
 *   return response.json()
 * })
 *
 * fetchUser('123')
 * </script>
 *
 * <template>
 *   <div v-if="state.status === 'pending'">Loading...</div>
 *   <div v-else-if="state.status === 'resolved'">{{ state.value }}</div>
 *   <div v-else-if="state.status === 'rejected'">{{ state.error?.message }}</div>
 * </template>
 * ```
 */
export function usePromise<T extends (...args: any[]) => Promise<any>>(
  fn: T,
): [
  UsePromiseState<Awaited<ReturnType<T>>>,
  (...args: Parameters<T>) => Promise<Awaited<ReturnType<T>>>,
] {
  const { state, call, cancel, reset } = usePromiseCore<Awaited<ReturnType<T>>>(
    fn as (...args: any[]) => Promise<any>,
  )

  // The tuple's first element is a live view of the reactive state: each field
  // reads through at access time, so a consumer destructuring it
  // (`const [state, call] = usePromise(fn)`) — or wrapping a field in
  // `computed(() => state.status)` — follows the settled state of the latest
  // call, like React's tuple.
  const view = {} as UsePromiseState<Awaited<ReturnType<T>>>
  for (const field of ['status', 'value', 'error'] as const) {
    Object.defineProperty(view, field, {
      get: () => state.value[field],
      enumerable: true,
      configurable: true,
    })
  }
  Object.defineProperty(view, 'cancel', {
    value: cancel,
    enumerable: true,
    writable: true,
    configurable: true,
  })
  Object.defineProperty(view, 'reset', {
    value: reset,
    enumerable: true,
    writable: true,
    configurable: true,
  })

  return [view, call] as [
    UsePromiseState<Awaited<ReturnType<T>>>,
    (...args: Parameters<T>) => Promise<Awaited<ReturnType<T>>>,
  ]
}
