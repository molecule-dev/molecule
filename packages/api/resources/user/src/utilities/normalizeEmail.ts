/**
 * Email normalization for the user resource.
 *
 * @module
 */

/**
 * Normalizes an email address for storage and lookup so case/whitespace
 * variants of the same mailbox cannot bypass the `email` UNIQUE constraint
 * (e.g. `Foo@Example.com` vs `foo@example.com`).
 *
 * Trims surrounding whitespace and lowercases the whole address. While the
 * local-part is technically case-sensitive per RFC 5321, every mainstream
 * provider treats it case-insensitively, and the account-takeover risk of
 * allowing variants far outweighs that pedantry. Both the local signup
 * (`create`) and OAuth (`logInOAuth`) write paths MUST use this so the stored
 * column and every collision lookup compare apples to apples.
 *
 * @param email - The raw email address (or null/undefined).
 * @returns The normalized email, or `undefined` when the input is empty/blank.
 */
export const normalizeEmail = (email: string | null | undefined): string | undefined => {
  if (typeof email !== 'string') {
    return undefined
  }

  const normalized = email.trim().toLowerCase()

  return normalized.length > 0 ? normalized : undefined
}
