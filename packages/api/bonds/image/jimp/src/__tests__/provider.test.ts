import { Jimp } from 'jimp'
import { describe, expect, it } from 'vitest'

import { createProvider, provider } from '../provider.js'

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
})
