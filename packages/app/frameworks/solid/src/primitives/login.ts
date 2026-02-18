/**
 * Solid.js primitive for login with async state tracking.
 *
 * @module
 */

import type { Accessor } from 'solid-js'

import type { AuthResult, LoginCredentials } from '@molecule/app-auth'
import type { PromiseState } from '@molecule/app-utilities'

import { getAuthClient } from '../context.js'
import { createPromise } from './promise.js'

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
