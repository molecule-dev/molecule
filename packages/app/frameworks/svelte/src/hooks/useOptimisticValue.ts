/**
 * Svelte hook for a server-backed value that the UI changes at once and saves
 * in order, porting React's `useOptimisticValue`.
 *
 * @module
 */

import { onDestroy } from 'svelte'
import { type Readable, writable } from 'svelte/store'

import type {
  OptimisticValue,
  OptimisticValueOptions,
  OptimisticValueState,
} from '@molecule/app-state'
import { createOptimisticValue, shallowEqual } from '@molecule/app-state'

import { fieldStore } from './live-store.js'

/**
 * The replaced host's controller, one turn long: a mount in the same turn
 * adopts it (React re-rendered the host, it did not unmount), so the pending
 * save keeps running across the re-render and the new render's server value
 * syncs into the same controller.
 */
interface OptimisticHandoff {
  /** Set by the adopting mount; the disarm timer then clears. */
  adopted: boolean
  /** The controller, holding the pending save. */
  controller: OptimisticValue<never>
  /** The last server value the hook received (React's `received` ref). */
  received: unknown
}

/** The previous host's handoff, alive until its disarm timer runs. */
let optimisticHandoff: OptimisticHandoff | null = null

/**
 * What {@link useOptimisticValue} returns: the state to render as readable
 * stores and the two ways to change it (the same names React returns).
 *
 * @template T - The value type.
 */
export interface UseOptimisticValueResult<T> {
  /** The value to render. */
  value: Readable<T>
  /** Whether a save is running or waiting. */
  pending: Readable<boolean>
  /** The failure of the newest change. */
  error: Readable<unknown>
  /** Shows `next` at once and saves it, after any save already running. */
  set: (next: T) => void
  /** Like `set`, computed from the value shown now (`update((on) => !on)`). */
  update: (change: (current: T) => T) => void
}

/**
 * A server-backed value — a favorite, follow, like or bookmark button, a
 * rating, a quantity, a setting switch — that changes on the first render
 * after a tap and is saved one change at a time, in order. See
 * `createOptimisticValue` in `@molecule/app-state`, under React's hook name.
 *
 * A new server `value` is taken only when it differs (by `equals`) from the
 * one the hook last received, and only while nothing is being saved, so a
 * refetch of older data never flips the button mid-save. The latest `commit`
 * and `onError` are always used. Give the component a `key` per record, so one
 * record's pending change never shows on another. Keep related fields, such as
 * a favorite flag and its count, in the SAME value. Let commit reject on
 * failure: a catch that returns old data hides the failure.
 *
 * @param options - The server's current value and how to save a change.
 * @returns The value to render, whether a save is pending, the newest failure,
 *   and `set`/`update`.
 * @example
 * ```svelte
 * <script>
 *   import { useOptimisticValue } from '@molecule/app-svelte'
 *   const star = useOptimisticValue({
 *     value: { starred: repository.starred, stars: repository.stars },
 *     commit: async (next) => { /* save and return the server's value * },
 *   })
 * </script>
 *
 * <button aria-pressed={$star.value.starred} onclick={() => star.update((on) => ({ ...on, starred: !on.starred }))}>
 * ```
 */
export const useOptimisticValue = <T>(
  options: OptimisticValueOptions<T>,
): UseOptimisticValueResult<T> => {
  // Actions read the latest options, so an adopting mount re-arms them (React
  // publishes them from committed renders).
  const latest = options

  // A mount in the same turn as the previous host's destroy is React's
  // re-render (an args step), not a new component: adopt its controller so the
  // pending save continues and the value does not flip.
  const adopted = optimisticHandoff
  optimisticHandoff = null
  if (adopted) adopted.adopted = true

  const controller = (adopted?.controller ??
    createOptimisticValue<T>({
      value: options.value,
      commit: (next, previous, confirm) => latest.commit(next, previous, confirm),
      equals: (a, b) => (latest.equals ?? shallowEqual)(a, b),
      onError: (error, value) => latest.onError?.(error, value),
    })) as OptimisticValue<T>

  // The handoff carries the value type-erased (it outlives one generic
  // instantiation); the adopting mount is the same component, so its `T` is
  // the one the controller was created with.
  const received: { current: T } = {
    current: adopted ? (adopted.received as T) : options.value,
  }

  const state = writable<OptimisticValueState<T>>(controller.getState())
  const unsubscribe = controller.subscribe((next) => state.set(next))
  onDestroy(() => {
    unsubscribe()
    const offer: OptimisticHandoff = {
      adopted: false,
      controller: controller as OptimisticValue<never>,
      received: received.current,
    }
    optimisticHandoff = offer
    // An unadopted handoff was a real unmount; the timer drops it so the next
    // mount starts clean. A mount in the same turn adopts first.
    setTimeout(() => {
      if (optimisticHandoff === offer && !offer.adopted) optimisticHandoff = null
    }, 0)
  })

  // A new server value is taken when it differs from the one last received
  // and nothing is being saved (the controller's `sync` decides that) —
  // React's value effect, which also runs only for a changed value.
  if (!(latest.equals ?? shallowEqual)(received.current, options.value)) {
    received.current = options.value
    controller.sync(options.value)
  }

  return {
    value: fieldStore(state, 'value') as Readable<T>,
    pending: fieldStore(state, 'pending'),
    error: fieldStore(state, 'error'),
    set: (next: T) => controller.set(next),
    update: (change: (current: T) => T) => controller.update(change),
  }
}
