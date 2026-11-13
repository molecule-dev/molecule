/**
 * Svelte hook for login with async state tracking, porting React's `useLogin`.
 *
 * @module
 */

import type { Readable } from 'svelte/store'

import type { AuthResult, LoginCredentials } from '@molecule/app-auth'

import { useAuthClient } from '../context.js'
import { promiseFields } from './live-store.js'
import { usePromise, type UsePromiseState, type UsePromiseStore } from './usePromise.js'

/** What {@link useLogin} returns: the promise state's value fields as stores plus the action. */
export interface UseLoginResult<T = unknown> {
  /** The latest call's status. */
  status: Readable<UsePromiseState<AuthResult<T>>['status']>
  /** The latest call's resolved value. */
  value: Readable<UsePromiseState<AuthResult<T>>['value']>
  /** The latest call's rejection. */
  error: Readable<UsePromiseState<AuthResult<T>>['error']>
  /** Runs the login. */
  login: (credentials: LoginCredentials) => Promise<AuthResult<T>>
  /** Returns the tracker to idle. */
  reset: () => void
}

/**
 * Login with async state tracking, React's `useLogin` in Svelte's idiom:
 * call it during component init under `setMoleculeContext({ auth })`.
 *
 * Registration is available through `const { register } = useAuth()`;
 * call `register({ email, password, name })` to create an account. There is
 * no separate `useRegister` hook; use `usePromise(register)` when a form
 * needs the same pending/error tracking as this login hook.
 *
 * @param T - The user profile the API returns.
 * @returns Login state as stores and the action.
 * @example
 * ```svelte
 * <script>
 *   import { useLogin } from '@molecule/app-svelte'
 *   const { status, error, login } = useLogin()
 * </script>
 *
 * <button onclick={() => login({ email, password })} disabled={$status === 'pending'}>
 *   {$status === 'pending' ? 'Logging in…' : 'Log in'}
 * </button>
 * {#if $error}<p>{$error.message}</p>{/if}
 * ```
 */
export function useLogin<T = unknown>(): UseLoginResult<T> {
  const client = useAuthClient<T>()
  const tracker: UsePromiseStore<AuthResult<T>, [LoginCredentials]> = usePromise((credentials) =>
    client.login(credentials),
  )
  const fields = promiseFields(tracker)
  return {
    status: fields.status,
    value: fields.value,
    error: fields.error,
    login: fields.call,
    reset: fields.reset,
  }
}
