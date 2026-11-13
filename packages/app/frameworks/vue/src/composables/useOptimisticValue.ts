/**
 * Vue composable for a server-backed value that the UI changes at once and
 * saves in order.
 *
 * @module
 */
import { computed, getCurrentInstance, getCurrentScope, onScopeDispose, shallowRef } from 'vue'

import type { OptimisticValue, OptimisticValueOptions } from '@molecule/app-state'
import { createOptimisticValue, shallowEqual } from '@molecule/app-state'

import type { UseOptimisticValueReturn } from '../types.js'
import { adoptContinuity, type ContinuityState, offerContinuity } from './host-continuity.js'

/**
 * What one host slot owns across the mounts a host makes of this composable
 * (a host that swaps the arguments re-mounts the composable; React kept the
 * controller, the last received server value and the newest options on the
 * re-rendered instance).
 */
interface OptimisticLane<T> extends ContinuityState {
  /** The controller created by the slot's first mount. */
  controller: OptimisticValue<T>
  /** The last server value the composable saw (React's `received` ref). */
  received: T
  /** The newest mount's options; the controller reads its callbacks here. */
  latest: OptimisticValueOptions<T>
}

/**
 * A server-backed value — a favorite, follow, like or bookmark button, a rating, a quantity, a
 * setting switch — that changes on the first read after a tap and is saved one change at a
 * time, in order. Taps during a save update the desired value; the newest waiting value is
 * saved after it (intermediate waiting values coalesce). Only a failure of the newest
 * change puts the server value back. See `createOptimisticValue` in `@molecule/app-state`.
 *
 * `value` is the server's value from props or a query. A new `value` is taken only when it
 * differs (by `equals`) from the one the composable last received, and only while nothing is
 * being saved, so a parent re-render or a refetch of older data never flips the button
 * mid-save. The latest `commit` and `onError` are always used. Give the component a `key`
 * per record, so one record's pending change never shows on another.
 * Keep related fields, such as a favorite flag and its count, in the SAME value. Return both
 * from the server response in `commit`, and publish that response to parent/query caches there
 * if needed. Let commit reject on failure: a catch that returns old data hides the failure.
 * Replace display-state refs and prop-copy watchers with this composable's value and `update`.
 * `pending` is for feedback, never a reason to disable the toggle or drop a tap.
 *
 * Render/enable the keyed control only once its initial record exists. Keep that control
 * mounted through refetches of the same record. This composable does not fix a click handler
 * that returns on a still-null profile, or a remount that throws its controller away.
 * Refetches during a save cannot replace pending intent; changed server snapshots arriving
 * AFTER saving finishes are accepted and need query-layer ordering if they can be stale.
 *
 * @param options - The server's current value and how to save a change.
 * @returns The value to render, whether a save is pending, the newest failure, and `set`/`update`.
 *
 * @example
 * ```vue
 * <script setup>
 * import { useOptimisticValue } from '@molecule/app-vue'
 *
 * const star = useOptimisticValue({
 *   value: { starred: repository.starred, stars: repository.stars },
 *   equals: (a, b) => a.starred === b.starred && a.stars === b.stars,
 *   commit: async (next) => {
 *     const response = next.starred
 *       ? await http.put(`/repositories/${repository.id}/star`)
 *       : await http.delete(`/repositories/${repository.id}/star`)
 *     return { starred: response.data.starred, stars: response.data.stars }
 *   },
 * })
 * // Never disable the button or return early while `star.pending.value` is true.
 * </script>
 *
 * <template>
 *   <button
 *     :aria-pressed="star.value.value.starred"
 *     @click="star.update((current) => ({
 *       starred: !current.starred,
 *       stars: current.stars + (current.starred ? -1 : 1),
 *     }))"
 *   >{{ star.value.value.stars }}</button>
 * </template>
 * ```
 */
export function useOptimisticValue<T>(
  options: OptimisticValueOptions<T>,
): UseOptimisticValueReturn<T> {
  const app = getCurrentInstance()?.appContext.app
  const adopted = adoptContinuity<OptimisticLane<T>>(app)
  const lane = adopted ?? {
    dead: false,
    controller: null as unknown as OptimisticValue<T>,
    received: options.value,
    latest: options,
  }
  // The newest mount's options always win, exactly like React's latest-options
  // ref: a replaced mount's commit/equals/onError drive the saves from here on.
  lane.latest = options

  const controller =
    lane.controller ??
    createOptimisticValue<T>({
      value: options.value,
      commit: (next, previous, confirm) => lane.latest.commit(next, previous, confirm),
      equals: (a, b) => (lane.latest.equals ?? shallowEqual)(a, b),
      onError: (error, value) => lane.latest.onError?.(error, value),
    })
  lane.controller = controller

  const state = shallowRef(controller.getState())
  const stop = controller.subscribe((next) => {
    state.value = next
  })

  // A newer server value is taken only when it differs from the last one this
  // slot received; the controller itself ignores it while a save runs.
  if (!(options.equals ?? shallowEqual)(lane.received, options.value)) {
    lane.received = options.value
    controller.sync(options.value)
  }

  if (getCurrentScope()) {
    onScopeDispose(() => {
      stop()
      // The lane lives until the tick ends: a host that re-mounts the
      // composable with new arguments adopts controller, received value and
      // pending save; a real unmount marks it dead and the save settles
      // quietly, exactly like React settling past unmount.
      offerContinuity(lane, app)
    })
  }

  return {
    value: computed(() => state.value.value),
    pending: computed(() => state.value.pending),
    error: computed(() => state.value.error),
    set: (next: T) => controller.set(next),
    update: (change: (current: T) => T) => controller.update(change),
  }
}
