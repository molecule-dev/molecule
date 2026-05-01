import { beforeEach, describe, expect, it, vi } from 'vitest'

import type * as ProviderModule from '../provider.js'
import type {
  EquityFundamentals,
  EquityHistoricalBar,
  EquityPricesProvider,
  EquityQuote,
  EquitySymbolMatch,
} from '../types.js'

// We need to reset the module state between tests so the bond registry
// is not contaminated across cases.
let setProvider: typeof ProviderModule.setProvider
let getProvider: typeof ProviderModule.getProvider
let hasProvider: typeof ProviderModule.hasProvider
let getQuote: typeof ProviderModule.getQuote
let getHistorical: typeof ProviderModule.getHistorical
let getFundamentals: typeof ProviderModule.getFundamentals
let searchSymbol: typeof ProviderModule.searchSymbol
let listSupportedExchanges: typeof ProviderModule.listSupportedExchanges

const buildProvider = (overrides: Partial<EquityPricesProvider> = {}): EquityPricesProvider => ({
  getQuote: vi.fn(),
  getHistorical: vi.fn(),
  getFundamentals: vi.fn(),
  searchSymbol: vi.fn(),
  listSupportedExchanges: vi.fn(),
  ...overrides,
})

describe('equity-prices provider', () => {
  beforeEach(async () => {
    vi.resetModules()
    const providerModule = await import('../provider.js')
    setProvider = providerModule.setProvider
    getProvider = providerModule.getProvider
    hasProvider = providerModule.hasProvider
    getQuote = providerModule.getQuote
    getHistorical = providerModule.getHistorical
    getFundamentals = providerModule.getFundamentals
    searchSymbol = providerModule.searchSymbol
    listSupportedExchanges = providerModule.listSupportedExchanges
  })

  describe('provider management', () => {
    it('should throw when no provider is set', () => {
      expect(() => getProvider()).toThrow(
        'Equity-prices provider not configured. Call setProvider() first.',
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

  describe('getQuote', () => {
    it('should throw when no provider is set', async () => {
      await expect(getQuote('AAPL')).rejects.toThrow('Equity-prices provider not configured')
    })

    it('should call provider getQuote and return the quote', async () => {
      const quote: EquityQuote = {
        symbol: 'AAPL',
        price: 195.42,
        currency: 'USD',
        ts: new Date('2024-01-15T20:00:00Z'),
        exchange: 'NASDAQ',
      }
      const mockGetQuote = vi.fn().mockResolvedValue(quote)
      setProvider(buildProvider({ getQuote: mockGetQuote }))

      const result = await getQuote('AAPL')

      expect(mockGetQuote).toHaveBeenCalledWith('AAPL')
      expect(result).toBe(quote)
    })
  })

  describe('getHistorical', () => {
    it('should throw when no provider is set', async () => {
      await expect(getHistorical('AAPL', '1y')).rejects.toThrow(
        'Equity-prices provider not configured',
      )
    })

    it('should call provider getHistorical with symbol and range', async () => {
      const bars: EquityHistoricalBar[] = [
        { ts: new Date('2024-01-02T00:00:00Z'), close: 185.0 },
        { ts: new Date('2024-01-03T00:00:00Z'), close: 186.4 },
      ]
      const mockGetHistorical = vi.fn().mockResolvedValue(bars)
      setProvider(buildProvider({ getHistorical: mockGetHistorical }))

      const result = await getHistorical('AAPL', '1m')

      expect(mockGetHistorical).toHaveBeenCalledWith('AAPL', '1m')
      expect(result).toEqual(bars)
    })

    it('should pass through every supported range value', async () => {
      const mockGetHistorical = vi.fn().mockResolvedValue([])
      setProvider(buildProvider({ getHistorical: mockGetHistorical }))

      await getHistorical('VOO', '5y')

      expect(mockGetHistorical).toHaveBeenCalledWith('VOO', '5y')
    })
  })

  describe('getFundamentals', () => {
    it('should throw when no provider is set', async () => {
      await expect(getFundamentals('AAPL')).rejects.toThrow('Equity-prices provider not configured')
    })

    it('should call provider getFundamentals and return the snapshot', async () => {
      const fundamentals: EquityFundamentals = {
        symbol: 'AAPL',
        marketCap: 3_000_000_000_000,
        peRatio: 32.1,
        eps: 6.07,
        dividendYield: 0.005,
        currency: 'USD',
      }
      const mockGetFundamentals = vi.fn().mockResolvedValue(fundamentals)
      setProvider(buildProvider({ getFundamentals: mockGetFundamentals }))

      const result = await getFundamentals('AAPL')

      expect(mockGetFundamentals).toHaveBeenCalledWith('AAPL')
      expect(result).toBe(fundamentals)
    })
  })

  describe('searchSymbol', () => {
    it('should throw when no provider is set', async () => {
      await expect(searchSymbol('apple')).rejects.toThrow('Equity-prices provider not configured')
    })

    it('should call provider searchSymbol and return matches', async () => {
      const matches: EquitySymbolMatch[] = [
        { symbol: 'AAPL', name: 'Apple Inc.', exchange: 'NASDAQ', currency: 'USD' },
      ]
      const mockSearchSymbol = vi.fn().mockResolvedValue(matches)
      setProvider(buildProvider({ searchSymbol: mockSearchSymbol }))

      const result = await searchSymbol('apple')

      expect(mockSearchSymbol).toHaveBeenCalledWith('apple')
      expect(result).toEqual(matches)
    })
  })

  describe('listSupportedExchanges', () => {
    it('should throw when no provider is set', async () => {
      await expect(listSupportedExchanges()).rejects.toThrow(
        'Equity-prices provider not configured',
      )
    })

    it('should return the list from the provider', async () => {
      const exchanges = ['NASDAQ', 'NYSE', 'LSE', 'TSE']
      const mockList = vi.fn().mockResolvedValue(exchanges)
      setProvider(buildProvider({ listSupportedExchanges: mockList }))

      const result = await listSupportedExchanges()

      expect(mockList).toHaveBeenCalledTimes(1)
      expect(result).toEqual(exchanges)
    })
  })
})

describe('equity-prices types', () => {
  it('should accept a minimal EquityPricesProvider implementation', () => {
    const provider: EquityPricesProvider = {
      getQuote: async (symbol) => ({
        symbol,
        price: 1,
        currency: 'USD',
        ts: new Date(0),
      }),
      getHistorical: async () => [],
      getFundamentals: async (symbol) => ({ symbol }),
      searchSymbol: async () => [],
      listSupportedExchanges: async () => [],
    }
    expect(typeof provider.getQuote).toBe('function')
    expect(typeof provider.getHistorical).toBe('function')
    expect(typeof provider.getFundamentals).toBe('function')
    expect(typeof provider.searchSymbol).toBe('function')
    expect(typeof provider.listSupportedExchanges).toBe('function')
  })

  it('should accept an EquityQuote value with optional exchange', () => {
    const quote: EquityQuote = {
      symbol: 'AAPL',
      price: 195.42,
      currency: 'USD',
      ts: new Date('2024-01-15T20:00:00Z'),
    }
    expect(quote.symbol).toBe('AAPL')
    expect(quote.exchange).toBeUndefined()
  })

  it('should accept an EquityFundamentals value with all optional fields missing', () => {
    const fundamentals: EquityFundamentals = { symbol: 'XYZ' }
    expect(fundamentals.symbol).toBe('XYZ')
    expect(fundamentals.marketCap).toBeUndefined()
    expect(fundamentals.peRatio).toBeUndefined()
    expect(fundamentals.eps).toBeUndefined()
    expect(fundamentals.dividendYield).toBeUndefined()
  })
})
