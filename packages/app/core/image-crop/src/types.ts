/**
 * ImageCrop provider interface.
 *
 * Implement this interface in a bond package to provide
 * a concrete image-crop implementation.
 *
 * @module
 */

/**
 *
 */
export interface ImageCropProvider {
  readonly name: string
  // TODO: Define provider methods
}

/**
 *
 */
export interface ImageCropConfig {
  // TODO: Define configuration options
  [key: string]: unknown
}
