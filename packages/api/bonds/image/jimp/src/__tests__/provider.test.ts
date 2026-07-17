import { Jimp } from 'jimp'
import { describe, expect, it } from 'vitest'

import { createProvider, getSupportedFormats, provider, SUPPORTED_FORMATS } from '../provider.js'

/**
 * Creates a 100x100 red PNG for testing.
 */
const createTestImage = async (): Promise<Buffer> => {
  const image = new Jimp({ width: 100, height: 100, color: 0xff0000ff })
  return image.getBuffer('image/png')
}

describe('jimp image provider', () => {
  describe('createProvider', () => {
    it('should create a provider with default config', () => {
      const p = createProvider()
      expect(p).toBeDefined()
      expect(p.resize).toBeInstanceOf(Function)
      expect(p.crop).toBeInstanceOf(Function)
      expect(p.convert).toBeInstanceOf(Function)
      expect(p.thumbnail).toBeInstanceOf(Function)
      expect(p.optimize).toBeInstanceOf(Function)
      expect(p.getMetadata).toBeInstanceOf(Function)
      expect(p.rotate).toBeInstanceOf(Function)
      expect(p.flip).toBeInstanceOf(Function)
      expect(p.flop).toBeInstanceOf(Function)
    })
  })

  describe('getMetadata', () => {
    it('should extract metadata from a PNG', async () => {
      const input = await createTestImage()
      const p = createProvider()
      const meta = await p.getMetadata(input)

      expect(meta.width).toBe(100)
      expect(meta.height).toBe(100)
      expect(meta.format).toBe('png')
      expect(meta.size).toBeGreaterThan(0)
      // Jimp hasAlpha checks pixel data, not channel count — a fully opaque image returns false
      expect(typeof meta.hasAlpha).toBe('boolean')
    })
  })

  describe('resize', () => {
    it('should resize an image to specified dimensions', async () => {
      const input = await createTestImage()
      const p = createProvider()
      const result = await p.resize(input, { width: 50, height: 50 })

      const meta = await p.getMetadata(result)
      expect(meta.width).toBe(50)
      expect(meta.height).toBe(50)
    })

    it('should resize width only', async () => {
      const input = await createTestImage()
      const p = createProvider()
      const result = await p.resize(input, { width: 50 })

      const meta = await p.getMetadata(result)
      expect(meta.width).toBe(50)
    })
  })

  describe('crop', () => {
    it('should crop an image to a region', async () => {
      const input = await createTestImage()
      const p = createProvider()
      const result = await p.crop(input, {
        left: 10,
        top: 10,
        width: 50,
        height: 50,
      })

      const meta = await p.getMetadata(result)
      expect(meta.width).toBe(50)
      expect(meta.height).toBe(50)
    })
  })

  describe('convert', () => {
    it('should convert PNG to JPEG', async () => {
      const input = await createTestImage()
      const p = createProvider()
      const result = await p.convert(input, 'jpeg', 80)

      const meta = await p.getMetadata(result)
      expect(meta.format).toBe('jpeg')
    })
  })

  describe('thumbnail', () => {
    it('should generate a square thumbnail', async () => {
      const input = await createTestImage()
      const p = createProvider()
      const result = await p.thumbnail(input, 32)

      const meta = await p.getMetadata(result)
      expect(meta.width).toBe(32)
      expect(meta.height).toBe(32)
    })
  })

  describe('optimize', () => {
    it('should optimize an image preserving format', async () => {
      const input = await createTestImage()
      const p = createProvider()
      const result = await p.optimize(input, { quality: 60 })

      expect(result).toBeInstanceOf(Buffer)
      expect(result.length).toBeGreaterThan(0)
    })
  })

  describe('rotate', () => {
    it('should rotate an image', async () => {
      const input = await createTestImage()
      const p = createProvider()
      const result = await p.rotate!(input, { angle: 90 })

      const meta = await p.getMetadata(result)
      expect(meta.width).toBeGreaterThan(0)
      expect(meta.height).toBeGreaterThan(0)
    })
  })

  describe('flip and flop', () => {
    it('should flip an image vertically', async () => {
      const input = await createTestImage()
      const p = createProvider()
      const result = await p.flip!(input)

      const meta = await p.getMetadata(result)
      expect(meta.width).toBe(100)
      expect(meta.height).toBe(100)
    })

    it('should flop an image horizontally', async () => {
      const input = await createTestImage()
      const p = createProvider()
      const result = await p.flop!(input)

      const meta = await p.getMetadata(result)
      expect(meta.width).toBe(100)
      expect(meta.height).toBe(100)
    })
  })

  describe('proxy provider', () => {
    it('should expose all ImageProvider methods via proxy', () => {
      expect(provider.resize).toBeInstanceOf(Function)
      expect(provider.crop).toBeInstanceOf(Function)
      expect(provider.convert).toBeInstanceOf(Function)
      expect(provider.thumbnail).toBeInstanceOf(Function)
      expect(provider.optimize).toBeInstanceOf(Function)
      expect(provider.getMetadata).toBeInstanceOf(Function)
    })
  })

  describe('advertised capabilities (feature-detection)', () => {
    it('advertises the formats jimp can actually produce', () => {
      expect([...getSupportedFormats()]).toEqual(['jpeg', 'png', 'gif', 'tiff'])
      expect([...SUPPORTED_FORMATS]).toEqual(['jpeg', 'png', 'gif', 'tiff'])
    })

    it('does NOT advertise webp or avif', () => {
      const formats = getSupportedFormats()
      expect(formats).not.toContain('webp')
      expect(formats).not.toContain('avif')
    })
  })

  describe('unsupported OUTPUT formats (webp/avif) fail loudly + actionably', () => {
    it('convert to webp rejects, names the format and the sharp sibling', async () => {
      const input = await createTestImage()
      const p = createProvider()
      await expect(p.convert(input, 'webp')).rejects.toThrow(
        /jimp does not support the "webp" output format.*@molecule\/api-image-sharp/,
      )
    })

    it('convert to avif rejects, names the format and the sharp sibling', async () => {
      const input = await createTestImage()
      const p = createProvider()
      await expect(p.convert(input, 'avif')).rejects.toThrow(
        /jimp does not support the "avif" output format.*@molecule\/api-image-sharp/,
      )
    })

    it('optimize with format:webp rejects with the actionable error', async () => {
      const input = await createTestImage()
      const p = createProvider()
      await expect(p.optimize(input, { format: 'webp' })).rejects.toThrow(
        /@molecule\/api-image-sharp for WebP\/AVIF/,
      )
    })

    it('validates the OUTPUT format BEFORE decoding (fails early on a bad buffer)', async () => {
      // A non-image buffer would throw a *decode* error if validation ran after
      // decode. Getting the format error instead proves fail-early ordering.
      const p = createProvider()
      await expect(p.convert(Buffer.from('not an image at all'), 'webp')).rejects.toThrow(
        /jimp does not support the "webp" output format/,
      )
    })
  })

  describe('unsupported INPUT formats (webp/avif) fail loudly + actionably', () => {
    // Minimal magic-byte buffers — enough for the sniffer, not decodable by anyone.
    const webpInput = Buffer.concat([
      Buffer.from('RIFF'),
      Buffer.from([0, 0, 0, 0]),
      Buffer.from('WEBP'),
    ])
    const avifInput = Buffer.concat([Buffer.from([0, 0, 0, 0x14]), Buffer.from('ftypavif')])

    it('rejects WebP input with the actionable error (not an opaque jimp decode error)', async () => {
      const p = createProvider()
      await expect(p.resize(webpInput, { width: 10 })).rejects.toThrow(
        /jimp does not support the "webp" input format.*@molecule\/api-image-sharp/,
      )
      await expect(p.getMetadata(webpInput)).rejects.toThrow(
        /@molecule\/api-image-sharp for WebP\/AVIF/,
      )
    })

    it('rejects AVIF input with the actionable error', async () => {
      const p = createProvider()
      await expect(p.getMetadata(avifInput)).rejects.toThrow(
        /jimp does not support the "avif" input format.*@molecule\/api-image-sharp/,
      )
    })
  })
})
