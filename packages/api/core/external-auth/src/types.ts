/**
 * Type definitions for the external authentication core interface.
 *
 * @module
 */

/**
 * The verified identity extracted from an external auth platform's user
 * token by {@link ExternalAuthProvider.verifyUserToken}.
 */
export interface ExternalAuthUser {
  /**
   * The platform's stable user id (e.g. Supabase `auth.users.id`, a Firebase
   * UID, a Clerk user id).
   */
  userId: string

  /**
   * The user's email address, when present on the token's user record.
   */
  email?: string
}

/**
 * Contract implemented by external-auth provider bonds
 * (e.g. `@molecule/api-external-auth-supabase`).
 */
export interface ExternalAuthProvider {
  /**
   * Verifies a user token issued by the external auth platform and returns
   * the verified identity, or `null` when the token is invalid, expired, or
   * empty. Never throws on a bad token — a bad token is a normal runtime
   * condition, not an error.
   *
   * @param token - The raw token the app's frontend already sends (typically
   *   the `Authorization: Bearer <token>` value).
   * @returns The verified user, or `null` if the token cannot be verified.
   */
  verifyUserToken(token: string): Promise<ExternalAuthUser | null>
}
