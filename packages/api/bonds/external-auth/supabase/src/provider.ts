/**
 * External authentication provider implementation using Supabase.
 *
 * Verifies Supabase user JWTs via the anon client's `auth.getUser(token)` —
 * the anon key is PUBLIC, so verification requires NO secret.
 *
 * @see https://www.npmjs.com/package/@supabase/supabase-js
 *
 * @module
 */

import type { ExternalAuthProvider, ExternalAuthUser } from '@molecule/api-external-auth'

import { getAnonClient } from './client.js'

/**
 * External authentication provider backed by Supabase. Wire it at startup:
 * `setProvider(provider)` from `@molecule/api-external-auth`.
 */
export const provider: ExternalAuthProvider = {
  async verifyUserToken(token: string): Promise<ExternalAuthUser | null> {
    if (!token) return null
    const client = getAnonClient()
    try {
      const { data, error } = await client.auth.getUser(token)
      if (error || !data.user) return null
      return { userId: data.user.id, email: data.user.email ?? undefined }
    } catch (_error) {
      // Intentionally ignored: supabase-js reports auth/transport failures via
      // the returned `error` (handled above); a throw here is a defensive
      // catch for unexpected library failures, and the contract is "a token
      // that cannot be verified is unverified (null)" — callers map null to
      // 401, they do not need a stack trace for a bad token.
      return null
    }
  },
}
