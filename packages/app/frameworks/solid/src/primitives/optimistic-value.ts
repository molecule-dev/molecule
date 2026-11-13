/**
 * A server-backed value that the UI changes at once and saves in order, under
 * React's hook name.
 *
 * @module
 */

import { type Accessor, createSignal, onCleanup } from 'solid-js'

import type { OptimisticValue, OptimisticValueOptions } from '@molecule/app-state'
import { createOptimisticValue, shallowEqual } from '@molecule/app-state'

/**
 * The replaced host's controller, one microtask long: a mount in the same turn
 * adopts it (React re-rendered the host, it did not unmount), so the pending
 * save keeps running across the re-render and the new render's server value
 * syncs into the same controller.
 */
interface OptimisticHandoff {
  /** Set by the adopting mount; the disposal microtask then clears. */
  adopted: boolean
  /** The controller, holding the pending save. */
  controller: OptimisticValue<never>
  /** The last server value the hook received (React's `received` ref). */
  received: unknown
}
let optimisticHandoff: OptimisticHandoff | null = null

/**
 * What {@link useOptimisticValue} returns: the state to render as accessors
 * and the two ways to change it (the same names React returns).
 *
 * @template T - The value type.
 */
export interface UseOptimisticValueResult<T> {
  /** The value to render, as an accessor. */
  value: Accessor<T>
  /** Whether a save is running or waiting, as an accessor. */
  pending: Accessor<boolean>
  /** The failure of the newest change, as an accessor. */
  error: Accessor<unknown>
  /** Shows `next` at once and saves it, after any save already running. */
  set: (next: T) => void
  /** Like `set`, computed from the value shown now (`update((on) => !on)`). */
  update: (change: (current: T) => T) => void
}

/**
 * A server-backed value — a favorite, follow, like or bookmark button, a
 * rating, a quantity, a setting switch — that changes immediately on a tap
 * and is saved one change at a time, in order. See `createOptimisticValue` in
 * `@molecule/app-state`, under React's hook name.
 *
 * A new server `value` is taken only when it differs (by `equals`) from the
 * one the hook last received, and only while nothing is being saved, so a
 * refetch of older data never flips the button mid-save. The latest `commit`
 * and `onError` are always used. Keep related fields in the SAME value and let
 * commit reject on failure so the hook can roll back.
 *
 * @param options - The server's current value and how to save a change.
 * @returns The value, pending and error state as accessors, and `set`/`update`.
 * @example
 * ```tsx
 * const star = useOptimisticValue({
 *   value: { starred: repository.starred, stars: repository.stars },
 *   commit: async (next) => { /* save and return the server's value * },
 * })
 * <button onClick={() => star.update((current) => ({ ...current, starred: !current.starred }))}>
 * ```
 */
export function useOptimisticValue<T>(
  options: OptimisticValueOptions<T>,
): UseOptimisticValueResult<T> {
  // Actions read the latest options, so an adopting mount re-arms them.
  const latest = options

  // A mount in the same turn as the previous host's cleanup is React's
  // re-render (the adapter's args step), not a new component: adopt its
  // controller so the pending save continues and the value does not flip.
  const adopted = optimisticHandoff
  if (adopted) {
    adopted.adopted = true
    optimisticHandoff = null
  }

  const controller = (adopted?.controller ??
    createOptimisticValue<T>({
      value: options.value,
      commit: (next, previous, confirm) => latest.commit(next, previous, confirm),
      equals: (a, b) => (latest.equals ?? shallowEqual)(a, b),
      onError: (error, value) => latest.onError?.(error, value),
    })) as OptimisticValue<T> & OptimisticValue<never>
  const shared = (): OptimisticValue<never> => controller

  const received = { current: adopted ? adopted.received : options.value }

  const [state, setState] = createSignal(controller.getState())
  const unsubscribe = controller.subscribe((next) => setState(() => next))

  const handoff: OptimisticHandoff = {
    adopted: false,
    controller: shared(),
    received: options.value,
  }
  onCleanup(() => {
    unsubscribe()
    handoff.received = received.current
    optimisticHandoff = handoff
    queueMicrotask(() => {
      // An unadopted handoff was a real unmount: the controller has no
      // subscriber left; dropping the handoff lets the next mount start clean.
      if (!handoff.adopted && optimisticHandoff === handoff) optimisticHandoff = null
    })
  })

  // A new server value is taken when it differs from the one last received
  // and nothing is being saved (the controller's `sync` decides that).
  const same = (a: unknown, b: unknown): boolean =>
    latest.equals ? latest.equals(a as T, b as T) : shallowEqual(a, b)
  if (!same(received.current, options.value)) {
    received.current = options.value
    handoff.received = options.value
    controller.sync(options.value)
  }

  return {
    value: () => state().value as T,
    pending: () => state().pending,
    error: () => state().error,
    set: (next: T) => controller.set(next),
    update: (change: (current: T) => T) => controller.update(change),
  }
}
