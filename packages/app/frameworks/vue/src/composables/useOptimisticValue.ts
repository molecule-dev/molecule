/**
 * Vue composable for a server-backed value that the UI changes at once and
 * saves in order.
 *
 * @module
 */
import {
  computed,
  getCurrentScope,
  type MaybeRefOrGetter,
  onScopeDispose,
  shallowRef,
  toValue,
  watch,
} from 'vue'

import type { OptimisticValue, OptimisticValueOptions } from '@molecule/app-state'
import { createOptimisticValue, shallowEqual } from '@molecule/app-state'

import type { UseOptimisticValueReturn } from '../types.js'

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
 * The options may be reactive (a ref or a getter) and are followed on the same component,
 * the way React re-renders `useOptimisticValue`: the controller and any pending save
 * survive an options change, `commit`/`onError` are read when each save runs, and a new
 * `value` is taken when it differs by `equals` from the last one received.
 *
 * Render/enable the keyed control only once its initial record exists. Keep that control
 * mounted through refetches of the same record. This composable does not fix a click handler
 * that returns on a still-null profile, or a remount that throws its controller away.
 * Refetches during a save cannot replace pending intent; changed server snapshots arriving
 * AFTER saving finishes are accepted and need query-layer ordering if they can be stale.
 *
 * @param options - The server's current value and how to save a change; may be
 *   reactive (a ref or a getter) and followed on the same component.
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
  options: MaybeRefOrGetter<OptimisticValueOptions<T>>,
): UseOptimisticValueReturn<T> {
  // The controller is created once and never replaced: it owns the save queue,
  // and its wrappers read the options source when each save runs — the newest
  // commit/equals/onError drive every save, exactly like React's latest-options
  // ref.
  const controller: OptimisticValue<T> = createOptimisticValue<T>({
    value: toValue(options).value,
    commit: (next, previous, confirm) => toValue(options).commit(next, previous, confirm),
    equals: (a, b) => (toValue(options).equals ?? shallowEqual)(a, b),
    onError: (error, value) => toValue(options).onError?.(error, value),
  })

  const state = shallowRef(controller.getState())
  const stop = controller.subscribe((next) => {
    state.value = next
  })

  // The last server value this instance received (React's `received` ref). A
  // newer server value is taken only when it differs by `equals`; the
  // controller itself ignores it while a save runs. React runs this check as
  // an effect on mount and on every `value`/`equals` change — the initial run
  // compares the first value with itself.
  let received = toValue(options).value
  const applyServerValue = (next: OptimisticValueOptions<T>): void => {
    if ((next.equals ?? shallowEqual)(received, next.value)) return
    received = next.value
    controller.sync(next.value)
  }
  applyServerValue(toValue(options))
  watch(
    () => toValue(options),
    (next) => {
      applyServerValue(next)
    },
    { deep: true },
  )

  if (getCurrentScope()) {
    onScopeDispose(() => {
      // The subscription ends with the component; a pending save settles
      // quietly, exactly like React settling past unmount.
      stop()
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
