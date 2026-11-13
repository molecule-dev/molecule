/**
 * Svelte hook for tracking async function state, porting React's `usePromise`.
 *
 * @module
 */

import { onDestroy } from 'svelte'
import { type Readable, type Writable, writable } from 'svelte/store'

import type { PromiseStatus } from '@molecule/app-utilities'

/**
 * Extended promise state with actions, React's `UsePromiseState`.
 */
export interface UsePromiseState<T> {
  status: PromiseStatus
  value: T | null
  error: Error | null
  cancel: (message?: string) => void
  reset: () => void
}

/**
 * The store {@link usePromise} returns: the current `[state, call]` tuple.
 */
export type UsePromiseStore<T, A extends unknown[]> = Readable<
  readonly [UsePromiseState<T>, (...args: A) => Promise<T>]
>

/**
 * Wraps an async function with state tracking, React's `usePromise` in
 * Svelte's idiom.
 *
 * For one UI action, pass `$store[0].status === 'pending'` to `Button loading`
 * from `@molecule/app-ui-svelte` (or disable a native control). The control
 * then refuses input while the request is pending and re-enables when the
 * tracked call settles. Handle the returned promise's rejection; the hook
 * also records the failure in `state.error`.
 *
 * This hook tracks the latest call: it does not serialize invocations or
 * cancel their network requests. An explicit reset/cancel changes the tracked
 * state, so it is not proof that an outstanding request has stopped. Use an
 * app-owned queue when every click must be accepted in order.
 *
 * The result is a readable store of the `[state, call]` tuple (React's tuple
 * shape): `$store[0]` is the current state, `$store[1]` the tracked function.
 * A pending call keeps the PREVIOUS `value`; a rejection records the error
 * (keeping the previous `value`) and rethrows to its caller; `cancel(message?)`
 * marks the state `rejected` with `new Error(message)` — or no error when no
 * message is given; `reset()` returns to idle.
 *
 * @param asyncFn - The async function to wrap.
 * @returns A readable store of the [state, wrappedFunction] tuple.
 * @example
 * ```svelte
 * <script>
 *   import { usePromise } from '@molecule/app-svelte'
 *   const fetchUser = usePromise((id: string) => api.getUser(id))
 *   const [state, call] = $fetchUser
 * </script>
 *
 * <button onclick={() => call('123')} disabled={state.status === 'pending'}>
 *   {state.status === 'pending' ? 'Loading…' : 'Fetch user'}
 * </button>
 * {#if state.value}<div>{state.value.name}</div>{/if}
 * {#if state.error}<div>Error: {state.error.message}</div>{/if}
 * ```
 */
export function usePromise<T, A extends unknown[]>(
  asyncFn: (...args: A) => Promise<T>,
): UsePromiseStore<T, A> {
  let isUnmounted = false
  let callId = 0
  const state: UsePromiseState<T> = {
    status: 'idle',
    value: null,
    error: null,
    cancel: (message?: string) => {
      callId += 1
      if (!isUnmounted) {
        publish({
          status: 'rejected',
          value: state.value,
          error: message ? new Error(message) : null,
        })
      }
    },
    reset: () => {
      if (!isUnmounted) {
        publish({ status: 'idle', value: null, error: null })
      }
    },
  }
  const tuple: Writable<readonly [UsePromiseState<T>, (...args: A) => Promise<T>]> = writable([
    state,
    call,
  ])

  onDestroy(() => {
    isUnmounted = true
  })

  /** Replaces the tracked state (the same `state` object, mutated). */
  function publish(next: { status: PromiseStatus; value: T | null; error: Error | null }): void {
    state.status = next.status
    state.value = next.value
    state.error = next.error
    tuple.set([state, call])
  }

  /** The tracked function, one stable identity for the component's life. */
  function call(...args: A): Promise<T> {
    callId += 1
    const thisCallId = callId

    if (!isUnmounted) {
      publish({ status: 'pending', value: state.value, error: null })
    }

    return asyncFn(...args).then(
      (resolved: T) => {
        if (thisCallId === callId && !isUnmounted) {
          publish({ status: 'resolved', value: resolved, error: null })
        }
        return resolved
      },
      (err: unknown) => {
        const rejection = err instanceof Error ? err : new Error(String(err))
        if (thisCallId === callId && !isUnmounted) {
          publish({ status: 'rejected', value: state.value, error: rejection })
        }
        throw rejection
      },
    )
  }

  return tuple
}
