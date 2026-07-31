import { createHash } from 'node:crypto'

/**
 * Hash a password-reset token for storage/lookup.
 *
 * The token emailed to the user is high-entropy random, but storing it VERBATIM
 * in `usersSecrets.passwordResetToken` means any read of that table (a backup, a
 * replica, the shared control-plane cluster) yields a live account-takeover
 * credential. Store `sha256(token)` instead and compare digests: a DB reader
 * gets only the hash, which cannot be replayed against the reset endpoint. The
 * token itself is single-use with a short TTL, so a fast hash (no salt) is
 * sufficient — this is not a password.
 *
 * @param token - The raw reset token (as generated / as received from the user).
 * @returns The lowercase hex SHA-256 digest to store and compare.
 */
export function hashResetToken(token: string): string {
  return createHash('sha256').update(token).digest('hex')
}
