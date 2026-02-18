/**
 * Svelte store for login with async state tracking.
 *
 * @module
 */

import type { AuthResult, LoginCredentials } from '@molecule/app-auth'

import { getAuthClient } from '../context.js'
import { createPromiseStore, type PromiseStore } from './promise.js'

/**
 * Login store type.
 */
export type LoginStore<T = unknown> = PromiseStore<AuthResult<T>>

/**
 * Creates a login store with async state tracking.
 *
 * @returns Login promise store
 *
 * @example
 * ```svelte
 * <script>
 *   import { createLoginStore } from '`@molecule/app-svelte`'
 *   const login = createLoginStore()
 * </script>
 *
 * <button
 *   on:click={() => login.call({ email, password })}
 *   disabled={$login.status === 'pending'}
 * >
 *   {$login.status === 'pending' ? 'Logging in...' : 'Login'}
 * </button>
 * ```
 */
export function createLoginStore<T = unknown>(): LoginStore<T> {
  const client = getAuthClient<T>()
  return createPromiseStore((credentials: LoginCredentials) => client.login(credentials))
}
