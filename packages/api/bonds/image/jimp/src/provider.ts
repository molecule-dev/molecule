/**
 * Jimp implementation of ImageProvider.
 *
 * Uses the `jimp` library for pure-JavaScript image processing with no native
 * dependencies. Supports resize, crop, format conversion, thumbnailing,
 * optimization, rotation, flip, and flop.
 *
 * Note: Jimp natively supports JPEG, PNG, BMP, TIFF, and GIF. Jimp 1.x ships NO
 * WebP or AVIF codec, so requesting either format — as OUTPUT (`convert`/`optimize`)
 * or as INPUT (any decode) — fails early with an actionable error pointing at the
 * `@molecule/api-image-sharp` sibling, never an opaque mid-pipeline throw. Read
 * `getSupportedFormats()` / `SUPPORTED_FORMATS` to feature-detect before requesting
 * a conversion.
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
 * The `ImageFormat`s this bond can actually decode AND encode. Deliberately
 * EXCLUDES `webp` and `avif`: Jimp 1.x ships no codec for either, so this bond
 * must not advertise formats it cannot produce — use `@molecule/api-image-sharp`
 * when those are required. Callers can read this to feature-detect before
 * requesting a conversion.
 */
export const SUPPORTED_FORMATS: readonly ImageFormat[] = ['jpeg', 'png', 'gif', 'tiff']

/**
 * Returns the image formats this bond can produce. Never advertises `webp`/`avif`.
 *
 * @returns The list of supported `ImageFormat`s for capability feature-detection.
 */
export const getSupportedFormats = (): readonly ImageFormat[] => SUPPORTED_FORMATS

/**
 * Builds the actionable error thrown when an unsupported format is requested,
 * naming the sibling bond that does support WebP/AVIF.
 *
 * @param format - The unsupported format name.
 * @param direction - Whether it was requested as `output` or `input`.
 * @returns An `Error` naming `@molecule/api-image-sharp` and Jimp's real formats.
 */
const unsupportedFormatError = (format: string, direction: 'output' | 'input'): Error =>
  new Error(
    `jimp does not support the "${format}" ${direction} format — ` +
      `use @molecule/api-image-sharp for WebP/AVIF. ` +
      `jimp supports: ${SUPPORTED_FORMATS.join(', ')}.`,
  )

/**
 * Maps an `ImageFormat` to the corresponding Jimp MIME type.
 *
 * @param format - The target image format.
 * @returns The MIME type string for Jimp.
 * @throws {Error} If the format is not supported by Jimp (e.g. webp/avif).
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
    throw unsupportedFormatError(format, 'output')
  }
  return mime
}

/**
 * Sniffs a buffer's magic bytes for formats Jimp cannot decode (WebP, AVIF),
 * so a bad input fails with an actionable error instead of Jimp's opaque
 * "Mime type image/webp does not support decoding".
 *
 * @param input - The image buffer to inspect.
 * @returns The detected unsupported format name, or `null` if Jimp can attempt it.
 */
const detectUnsupportedInput = (input: Buffer): 'webp' | 'avif' | null => {
  if (input.length < 12) {
    return null
  }
  // WebP: "RIFF" <4-byte size> "WEBP"
  if (input.toString('latin1', 0, 4) === 'RIFF' && input.toString('latin1', 8, 12) === 'WEBP') {
    return 'webp'
  }
  // AVIF: ISO-BMFF "ftyp" box at offset 4 with an AVIF brand.
  if (input.toString('latin1', 4, 8) === 'ftyp') {
    const brand = input.toString('latin1', 8, 12)
    if (brand === 'avif' || brand === 'avis') {
      return 'avif'
    }
  }
  return null
}

/**
 * Decodes a buffer into a Jimp image, first rejecting inputs Jimp has no codec
 * for (WebP/AVIF) with a loud, actionable error naming the sharp sibling.
 *
 * @param input - The image buffer to decode.
 * @returns The loaded Jimp image instance.
 * @throws {Error} If the input is a WebP/AVIF buffer Jimp cannot decode.
 */
const loadImage = async (input: Buffer): Promise<Awaited<ReturnType<typeof Jimp.fromBuffer>>> => {
  const unsupported = detectUnsupportedInput(input)
  if (unsupported) {
    throw unsupportedFormatError(unsupported, 'input')
  }
  return Jimp.fromBuffer(input)
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
      const image = await loadImage(input)

      image.resize({
        w: options.width ?? image.width,
        h: options.height ?? image.height,
      })

      return toBuffer(image)
    },

    async crop(input: Buffer, options: CropOptions): Promise<Buffer> {
      const image = await loadImage(input)

      image.crop({
        x: options.left,
        y: options.top,
        w: options.width,
        h: options.height,
      })

      return toBuffer(image)
    },

    async convert(input: Buffer, format: ImageFormat, quality?: number): Promise<Buffer> {
      // Validate the requested format BEFORE decoding, so unsupported requests
      // (webp/avif) fail loudly and early instead of mid-pipeline.
      const mime = toJimpMime(format)
      const image = await loadImage(input)

      if (format === 'jpeg' && quality !== undefined) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        return (image as any).getBuffer(mime, { quality }) as Promise<Buffer>
      }

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      return (image as any).getBuffer(mime) as Promise<Buffer>
    },

    async thumbnail(input: Buffer, size: number): Promise<Buffer> {
      const image = await loadImage(input)

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
      // Validate a requested output format BEFORE decoding (fail early on webp/avif).
      const requestedMime = options?.format ? toJimpMime(options.format) : undefined
      const image = await loadImage(input)
      const mime = requestedMime ?? resolveMime(image.mime)
      const quality = options?.quality ?? defaultJpegQuality

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      return (image as any).getBuffer(mime, { quality }) as Promise<Buffer>
    },

    async getMetadata(input: Buffer): Promise<ImageMetadata> {
      const image = await loadImage(input)

      return {
        width: image.width,
        height: image.height,
        format: fromMime(image.mime ?? 'unknown'),
        size: input.length,
        hasAlpha: image.hasAlpha(),
      }
    },

    async rotate(input: Buffer, options: RotateOptions): Promise<Buffer> {
      const image = await loadImage(input)
      image.rotate(options.angle)
      return toBuffer(image)
    },

    async flip(input: Buffer): Promise<Buffer> {
      const image = await loadImage(input)
      image.flip({ horizontal: false, vertical: true })
      return toBuffer(image)
    },

    async flop(input: Buffer): Promise<Buffer> {
      const image = await loadImage(input)
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
  // set trap: methods run with `this` bound to the proxy — without it, instance-state writes land on the dummy target and are lost (see api-push-notifications-web-push)
  set(_, prop, value) {
    if (!_provider) _provider = createProvider()
    return Reflect.set(_provider, prop, value)
  },
})
