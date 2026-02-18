/**
 * React hook for login with async state tracking.
 *
 * @module
 */

import { useCallback } from 'react'

import type { AuthResult, LoginCredentials } from '@molecule/app-auth'

import { useAuthClient } from './useAuth.js'
import { usePromise, type UsePromiseState } from './usePromise.js'

/**
 * Return type for useLogin hook.
 */
export interface UseLoginReturn<T = unknown> {
  status: UsePromiseState<AuthResult<T>>['status']
  value: UsePromiseState<AuthResult<T>>['value']
  error: UsePromiseState<AuthResult<T>>['error']
  login: (credentials: LoginCredentials) => Promise<AuthResult<T>>
  reset: () => void
}

/**
 * Hook for login with async state tracking.
 *
 * @returns Login state and action
 *
 * @example
 * ```tsx
 * const { status, error, login } = useLogin()
 *
 * return (
 *   <button onClick={() => login({ email, password })} disabled={status === 'pending'}>
 *     {status === 'pending' ? 'Logging in...' : 'Login'}
 *   </button>
 * )
 * ```
 */
export function useLogin<T = unknown>(): UseLoginReturn<T> {
  const client = useAuthClient<T>()

  const loginFn = useCallback(
    (credentials: LoginCredentials) => client.login(credentials),
    [client],
  )

  const [state, call] = usePromise(loginFn)

  return {
    status: state.status,
    value: state.value,
    error: state.error,
    login: call,
    reset: state.reset,
  }
}
