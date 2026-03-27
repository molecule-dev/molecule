/**
 * MediaStreaming provider interface.
 *
 * Implement this interface in a bond package to provide
 * a concrete media-streaming implementation.
 *
 * @module
 */

/**
 *
 */
export interface MediaStreamingProvider {
  readonly name: string
  // TODO: Define provider methods
}

/**
 *
 */
export interface MediaStreamingConfig {
  // TODO: Define configuration options
  [key: string]: unknown
}
