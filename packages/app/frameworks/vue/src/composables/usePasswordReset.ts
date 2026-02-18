/**
 * Vue composable for password reset with async state tracking.
 *
 * @module
 */

import type { ComputedRef } from 'vue'

import type { PasswordResetConfirm, PasswordResetRequest } from '@molecule/app-auth'
import type { PromiseStatus } from '@molecule/app-utilities'

import { useAuthClient } from './useAuth.js'
import { usePromise } from './usePromise.js'

/**
 * Return type for usePasswordReset composable.
 */
export interface UsePasswordResetReturn {
  requestStatus: ComputedRef<PromiseStatus>
  requestError: ComputedRef<Error | null>
  confirmStatus: ComputedRef<PromiseStatus>
  confirmError: ComputedRef<Error | null>
  requestReset: (data: PasswordResetRequest) => Promise<void>
  confirmReset: (data: PasswordResetConfirm) => Promise<void>
  reset: () => void
}

/**
 * Composable for password reset flow with async state tracking.
 *
 * @returns Password reset state and actions
 */
export function usePasswordReset(): UsePasswordResetReturn {
  const client = useAuthClient()

  const request = usePromise((data: PasswordResetRequest) => client.requestPasswordReset(data))

  const confirm = usePromise((data: PasswordResetConfirm) => client.confirmPasswordReset(data))

  return {
    requestStatus: request.status,
    requestError: request.error,
    confirmStatus: confirm.status,
    confirmError: confirm.error,
    requestReset: request.call,
    confirmReset: confirm.call,
    reset: () => {
      request.reset()
      confirm.reset()
    },
  }
}
