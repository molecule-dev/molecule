/**
 * FileUpload provider interface.
 *
 * Implement this interface in a bond package to provide
 * a concrete file-upload implementation.
 *
 * @module
 */

/**
 *
 */
export interface FileUploadProvider {
  readonly name: string
  // TODO: Define provider methods
}

/**
 *
 */
export interface FileUploadConfig {
  // TODO: Define configuration options
  [key: string]: unknown
}
