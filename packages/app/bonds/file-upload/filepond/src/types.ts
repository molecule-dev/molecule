/**
 * FilePond file upload provider configuration types.
 *
 * @module
 */

/**
 * Configuration options for the FilePond file upload provider.
 */
export interface FilepondConfig {
  /**
   * Timeout in milliseconds for individual upload requests.
   * Set to `0` for no timeout. Defaults to `0`.
   */
  timeout?: number
}
