/**
 * Random generation utilities for molecule.dev frontend applications.
 *
 * @module
 */

/**
 * Generates a random string by picking characters from the given charset.
 * Uses `Math.random()` — not suitable for cryptographic purposes.
 *
 * @param length - The desired string length (default: 16).
 * @param charset - The character set to sample from (default: alphanumeric A-Z, a-z, 0-9).
 * @returns A random string of the specified length.
 */
export const randomString = (
  length = 16,
  charset = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789',
): string => {
  let result = ''
  const charsetLength = charset.length

  for (let i = 0; i < length; i++) {
    result += charset.charAt(Math.floor(Math.random() * charsetLength))
  }

  return result
}

/**
 * Generates a UUID v4 string. Uses `crypto.randomUUID()` when available,
 * with a `Math.random()` fallback for environments that lack it.
 *
 * @returns A UUID v4 string (e.g. `"550e8400-e29b-41d4-a716-446655440000"`).
 */
export const uuid = (): string => {
  if (crypto.randomUUID) {
    return crypto.randomUUID()
  }

  // Fallback implementation
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0
    const v = c === 'x' ? r : (r & 0x3) | 0x8
    return v.toString(16)
  })
}
