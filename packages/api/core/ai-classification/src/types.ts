/**
 * AIClassification provider interface.
 *
 * Implement this interface in a bond package to provide
 * a concrete ai-classification implementation.
 *
 * @module
 */

/**
 *
 */
export interface AIClassificationProvider {
  readonly name: string
  // TODO: Define provider methods
}

/**
 *
 */
export interface AIClassificationConfig {
  // TODO: Define configuration options
  [key: string]: unknown
}
