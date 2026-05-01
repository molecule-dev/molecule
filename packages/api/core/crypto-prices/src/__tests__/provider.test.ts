import { beforeEach, describe, expect, it, vi } from 'vitest'

import type * as ProviderModule from '../provider.js'
import type {
  CoinMarketRow,
  CoinMarketStats,
  CoinPricePoint,
  CoinPriceQuote,
  CryptoPricesProvider,
} from '../types.js'

// We need to reset the module state between tests so the bond registry
// is not contaminated across cases.
let setProvider: typeof ProviderModule.setProvider
let getProvider: typeof ProviderModule.getProvider
let hasProvider: typeof ProviderModule.hasProvider
let listCoins: typeof ProviderModule.listCoins
let getPrice: typeof ProviderModule.getPrice
let getHistorical: typeof ProviderModule.getHistorical
let listSupportedSymbols: typeof ProviderModule.listSupportedSymbols
let getMarketStats: typeof ProviderModule.getMarketStats

const buildProvider = (overrides: Partial<CryptoPricesProvider> = {}): CryptoPricesProvider => ({
  listCoins: vi.fn(),
  getPrice: vi.fn(),
  getHistorical: vi.fn(),
  listSupportedSymbols: vi.fn(),
  getMarketStats: vi.fn(),
  ...overrides,
})

describe('crypto-prices provider', () => {
  beforeEach(async () => {
    vi.resetModules()
    const providerModule = await import('../provider.js')
    setProvider = providerModule.setProvider
    getProvider = providerModule.getProvider
    hasProvider = providerModule.hasProvider
    listCoins = providerModule.listCoins
    getPrice = providerModule.getPrice
    getHistorical = providerModule.getHistorical
    listSupportedSymbols = providerModule.listSupportedSymbols
    getMarketStats = providerModule.getMarketStats
  })

  describe('provider management', () => {
    it('should throw when no provider is set', () => {
      expect(() => getProvider()).toThrow(
        'Crypto-prices provider not configured. Call setProvider() first.',
      )
    })

    it('should return false when no provider is configured', () => {
      expect(hasProvider()).toBe(false)
    })

    it('should set and get provider', () => {
      const mockProvider = buildProvider()
      setProvider(mockProvider)
      expect(getProvider()).toBe(mockProvider)
    })

    it('should return true when provider is configured', () => {
      const mockProvider = buildProvider()
      setProvider(mockProvider)
      expect(hasProvider()).toBe(true)
    })
  })

  describe('listCoins', () => {
    it('should throw when no provider is set', async () => {
      await expect(listCoins()).rejects.toThrow('Crypto-prices provider not configured')
    })

    it('should call provider listCoins without options', async () => {
      const rows: CoinMarketRow[] = [
        {
          id: 'bitcoin',
          symbol: 'BTC',
          name: 'Bitcoin',
          vsCurrency: 'usd',
          price: 65_000,
          rank: 1,
          change24h: -0.5,
          asOf: new Date('2026-05-01T00:00:00Z'),
        },
      ]
      const mockListCoins = vi.fn().mockResolvedValue(rows)
      setProvider(buildProvider({ listCoins: mockListCoins }))

      const result = await listCoins()

      expect(mockListCoins).toHaveBeenCalledWith(undefined)
      expect(result).toBe(rows)
    })

    it('should pass list options through to provider listCoins', async () => {
      const mockListCoins = vi.fn().mockResolvedValue([])
      setProvider(buildProvider({ listCoins: mockListCoins }))

      const opts = { vsCurrency: 'eur', limit: 25, page: 2, order: 'market-cap-desc' as const }
      await listCoins(opts)

      expect(mockListCoins).toHaveBeenCalledWith(opts)
    })
  })

  describe('getPrice', () => {
    it('should throw when no provider is set', async () => {
      await expect(getPrice('bitcoin')).rejects.toThrow('Crypto-prices provider not configured')
    })

    it('should call provider getPrice with default vsCurrency undefined', async () => {
      const quote: CoinPriceQuote = {
        id: 'bitcoin',
        vsCurrency: 'usd',
        price: 65_000,
        change24h: -0.5,
        asOf: new Date('2026-05-01T00:00:00Z'),
      }
      const mockGetPrice = vi.fn().mockResolvedValue(quote)
      setProvider(buildProvider({ getPrice: mockGetPrice }))

      const result = await getPrice('bitcoin')

      expect(mockGetPrice).toHaveBeenCalledWith('bitcoin', undefined)
      expect(result).toBe(quote)
    })

    it('should pass vsCurrency through to provider getPrice', async () => {
      const quote: CoinPriceQuote = {
        id: 'ethereum',
        vsCurrency: 'eur',
        price: 3_000,
        change24h: 1.2,
        asOf: new Date('2026-05-01T00:00:00Z'),
      }
      const mockGetPrice = vi.fn().mockResolvedValue(quote)
      setProvider(buildProvider({ getPrice: mockGetPrice }))

      const result = await getPrice('ethereum', 'eur')

      expect(mockGetPrice).toHaveBeenCalledWith('ethereum', 'eur')
      expect(result).toBe(quote)
    })
  })

  describe('getHistorical', () => {
    it('should throw when no provider is set', async () => {
      await expect(getHistorical('bitcoin', 7)).rejects.toThrow(
        'Crypto-prices provider not configured',
      )
    })

    it('should call provider getHistorical and return the series', async () => {
      const series: CoinPricePoint[] = [
        { ts: new Date('2026-04-25T00:00:00Z'), price: 64_000 },
        { ts: new Date('2026-04-26T00:00:00Z'), price: 64_500 },
        { ts: new Date('2026-04-27T00:00:00Z'), price: 65_000 },
      ]
      const mockGetHistorical = vi.fn().mockResolvedValue(series)
      setProvider(buildProvider({ getHistorical: mockGetHistorical }))

      const result = await getHistorical('bitcoin', 7)

      expect(mockGetHistorical).toHaveBeenCalledWith('bitcoin', 7, undefined)
      expect(result).toBe(series)
    })

    it('should pass vsCurrency through to provider getHistorical', async () => {
      const mockGetHistorical = vi.fn().mockResolvedValue([])
      setProvider(buildProvider({ getHistorical: mockGetHistorical }))

      await getHistorical('ethereum', 30, 'btc')

      expect(mockGetHistorical).toHaveBeenCalledWith('ethereum', 30, 'btc')
    })
  })

  describe('listSupportedSymbols', () => {
    it('should throw when no provider is set', async () => {
      await expect(listSupportedSymbols()).rejects.toThrow('Crypto-prices provider not configured')
    })

    it('should return the list from the provider', async () => {
      const ids = ['bitcoin', 'ethereum', 'solana', 'cardano']
      const mockList = vi.fn().mockResolvedValue(ids)
      setProvider(buildProvider({ listSupportedSymbols: mockList }))

      const result = await listSupportedSymbols()

      expect(mockList).toHaveBeenCalledTimes(1)
      expect(result).toEqual(ids)
    })
  })

  describe('getMarketStats', () => {
    it('should throw when no provider is set', async () => {
      await expect(getMarketStats('bitcoin')).rejects.toThrow(
        'Crypto-prices provider not configured',
      )
    })

    it('should call provider getMarketStats and return the snapshot', async () => {
      const stats: CoinMarketStats = {
        id: 'bitcoin',
        vsCurrency: 'usd',
        price: 65_000,
        marketCap: 1_280_000_000_000,
        volume24h: 28_500_000_000,
        circulatingSupply: 19_700_000,
        totalSupply: 21_000_000,
        change24h: -0.5,
        asOf: new Date('2026-05-01T00:00:00Z'),
      }
      const mockGetMarketStats = vi.fn().mockResolvedValue(stats)
      setProvider(buildProvider({ getMarketStats: mockGetMarketStats }))

      const result = await getMarketStats('bitcoin')

      expect(mockGetMarketStats).toHaveBeenCalledWith('bitcoin', undefined)
      expect(result).toBe(stats)
    })

    it('should pass vsCurrency through to provider getMarketStats', async () => {
      const mockGetMarketStats = vi.fn().mockResolvedValue({
        id: 'ethereum',
        vsCurrency: 'eur',
        price: 3_000,
        marketCap: null,
        volume24h: null,
        circulatingSupply: null,
        totalSupply: null,
        change24h: null,
        asOf: new Date('2026-05-01T00:00:00Z'),
      })
      setProvider(buildProvider({ getMarketStats: mockGetMarketStats }))

      await getMarketStats('ethereum', 'eur')

      expect(mockGetMarketStats).toHaveBeenCalledWith('ethereum', 'eur')
    })
  })
})

describe('crypto-prices types', () => {
  it('should accept a minimal CryptoPricesProvider implementation', () => {
    const provider: CryptoPricesProvider = {
      listCoins: async () => [],
      getPrice: async (id, vsCurrency = 'usd') => ({
        id,
        vsCurrency,
        price: 0,
        change24h: null,
        asOf: new Date(0),
      }),
      getHistorical: async () => [],
      listSupportedSymbols: async () => ['bitcoin'],
      getMarketStats: async (id, vsCurrency = 'usd') => ({
        id,
        vsCurrency,
        price: 0,
        marketCap: null,
        volume24h: null,
        circulatingSupply: null,
        totalSupply: null,
        change24h: null,
        asOf: new Date(0),
      }),
    }
    expect(typeof provider.listCoins).toBe('function')
    expect(typeof provider.getPrice).toBe('function')
    expect(typeof provider.getHistorical).toBe('function')
    expect(typeof provider.listSupportedSymbols).toBe('function')
    expect(typeof provider.getMarketStats).toBe('function')
  })

  it('should accept a CoinMarketRow value', () => {
    const row: CoinMarketRow = {
      id: 'bitcoin',
      symbol: 'BTC',
      name: 'Bitcoin',
      vsCurrency: 'usd',
      price: 65_000,
      rank: 1,
      change24h: -0.5,
      asOf: new Date('2026-05-01T00:00:00Z'),
    }
    expect(row.id).toBe('bitcoin')
    expect(row.rank).toBe(1)
    expect(row.change24h).toBeCloseTo(-0.5)
  })
})
