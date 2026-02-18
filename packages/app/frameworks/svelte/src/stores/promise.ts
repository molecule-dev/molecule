/**
 * Svelte store for tracking async function state.
 *
 * @module
 */

/* eslint-disable @typescript-eslint/no-explicit-any */
import { type Readable, writable } from 'svelte/store'

import type { PromiseState, PromiseStatus } from '@molecule/app-utilities'

/**
 * Promise store with action methods.
 */
export interface PromiseStore<T> extends Readable<PromiseState<T>> {
  call: (...args: any[]) => Promise<T>
  cancel: (message?: string) => void
  reset: () => void
}

/**
 * Creates a store that tracks async function state.
 *
 * @param asyncFn - The async function to track
 * @returns Promise store with subscribe, call, cancel, and reset
 *
 * @example
 * ```svelte
 * <script>
 * import { createPromiseStore } from '`@molecule/app-svelte`'
 *
 * const users = createPromiseStore((query) => api.searchUsers(query))
 * </script>
 *
 * <button on:click={() => users.call('john')} disabled={$users.status === 'pending'}>
 *   Search
 * </button>
 * {#if $users.value}
 *   {#each $users.value as user}
 *     <div>{user.name}</div>
 *   {/each}
 * {/if}
 * ```
 */
export const createPromiseStore = <T extends (...args: any[]) => Promise<any>>(
  asyncFn: T,
): PromiseStore<Awaited<ReturnType<T>>> => {
  type V = Awaited<ReturnType<T>>

  const initial: PromiseState<V> = {
    status: 'idle' as PromiseStatus,
    value: null,
    error: null,
  }

  const store = writable<PromiseState<V>>(initial)

  let callId = 0

  const call = (...args: any[]): Promise<V> => {
    callId += 1
    const thisCallId = callId

    store.set({ status: 'pending', value: null, error: null })

    return asyncFn(...args).then(
      (resolved: V) => {
        if (thisCallId === callId) {
          store.set({ status: 'resolved', value: resolved, error: null })
        }
        return resolved
      },
      (err: unknown) => {
        const rejection = err instanceof Error ? err : new Error(String(err))

        if (thisCallId === callId) {
          store.set({ status: 'rejected', value: null, error: rejection })
        }

        throw rejection
      },
    )
  }

  const cancel = (message?: string): void => {
    callId += 1
    store.set({
      status: 'rejected',
      value: null,
      error: message ? new Error(message) : null,
    })
  }

  const reset = (): void => {
    callId += 1
    store.set({ status: 'idle', value: null, error: null })
  }

  return {
    subscribe: store.subscribe,
    call,
    cancel,
    reset,
  }
}
