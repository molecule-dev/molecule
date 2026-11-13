/**
 * Solid.js primitive for changing password with async state tracking.
 *
 * @module
 */

import type { Accessor } from 'solid-js'

import type { PromiseState } from '@molecule/app-utilities'

import { getAuthClient } from '../context.js'
import { useAuthClient } from './auth.js'
import { createPromise, usePromise, type UsePromiseState } from './promise.js'

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

/**
 * What {@link useChangePassword} returns (the same names React returns).
 */
export interface UseChangePasswordReturn {
  /** The tracked change status, as an accessor. */
  status: Accessor<UsePromiseState<void>['status']>
  /** The change failure, as an accessor. */
  error: Accessor<UsePromiseState<void>['error']>
  changePassword: (oldPassword: string, newPassword: string) => Promise<void>
  reset: () => void
}

/**
 * Changing password with async state tracking, under React's hook name.
 *
 * @returns Change state (status, error as accessors) and the controls.
 * @throws {Error} When no `MoleculeProvider` above configures `auth`.
 * @example
 * ```tsx
 * const { status, error, changePassword } = useChangePassword()
 * <button onClick={() => changePassword(old, new)} disabled={status() === 'pending'}>
 * ```
 */
export function useChangePassword(): UseChangePasswordReturn {
  const client = useAuthClient()

  const changeFn = (oldPassword: string, newPassword: string): Promise<void> =>
    client.changePassword(oldPassword, newPassword)

  const tuple = usePromise(changeFn)
  const state = (): UsePromiseState<void> => tuple[0] as UsePromiseState<void>
  const call = tuple[1]

  return {
    status: () => state().status,
    error: () => state().error,
    changePassword: call,
    reset: state().reset,
  }
}
