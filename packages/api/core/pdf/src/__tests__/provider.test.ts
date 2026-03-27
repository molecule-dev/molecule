import { beforeEach, describe, expect, it, vi } from 'vitest'

import type * as ProviderModule from '../provider.js'
import type { PDFProvider } from '../types.js'

let setProvider: typeof ProviderModule.setProvider
let getProvider: typeof ProviderModule.getProvider
let hasProvider: typeof ProviderModule.hasProvider
let fromHTML: typeof ProviderModule.fromHTML
let fromTemplate: typeof ProviderModule.fromTemplate
let merge: typeof ProviderModule.merge
let addWatermark: typeof ProviderModule.addWatermark
let getPageCount: typeof ProviderModule.getPageCount
let getMetadata: typeof ProviderModule.getMetadata
let toImages: typeof ProviderModule.toImages

const createMockProvider = (overrides?: Partial<PDFProvider>): PDFProvider => ({
  fromHTML: vi.fn().mockResolvedValue(Buffer.from('pdf-html')),
  fromTemplate: vi.fn().mockResolvedValue(Buffer.from('pdf-template')),
  merge: vi.fn().mockResolvedValue(Buffer.from('pdf-merged')),
  addWatermark: vi.fn().mockResolvedValue(Buffer.from('pdf-watermarked')),
  getPageCount: vi.fn().mockResolvedValue(5),
  ...overrides,
})

describe('pdf provider', () => {
  beforeEach(async () => {
    vi.resetModules()
    const providerModule = await import('../provider.js')
    setProvider = providerModule.setProvider
    getProvider = providerModule.getProvider
    hasProvider = providerModule.hasProvider
    fromHTML = providerModule.fromHTML
    fromTemplate = providerModule.fromTemplate
    merge = providerModule.merge
    addWatermark = providerModule.addWatermark
    getPageCount = providerModule.getPageCount
    getMetadata = providerModule.getMetadata
    toImages = providerModule.toImages
  })

  describe('provider management', () => {
    it('should throw when no provider is set', () => {
      expect(() => getProvider()).toThrow('PDF provider not configured. Call setProvider() first.')
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
    let mockProvider: PDFProvider

    beforeEach(() => {
      mockProvider = createMockProvider()
      setProvider(mockProvider)
    })

    it('should delegate fromHTML to provider', async () => {
      const options = { format: 'A4' as const, landscape: false }
      const result = await fromHTML('<h1>Hello</h1>', options)
      expect(mockProvider.fromHTML).toHaveBeenCalledWith('<h1>Hello</h1>', options)
      expect(result).toEqual(Buffer.from('pdf-html'))
    })

    it('should delegate fromTemplate to provider', async () => {
      const data = { name: 'World' }
      const options = { format: 'Letter' as const }
      const result = await fromTemplate('<h1>{{name}}</h1>', data, options)
      expect(mockProvider.fromTemplate).toHaveBeenCalledWith('<h1>{{name}}</h1>', data, options)
      expect(result).toEqual(Buffer.from('pdf-template'))
    })

    it('should delegate merge to provider', async () => {
      const pdfs = [Buffer.from('pdf1'), Buffer.from('pdf2')]
      const result = await merge(pdfs)
      expect(mockProvider.merge).toHaveBeenCalledWith(pdfs)
      expect(result).toEqual(Buffer.from('pdf-merged'))
    })

    it('should delegate addWatermark to provider', async () => {
      const pdf = Buffer.from('source-pdf')
      const options = { fontSize: 36, rotation: -30 }
      const result = await addWatermark(pdf, 'DRAFT', options)
      expect(mockProvider.addWatermark).toHaveBeenCalledWith(pdf, 'DRAFT', options)
      expect(result).toEqual(Buffer.from('pdf-watermarked'))
    })

    it('should delegate getPageCount to provider', async () => {
      const pdf = Buffer.from('source-pdf')
      const result = await getPageCount(pdf)
      expect(mockProvider.getPageCount).toHaveBeenCalledWith(pdf)
      expect(result).toBe(5)
    })
  })

  describe('optional methods', () => {
    it('should delegate getMetadata when supported', async () => {
      const mockGetMetadata = vi.fn().mockResolvedValue({
        pageCount: 10,
        title: 'Test Document',
        author: 'Author',
      })
      const mockProvider = createMockProvider({ getMetadata: mockGetMetadata })
      setProvider(mockProvider)

      const pdf = Buffer.from('test-pdf')
      const result = await getMetadata(pdf)
      expect(mockGetMetadata).toHaveBeenCalledWith(pdf)
      expect(result).toEqual({
        pageCount: 10,
        title: 'Test Document',
        author: 'Author',
      })
    })

    it('should throw when getMetadata is not supported', async () => {
      const mockProvider = createMockProvider()
      setProvider(mockProvider)

      await expect(getMetadata(Buffer.from('test-pdf'))).rejects.toThrow(
        'The bonded PDF provider does not support metadata extraction.',
      )
    })

    it('should delegate toImages when supported', async () => {
      const mockToImages = vi.fn().mockResolvedValue([Buffer.from('page1'), Buffer.from('page2')])
      const mockProvider = createMockProvider({ toImages: mockToImages })
      setProvider(mockProvider)

      const pdf = Buffer.from('test-pdf')
      const options = { format: 'png' as const, dpi: 300 }
      const result = await toImages(pdf, options)
      expect(mockToImages).toHaveBeenCalledWith(pdf, options)
      expect(result).toHaveLength(2)
    })

    it('should throw when toImages is not supported', async () => {
      const mockProvider = createMockProvider()
      setProvider(mockProvider)

      await expect(toImages(Buffer.from('test-pdf'))).rejects.toThrow(
        'The bonded PDF provider does not support rendering to images.',
      )
    })
  })
})
