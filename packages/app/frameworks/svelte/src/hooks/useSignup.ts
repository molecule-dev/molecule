/**
 * Svelte hook for registration with async state tracking, porting React's
 * `useSignup`.
 *
 * @module
 */

import type { Readable } from 'svelte/store'

import type { AuthResult, RegisterData, RegisterExtraShape } from '@molecule/app-auth'

import { useAuthClient } from '../context.js'
import { promiseFields } from './live-store.js'
import { usePromise, type UsePromiseState, type UsePromiseStore } from './usePromise.js'

/**
 * What {@link useSignup} returns.
 *
 * @template T - The user profile the API returns.
 * @template TRegister - The app's own registration fields (the second generic
 *   of `createJWTAuthClient<T, TRegister>`), so `signup()` is typed like the
 *   client's `register()`.
 */
export interface UseSignupResult<
  T = unknown,
  TRegister extends RegisterExtraShape<TRegister> = Record<never, never>,
> {
  /** The latest call's status. */
  status: Readable<UsePromiseState<AuthResult<T>>['status']>
  /** The latest call's resolved value. */
  value: Readable<UsePromiseState<AuthResult<T>>['value']>
  /** The latest call's rejection. */
  error: Readable<UsePromiseState<AuthResult<T>>['error']>
  /** Runs the signup. */
  signup: (data: RegisterData<TRegister>) => Promise<AuthResult<T>>
  /** Returns the tracker to idle. */
  reset: () => void
}

/**
 * User registration with async state tracking, React's `useSignup` in
 * Svelte's idiom: call it during component init under
 * `setMoleculeContext({ auth })`.
 *
 * @param T - The user profile the API returns.
 * @param TRegister - The app's own registration fields.
 * @returns Signup state as stores and the action.
 * @example
 * ```svelte
 * <script>
 *   import { useSignup } from '@molecule/app-svelte'
 *   const { status, error, signup } = useSignup()
 * </script>
 *
 * <button onclick={() => signup({ email, password, name })} disabled={$status === 'pending'}>
 *   {$status === 'pending' ? 'Creating account…' : 'Sign up'}
 * </button>
 * {#if $error}<p>{$error.message}</p>{/if}
 * ```
 */
export function useSignup<
  T = unknown,
  TRegister extends RegisterExtraShape<TRegister> = Record<never, never>,
>(): UseSignupResult<T, TRegister> {
  const client = useAuthClient<T, TRegister>()
  const tracker: UsePromiseStore<AuthResult<T>, [RegisterData<TRegister>]> = usePromise((data) =>
    client.register(data),
  )
  const fields = promiseFields(tracker)
  return {
    status: fields.status,
    value: fields.value,
    error: fields.error,
    signup: fields.call,
    reset: fields.reset,
  }
}
