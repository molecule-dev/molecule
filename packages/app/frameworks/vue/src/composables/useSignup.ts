/**
 * Vue composable for registration with async state tracking.
 *
 * @module
 */

import type { ComputedRef } from 'vue'

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
  const { status, value, error, call, reset } = usePromise((data: RegisterData) =>
    client.register(data),
  )

  return {
    status,
    value: value as ComputedRef<AuthResult<T> | null>,
    error,
    signup: call,
    reset,
  }
}
