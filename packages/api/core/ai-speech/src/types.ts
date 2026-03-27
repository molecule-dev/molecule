/**
 * AISpeech provider interface.
 *
 * Implement this interface in a bond package to provide
 * a concrete ai-speech implementation.
 *
 * @module
 */

/**
 *
 */
export interface AISpeechProvider {
  readonly name: string
  // TODO: Define provider methods
}

/**
 *
 */
export interface AISpeechConfig {
  // TODO: Define configuration options
  [key: string]: unknown
}
