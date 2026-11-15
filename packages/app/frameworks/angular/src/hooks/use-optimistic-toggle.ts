/**
 * Angular function for a server-backed boolean toggle rendered with the app's own markup,
 * mirroring `useOptimisticToggle` from `@molecule/app-react`.
 *
 * @module
 */

import { computed, type Signal } from '@angular/core'

import { type MaybeSignal, readMaybeSignal } from '../maybe-signal.js'
import { useOptimisticValue } from './use-async.js'

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
 * What {@link useOptimisticToggle} returns: the boolean to render (as signals, the same
 * fields React's result carries as plain values) and an argument-free action.
 */
export interface UseOptimisticToggleResult {
  /** The newest chosen value, or the server's value when nothing is saving. */
  readonly value: Signal<boolean>
  /** Whether a save is running or waiting to run. */
  readonly pending: Signal<boolean>
  /** The failure of the newest change, after the value went back; `null` otherwise. */
  readonly error: Signal<unknown>
  /** Flips the value shown now and saves it; the same function for the component's life. */
  toggle: () => void
}

/**
 * Owns the state and save ordering of a follow, favorite, star or subscription control
 * while all markup stays in the component's template. Bind `toggle` straight to the click
 * handler: it takes no argument and flips the value shown now. `commit(desired)` receives
 * the value to SAVE, never the old one, and returns the server's boolean answer. Only the
 * newest failure rolls the shown value back. Call it in an injection context.
 *
 * Saves run one at a time; clicks during a save coalesce to the newest desired value. Use
 * `pending` for feedback, not to disable the control or drop a click. Create it only after
 * the record loads, one per record, and keep it through refetches. For a flag with a
 * related count, use `useOptimisticValue` with both fields in one value.
 *
 * @param options - The server value, the save and an optional error callback (or a signal
 *   of them: a new `value` syncs in while nothing is saving).
 * @returns The value, pending and error state as signals, and the stable `toggle`.
 * @example
 * ```ts
 * readonly subscription = useOptimisticToggle(
 *   computed(() => ({
 *     value: this.thread().subscribed,
 *     commit: async (desired: boolean) => {
 *       const path = `/threads/${encodeURIComponent(this.thread().id)}/subscription`
 *       const response = desired
 *         ? await this.http.put<{ subscribed: boolean }>(path)
 *         : await this.http.delete<{ subscribed: boolean }>(path)
 *       return response.data.subscribed
 *     },
 *   })),
 * )
 * // <button type="button" [attr.aria-pressed]="subscription.value()" (click)="subscription.toggle()">
 * ```
 */
export const useOptimisticToggle = (
  options: MaybeSignal<UseOptimisticToggleOptions>,
): UseOptimisticToggleResult => {
  // `commit` gets only the desired boolean, never the previous value or a confirm callback.
  const { value, pending, error, update } = useOptimisticValue<boolean>(
    computed(() => {
      const current = readMaybeSignal(options)
      return { ...current, commit: (desired: boolean) => current.commit(desired) }
    }),
  )
  const toggle = (): void => update((current) => !current)
  return { value, pending, error, toggle }
}
