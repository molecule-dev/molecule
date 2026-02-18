/**
 * Solid.js primitive for changing password with async state tracking.
 *
 * @module
 */

import type { Accessor } from 'solid-js'

import type { PromiseState } from '@molecule/app-utilities'

import { getAuthClient } from '../context.js'
import { createPromise } from './promise.js'

/**
 * Return type for createChangePassword primitive.
 */
export interface CreateChangePasswordReturn {
  state: Accessor<PromiseState<void>>
  changePassword: (oldPassword: string, newPassword: string) => Promise<void>
  reset: () => void
}

/**
 * Creates a change password primitive with async state tracking.
 *
 * @returns Change password state and action
 *
 * @example
 * ```tsx
 * const { state, changePassword } = createChangePassword()
 *
 * return (
 *   <button
 *     onClick={() => changePassword(oldPassword(), newPassword())}
 *     disabled={state().status === 'pending'}
 *   >
 *     {state().status === 'pending' ? 'Changing...' : 'Change Password'}
 *   </button>
 * )
 * ```
 */
export function createChangePassword(): CreateChangePasswordReturn {
  const client = getAuthClient()
  const { state, call, reset } = createPromise((oldPassword: string, newPassword: string) =>
    client.changePassword(oldPassword, newPassword),
  )

  return { state, changePassword: call, reset }
}
