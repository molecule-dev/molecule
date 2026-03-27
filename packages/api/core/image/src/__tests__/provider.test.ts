import { beforeEach, describe, expect, it, vi } from 'vitest'

import type * as ProviderModule from '../provider.js'
import type { ImageProvider } from '../types.js'

let setProvider: typeof ProviderModule.setProvider
let getProvider: typeof ProviderModule.getProvider
let hasProvider: typeof ProviderModule.hasProvider
let resize: typeof ProviderModule.resize
let crop: typeof ProviderModule.crop
let convert: typeof ProviderModule.convert
let thumbnail: typeof ProviderModule.thumbnail
let optimize: typeof ProviderModule.optimize
let getMetadata: typeof ProviderModule.getMetadata
let rotate: typeof ProviderModule.rotate
let flip: typeof ProviderModule.flip
let flop: typeof ProviderModule.flop

const createMockProvider = (overrides?: Partial<ImageProvider>): ImageProvider => ({
  resize: vi.fn().mockResolvedValue(Buffer.from('resized')),
  crop: vi.fn().mockResolvedValue(Buffer.from('cropped')),
  convert: vi.fn().mockResolvedValue(Buffer.from('converted')),
  thumbnail: vi.fn().mockResolvedValue(Buffer.from('thumbnail')),
  optimize: vi.fn().mockResolvedValue(Buffer.from('optimized')),
  getMetadata: vi.fn().mockResolvedValue({
    width: 800,
    height: 600,
    format: 'jpeg',
    size: 50000,
    hasAlpha: false,
  }),
  ...overrides,
})

describe('image provider', () => {
  beforeEach(async () => {
    vi.resetModules()
    const providerModule = await import('../provider.js')
    setProvider = providerModule.setProvider
    getProvider = providerModule.getProvider
    hasProvider = providerModule.hasProvider
    resize = providerModule.resize
    crop = providerModule.crop
    convert = providerModule.convert
    thumbnail = providerModule.thumbnail
    optimize = providerModule.optimize
    getMetadata = providerModule.getMetadata
    rotate = providerModule.rotate
    flip = providerModule.flip
    flop = providerModule.flop
  })

  describe('provider management', () => {
    it('should throw when no provider is set', () => {
      expect(() => getProvider()).toThrow(
        'Image provider not configured. Call setProvider() first.',
      )
    })

    it('should return false when no provider is configured', () => {
      expect(hasProvider()).toBe(false)
    })

    it('should set and get provider', () => {
      const mockProvider = createMockProvider()
      setProvider(mockProvider)
      expect(getProvider()).toBe(mockProvider)
    })

    it('should return true when provider is configured', () => {
      const mockProvider = createMockProvider()
      setProvider(mockProvider)
      expect(hasProvider()).toBe(true)
    })
  })

  describe('convenience functions', () => {
    let mockProvider: ImageProvider

    beforeEach(() => {
      mockProvider = createMockProvider()
      setProvider(mockProvider)
    })

    it('should delegate resize to provider', async () => {
      const input = Buffer.from('test')
      const options = { width: 200, height: 100, fit: 'cover' as const }
      const result = await resize(input, options)
      expect(mockProvider.resize).toHaveBeenCalledWith(input, options)
      expect(result).toEqual(Buffer.from('resized'))
    })

    it('should delegate crop to provider', async () => {
      const input = Buffer.from('test')
      const options = { left: 10, top: 20, width: 100, height: 80 }
      const result = await crop(input, options)
      expect(mockProvider.crop).toHaveBeenCalledWith(input, options)
      expect(result).toEqual(Buffer.from('cropped'))
    })

    it('should delegate convert to provider', async () => {
      const input = Buffer.from('test')
      const result = await convert(input, 'webp', 80)
      expect(mockProvider.convert).toHaveBeenCalledWith(input, 'webp', 80)
      expect(result).toEqual(Buffer.from('converted'))
    })

    it('should delegate thumbnail to provider', async () => {
      const input = Buffer.from('test')
      const result = await thumbnail(input, 150)
      expect(mockProvider.thumbnail).toHaveBeenCalledWith(input, 150)
      expect(result).toEqual(Buffer.from('thumbnail'))
    })

    it('should delegate optimize to provider', async () => {
      const input = Buffer.from('test')
      const options = { quality: 75, stripMetadata: true }
      const result = await optimize(input, options)
      expect(mockProvider.optimize).toHaveBeenCalledWith(input, options)
      expect(result).toEqual(Buffer.from('optimized'))
    })

    it('should delegate getMetadata to provider', async () => {
      const input = Buffer.from('test')
      const result = await getMetadata(input)
      expect(mockProvider.getMetadata).toHaveBeenCalledWith(input)
      expect(result).toEqual({
        width: 800,
        height: 600,
        format: 'jpeg',
        size: 50000,
        hasAlpha: false,
      })
    })
  })

  describe('optional methods', () => {
    it('should delegate rotate when supported', async () => {
      const mockRotate = vi.fn().mockResolvedValue(Buffer.from('rotated'))
      const mockProvider = createMockProvider({ rotate: mockRotate })
      setProvider(mockProvider)

      const input = Buffer.from('test')
      const result = await rotate(input, { angle: 90 })
      expect(mockRotate).toHaveBeenCalledWith(input, { angle: 90 })
      expect(result).toEqual(Buffer.from('rotated'))
    })

    it('should throw when rotate is not supported', async () => {
      const mockProvider = createMockProvider()
      setProvider(mockProvider)

      await expect(rotate(Buffer.from('test'), { angle: 90 })).rejects.toThrow(
        'The bonded image provider does not support rotation.',
      )
    })

    it('should delegate flip when supported', async () => {
      const mockFlip = vi.fn().mockResolvedValue(Buffer.from('flipped'))
      const mockProvider = createMockProvider({ flip: mockFlip })
      setProvider(mockProvider)

      const result = await flip(Buffer.from('test'))
      expect(mockFlip).toHaveBeenCalled()
      expect(result).toEqual(Buffer.from('flipped'))
    })

    it('should throw when flip is not supported', async () => {
      const mockProvider = createMockProvider()
      setProvider(mockProvider)

      await expect(flip(Buffer.from('test'))).rejects.toThrow(
        'The bonded image provider does not support flip.',
      )
    })

    it('should delegate flop when supported', async () => {
      const mockFlop = vi.fn().mockResolvedValue(Buffer.from('flopped'))
      const mockProvider = createMockProvider({ flop: mockFlop })
      setProvider(mockProvider)

      const result = await flop(Buffer.from('test'))
      expect(mockFlop).toHaveBeenCalled()
      expect(result).toEqual(Buffer.from('flopped'))
    })

    it('should throw when flop is not supported', async () => {
      const mockProvider = createMockProvider()
      setProvider(mockProvider)

      await expect(flop(Buffer.from('test'))).rejects.toThrow(
        'The bonded image provider does not support flop.',
      )
    })
  })
})
