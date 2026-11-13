/**
 * Vue composable for password reset flow with async state tracking.
 *
 * @module
 */

import { computed, type ComputedRef } from 'vue'

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

  const [requestState, requestCall] = usePromise((data: PasswordResetRequest) =>
    client.requestPasswordReset(data),
  )
  const [confirmState, confirmCall] = usePromise((data: PasswordResetConfirm) =>
    client.confirmPasswordReset(data),
  )

  return {
    requestStatus: computed(() => requestState.status),
    requestError: computed(() => requestState.error),
    confirmStatus: computed(() => confirmState.status),
    confirmError: computed(() => confirmState.error),
    requestReset: requestCall,
    confirmReset: confirmCall,
    reset: () => {
      requestState.reset()
      confirmState.reset()
    },
  }
}
