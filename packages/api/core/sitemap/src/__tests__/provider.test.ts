import { beforeEach, describe, expect, it, vi } from 'vitest'

import type * as ProviderModule from '../provider.js'
import type { SitemapProvider } from '../types.js'

let setProvider: typeof ProviderModule.setProvider
let getProvider: typeof ProviderModule.getProvider
let hasProvider: typeof ProviderModule.hasProvider
let addUrl: typeof ProviderModule.addUrl
let generate: typeof ProviderModule.generate
let generateIndex: typeof ProviderModule.generateIndex
let rss: typeof ProviderModule.rss
let atom: typeof ProviderModule.atom

const createMockProvider = (overrides?: Partial<SitemapProvider>): SitemapProvider => ({
  addUrl: vi.fn(),
  generate: vi.fn().mockResolvedValue('<urlset></urlset>'),
  generateIndex: vi.fn().mockResolvedValue('<sitemapindex></sitemapindex>'),
  rss: vi.fn().mockResolvedValue('<rss></rss>'),
  atom: vi.fn().mockResolvedValue('<feed></feed>'),
  ...overrides,
})

describe('sitemap provider', () => {
  beforeEach(async () => {
    vi.resetModules()
    const providerModule = await import('../provider.js')
    setProvider = providerModule.setProvider
    getProvider = providerModule.getProvider
    hasProvider = providerModule.hasProvider
    addUrl = providerModule.addUrl
    generate = providerModule.generate
    generateIndex = providerModule.generateIndex
    rss = providerModule.rss
    atom = providerModule.atom
  })

  describe('provider management', () => {
    it('should throw when no provider is set', () => {
      expect(() => getProvider()).toThrow(
        'Sitemap provider not configured. Call setProvider() first.',
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
    let mockProvider: SitemapProvider

    beforeEach(() => {
      mockProvider = createMockProvider()
      setProvider(mockProvider)
    })

    it('should delegate addUrl to provider', () => {
      const url = { loc: 'https://example.com/', priority: 1.0 }
      addUrl(url)
      expect(mockProvider.addUrl).toHaveBeenCalledWith(url)
    })

    it('should delegate generate to provider', async () => {
      const result = await generate()
      expect(mockProvider.generate).toHaveBeenCalled()
      expect(result).toBe('<urlset></urlset>')
    })

    it('should delegate generateIndex to provider', async () => {
      const sitemaps = ['https://example.com/sitemap1.xml', 'https://example.com/sitemap2.xml']
      const result = await generateIndex(sitemaps)
      expect(mockProvider.generateIndex).toHaveBeenCalledWith(sitemaps)
      expect(result).toBe('<sitemapindex></sitemapindex>')
    })

    it('should delegate rss to provider', async () => {
      const feed = {
        title: 'Test',
        description: 'Test feed',
        link: 'https://example.com',
        items: [],
      }
      const result = await rss(feed)
      expect(mockProvider.rss).toHaveBeenCalledWith(feed)
      expect(result).toBe('<rss></rss>')
    })

    it('should delegate atom to provider', async () => {
      const feed = {
        title: 'Test',
        link: 'https://example.com',
        id: 'https://example.com/feed',
        entries: [],
      }
      const result = await atom(feed)
      expect(mockProvider.atom).toHaveBeenCalledWith(feed)
      expect(result).toBe('<feed></feed>')
    })
  })

  describe('error handling', () => {
    it('should throw on addUrl when no provider is set', () => {
      expect(() => addUrl({ loc: 'https://example.com/' })).toThrow(
        'Sitemap provider not configured. Call setProvider() first.',
      )
    })

    it('should throw on generate when no provider is set', async () => {
      await expect(generate()).rejects.toThrow(
        'Sitemap provider not configured. Call setProvider() first.',
      )
    })

    it('should throw on generateIndex when no provider is set', async () => {
      await expect(generateIndex([])).rejects.toThrow(
        'Sitemap provider not configured. Call setProvider() first.',
      )
    })

    it('should throw on rss when no provider is set', async () => {
      await expect(rss({ title: '', description: '', link: '', items: [] })).rejects.toThrow(
        'Sitemap provider not configured. Call setProvider() first.',
      )
    })

    it('should throw on atom when no provider is set', async () => {
      await expect(atom({ title: '', link: '', id: '', entries: [] })).rejects.toThrow(
        'Sitemap provider not configured. Call setProvider() first.',
      )
    })
  })
})
