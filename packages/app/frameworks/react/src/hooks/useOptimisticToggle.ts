/**
 * A headless server-backed boolean toggle for application-owned markup.
 *
 * @module
 */
import { useCallback } from 'react'

import type { OptimisticValueState } from '@molecule/app-state'

import { useOptimisticValue } from './useOptimisticValue.js'

/** Options for {@link useOptimisticToggle}. */
export interface UseOptimisticToggleOptions {
  /** The loaded server value. Mount the control only after its record exists. */
  value: boolean
  /** Saves the DESIRED value and returns the server-confirmed value; reject on failure. */
  commit: (desired: boolean) => Promise<boolean>
  /** Receives the newest failed save and the confirmed value restored by the controller. */
  onError?: (error: unknown, value: boolean) => void
}

/** A boolean to render and an argument-free action, suitable for any button or switch. */
export interface UseOptimisticToggleResult extends OptimisticValueState<boolean> {
  /** Flips the latest displayed value, including clicks made before React renders again. */
  toggle: () => void
}

/**
 * Own the state and save ordering of a follow, favorite, star or subscription control while
 * keeping all markup in the application. Pass `toggle` directly to the click handler: it
 * takes no current/desired argument and computes the next value from the live controller.
 * `commit(desired)` receives the value to SAVE, never the old value, and must return the
 * server's boolean answer. Only the newest failure rolls back the displayed value.
 *
 * Saves run one at a time; clicks during a save coalesce to the latest desired value. Use
 * `pending` for feedback, not to disable the control or discard another click. Mount only
 * after the initial record loads, key by record identity, and keep mounted during refetches.
 * Keep authentication/permissions in the app. For a flag with a related count or other
 * fields that must settle together, use `useOptimisticValue` with those fields in one value.
 * A local UI switch without a server commit stays ordinary local state.
 *
 * @param options - The server value, save adapter and optional error callback.
 * @returns The displayed boolean, pending/error state and stable `toggle()` action.
 */
export function useOptimisticToggle(
  options: UseOptimisticToggleOptions,
): UseOptimisticToggleResult {
  const { value, pending, error, update } = useOptimisticValue<boolean>(options)
  const toggle = useCallback(() => update((current) => !current), [update])
  return { value, pending, error, toggle }
}
