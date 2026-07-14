/**
 * Have-I-Been-Pwned (HIBP) k-anonymity password breach check for molecule.dev.
 *
 * Computes a SHA-1 hash of a plaintext password locally, transmits only the
 * first 5 hex characters of the hash to the HIBP password range API, and
 * scans the response locally for a match. The full hash is never sent.
 *
 * @example
 * ```ts
 * import { checkPassword } from '@molecule/api-breach-check'
 *
 * const result = await checkPassword('hunter2')
 * if (result.pwned) {
 *   throw new Error(`password seen in ${result.count} breaches`)
 * }
 * ```
 *
 * @remarks
 * Privacy contract: the plaintext password and its full SHA-1 hash never
 * leave the calling process. Only the 5-character k-anonymity prefix is
 * transmitted. The optional `padding` flag (default `true`) instructs HIBP
 * to pad responses to thwart traffic analysis. An optional cache adapter
 * (compatible with `@molecule/api-cache`) can be supplied to coalesce
 * repeated lookups for the same prefix.
 *
 * @module
 */

export * from './browser-guard.js'
export * from './checkPassword.js'
export * from './sha1Prefix.js'
export * from './types.js'
