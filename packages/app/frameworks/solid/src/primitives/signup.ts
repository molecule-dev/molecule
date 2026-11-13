/**
 * Solid.js primitive for registration with async state tracking.
 *
 * @module
 */

import type { Accessor } from 'solid-js'

import type { AuthResult, RegisterData, RegisterExtraShape } from '@molecule/app-auth'
import type { PromiseState } from '@molecule/app-utilities'

import { getAuthClient } from '../context.js'
import { useAuthClient } from './auth.js'
import { createPromise, usePromise, type UsePromiseState } from './promise.js'

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

/**
 * What {@link useSignup} returns (the same names React returns).
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
  /** The tracked signup status, as an accessor. */
  status: Accessor<UsePromiseState<AuthResult<T>>['status']>
  /** The settled signup result, as an accessor. */
  value: Accessor<UsePromiseState<AuthResult<T>>['value']>
  /** The signup failure, as an accessor. */
  error: Accessor<UsePromiseState<AuthResult<T>>['error']>
  signup: (data: RegisterData<TRegister>) => Promise<AuthResult<T>>
  reset: () => void
}

/**
 * User registration with async state tracking, under React's hook name.
 *
 * @returns Signup state (status, value, error as accessors) and the controls.
 * @throws {Error} When no `MoleculeProvider` above configures `auth`.
 * @example
 * ```tsx
 * const { status, error, signup } = useSignup()
 * <button onClick={() => signup({ email, password, name })} disabled={status() === 'pending'}>
 * ```
 */
export function useSignup<
  T = unknown,
  TRegister extends RegisterExtraShape<TRegister> = Record<never, never>,
>(): UseSignupReturn<T, TRegister> {
  const client = useAuthClient<T, TRegister>()

  const registerFn = (data: RegisterData<TRegister>): Promise<AuthResult<T>> =>
    client.register(data)

  const tuple = usePromise(registerFn)
  const state = (): UsePromiseState<AuthResult<T>> => tuple[0] as UsePromiseState<AuthResult<T>>
  const call = tuple[1]

  return {
    status: () => state().status,
    value: () => state().value,
    error: () => state().error,
    signup: call,
    reset: state().reset,
  }
}
