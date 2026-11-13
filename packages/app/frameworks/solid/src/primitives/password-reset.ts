/**
 * Solid.js primitive for password reset with async state tracking.
 *
 * @module
 */

import type { Accessor } from 'solid-js'

import type { PasswordResetConfirm, PasswordResetRequest } from '@molecule/app-auth'
import type { PromiseState } from '@molecule/app-utilities'

import { getAuthClient } from '../context.js'
import { useAuthClient } from './auth.js'
import { createPromise, usePromise, type UsePromiseState } from './promise.js'

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

/**
 * What {@link usePasswordReset} returns (the same names React returns).
 */
export interface UsePasswordResetReturn {
  /** The tracked request status, as an accessor. */
  requestStatus: Accessor<UsePromiseState<void>['status']>
  /** The request failure, as an accessor. */
  requestError: Accessor<UsePromiseState<void>['error']>
  /** The tracked confirm status, as an accessor. */
  confirmStatus: Accessor<UsePromiseState<void>['status']>
  /** The confirm failure, as an accessor. */
  confirmError: Accessor<UsePromiseState<void>['error']>
  requestReset: (data: PasswordResetRequest) => Promise<void>
  confirmReset: (data: PasswordResetConfirm) => Promise<void>
  reset: () => void
}

/**
 * The password reset flow with async state tracking, under React's hook name.
 * The request and confirm halves are tracked separately.
 *
 * @returns Password reset state (statuses and errors as accessors) and the actions.
 * @throws {Error} When no `MoleculeProvider` above configures `auth`.
 * @example
 * ```tsx
 * const { requestStatus, requestError, requestReset, confirmReset } = usePasswordReset()
 * ```
 */
export function usePasswordReset(): UsePasswordResetReturn {
  const client = useAuthClient()

  const requestFn = (data: PasswordResetRequest): Promise<void> => client.requestPasswordReset(data)
  const confirmFn = (data: PasswordResetConfirm): Promise<void> => client.confirmPasswordReset(data)

  const requestTuple = usePromise(requestFn)
  const requestState = (): UsePromiseState<void> => requestTuple[0] as UsePromiseState<void>
  const requestCall = requestTuple[1]
  const confirmTuple = usePromise(confirmFn)
  const confirmState = (): UsePromiseState<void> => confirmTuple[0] as UsePromiseState<void>
  const confirmCall = confirmTuple[1]

  return {
    requestStatus: () => requestState().status,
    requestError: () => requestState().error,
    confirmStatus: () => confirmState().status,
    confirmError: () => confirmState().error,
    requestReset: requestCall,
    confirmReset: confirmCall,
    reset: () => {
      requestState().reset()
      confirmState().reset()
    },
  }
}
