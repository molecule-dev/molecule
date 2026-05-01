import { createHash } from 'node:crypto'

/**
 * Compute the uppercase SHA-1 hex digest of a plaintext string and split it
 * into the 5-character k-anonymity prefix and the 35-character suffix.
 *
 * Privacy contract: only the {@link Sha1Split.prefix} is ever transmitted to
 * the HIBP password range API. The {@link Sha1Split.suffix} is compared
 * client-side against the lines in the response body.
 *
 * @param plaintext - The password (or any string) to hash.
 * @returns Object containing the uppercase SHA-1 `prefix` (length 5) and
 *   `suffix` (length 35).
 */
export const sha1Split = (plaintext: string): Sha1Split => {
  const digest = createHash('sha1').update(plaintext, 'utf8').digest('hex').toUpperCase()

  return {
    prefix: digest.slice(0, 5),
    suffix: digest.slice(5),
  }
}

/**
 * Result of {@link sha1Split}.
 */
export interface Sha1Split {
  /**
   * The first 5 hex characters of the SHA-1 digest (uppercase). This is
   * what gets transmitted to HIBP — never the full hash.
   */
  prefix: string

  /**
   * The remaining 35 hex characters of the SHA-1 digest (uppercase). Used
   * locally to scan the response for a match.
   */
  suffix: string
}
