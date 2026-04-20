/**
 * AIClassification provider interface.
 *
 * Implement this interface in a bond package to provide
 * a concrete ai-classification implementation.
 *
 * @module
 */

/**
 * Live AI classification integration contract (TODO: expand methods).
 */
export interface AIClassificationProvider {
  readonly name: string
  // TODO: Define provider methods
}

/**
 * Config options for an AI classification bond (TODO: tighten schema).
 */
export interface AIClassificationConfig {
  // TODO: Define configuration options
  [key: string]: unknown
}
