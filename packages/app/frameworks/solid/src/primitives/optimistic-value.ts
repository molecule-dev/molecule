/**
 * A server-backed value that the UI changes at once and saves in order, under
 * React's hook name.
 *
 * @module
 */

import { type Accessor, createEffect, createSignal, onCleanup } from 'solid-js'

import type { OptimisticValueOptions } from '@molecule/app-state'
import { createOptimisticValue, shallowEqual } from '@molecule/app-state'

import { access, type MaybeAccessor } from './maybe-accessor.js'

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
 * @param options - The server's current value and how to save a change. May be
 *   an accessor: the controller survives a change (a pending save keeps
 *   running), `commit`/`onError` are always read from the latest options, and
 *   a new `value` syncs in exactly as React's re-render delivers it.
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
  options: MaybeAccessor<OptimisticValueOptions<T>>,
): UseOptimisticValueResult<T> {
  // Actions read the latest options, so a changed argument re-arms them.
  const latest = (): OptimisticValueOptions<T> => access(options)

  const initial = latest()
  // The controller is created once per component (React's useState); only its
  // wiring reads the options, never a snapshot of them.
  const controller = createOptimisticValue<T>({
    value: initial.value,
    commit: (next, previous, confirm) => latest().commit(next, previous, confirm),
    equals: (a, b) => (latest().equals ?? shallowEqual)(a, b),
    onError: (error, value) => latest().onError?.(error, value),
  })

  // The last server value the hook received (React's `received` ref).
  let received = initial.value

  const [state, setState] = createSignal(controller.getState())
  const unsubscribe = controller.subscribe((next) => setState(() => next))
  onCleanup(unsubscribe)

  // A new server value is taken when it differs from the one last received
  // and nothing is being saved (the controller's `sync` decides that). The
  // equality check makes an equal re-read apply nothing, as in React.
  createEffect(() => {
    const current = latest()
    const same = current.equals
      ? current.equals(received, current.value)
      : shallowEqual(received, current.value)
    if (same) return
    received = current.value
    controller.sync(current.value)
  })

  return {
    value: () => state().value as T,
    pending: () => state().pending,
    error: () => state().error,
    set: (next: T) => controller.set(next),
    update: (change: (current: T) => T) => controller.update(change),
  }
}
