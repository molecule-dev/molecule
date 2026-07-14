import { getProvider, hasProvider } from './provider.js'
import type { ExternalAuthUser } from './types.js'

/**
 * Verifies a user token issued by the imported app's own auth platform using
 * the bonded provider, returning the verified identity or `null` when the
 * token is invalid, expired, or empty (never throws on a bad token).
 *
 * @param token - The raw token the app's frontend already sends (typically
 *   the `Authorization: Bearer <token>` value).
 * @returns The verified user, or `null` if the token cannot be verified.
 * @throws {Error} If no external-auth provider has been bonded — wire one at
 *   startup with `setProvider()`.
 */
export const verifyUserToken = async (token: string): Promise<ExternalAuthUser | null> => {
  if (!hasProvider()) {
    throw new Error(
      'No external-auth provider bonded — setProvider(provider) from a bond like @molecule/api-external-auth-supabase at startup.',
    )
  }
  return getProvider().verifyUserToken(token)
}
