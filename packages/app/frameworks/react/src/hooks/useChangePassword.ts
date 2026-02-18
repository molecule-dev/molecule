/**
 * React hook for changing password with async state tracking.
 *
 * @module
 */

import { useCallback } from 'react'

import { useAuthClient } from './useAuth.js'
import { usePromise, type UsePromiseState } from './usePromise.js'

/**
 * Return type for useChangePassword hook.
 */
export interface UseChangePasswordReturn {
  status: UsePromiseState<void>['status']
  error: UsePromiseState<void>['error']
  changePassword: (oldPassword: string, newPassword: string) => Promise<void>
  reset: () => void
}

/**
 * Hook for changing password with async state tracking.
 *
 * @returns Change password state and action
 *
 * @example
 * ```tsx
 * const { status, error, changePassword } = useChangePassword()
 *
 * <button
 *   onClick={() => changePassword(oldPassword, newPassword)}
 *   disabled={status === 'pending'}
 * >
 *   {status === 'pending' ? 'Changing...' : 'Change Password'}
 * </button>
 * ```
 */
export function useChangePassword(): UseChangePasswordReturn {
  const client = useAuthClient()

  const changeFn = useCallback(
    (oldPassword: string, newPassword: string) => client.changePassword(oldPassword, newPassword),
    [client],
  )

  const [state, call] = usePromise(changeFn)

  return {
    status: state.status,
    error: state.error,
    changePassword: call,
    reset: state.reset,
  }
}
