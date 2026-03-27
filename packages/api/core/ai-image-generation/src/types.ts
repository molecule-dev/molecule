/**
 * AIImageGeneration provider interface.
 *
 * Implement this interface in a bond package to provide
 * a concrete ai-image-generation implementation.
 *
 * @module
 */

/**
 *
 */
export interface AIImageGenerationProvider {
  readonly name: string
  // TODO: Define provider methods
}

/**
 *
 */
export interface AIImageGenerationConfig {
  // TODO: Define configuration options
  [key: string]: unknown
}
