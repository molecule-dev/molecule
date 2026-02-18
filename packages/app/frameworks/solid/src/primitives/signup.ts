/**
 * Solid.js primitive for registration with async state tracking.
 *
 * @module
 */

import type { Accessor } from 'solid-js'

import type { AuthResult, RegisterData } from '@molecule/app-auth'
import type { PromiseState } from '@molecule/app-utilities'

import { getAuthClient } from '../context.js'
import { createPromise } from './promise.js'

/**
 * Return type for createSignup primitive.
 */
export interface CreateSignupReturn<T = unknown> {
  state: Accessor<PromiseState<AuthResult<T>>>
  signup: (data: RegisterData) => Promise<AuthResult<T>>
  reset: () => void
}

/**
 * Creates a signup primitive with async state tracking.
 *
 * @returns Signup state and action
 *
 * @example
 * ```tsx
 * const { state, signup } = createSignup()
 *
 * return (
 *   <button
 *     onClick={() => signup({ email: email(), password: password() })}
 *     disabled={state().status === 'pending'}
 *   >
 *     {state().status === 'pending' ? 'Signing up...' : 'Sign Up'}
 *   </button>
 * )
 * ```
 */
export function createSignup<T = unknown>(): CreateSignupReturn<T> {
  const client = getAuthClient<T>()
  const { state, call, reset } = createPromise((data: RegisterData) => client.register(data))

  return { state, signup: call, reset }
}
