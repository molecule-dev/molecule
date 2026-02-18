/**
 * Svelte store for changing password with async state tracking.
 *
 * @module
 */

import { getAuthClient } from '../context.js'
import { createPromiseStore, type PromiseStore } from './promise.js'

/**
 * Change password store type.
 */
export type ChangePasswordStore = PromiseStore<void>

/**
 * Creates a change password store with async state tracking.
 *
 * @returns Change password promise store
 */
export function createChangePasswordStore(): ChangePasswordStore {
  const client = getAuthClient()
  return createPromiseStore((oldPassword: string, newPassword: string) =>
    client.changePassword(oldPassword, newPassword),
  )
}
