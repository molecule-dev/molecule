/**
 * Angular utility for changing password with async state tracking.
 *
 * @module
 */

import type { Observable } from 'rxjs'

import type { AuthClient } from '@molecule/app-auth'
import type { PromiseState } from '@molecule/app-utilities'

import { createPromiseState } from './promise.service.js'

/**
 * Change password state manager.
 */
export interface ChangePasswordStateManager {
  state$: Observable<PromiseState<void>>
  getState: () => PromiseState<void>
  changePassword: (oldPassword: string, newPassword: string) => Promise<void>
  reset: () => void
  destroy: () => void
}

/**
 * Creates a change password state manager with async state tracking.
 *
 * @param client - Auth client
 * @returns Change password state manager
 *
 * @example
 * ```typescript
 * const changeManager = createChangePasswordState(authClient)
 *
 * changeManager.state$.subscribe(state => {
 *   console.log(state.status) // 'idle' | 'pending' | 'resolved' | 'rejected'
 * })
 *
 * await changeManager.changePassword('oldpass', 'newpass')
 * ```
 */
export function createChangePasswordState(client: AuthClient): ChangePasswordStateManager {
  const manager = createPromiseState((oldPassword: string, newPassword: string) =>
    client.changePassword(oldPassword, newPassword),
  )

  return {
    state$: manager.state$,
    getState: manager.getState,
    changePassword: manager.call,
    reset: manager.reset,
    destroy: manager.destroy,
  }
}
