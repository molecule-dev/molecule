/**
 * Svelte hook for a server-backed value that the UI changes at once and saves
 * in order, porting React's `useOptimisticValue`.
 *
 * @module
 */

import { onDestroy } from 'svelte'
import { get, type Readable, writable } from 'svelte/store'

import type { OptimisticValueOptions, OptimisticValueState } from '@molecule/app-state'
import { createOptimisticValue, shallowEqual } from '@molecule/app-state'

import { fieldStore } from './live-store.js'
import { type MaybeReadable, toReadable } from './maybe-readable.js'

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
 * The options may be a plain value or a readable store of one: setting the
 * store applies the new server value (and the new `commit`, `equals` and
 * `onError`) on the same component, the way React's re-render does — the
 * controller, and any save it is running, survive the change.
 *
 * @param options - The server's current value and how to save a change (or a store of them).
 * @returns The value to render, whether a save is pending, the newest failure,
 *   and `set`/`update`.
 * @example
 * ```svelte
 * <script>
 *   import { useOptimisticValue } from '@molecule/app-svelte'
 *   // `value` is the store; the result itself is not, so take the store out to read it with `$`.
 *   const { value: star, update } = useOptimisticValue({
 *     value: { starred: repository.starred, stars: repository.stars },
 *     commit: async (next) => { /* save and return the server's value * },
 *   })
 * </script>
 *
 * <button aria-pressed={$star.starred} onclick={() => update((on) => ({ ...on, starred: !on.starred }))}>
 * ```
 */
export const useOptimisticValue = <T>(
  options: MaybeReadable<OptimisticValueOptions<T>>,
): UseOptimisticValueResult<T> => {
  const optionsStore = toReadable(options)
  // Actions read the latest options (React publishes them from committed
  // renders), so a changed source re-arms them at once.
  const current = (): OptimisticValueOptions<T> => get(optionsStore) as OptimisticValueOptions<T>

  const initial = current()
  const controller = createOptimisticValue<T>({
    value: initial.value,
    commit: (next, previous, confirm) => current().commit(next, previous, confirm),
    equals: (a, b) => (current().equals ?? shallowEqual)(a, b),
    onError: (error, value) => current().onError?.(error, value),
  })

  // The last server value the hook received (React's `received` ref); it
  // survives an argument change, so only a genuinely different value syncs.
  const received: { current: T } = { current: initial.value }

  const state = writable<OptimisticValueState<T>>(controller.getState())
  const unsubscribe = controller.subscribe((next) => state.set(next))
  onDestroy(unsubscribe)

  // A new server value is taken when it differs from the one last received
  // and nothing is being saved (the controller's `sync` decides that) —
  // React's value effect, which also runs only for a changed value. The
  // store's immediate callback IS the mount check (with the options the
  // controller was created from, it changes nothing).
  const syncIfChanged = (optionsNow: OptimisticValueOptions<T>): void => {
    const { value, equals } = optionsNow
    if ((equals ?? shallowEqual)(received.current, value)) return
    received.current = value
    controller.sync(value)
  }
  const stopOptions = optionsStore.subscribe((next) => {
    syncIfChanged(next as OptimisticValueOptions<T>)
  })
  onDestroy(stopOptions)

  return {
    value: fieldStore(state, 'value') as Readable<T>,
    pending: fieldStore(state, 'pending'),
    error: fieldStore(state, 'error'),
    set: (next: T) => controller.set(next),
    update: (change: (current: T) => T) => controller.update(change),
  }
}
