/**
 * ContentModeration provider interface.
 *
 * Implement this interface in a bond package to provide
 * a concrete content-moderation implementation.
 *
 * @module
 */

/**
 *
 */
export interface ContentModerationProvider {
  readonly name: string
  // TODO: Define provider methods
}

/**
 *
 */
export interface ContentModerationConfig {
  // TODO: Define configuration options
  [key: string]: unknown
}
