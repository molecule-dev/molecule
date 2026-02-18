/**
 * Angular utility for registration with async state tracking.
 *
 * @module
 */

import type { Observable } from 'rxjs'

import type { AuthClient, AuthResult, RegisterData } from '@molecule/app-auth'
import type { PromiseState } from '@molecule/app-utilities'

import { createPromiseState } from './promise.service.js'

/**
 * Signup state manager.
 */
export interface SignupStateManager<T = unknown> {
  state$: Observable<PromiseState<AuthResult<T>>>
  getState: () => PromiseState<AuthResult<T>>
  signup: (data: RegisterData) => Promise<AuthResult<T>>
  reset: () => void
  destroy: () => void
}

/**
 * Creates a signup state manager with async state tracking.
 *
 * @param client - Auth client
 * @returns Signup state manager
 *
 * @example
 * ```typescript
 * const signupManager = createSignupState(authClient)
 *
 * signupManager.state$.subscribe(state => {
 *   console.log(state.status) // 'idle' | 'pending' | 'resolved' | 'rejected'
 * })
 *
 * await signupManager.signup({ email: 'user@example.com', password: 'secret' })
 * ```
 */
export function createSignupState<T = unknown>(client: AuthClient<T>): SignupStateManager<T> {
  const manager = createPromiseState((data: RegisterData) => client.register(data))

  return {
    state$: manager.state$,
    getState: manager.getState,
    signup: manager.call,
    reset: manager.reset,
    destroy: manager.destroy,
  }
}
