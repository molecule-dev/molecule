/**
 * Solid.js primitive for password reset with async state tracking.
 *
 * @module
 */

import type { Accessor } from 'solid-js'

import type { PasswordResetConfirm, PasswordResetRequest } from '@molecule/app-auth'
import type { PromiseState } from '@molecule/app-utilities'

import { getAuthClient } from '../context.js'
import { createPromise } from './promise.js'

/**
 * Return type for createPasswordReset primitive.
 */
export interface CreatePasswordResetReturn {
  requestState: Accessor<PromiseState<void>>
  confirmState: Accessor<PromiseState<void>>
  requestReset: (data: PasswordResetRequest) => Promise<void>
  confirmReset: (data: PasswordResetConfirm) => Promise<void>
  reset: () => void
}

/**
 * Creates a password reset primitive with async state tracking.
 *
 * @returns Password reset state and actions
 *
 * @example
 * ```tsx
 * const { requestState, confirmState, requestReset, confirmReset } = createPasswordReset()
 *
 * // Request phase
 * <button
 *   onClick={() => requestReset({ email: email() })}
 *   disabled={requestState().status === 'pending'}
 * >
 *   Send Reset Email
 * </button>
 *
 * // Confirm phase
 * <button
 *   onClick={() => confirmReset({ token: token(), password: password() })}
 *   disabled={confirmState().status === 'pending'}
 * >
 *   Reset Password
 * </button>
 * ```
 */
export function createPasswordReset(): CreatePasswordResetReturn {
  const client = getAuthClient()

  const request = createPromise((data: PasswordResetRequest) => client.requestPasswordReset(data))

  const confirm = createPromise((data: PasswordResetConfirm) => client.confirmPasswordReset(data))

  return {
    requestState: request.state,
    confirmState: confirm.state,
    requestReset: request.call,
    confirmReset: confirm.call,
    reset: () => {
      request.reset()
      confirm.reset()
    },
  }
}
