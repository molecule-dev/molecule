/**
 * Svelte hook for changing passwords with async state tracking, porting
 * React's `useChangePassword`.
 *
 * @module
 */

import type { Readable } from 'svelte/store'

import { useAuthClient } from '../context.js'
import { promiseFields } from './live-store.js'
import { usePromise, type UsePromiseState, type UsePromiseStore } from './usePromise.js'

/** What {@link useChangePassword} returns. */
export interface UseChangePasswordResult {
  /** The latest call's status. */
  status: Readable<UsePromiseState<void>['status']>
  /** The latest call's rejection. */
  error: Readable<UsePromiseState<void>['error']>
  /** Runs the password change. */
  changePassword: (oldPassword: string, newPassword: string) => Promise<void>
  /** Returns the tracker to idle. */
  reset: () => void
}

/**
 * Password change with async state tracking, React's `useChangePassword` in
 * Svelte's idiom: call it during component init under
 * `setMoleculeContext({ auth })`. There is no `value` field — the call
 * resolves `void`.
 *
 * @returns Change-password state as stores and the action.
 * @example
 * ```svelte
 * <script>
 *   import { useChangePassword } from '@molecule/app-svelte'
 *   const { status, error, changePassword } = useChangePassword()
 * </script>
 *
 * <button onclick={() => changePassword(oldPassword, newPassword)} disabled={$status === 'pending'}>
 *   {$status === 'pending' ? 'Changing…' : 'Change password'}
 * </button>
 * {#if $error}<p>{$error.message}</p>{/if}
 * ```
 */
export function useChangePassword(): UseChangePasswordResult {
  const client = useAuthClient()
  const tracker: UsePromiseStore<void, [string, string]> = usePromise((oldPassword, newPassword) =>
    client.changePassword(oldPassword, newPassword),
  )
  const fields = promiseFields(tracker)
  return {
    status: fields.status,
    error: fields.error,
    changePassword: fields.call,
    reset: fields.reset,
  }
}
