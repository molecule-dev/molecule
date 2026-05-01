/**
 * Internal utilities for the JoinCode component.
 *
 * @module
 */

import type { JoinCodeAlphabet } from './types.js'

/**
 * Regular-expression source matching a single character of the given alphabet.
 *
 * @param alphabet - The alphabet name.
 * @returns A character-class string (e.g. `'A-Z0-9'`).
 */
function alphabetSource(alphabet: JoinCodeAlphabet): string {
  switch (alphabet) {
    case 'numeric':
      return '0-9'
    case 'letters':
      return 'A-Za-z'
    case 'alphanumeric':
    default:
      return 'A-Za-z0-9'
  }
}

/**
 * Build a regex matching characters that should be stripped from input under
 * the given alphabet. The returned regex has the global flag set.
 *
 * @param alphabet - The alphabet name.
 * @returns A regex usable with `String.prototype.replace`.
 */
export function buildStripRegex(alphabet: JoinCodeAlphabet): RegExp {
  return new RegExp(`[^${alphabetSource(alphabet)}]`, 'g')
}

/**
 * Sanitize a raw string by stripping disallowed characters and normalising to
 * upper-case (when the alphabet is `'letters'` or `'alphanumeric'`).
 *
 * @param raw - The raw string to sanitize.
 * @param alphabet - The alphabet name.
 * @returns The sanitized string.
 */
export function sanitizeInput(raw: string, alphabet: JoinCodeAlphabet): string {
  const stripped = raw.replace(buildStripRegex(alphabet), '')
  return alphabet === 'numeric' ? stripped : stripped.toUpperCase()
}

/**
 * Test whether a single character is valid for the given alphabet. The test
 * runs against already-normalised characters (upper-case for letters /
 * alphanumeric), so callers should sanitize first.
 *
 * @param char - The single character to test.
 * @param alphabet - The alphabet name.
 * @returns `true` when the character is allowed, `false` otherwise.
 */
export function isValidChar(char: string, alphabet: JoinCodeAlphabet): boolean {
  if (char.length !== 1) return false
  const re = new RegExp(`^[${alphabetSource(alphabet)}]$`)
  return re.test(char)
}
