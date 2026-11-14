/**
 * Shared types for the AccountSection unit tests (test-only; not exported
 * from the package).
 *
 * @module
 */

import type { AuthClient } from '@molecule/app-auth'

/** The handle-keyed account shape the custom-aliases counterexample uses. */
export interface HandleUser {
  /** The account's unique handle (its identity; no `id`). */
  handle: string
  /** The account's email address. */
  email: string
  /** The nullable display alias. */
  displayName: string | null
  /** The nullable avatar alias. */
  avatarUrl: string | null
}

/** Anything mounting the test hosts needs an auth client. */
export type TestClient<T> = AuthClient<T>
