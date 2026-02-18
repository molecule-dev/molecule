/**
 * Angular utility for login with async state tracking.
 *
 * @module
 */

import type { Observable } from 'rxjs'

import type { AuthClient, AuthResult, LoginCredentials } from '@molecule/app-auth'
import type { PromiseState } from '@molecule/app-utilities'

import { createPromiseState } from './promise.service.js'

/**
 * Login state manager.
 */
export interface LoginStateManager<T = unknown> {
  state$: Observable<PromiseState<AuthResult<T>>>
  getState: () => PromiseState<AuthResult<T>>
  login: (credentials: LoginCredentials) => Promise<AuthResult<T>>
  reset: () => void
  destroy: () => void
}

/**
 * Creates a login state manager with async state tracking.
 *
 * @param client - Auth client
 * @returns Login state manager
 *
 * @example
 * ```typescript
 * const loginManager = createLoginState(authClient)
 *
 * loginManager.state$.subscribe(state => {
 *   console.log(state.status) // 'idle' | 'pending' | 'resolved' | 'rejected'
 * })
 *
 * await loginManager.login({ email: 'user@example.com', password: 'secret' })
 * ```
 */
export function createLoginState<T = unknown>(client: AuthClient<T>): LoginStateManager<T> {
  const manager = createPromiseState((credentials: LoginCredentials) => client.login(credentials))

  return {
    state$: manager.state$,
    getState: manager.getState,
    login: manager.call,
    reset: manager.reset,
    destroy: manager.destroy,
  }
}
