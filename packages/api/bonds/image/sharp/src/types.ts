/**
 * Sharp image provider configuration types.
 *
 * @module
 */

/**
 * Configuration options for the Sharp image provider.
 */
export interface SharpConfig {
  /** Default JPEG quality (1–100). Defaults to `80`. */
  defaultJpegQuality?: number

  /** Default PNG compression level (0–9). Defaults to `6`. */
  defaultPngCompression?: number

  /** Default WebP quality (1–100). Defaults to `80`. */
  defaultWebpQuality?: number

  /** Default AVIF quality (1–100). Defaults to `50`. */
  defaultAvifQuality?: number

  /** Whether to use progressive encoding for JPEG by default. Defaults to `false`. */
  progressive?: boolean

  /** Whether to strip metadata by default. Defaults to `true`. */
  stripMetadata?: boolean

  /** Limit the number of pixels to process (width × height). Defaults to `268402689` (Sharp default). */
  limitInputPixels?: number | false
}
