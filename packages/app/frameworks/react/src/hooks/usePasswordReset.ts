/**
 * React hook for password reset with async state tracking.
 *
 * @module
 */

import { useCallback } from 'react'

import type { PasswordResetConfirm, PasswordResetRequest } from '@molecule/app-auth'

import { useAuthClient } from './useAuth.js'
import { usePromise, type UsePromiseState } from './usePromise.js'

/**
 * Return type for usePasswordReset hook.
 */
export interface UsePasswordResetReturn {
  requestStatus: UsePromiseState<void>['status']
  requestError: UsePromiseState<void>['error']
  confirmStatus: UsePromiseState<void>['status']
  confirmError: UsePromiseState<void>['error']
  requestReset: (data: PasswordResetRequest) => Promise<void>
  confirmReset: (data: PasswordResetConfirm) => Promise<void>
  reset: () => void
}

/**
 * Hook for password reset flow with async state tracking.
 *
 * Provides separate tracking for the request and confirm steps.
 *
 * @returns Password reset state and actions
 *
 * @example
 * ```tsx
 * const { requestStatus, requestError, requestReset, confirmReset } = usePasswordReset()
 *
 * // Step 1: Request reset
 * <button onClick={() => requestReset({ email })} disabled={requestStatus === 'pending'}>
 *   Send Reset Email
 * </button>
 *
 * // Step 2: Confirm reset
 * <button onClick={() => confirmReset({ token, password })}>
 *   Set New Password
 * </button>
 * ```
 */
export function usePasswordReset(): UsePasswordResetReturn {
  const client = useAuthClient()

  const requestFn = useCallback(
    (data: PasswordResetRequest) => client.requestPasswordReset(data),
    [client],
  )

  const confirmFn = useCallback(
    (data: PasswordResetConfirm) => client.confirmPasswordReset(data),
    [client],
  )

  const [requestState, requestCall] = usePromise(requestFn)
  const [confirmState, confirmCall] = usePromise(confirmFn)

  return {
    requestStatus: requestState.status,
    requestError: requestState.error,
    confirmStatus: confirmState.status,
    confirmError: confirmState.error,
    requestReset: requestCall,
    confirmReset: confirmCall,
    reset: () => {
      requestState.reset()
      confirmState.reset()
    },
  }
}
