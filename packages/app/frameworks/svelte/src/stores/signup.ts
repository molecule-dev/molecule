/**
 * Svelte store for registration with async state tracking.
 *
 * @module
 */

import type { AuthResult, RegisterData } from '@molecule/app-auth'

import { getAuthClient } from '../context.js'
import { createPromiseStore, type PromiseStore } from './promise.js'

/**
 * Signup store type.
 */
export type SignupStore<T = unknown> = PromiseStore<AuthResult<T>>

/**
 * Creates a signup store with async state tracking.
 *
 * @returns Signup promise store
 */
export function createSignupStore<T = unknown>(): SignupStore<T> {
  const client = getAuthClient<T>()
  return createPromiseStore((data: RegisterData) => client.register(data))
}
