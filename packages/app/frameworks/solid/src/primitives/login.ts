/**
 * Solid.js primitive for login with async state tracking.
 *
 * @module
 */

import type { Accessor } from 'solid-js'

import type { AuthResult, LoginCredentials } from '@molecule/app-auth'
import type { PromiseState } from '@molecule/app-utilities'

import { getAuthClient } from '../context.js'
import { useAuthClient } from './auth.js'
import { createPromise, usePromise, type UsePromiseState } from './promise.js'

/**
 * Return type for createLogin primitive.
 */
export interface CreateLoginReturn<T = unknown> {
  state: Accessor<PromiseState<AuthResult<T>>>
  login: (credentials: LoginCredentials) => Promise<AuthResult<T>>
  reset: () => void
}

/**
 * Creates a login primitive with async state tracking.
 *
 * @returns Login state and action
 *
 * @example
 * ```tsx
 * const { state, login } = createLogin()
 *
 * return (
 *   <button
 *     onClick={() => login({ email: email(), password: password() })}
 *     disabled={state().status === 'pending'}
 *   >
 *     {state().status === 'pending' ? 'Logging in...' : 'Login'}
 *   </button>
 * )
 * ```
 */
export function createLogin<T = unknown>(): CreateLoginReturn<T> {
  const client = getAuthClient<T>()
  const { state, call, reset } = createPromise((credentials: LoginCredentials) =>
    client.login(credentials),
  )

  return { state, login: call, reset }
}

/**
 * What {@link useLogin} returns (the same names React returns).
 *
 * @template T - The user profile the API returns.
 */
export interface UseLoginReturn<T = unknown> {
  /** The tracked login status, as an accessor. */
  status: Accessor<UsePromiseState<AuthResult<T>>['status']>
  /** The settled login result, as an accessor. */
  value: Accessor<UsePromiseState<AuthResult<T>>['value']>
  /** The login failure, as an accessor. */
  error: Accessor<UsePromiseState<AuthResult<T>>['error']>
  login: (credentials: LoginCredentials) => Promise<AuthResult<T>>
  reset: () => void
}

/**
 * Login with async state tracking, under React's hook name.
 *
 * Registration is available through `const { register } = useAuth()`; use
 * `usePromise(register)` when a form needs the same pending/error tracking.
 *
 * @returns Login state (status, value, error as accessors) and the controls.
 * @throws {Error} When no `MoleculeProvider` above configures `auth`.
 * @example
 * ```tsx
 * const { status, error, login } = useLogin()
 * <button onClick={() => login({ email, password })} disabled={status() === 'pending'}>
 * ```
 */
export function useLogin<T = unknown>(): UseLoginReturn<T> {
  const client = useAuthClient<T>()

  const loginFn = (credentials: LoginCredentials): Promise<AuthResult<T>> =>
    client.login(credentials)

  const tuple = usePromise(loginFn)
  const state = (): UsePromiseState<AuthResult<T>> => tuple[0] as UsePromiseState<AuthResult<T>>
  const call = tuple[1]

  return {
    status: () => state().status,
    value: () => state().value,
    error: () => state().error,
    login: call,
    reset: state().reset,
  }
}
