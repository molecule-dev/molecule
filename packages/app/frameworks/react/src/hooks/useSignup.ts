/**
 * React hook for registration with async state tracking.
 *
 * @module
 */

import { useCallback } from 'react'

import type { AuthResult, RegisterData, RegisterExtraShape } from '@molecule/app-auth'

import { useAuthClient } from './useAuth.js'
import { usePromise, type UsePromiseState } from './usePromise.js'

/**
 * Return type for useSignup hook.
 *
 * @template T - The user profile the API returns.
 * @template TRegister - The app's own registration fields (the second generic
 *   of `createJWTAuthClient<T, TRegister>`), so `signup()` is typed like the
 *   client's `register()`.
 */
export interface UseSignupReturn<
  T = unknown,
  TRegister extends RegisterExtraShape<TRegister> = Record<never, never>,
> {
  status: UsePromiseState<AuthResult<T>>['status']
  value: UsePromiseState<AuthResult<T>>['value']
  error: UsePromiseState<AuthResult<T>>['error']
  signup: (data: RegisterData<TRegister>) => Promise<AuthResult<T>>
  reset: () => void
}

/**
 * Hook for user registration with async state tracking.
 *
 * @returns Signup state and action
 *
 * @example
 * ```tsx
 * const { status, error, signup } = useSignup()
 *
 * return (
 *   <button onClick={() => signup({ email, password, name })} disabled={status === 'pending'}>
 *     {status === 'pending' ? 'Creating account...' : 'Sign Up'}
 *   </button>
 * )
 * ```
 */
export function useSignup<
  T = unknown,
  TRegister extends RegisterExtraShape<TRegister> = Record<never, never>,
>(): UseSignupReturn<T, TRegister> {
  const client = useAuthClient<T, TRegister>()

  const registerFn = useCallback((data: RegisterData<TRegister>) => client.register(data), [client])

  const [state, call] = usePromise(registerFn)

  return {
    status: state.status,
    value: state.value,
    error: state.error,
    signup: call,
    reset: state.reset,
  }
}
