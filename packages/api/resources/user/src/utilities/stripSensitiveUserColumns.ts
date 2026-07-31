/**
 * Removes secret columns from a user row before it is returned to the client.
 *
 * `findById` is `SELECT *`, so a self-read (`/users/me`, `/users/:id` self)
 * would otherwise return every column verbatim — including base-schema OAuth
 * material AND any secret column a consuming app adds to the shared `users`
 * table by migration. Notably `emailConfirmationToken`: an app that stores the
 * email-verification token here in plaintext would let a user read their own
 * token from a self-read and self-verify with no mailbox access (defeating an
 * email-verification gate). This is a DENYLIST, not an allowlist projection, so
 * app-added *non-secret* columns still reach the client.
 *
 * @module
 */

/** User-row columns that must never appear in a self-read response. */
export const SENSITIVE_USER_COLUMNS = [
  'oauthData',
  'oauthId',
  'emailConfirmationToken',
  'emailConfirmationTokenAt',
  'passwordResetToken',
  'passwordResetTokenAt',
  'passwordHash',
  'twoFactorSecret',
  'pendingTwoFactorSecret',
  'anonymousSecretHash',
  'anonymousSecret',
  'stripeCustomerId',
] as const

/**
 * Returns a shallow copy of a user row with {@link SENSITIVE_USER_COLUMNS}
 * removed. The input row is not mutated.
 *
 * @param user - The full user row (as loaded by `findById`).
 * @returns A copy of the row without secret columns.
 */
export function stripSensitiveUserColumns<T extends Record<string, unknown>>(user: T): T {
  const safe: Record<string, unknown> = { ...user }
  for (const col of SENSITIVE_USER_COLUMNS) delete safe[col]
  return safe as T
}
