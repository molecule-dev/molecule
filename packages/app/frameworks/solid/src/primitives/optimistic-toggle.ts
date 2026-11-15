/**
 * A server-backed boolean toggle rendered with the app's own markup, under React's hook name.
 *
 * @module
 */

import type { Accessor } from 'solid-js'

import { access, type MaybeAccessor } from './maybe-accessor.js'
import { useOptimisticValue } from './optimistic-value.js'

/** Options for {@link useOptimisticToggle}. */
export interface UseOptimisticToggleOptions {
  /** The loaded server value. Mount the control only after its record exists. */
  value: boolean
  /** Saves the DESIRED value and returns the server-confirmed value; reject on failure. */
  commit: (desired: boolean) => Promise<boolean>
  /** Receives the newest failed save and the confirmed value restored by the controller. */
  onError?: (error: unknown, value: boolean) => void
}

/**
 * What {@link useOptimisticToggle} returns: the boolean to render as accessors and an
 * argument-free action (the same names React returns).
 */
export interface UseOptimisticToggleResult {
  /** The value to render, as an accessor. */
  value: Accessor<boolean>
  /** Whether a save is running or waiting, as an accessor. */
  pending: Accessor<boolean>
  /** The failure of the newest change, as an accessor. */
  error: Accessor<unknown>
  /** Flips the value shown now and saves it; the same function for the component's life. */
  toggle: () => void
}

/**
 * Owns the state and save ordering of a follow, favorite, star or subscription control
 * while all markup stays in the app. Pass `toggle` straight to the click handler: it takes
 * no argument and flips the value shown now. `commit(desired)` receives the value to SAVE,
 * never the old one, and returns the server's boolean answer. Only the newest failure
 * rolls the shown value back.
 *
 * Saves run one at a time; clicks during a save coalesce to the newest desired value. Use
 * `pending` for feedback, not to disable the control or drop a click. Mount it only after
 * the record loads, key it by record identity, and keep it mounted through refetches. For
 * a flag with a related count, use `useOptimisticValue` with both fields in one value.
 *
 * @param options - The server value, the save and an optional error callback (or an
 *   accessor of them: a new `value` syncs in while nothing is saving).
 * @returns The value, pending and error state as accessors, and the stable `toggle`.
 * @example
 * ```tsx
 * const subscription = useOptimisticToggle(() => ({
 *   value: props.thread.subscribed,
 *   commit: async (desired) => {
 *     const path = `/threads/${encodeURIComponent(props.thread.id)}/subscription`
 *     const response = desired
 *       ? await http.put<{ subscribed: boolean }>(path)
 *       : await http.delete<{ subscribed: boolean }>(path)
 *     return response.data.subscribed
 *   },
 * }))
 * <button type="button" aria-pressed={subscription.value()} onClick={subscription.toggle}>
 * ```
 */
export function useOptimisticToggle(
  options: MaybeAccessor<UseOptimisticToggleOptions>,
): UseOptimisticToggleResult {
  // `commit` gets only the desired boolean, never the previous value or a confirm callback.
  const { value, pending, error, update } = useOptimisticValue<boolean>(() => {
    const current = access(options)
    return { ...current, commit: (desired: boolean) => current.commit(desired) }
  })
  const toggle = (): void => update((current) => !current)
  return { value, pending, error, toggle }
}
