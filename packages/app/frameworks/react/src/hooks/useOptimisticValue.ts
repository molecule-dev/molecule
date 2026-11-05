/**
 * React hook for a server-backed value that the UI changes at once and saves in order.
 *
 * @module
 */
import { useEffect, useInsertionEffect, useRef, useState, useSyncExternalStore } from 'react'

import type { OptimisticValueOptions, OptimisticValueState } from '@molecule/app-state'
import { createOptimisticValue, shallowEqual } from '@molecule/app-state'

/**
 * What {@link useOptimisticValue} returns: the state to render and the two ways to change it.
 */
export interface UseOptimisticValueResult<T> extends OptimisticValueState<T> {
  /**
   * Shows `next` at once and saves it, after any save already running.
   *
   * @param next - The value the person chose.
   */
  set: (next: T) => void

  /**
   * Like `set`, computed from the value shown now (`update((on) => !on)`).
   *
   * @param change - Computes the next value from the value shown now.
   */
  update: (change: (current: T) => T) => void
}

/**
 * A server-backed value — a favorite, follow, like or bookmark button, a rating, a quantity, a
 * setting switch — that changes on the first render after a tap and is saved one change at a
 * time, in order. A tap during a save is saved right after it; only a failure of the newest
 * change puts the server value back. See `createOptimisticValue` in `@molecule/app-state`.
 *
 * `value` is the server's value from props or a query. A new `value` is taken only when it
 * differs (by `equals`) from the one the hook last received, and only while nothing is being
 * saved, so a parent re-render or a refetch of older data never flips the button mid-save. The
 * latest `commit` and `onError` are always used. Give the component a `key` per record, so one
 * record's pending change never shows on another.
 *
 * @param options - The server's current value and how to save a change.
 * @returns The value to render, whether a save is pending, the newest failure, and `set`/`update`.
 *
 * @example
 * ```tsx
 * import { useOptimisticValue } from '@molecule/app-react'
 *
 * function StarButton({ repository }: { repository: Repository }) {
 *   const star = useOptimisticValue({
 *     value: { starred: repository.starred, stars: repository.stars },
 *     equals: (a, b) => a.starred === b.starred && a.stars === b.stars,
 *     commit: async (next) => {
 *       const response = next.starred
 *         ? await http.put(`/repositories/${repository.id}/star`)
 *         : await http.delete(`/repositories/${repository.id}/star`)
 *       return { starred: response.data.starred, stars: response.data.stars }
 *     },
 *   })
 *   // Never disable the button or return early while `star.pending` is true.
 *   return (
 *     <button
 *       aria-pressed={star.value.starred}
 *       onClick={() =>
 *         star.update((current) => ({
 *           starred: !current.starred,
 *           stars: current.stars + (current.starred ? -1 : 1),
 *         }))
 *       }
 *     >
 *       {star.value.stars}
 *     </button>
 *   )
 * }
 * ```
 */
export const useOptimisticValue = <T>(
  options: OptimisticValueOptions<T>,
): UseOptimisticValueResult<T> => {
  const latest = useRef(options)
  // Exposed actions may run in a descendant's layout effect, before this component's
  // layout/passive effects. Publish options from committed renders before those actions.
  useInsertionEffect(() => {
    latest.current = options
  })

  const [controller] = useState(() =>
    createOptimisticValue<T>({
      value: options.value,
      commit: (next, previous, confirm) => latest.current.commit(next, previous, confirm),
      equals: (a, b) => (latest.current.equals ?? shallowEqual)(a, b),
      onError: (error, value) => latest.current.onError?.(error, value),
    }),
  )

  const received = useRef(options.value)
  const { value, equals } = options
  useEffect(() => {
    if ((equals ?? shallowEqual)(received.current, value)) return
    received.current = value
    controller.sync(value)
  }, [controller, value, equals])

  const state = useSyncExternalStore(controller.subscribe, controller.getState, controller.getState)
  return { ...state, set: controller.set, update: controller.update }
}
