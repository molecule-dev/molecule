/**
 * Jimp implementation of ImageProvider.
 *
 * Uses the `jimp` library for pure-JavaScript image processing with no native
 * dependencies. Supports resize, crop, format conversion, thumbnailing,
 * optimization, rotation, flip, and flop.
 *
 * Note: Jimp natively supports JPEG, PNG, BMP, TIFF, and GIF.
 * WebP and AVIF are not supported and will throw an error.
 *
 * @module
 */

import { Jimp, JimpMime } from 'jimp'

import type {
  CropOptions,
  ImageFormat,
  ImageMetadata,
  ImageProvider,
  OptimizeOptions,
  ResizeOptions,
  RotateOptions,
} from '@molecule/api-image'

import type { JimpConfig } from './types.js'

/** Supported MIME types for Jimp getBuffer. */
type JimpSupportedMime = 'image/jpeg' | 'image/png' | 'image/gif' | 'image/tiff' | 'image/bmp'

/**
 * Maps an `ImageFormat` to the corresponding Jimp MIME type.
 *
 * @param format - The target image format.
 * @returns The MIME type string for Jimp.
 * @throws {Error} If the format is not supported by Jimp.
 */
const toJimpMime = (format: ImageFormat): JimpSupportedMime => {
  const mimeMap: Partial<Record<ImageFormat, JimpSupportedMime>> = {
    jpeg: JimpMime.jpeg as JimpSupportedMime,
    png: JimpMime.png as JimpSupportedMime,
    gif: JimpMime.gif as JimpSupportedMime,
    tiff: JimpMime.tiff as JimpSupportedMime,
  }
  const mime = mimeMap[format]
  if (!mime) {
    throw new Error(
      `Jimp does not support the "${format}" format. Supported formats: jpeg, png, gif, tiff.`,
    )
  }
  return mime
}

/**
 * Returns the MIME of the loaded image, defaulting to PNG.
 *
 * @param mime - The MIME string from the Jimp image.
 * @returns A supported MIME string.
 */
const resolveMime = (mime: string | undefined): JimpSupportedMime => {
  return (mime ?? JimpMime.png) as JimpSupportedMime
}

/**
 * Detects the image format from a MIME type string.
 *
 * @param mime - The MIME type to convert.
 * @returns The format name.
 */
const fromMime = (mime: string): string => {
  const formatMap: Record<string, string> = {
    'image/jpeg': 'jpeg',
    'image/png': 'png',
    'image/gif': 'gif',
    'image/tiff': 'tiff',
    'image/bmp': 'bmp',
    'image/x-ms-bmp': 'bmp',
  }
  return formatMap[mime] ?? 'unknown'
}

/**
 * Extracts buffer from a Jimp image using its original MIME type.
 *
 * @param image - The Jimp image instance.
 * @returns The image buffer.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const toBuffer = async (image: any): Promise<Buffer> => {
  const mime = resolveMime(image.mime)
  return image.getBuffer(mime) as Promise<Buffer>
}

/**
 * Creates a Jimp-backed image provider.
 *
 * @param config - Optional provider configuration (default quality settings).
 * @returns An `ImageProvider` backed by Jimp.
 */
export const createProvider = (config?: JimpConfig): ImageProvider => {
  const defaultJpegQuality = config?.defaultJpegQuality ?? 80

  return {
    async resize(input: Buffer, options: ResizeOptions): Promise<Buffer> {
      const image = await Jimp.fromBuffer(input)

      image.resize({
        w: options.width ?? image.width,
        h: options.height ?? image.height,
      })

      return toBuffer(image)
    },

    async crop(input: Buffer, options: CropOptions): Promise<Buffer> {
      const image = await Jimp.fromBuffer(input)

      image.crop({
        x: options.left,
        y: options.top,
        w: options.width,
        h: options.height,
      })

      return toBuffer(image)
    },

    async convert(input: Buffer, format: ImageFormat, quality?: number): Promise<Buffer> {
      const image = await Jimp.fromBuffer(input)
      const mime = toJimpMime(format)

      if (format === 'jpeg' && quality !== undefined) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        return (image as any).getBuffer(mime, { quality }) as Promise<Buffer>
      }

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      return (image as any).getBuffer(mime) as Promise<Buffer>
    },

    async thumbnail(input: Buffer, size: number): Promise<Buffer> {
      const image = await Jimp.fromBuffer(input)

      // Cover: resize to fill the square, then crop center
      const ratio = Math.max(size / image.width, size / image.height)
      const newW = Math.round(image.width * ratio)
      const newH = Math.round(image.height * ratio)

      image.resize({ w: newW, h: newH })

      const x = Math.round((newW - size) / 2)
      const y = Math.round((newH - size) / 2)
      image.crop({ x, y, w: size, h: size })

      return toBuffer(image)
    },

    async optimize(input: Buffer, options?: OptimizeOptions): Promise<Buffer> {
      const image = await Jimp.fromBuffer(input)
      const mime = options?.format ? toJimpMime(options.format) : resolveMime(image.mime)
      const quality = options?.quality ?? defaultJpegQuality

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      return (image as any).getBuffer(mime, { quality }) as Promise<Buffer>
    },

    async getMetadata(input: Buffer): Promise<ImageMetadata> {
      const image = await Jimp.fromBuffer(input)

      return {
        width: image.width,
        height: image.height,
        format: fromMime(image.mime ?? 'unknown'),
        size: input.length,
        hasAlpha: image.hasAlpha(),
      }
    },

    async rotate(input: Buffer, options: RotateOptions): Promise<Buffer> {
      const image = await Jimp.fromBuffer(input)
      image.rotate(options.angle)
      return toBuffer(image)
    },

    async flip(input: Buffer): Promise<Buffer> {
      const image = await Jimp.fromBuffer(input)
      image.flip({ horizontal: false, vertical: true })
      return toBuffer(image)
    },

    async flop(input: Buffer): Promise<Buffer> {
      const image = await Jimp.fromBuffer(input)
      image.flip({ horizontal: true, vertical: false })
      return toBuffer(image)
    },
  }
}

/**
 * Default Jimp provider instance, lazily initialized on first access.
 */
let _provider: ImageProvider | null = null

/**
 * The provider implementation, lazily initialized with default config.
 */
export const provider: ImageProvider = new Proxy({} as ImageProvider, {
  get(_, prop, receiver) {
    if (!_provider) _provider = createProvider()
    return Reflect.get(_provider, prop, receiver)
  },
})
