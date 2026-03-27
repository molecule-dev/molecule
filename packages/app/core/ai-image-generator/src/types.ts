/**
 * AIImageGenerator provider interface.
 *
 * Implement this interface in a bond package to provide
 * a concrete ai-image-generator implementation.
 *
 * @module
 */

/**
 *
 */
export interface AIImageGeneratorProvider {
  readonly name: string
  // TODO: Define provider methods
}

/**
 *
 */
export interface AIImageGeneratorConfig {
  // TODO: Define configuration options
  [key: string]: unknown
}
