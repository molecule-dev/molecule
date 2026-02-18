/**
 * Vue composable for login with async state tracking.
 *
 * @module
 */

import type { ComputedRef } from 'vue'

import type { AuthResult, LoginCredentials } from '@molecule/app-auth'
import type { PromiseStatus } from '@molecule/app-utilities'

import { useAuthClient } from './useAuth.js'
import { usePromise } from './usePromise.js'

/**
 * Return type for the {@link useLogin} composable.
 */
export interface UseLoginReturn<T = unknown> {
  status: ComputedRef<PromiseStatus>
  value: ComputedRef<AuthResult<T> | null>
  error: ComputedRef<Error | null>
  login: (credentials: LoginCredentials) => Promise<AuthResult<T>>
  reset: () => void
}

/**
 * Composable for login with async state tracking.
 *
 * @returns Reactive status, auth result value, error, a `login` action, and a `reset` method.
 */
export function useLogin<T = unknown>(): UseLoginReturn<T> {
  const client = useAuthClient<T>()
  const { status, value, error, call, reset } = usePromise((credentials: LoginCredentials) =>
    client.login(credentials),
  )

  return {
    status,
    value: value as ComputedRef<AuthResult<T> | null>,
    error,
    login: call,
    reset,
  }
}
