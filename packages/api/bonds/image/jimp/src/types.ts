/**
 * Jimp image provider configuration types.
 *
 * @module
 */

/**
 * Configuration options for the Jimp image provider.
 */
export interface JimpConfig {
  /** Default JPEG quality (1–100). Defaults to `80`. */
  defaultJpegQuality?: number

  /** Default PNG deflate level (0–9). Defaults to `6`. */
  defaultPngDeflateLevel?: number
}
