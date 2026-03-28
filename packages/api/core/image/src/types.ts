/**
 * Type definitions for image processing core interface.
 *
 * @module
 */

/**
 * Supported image output formats.
 */
export type ImageFormat = 'jpeg' | 'png' | 'webp' | 'avif' | 'gif' | 'tiff'

/**
 * Resize fit modes that control how the image fits the target dimensions.
 */
export type ResizeFit = 'cover' | 'contain' | 'fill' | 'inside' | 'outside'

/**
 * Image resize options.
 */
export interface ResizeOptions {
  /** Target width in pixels. */
  width?: number

  /** Target height in pixels. */
  height?: number

  /** How the image should be resized to fit the target dimensions. */
  fit?: ResizeFit

  /** Background color when fit is `contain` and the image doesn't fill the target (CSS color string). */
  background?: string

  /** Whether to allow upscaling beyond original dimensions. Defaults to `false`. */
  withoutEnlargement?: boolean
}

/**
 * Image crop options specifying a rectangular region.
 */
export interface CropOptions {
  /** Left offset in pixels. */
  left: number

  /** Top offset in pixels. */
  top: number

  /** Width of the crop region in pixels. */
  width: number

  /** Height of the crop region in pixels. */
  height: number
}

/**
 * Image optimization options.
 */
export interface OptimizeOptions {
  /** Output format. If omitted, the original format is preserved. */
  format?: ImageFormat

  /** Quality percentage (1–100). Higher values produce larger files with better quality. */
  quality?: number

  /** Whether to strip metadata (EXIF, ICC profiles, etc.). Defaults to `true`. */
  stripMetadata?: boolean

  /** Whether to generate a progressive/interlaced image. */
  progressive?: boolean
}

/**
 * Rotation options.
 */
export interface RotateOptions {
  /** Rotation angle in degrees (clockwise). */
  angle: number

  /** Background color for uncovered regions after rotation (CSS color string). */
  background?: string
}

/**
 * Image metadata extracted from a buffer.
 */
export interface ImageMetadata {
  /** Image width in pixels. */
  width: number

  /** Image height in pixels. */
  height: number

  /** Detected image format (e.g., `'jpeg'`, `'png'`). */
  format: string

  /** File size in bytes. */
  size: number

  /** Whether the image has an alpha channel. */
  hasAlpha: boolean

  /** Number of color channels (e.g., 3 for RGB, 4 for RGBA). */
  channels?: number

  /** Image density (DPI) if available. */
  density?: number

  /** Image orientation from EXIF data if available. */
  orientation?: number
}

/**
 * Image processing provider interface.
 *
 * All image processing providers must implement this interface.
 * Bond packages (Sharp, Jimp, etc.) provide concrete implementations.
 */
export interface ImageProvider {
  /**
   * Resizes an image to the specified dimensions.
   *
   * @param input - Image data as a Buffer.
   * @param options - Resize dimensions and fit mode.
   * @returns The resized image as a Buffer.
   */
  resize(input: Buffer, options: ResizeOptions): Promise<Buffer>

  /**
   * Crops an image to a rectangular region.
   *
   * @param input - Image data as a Buffer.
   * @param options - Crop region coordinates and dimensions.
   * @returns The cropped image as a Buffer.
   */
  crop(input: Buffer, options: CropOptions): Promise<Buffer>

  /**
   * Converts an image to a different format.
   *
   * @param input - Image data as a Buffer.
   * @param format - Target image format.
   * @param quality - Optional quality percentage (1–100).
   * @returns The converted image as a Buffer.
   */
  convert(input: Buffer, format: ImageFormat, quality?: number): Promise<Buffer>

  /**
   * Generates a square thumbnail from an image.
   *
   * @param input - Image data as a Buffer.
   * @param size - Thumbnail side length in pixels.
   * @returns The thumbnail image as a Buffer.
   */
  thumbnail(input: Buffer, size: number): Promise<Buffer>

  /**
   * Optimizes an image for file size with optional format conversion.
   *
   * @param input - Image data as a Buffer.
   * @param options - Optimization options (format, quality, strip metadata).
   * @returns The optimized image as a Buffer.
   */
  optimize(input: Buffer, options?: OptimizeOptions): Promise<Buffer>

  /**
   * Extracts metadata from an image buffer.
   *
   * @param input - Image data as a Buffer.
   * @returns Metadata about the image (dimensions, format, size, etc.).
   */
  getMetadata(input: Buffer): Promise<ImageMetadata>

  /**
   * Rotates an image by the specified angle.
   *
   * @param input - Image data as a Buffer.
   * @param options - Rotation angle and background fill options.
   * @returns The rotated image as a Buffer.
   */
  rotate?(input: Buffer, options: RotateOptions): Promise<Buffer>

  /**
   * Flips an image vertically (top to bottom).
   *
   * @param input - Image data as a Buffer.
   * @returns The flipped image as a Buffer.
   */
  flip?(input: Buffer): Promise<Buffer>

  /**
   * Flops an image horizontally (left to right).
   *
   * @param input - Image data as a Buffer.
   * @returns The flopped image as a Buffer.
   */
  flop?(input: Buffer): Promise<Buffer>
}
