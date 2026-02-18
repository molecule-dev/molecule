/**
 * Svelte store for password reset with async state tracking.
 *
 * @module
 */

import type { Readable } from 'svelte/store'

import type { PasswordResetConfirm, PasswordResetRequest } from '@molecule/app-auth'
import type { PromiseState } from '@molecule/app-utilities'

import { getAuthClient } from '../context.js'
import { createPromiseStore } from './promise.js'

/**
 * Password reset stores.
 */
export interface PasswordResetStores {
  request: Readable<PromiseState<void>> & {
    call: (data: PasswordResetRequest) => Promise<void>
    cancel: (message?: string) => void
    reset: () => void
  }
  confirm: Readable<PromiseState<void>> & {
    call: (data: PasswordResetConfirm) => Promise<void>
    cancel: (message?: string) => void
    reset: () => void
  }
  resetAll: () => void
}

/**
 * Creates password reset stores with async state tracking.
 *
 * @returns Password reset stores for request and confirm steps
 */
export function createPasswordResetStores(): PasswordResetStores {
  const client = getAuthClient()

  const request = createPromiseStore((data: PasswordResetRequest) =>
    client.requestPasswordReset(data),
  )

  const confirm = createPromiseStore((data: PasswordResetConfirm) =>
    client.confirmPasswordReset(data),
  )

  return {
    request,
    confirm,
    resetAll: () => {
      request.reset()
      confirm.reset()
    },
  }
}
