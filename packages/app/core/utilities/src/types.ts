/**
 * Type definitions for molecule.dev frontend utilities.
 *
 * @module
 */

/**
 * Alphanumeric validation options.
 */
export interface AlphanumericOptions {
  /**
   * Allow spaces.
   */
  allowSpaces?: boolean

  /**
   * Allow dashes.
   */
  allowDashes?: boolean

  /**
   * Allow underscores.
   */
  allowUnderscores?: boolean

  /**
   * Minimum length.
   */
  minLength?: number

  /**
   * Maximum length.
   */
  maxLength?: number
}
