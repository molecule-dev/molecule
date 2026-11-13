/**
 * Svelte hook for the password-reset flow, porting React's `usePasswordReset`.
 *
 * @module
 */

import type { Readable } from 'svelte/store'

import type { PasswordResetConfirm, PasswordResetRequest } from '@molecule/app-auth'

import { useAuthClient } from '../context.js'
import { promiseFields } from './live-store.js'
import { usePromise, type UsePromiseState, type UsePromiseStore } from './usePromise.js'

/** What {@link usePasswordReset} returns: two independent trackers plus a combined reset. */
export interface UsePasswordResetResult {
  /** The request step's status. */
  requestStatus: Readable<UsePromiseState<void>['status']>
  /** The request step's rejection. */
  requestError: Readable<UsePromiseState<void>['error']>
  /** The confirm step's status. */
  confirmStatus: Readable<UsePromiseState<void>['status']>
  /** The confirm step's rejection. */
  confirmError: Readable<UsePromiseState<void>['error']>
  /** Sends the reset email (step 1). */
  requestReset: (data: PasswordResetRequest) => Promise<void>
  /** Sets the new password (step 2). */
  confirmReset: (data: PasswordResetConfirm) => Promise<void>
  /** Returns BOTH trackers to idle. */
  reset: () => void
}

/**
 * The password-reset flow with separate tracking for the request and confirm
 * steps, React's `usePasswordReset` in Svelte's idiom: call it during
 * component init under `setMoleculeContext({ auth })`.
 *
 * @returns Both steps' state as stores and their actions.
 * @example
 * ```svelte
 * <script>
 *   import { usePasswordReset } from '@molecule/app-svelte'
 *   const { requestStatus, requestError, requestReset, confirmReset } = usePasswordReset()
 * </script>
 *
 * <!-- Step 1: request the reset email -->
 * <button onclick={() => requestReset({ email })} disabled={$requestStatus === 'pending'}>
 *   Send reset email
 * </button>
 *
 * <!-- Step 2: set the new password -->
 * <button onclick={() => confirmReset({ token, password })}>Set new password</button>
 * {#if $requestError}<p>{$requestError.message}</p>{/if}
 * ```
 */
export function usePasswordReset(): UsePasswordResetResult {
  const client = useAuthClient()
  const request: UsePromiseStore<void, [PasswordResetRequest]> = usePromise((data) =>
    client.requestPasswordReset(data),
  )
  const confirm: UsePromiseStore<void, [PasswordResetConfirm]> = usePromise((data) =>
    client.confirmPasswordReset(data),
  )
  const requestFields = promiseFields(request)
  const confirmFields = promiseFields(confirm)
  return {
    requestStatus: requestFields.status,
    requestError: requestFields.error,
    confirmStatus: confirmFields.status,
    confirmError: confirmFields.error,
    requestReset: requestFields.call,
    confirmReset: confirmFields.call,
    reset: () => {
      requestFields.reset()
      confirmFields.reset()
    },
  }
}
