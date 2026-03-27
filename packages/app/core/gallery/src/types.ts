/**
 * Gallery provider interface.
 *
 * Implement this interface in a bond package to provide
 * a concrete gallery implementation.
 *
 * @module
 */

/**
 *
 */
export interface GalleryProvider {
  readonly name: string
  // TODO: Define provider methods
}

/**
 *
 */
export interface GalleryConfig {
  // TODO: Define configuration options
  [key: string]: unknown
}
