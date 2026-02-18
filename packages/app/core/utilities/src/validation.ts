/**
 * Validation utilities for molecule.dev frontend applications.
 *
 * @module
 */

/**
 * Validates an email address against a simplified RFC 5322 pattern.
 *
 * @param value - The string to validate as an email address.
 * @returns `true` if the string matches the email pattern.
 */
export const isEmail = (value: string): boolean => {
  if (!value) return false

  // RFC 5322 compliant email regex (simplified)
  const emailRegex =
    /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/

  return emailRegex.test(value)
}

/**
 * Validates whether a string is a well-formed URL using the `URL` constructor.
 *
 * @param value - The string to validate as a URL.
 * @returns `true` if the string can be parsed as a valid URL.
 */
export const isUrl = (value: string): boolean => {
  if (!value) return false

  try {
    new URL(value)
    return true
  } catch {
    return false
  }
}
