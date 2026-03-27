/**
 * Image provider bond accessor and convenience functions.
 *
 * Bond packages (e.g. `@molecule/api-image-sharp`) call `setProvider()` during setup.
 * Application code uses the convenience functions which delegate to the bonded provider.
 *
 * @module
 */

import { bond, expectBond, isBonded, require as bondRequire } from '@molecule/api-bond'
import { t } from '@molecule/api-i18n'

import type {
  CropOptions,
  ImageFormat,
  ImageMetadata,
  ImageProvider,
  OptimizeOptions,
  ResizeOptions,
  RotateOptions,
} from './types.js'

const BOND_TYPE = 'image'
expectBond(BOND_TYPE)

/**
 * Registers an image provider as the active singleton. Called by bond
 * packages during application startup.
 *
 * @param provider - The image provider implementation to bond.
 */
export const setProvider = (provider: ImageProvider): void => {
  bond(BOND_TYPE, provider)
}

/**
 * Retrieves the bonded image provider, throwing if none is configured.
 *
 * @returns The bonded image provider.
 * @throws {Error} If no image provider has been bonded.
 */
export const getProvider = (): ImageProvider => {
  try {
    return bondRequire<ImageProvider>(BOND_TYPE)
  } catch {
    throw new Error(
      t('image.error.noProvider', undefined, {
        defaultValue: 'Image provider not configured. Call setProvider() first.',
      }),
    )
  }
}

/**
 * Checks whether an image provider is currently bonded.
 *
 * @returns `true` if an image provider is bonded.
 */
export const hasProvider = (): boolean => {
  return isBonded(BOND_TYPE)
}

/**
 * Resizes an image to the specified dimensions.
 *
 * @param input - Image data as a Buffer.
 * @param options - Resize dimensions and fit mode.
 * @returns The resized image as a Buffer.
 * @throws {Error} If no image provider has been bonded.
 */
export const resize = async (input: Buffer, options: ResizeOptions): Promise<Buffer> => {
  return getProvider().resize(input, options)
}

/**
 * Crops an image to a rectangular region.
 *
 * @param input - Image data as a Buffer.
 * @param options - Crop region coordinates and dimensions.
 * @returns The cropped image as a Buffer.
 * @throws {Error} If no image provider has been bonded.
 */
export const crop = async (input: Buffer, options: CropOptions): Promise<Buffer> => {
  return getProvider().crop(input, options)
}

/**
 * Converts an image to a different format.
 *
 * @param input - Image data as a Buffer.
 * @param format - Target image format.
 * @param quality - Optional quality percentage (1–100).
 * @returns The converted image as a Buffer.
 * @throws {Error} If no image provider has been bonded.
 */
export const convert = async (
  input: Buffer,
  format: ImageFormat,
  quality?: number,
): Promise<Buffer> => {
  return getProvider().convert(input, format, quality)
}

/**
 * Generates a square thumbnail from an image.
 *
 * @param input - Image data as a Buffer.
 * @param size - Thumbnail side length in pixels.
 * @returns The thumbnail image as a Buffer.
 * @throws {Error} If no image provider has been bonded.
 */
export const thumbnail = async (input: Buffer, size: number): Promise<Buffer> => {
  return getProvider().thumbnail(input, size)
}

/**
 * Optimizes an image for file size with optional format conversion.
 *
 * @param input - Image data as a Buffer.
 * @param options - Optimization options (format, quality, strip metadata).
 * @returns The optimized image as a Buffer.
 * @throws {Error} If no image provider has been bonded.
 */
export const optimize = async (input: Buffer, options?: OptimizeOptions): Promise<Buffer> => {
  return getProvider().optimize(input, options)
}

/**
 * Extracts metadata from an image buffer.
 *
 * @param input - Image data as a Buffer.
 * @returns Metadata about the image (dimensions, format, size, etc.).
 * @throws {Error} If no image provider has been bonded.
 */
export const getMetadata = async (input: Buffer): Promise<ImageMetadata> => {
  return getProvider().getMetadata(input)
}

/**
 * Rotates an image by the specified angle.
 *
 * @param input - Image data as a Buffer.
 * @param options - Rotation angle and background fill options.
 * @returns The rotated image as a Buffer.
 * @throws {Error} If no image provider has been bonded or the provider does not support rotation.
 */
export const rotate = async (input: Buffer, options: RotateOptions): Promise<Buffer> => {
  const provider = getProvider()
  if (!provider.rotate) {
    throw new Error(
      t('image.error.rotateNotSupported', undefined, {
        defaultValue: 'The bonded image provider does not support rotation.',
      }),
    )
  }
  return provider.rotate(input, options)
}

/**
 * Flips an image vertically (top to bottom).
 *
 * @param input - Image data as a Buffer.
 * @returns The flipped image as a Buffer.
 * @throws {Error} If no image provider has been bonded or the provider does not support flip.
 */
export const flip = async (input: Buffer): Promise<Buffer> => {
  const provider = getProvider()
  if (!provider.flip) {
    throw new Error(
      t('image.error.flipNotSupported', undefined, {
        defaultValue: 'The bonded image provider does not support flip.',
      }),
    )
  }
  return provider.flip(input)
}

/**
 * Flops an image horizontally (left to right).
 *
 * @param input - Image data as a Buffer.
 * @returns The flopped image as a Buffer.
 * @throws {Error} If no image provider has been bonded or the provider does not support flop.
 */
export const flop = async (input: Buffer): Promise<Buffer> => {
  const provider = getProvider()
  if (!provider.flop) {
    throw new Error(
      t('image.error.flopNotSupported', undefined, {
        defaultValue: 'The bonded image provider does not support flop.',
      }),
    )
  }
  return provider.flop(input)
}
