/**
 * AITranslation provider interface.
 *
 * Implement this interface in a bond package to provide
 * a concrete ai-translation implementation.
 *
 * @module
 */

/**
 *
 */
export interface AITranslationProvider {
  readonly name: string
  // TODO: Define provider methods
}

/**
 *
 */
export interface AITranslationConfig {
  // TODO: Define configuration options
  [key: string]: unknown
}
