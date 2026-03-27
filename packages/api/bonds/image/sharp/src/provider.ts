/**
 * Sharp implementation of ImageProvider.
 *
 * Uses the `sharp` library for high-performance, native image processing
 * including resize, crop, format conversion, thumbnailing, optimization,
 * rotation, flip, and flop.
 *
 * @module
 */

import sharp from 'sharp'

import type {
  CropOptions,
  ImageFormat,
  ImageMetadata,
  ImageProvider,
  OptimizeOptions,
  ResizeOptions,
  RotateOptions,
} from '@molecule/api-image'

import type { SharpConfig } from './types.js'

/**
 * Maps an `ImageFormat` to the corresponding Sharp output format.
 *
 * @param format - The target image format.
 * @returns The Sharp-compatible format string.
 */
const toSharpFormat = (format: ImageFormat): 'jpeg' | 'png' | 'webp' | 'avif' | 'gif' | 'tiff' => {
  return format
}

/**
 * Creates a Sharp-backed image provider.
 *
 * @param config - Optional provider configuration (default quality, strip metadata, etc.).
 * @returns An `ImageProvider` backed by Sharp.
 */
export const createProvider = (config?: SharpConfig): ImageProvider => {
  const defaultJpegQuality = config?.defaultJpegQuality ?? 80
  const defaultWebpQuality = config?.defaultWebpQuality ?? 80
  const defaultAvifQuality = config?.defaultAvifQuality ?? 50
  const stripMetadata = config?.stripMetadata ?? true
  const progressive = config?.progressive ?? false

  const createPipeline = (input: Buffer): sharp.Sharp => {
    const pipeline = sharp(input, {
      limitInputPixels: config?.limitInputPixels,
    })
    return pipeline
  }

  const applyFormat = (
    pipeline: sharp.Sharp,
    format: ImageFormat,
    quality?: number,
  ): sharp.Sharp => {
    const fmt = toSharpFormat(format)
    switch (fmt) {
      case 'jpeg':
        return pipeline.jpeg({
          quality: quality ?? defaultJpegQuality,
          progressive,
        })
      case 'png':
        return pipeline.png({
          compressionLevel: config?.defaultPngCompression ?? 6,
          progressive,
        })
      case 'webp':
        return pipeline.webp({ quality: quality ?? defaultWebpQuality })
      case 'avif':
        return pipeline.avif({ quality: quality ?? defaultAvifQuality })
      case 'gif':
        return pipeline.gif()
      case 'tiff':
        return pipeline.tiff({ quality: quality ?? defaultJpegQuality })
    }
  }

  return {
    async resize(input: Buffer, options: ResizeOptions): Promise<Buffer> {
      let pipeline = createPipeline(input).resize({
        width: options.width,
        height: options.height,
        fit: options.fit ?? 'cover',
        background: options.background,
        withoutEnlargement: options.withoutEnlargement ?? false,
      })
      if (stripMetadata) {
        pipeline = pipeline.withMetadata()
      }
      return pipeline.toBuffer()
    },

    async crop(input: Buffer, options: CropOptions): Promise<Buffer> {
      return createPipeline(input)
        .extract({
          left: options.left,
          top: options.top,
          width: options.width,
          height: options.height,
        })
        .toBuffer()
    },

    async convert(input: Buffer, format: ImageFormat, quality?: number): Promise<Buffer> {
      const pipeline = createPipeline(input)
      return applyFormat(pipeline, format, quality).toBuffer()
    },

    async thumbnail(input: Buffer, size: number): Promise<Buffer> {
      return createPipeline(input).resize(size, size, { fit: 'cover' }).toBuffer()
    },

    async optimize(input: Buffer, options?: OptimizeOptions): Promise<Buffer> {
      let pipeline = createPipeline(input)

      if (options?.stripMetadata !== false && stripMetadata) {
        // Default: strip metadata for smaller files
      }

      if (options?.format) {
        pipeline = applyFormat(pipeline, options.format, options.quality)
      } else {
        // Preserve original format, apply quality settings
        const meta = await sharp(input).metadata()
        const fmt = (meta.format ?? 'jpeg') as ImageFormat
        pipeline = applyFormat(pipeline, fmt, options?.quality)
      }

      return pipeline.toBuffer()
    },

    async getMetadata(input: Buffer): Promise<ImageMetadata> {
      const meta = await sharp(input).metadata()
      const stats = input.length

      return {
        width: meta.width ?? 0,
        height: meta.height ?? 0,
        format: meta.format ?? 'unknown',
        size: stats,
        hasAlpha: meta.hasAlpha ?? false,
        channels: meta.channels,
        density: meta.density,
        orientation: meta.orientation,
      }
    },

    async rotate(input: Buffer, options: RotateOptions): Promise<Buffer> {
      return createPipeline(input)
        .rotate(options.angle, { background: options.background })
        .toBuffer()
    },

    async flip(input: Buffer): Promise<Buffer> {
      return createPipeline(input).flip().toBuffer()
    },

    async flop(input: Buffer): Promise<Buffer> {
      return createPipeline(input).flop().toBuffer()
    },
  }
}

/**
 * Default Sharp provider instance, lazily initialized on first access.
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
