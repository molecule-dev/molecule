/**
 * Encryption provider interface.
 *
 * Implement this interface in a bond package to provide
 * a concrete encryption implementation.
 *
 * @module
 */

/**
 *
 */
export interface EncryptionProvider {
  readonly name: string
  // TODO: Define provider methods
}

/**
 *
 */
export interface EncryptionConfig {
  // TODO: Define configuration options
  [key: string]: unknown
}
