/**
 * Vue composable for tracking async function state.
 *
 * @module
 */

/* eslint-disable @typescript-eslint/no-explicit-any */
import { computed, type ComputedRef, getCurrentScope, onScopeDispose, shallowRef } from 'vue'

import type { PromiseStatus } from '@molecule/app-utilities'

/**
 * Internal state shape for the promise tracker.
 */
interface PromiseInternalState<T> {
  status: PromiseStatus
  value: T | null
  error: Error | null
}

/**
 * Return type for usePromise composable.
 */
export interface UsePromiseReturn<T> {
  /** Current status of the async operation. */
  status: ComputedRef<PromiseStatus>
  /** Resolved value, or null if not yet resolved. */
  value: ComputedRef<T | null>
  /** Rejection error, or null if not rejected. */
  error: ComputedRef<Error | null>
  /** Invoke the async function. Returns a promise that resolves with the result. */
  call: (...args: any[]) => Promise<T>
  /** Cancel the current in-flight call. */
  cancel: (message?: string) => void
  /** Reset state to idle with null value and error. */
  reset: () => void
}

/**
 * Vue composable for tracking async function state.
 *
 * Wraps an async function and provides reactive state tracking for its
 * pending/resolved/rejected status, along with cancellation and reset support.
 *
 * @param fn - The async function to track
 * @returns Reactive state and control methods
 *
 * @example
 * ```vue
 * <script setup>
 * import { usePromise } from '`@molecule/app-vue`'
 *
 * const { status, value, error, call } = usePromise(async (id: string) => {
 *   const response = await fetch(`/api/users/${id}`)
 *   return response.json()
 * })
 *
 * call('123')
 * </script>
 *
 * <template>
 *   <div v-if="status === 'pending'">Loading...</div>
 *   <div v-else-if="status === 'resolved'">{{ value }}</div>
 *   <div v-else-if="status === 'rejected'">{{ error?.message }}</div>
 * </template>
 * ```
 */
export function usePromise<T>(fn: (...args: any[]) => Promise<T>): UsePromiseReturn<T> {
  const state = shallowRef<PromiseInternalState<T>>({
    status: 'idle',
    value: null,
    error: null,
  })

  let callId = 0
  let disposed = false

  // Track scope disposal for cleanup
  if (getCurrentScope()) {
    onScopeDispose(() => {
      disposed = true
    })
  }

  const status = computed(() => state.value.status)
  const value = computed(() => state.value.value)
  const error = computed(() => state.value.error)

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
      const error = err instanceof Error ? err : new Error(String(err))

      if (currentId === callId && !disposed) {
        state.value = {
          status: 'rejected',
          value: null,
          error,
        }
      }

      throw error
    }
  }

  const cancel = (message?: string): void => {
    callId++
    state.value = {
      status: 'rejected',
      value: null,
      error: new Error(message ?? 'Cancelled'),
    }
  }

  const reset = (): void => {
    callId++
    state.value = {
      status: 'idle',
      value: null,
      error: null,
    }
  }

  return {
    status,
    value,
    error,
    call,
    cancel,
    reset,
  }
}
