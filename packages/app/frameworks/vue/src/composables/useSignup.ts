/**
 * Vue composable for registration with async state tracking.
 *
 * @module
 */

import { computed, type ComputedRef } from 'vue'

import type { AuthResult, RegisterData } from '@molecule/app-auth'
import type { PromiseStatus } from '@molecule/app-utilities'

import { useAuthClient } from './useAuth.js'
import { usePromise } from './usePromise.js'

/**
 * Return type for useSignup composable.
 * @returns The result.
 */
export interface UseSignupReturn<T = unknown> {
  status: ComputedRef<PromiseStatus>
  value: ComputedRef<AuthResult<T> | null>
  error: ComputedRef<Error | null>
  signup: (data: RegisterData) => Promise<AuthResult<T>>
  reset: () => void
}

/**
 * Composable for user registration with async state tracking.
 *
 * @returns Signup state and action
 */
export function useSignup<T = unknown>(): UseSignupReturn<T> {
  const client = useAuthClient<T>()
  const [state, call] = usePromise((data: RegisterData) => client.register(data))

  return {
    status: computed(() => state.status),
    value: computed(() => state.value as AuthResult<T> | null),
    error: computed(() => state.error),
    signup: call,
    reset: state.reset,
  }
}
