import { describe, expect, it } from 'vitest'

import { createProvider, provider } from '../provider.js'

/**
 * Creates a minimal valid 1x1 red PNG for testing.
 */
const createTestPng = (): Buffer => {
  // Minimal 1x1 red pixel PNG
  return Buffer.from(
    'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8/5+hHgAHggJ/PchI7wAAAABJRU5ErkJggg==',
    'base64',
  )
}

/**
 * Creates a small 2x2 RGBA PNG for crop/resize tests.
 */
const createTestRgba = async (): Promise<Buffer> => {
  const sharp = (await import('sharp')).default
  return sharp({
    create: {
      width: 100,
      height: 100,
      channels: 4,
      background: { r: 255, g: 0, b: 0, alpha: 1 },
    },
  })
    .png()
    .toBuffer()
}

describe('sharp image provider', () => {
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

    it('should create a provider with custom config', () => {
      const p = createProvider({
        defaultJpegQuality: 90,
        defaultWebpQuality: 85,
        progressive: true,
      })
      expect(p).toBeDefined()
    })
  })

  describe('getMetadata', () => {
    it('should extract metadata from a PNG', async () => {
      const input = createTestPng()
      const p = createProvider()
      const meta = await p.getMetadata(input)

      expect(meta.width).toBe(1)
      expect(meta.height).toBe(1)
      expect(meta.format).toBe('png')
      expect(meta.size).toBeGreaterThan(0)
      expect(meta.hasAlpha).toBe(true)
    })

    it('should extract metadata from a generated image', async () => {
      const input = await createTestRgba()
      const p = createProvider()
      const meta = await p.getMetadata(input)

      expect(meta.width).toBe(100)
      expect(meta.height).toBe(100)
      expect(meta.format).toBe('png')
      expect(meta.channels).toBe(4)
    })
  })

  describe('resize', () => {
    it('should resize an image to specified dimensions', async () => {
      const input = await createTestRgba()
      const p = createProvider()
      const result = await p.resize(input, { width: 50, height: 50 })

      const meta = await p.getMetadata(result)
      expect(meta.width).toBe(50)
      expect(meta.height).toBe(50)
    })

    it('should resize width only, maintaining aspect ratio', async () => {
      const input = await createTestRgba()
      const p = createProvider()
      const result = await p.resize(input, { width: 50 })

      const meta = await p.getMetadata(result)
      expect(meta.width).toBe(50)
    })

    it('should support contain fit mode', async () => {
      const input = await createTestRgba()
      const p = createProvider()
      const result = await p.resize(input, {
        width: 50,
        height: 25,
        fit: 'contain',
      })

      const meta = await p.getMetadata(result)
      expect(meta.width).toBeLessThanOrEqual(50)
      expect(meta.height).toBeLessThanOrEqual(25)
    })
  })

  describe('crop', () => {
    it('should crop an image to a region', async () => {
      const input = await createTestRgba()
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
      const input = await createTestRgba()
      const p = createProvider()
      const result = await p.convert(input, 'jpeg', 80)

      const meta = await p.getMetadata(result)
      expect(meta.format).toBe('jpeg')
    })

    it('should convert PNG to WebP', async () => {
      const input = await createTestRgba()
      const p = createProvider()
      const result = await p.convert(input, 'webp')

      const meta = await p.getMetadata(result)
      expect(meta.format).toBe('webp')
    })
  })

  describe('thumbnail', () => {
    it('should generate a square thumbnail', async () => {
      const input = await createTestRgba()
      const p = createProvider()
      const result = await p.thumbnail(input, 32)

      const meta = await p.getMetadata(result)
      expect(meta.width).toBe(32)
      expect(meta.height).toBe(32)
    })
  })

  describe('optimize', () => {
    it('should optimize an image preserving format', async () => {
      const input = await createTestRgba()
      const p = createProvider()
      const result = await p.optimize(input, { quality: 60 })

      expect(result).toBeInstanceOf(Buffer)
      expect(result.length).toBeGreaterThan(0)
    })

    it('should optimize with format conversion', async () => {
      const input = await createTestRgba()
      const p = createProvider()
      const result = await p.optimize(input, { format: 'webp', quality: 50 })

      const meta = await p.getMetadata(result)
      expect(meta.format).toBe('webp')
    })
  })

  describe('rotate', () => {
    it('should rotate an image by 90 degrees', async () => {
      const input = await createTestRgba()
      const p = createProvider()
      const result = await p.rotate!(input, { angle: 90 })

      const meta = await p.getMetadata(result)
      expect(meta.width).toBe(100)
      expect(meta.height).toBe(100)
    })
  })

  describe('flip and flop', () => {
    it('should flip an image vertically', async () => {
      const input = await createTestRgba()
      const p = createProvider()
      const result = await p.flip!(input)

      const meta = await p.getMetadata(result)
      expect(meta.width).toBe(100)
      expect(meta.height).toBe(100)
    })

    it('should flop an image horizontally', async () => {
      const input = await createTestRgba()
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
      expect(provider.rotate).toBeInstanceOf(Function)
      expect(provider.flip).toBeInstanceOf(Function)
      expect(provider.flop).toBeInstanceOf(Function)
    })
  })
})
