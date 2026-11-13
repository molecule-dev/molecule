/**
 * Vue composable for changing password with async state tracking.
 *
 * @module
 */

import { computed, type ComputedRef } from 'vue'

import type { PromiseStatus } from '@molecule/app-utilities'

import { useAuthClient } from './useAuth.js'
import { usePromise } from './usePromise.js'

/**
 * Return type for the {@link useChangePassword} composable.
 */
export interface UseChangePasswordReturn {
  status: ComputedRef<PromiseStatus>
  error: ComputedRef<Error | null>
  changePassword: (oldPassword: string, newPassword: string) => Promise<void>
  reset: () => void
}

/**
 * Composable for changing password with async state tracking.
 *
 * @returns Reactive status, error, a `changePassword` action, and a `reset` method.
 */
export function useChangePassword(): UseChangePasswordReturn {
  const client = useAuthClient()
  const [state, call] = usePromise((oldPassword: string, newPassword: string) =>
    client.changePassword(oldPassword, newPassword),
  )

  return {
    status: computed(() => state.status),
    error: computed(() => state.error),
    changePassword: call,
    reset: state.reset,
  }
}
