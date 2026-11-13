/**
 * Angular utility for password reset with async state tracking.
 *
 * @module
 */

import type { Observable } from 'rxjs'

import type { AuthClient, PasswordResetConfirm, PasswordResetRequest } from '@molecule/app-auth'
import type { PromiseState } from '@molecule/app-utilities'

import { createPromiseState } from './promise.service.js'

/**
 * Password reset state manager.
 */
export interface PasswordResetStateManager {
  requestState$: Observable<PromiseState<void>>
  confirmState$: Observable<PromiseState<void>>
  getRequestState: () => PromiseState<void>
  getConfirmState: () => PromiseState<void>
  requestReset: (data: PasswordResetRequest) => Promise<void>
  confirmReset: (data: PasswordResetConfirm) => Promise<void>
  reset: () => void
  destroy: () => void
}

/**
 * Creates a password reset state manager with async state tracking.
 *
 * Generic over the client's user type like `createLoginState`, so the client the
 * `AUTH_CLIENT` token provides (`AuthClient<unknown>`) is accepted as it is.
 *
 * @param client - Auth client
 * @returns Password reset state manager
 *
 * @example
 * ```typescript
 * const resetManager = createPasswordResetState(authClient)
 *
 * resetManager.requestState$.subscribe(state => {
 *   console.log(state.status) // 'idle' | 'pending' | 'resolved' | 'rejected'
 * })
 *
 * await resetManager.requestReset({ email: 'user@example.com' })
 * await resetManager.confirmReset({ token: 'abc123', password: 'newpass' })
 * ```
 */
export function createPasswordResetState<T = unknown>(
  client: AuthClient<T>,
): PasswordResetStateManager {
  const requestManager = createPromiseState((data: PasswordResetRequest) =>
    client.requestPasswordReset(data),
  )

  const confirmManager = createPromiseState((data: PasswordResetConfirm) =>
    client.confirmPasswordReset(data),
  )

  return {
    requestState$: requestManager.state$,
    confirmState$: confirmManager.state$,
    getRequestState: requestManager.getState,
    getConfirmState: confirmManager.getState,
    requestReset: requestManager.call,
    confirmReset: confirmManager.call,
    reset: () => {
      requestManager.reset()
      confirmManager.reset()
    },
    destroy: () => {
      requestManager.destroy()
      confirmManager.destroy()
    },
  }
}
