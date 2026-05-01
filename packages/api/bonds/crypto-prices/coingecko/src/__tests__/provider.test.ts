import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import type { CryptoPricesProvider } from '@molecule/api-crypto-prices'

import { createProvider } from '../provider.js'
import { CoinGeckoRateLimitedError, RATE_LIMITED } from '../types.js'

/**
 * Builds a fake `Response` for `vi.stubGlobal('fetch', ...)`.
 *
 * @param data - JSON body the response should resolve to.
 * @param status - HTTP status. Defaults to `200`.
 * @param headers - Response headers.
 * @returns A minimal `Response` stub.
 */
const mockFetchResponse = (
  data: unknown,
  status = 200,
  headers: Record<string, string> = {},
): Response =>
  ({
    ok: status >= 200 && status < 300,
    status,
    headers: {
      get: (name: string): string | null => headers[name.toLowerCase()] ?? null,
    },
    json: () => Promise.resolve(data),
  }) as unknown as Response

const SIMPLE_PRICE_FIXTURE = {
  bitcoin: {
    usd: 71234.56,
    usd_24h_change: 1.23,
    last_updated_at: 1714560000,
  },
}

const COINS_MARKETS_FIXTURE = [
  {
    id: 'bitcoin',
    symbol: 'btc',
    name: 'Bitcoin',
    current_price: 71234.56,
    market_cap_rank: 1,
    price_change_percentage_24h: 1.23,
    last_updated: '2026-05-01T12:00:00.000Z',
  },
  {
    id: 'ethereum',
    symbol: 'eth',
    name: 'Ethereum',
    current_price: 3456.78,
    market_cap_rank: 2,
    price_change_percentage_24h: -0.45,
    last_updated: '2026-05-01T12:00:00.000Z',
  },
]

const MARKET_CHART_FIXTURE = {
  prices: [
    [1714473600000, 70000.1],
    [1714477200000, 70250.4],
    [1714480800000, 70400.0],
  ],
}

const COIN_DETAIL_FIXTURE = {
  id: 'bitcoin',
  market_data: {
    current_price: { usd: 71234.56 },
    market_cap: { usd: 1_400_000_000_000 },
    total_volume: { usd: 25_000_000_000 },
    price_change_percentage_24h: 1.23,
    circulating_supply: 19_700_000,
    total_supply: 21_000_000,
    last_updated: '2026-05-01T12:00:00.000Z',
  },
}

const COINS_LIST_FIXTURE = [
  { id: 'bitcoin', symbol: 'btc', name: 'Bitcoin' },
  { id: 'ethereum', symbol: 'eth', name: 'Ethereum' },
  { id: 'solana', symbol: 'sol', name: 'Solana' },
]

describe('coingecko crypto-prices provider', () => {
  let provider: CryptoPricesProvider

  beforeEach(() => {
    provider = createProvider()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('createProvider', () => {
    it('should create a provider with the expected methods', () => {
      expect(provider).toBeDefined()
      expect(provider.listCoins).toBeInstanceOf(Function)
      expect(provider.getPrice).toBeInstanceOf(Function)
      expect(provider.getHistorical).toBeInstanceOf(Function)
      expect(provider.listSupportedSymbols).toBeInstanceOf(Function)
      expect(provider.getMarketStats).toBeInstanceOf(Function)
    })
  })

  describe('getPrice', () => {
    it('should map /simple/price into a normalized quote', async () => {
      vi.stubGlobal('fetch', vi.fn().mockResolvedValue(mockFetchResponse(SIMPLE_PRICE_FIXTURE)))

      const quote = await provider.getPrice('bitcoin')

      expect(quote.id).toBe('bitcoin')
      expect(quote.vsCurrency).toBe('usd')
      expect(quote.price).toBe(71234.56)
      expect(quote.change24h).toBe(1.23)
      expect(quote.asOf).toEqual(new Date(1714560000 * 1000))
    })

    it('should call /simple/price with the requested vs-currency', async () => {
      const fixture = {
        bitcoin: { eur: 65000, eur_24h_change: -0.5, last_updated_at: 1714560000 },
      }
      const mockFetch = vi.fn().mockResolvedValue(mockFetchResponse(fixture))
      vi.stubGlobal('fetch', mockFetch)

      const quote = await provider.getPrice('bitcoin', 'eur')

      const calledUrl = mockFetch.mock.calls[0][0] as string
      expect(calledUrl).toContain('https://api.coingecko.com/api/v3/simple/price?')
      expect(calledUrl).toContain('ids=bitcoin')
      expect(calledUrl).toContain('vs_currencies=eur')
      expect(quote.price).toBe(65000)
      expect(quote.change24h).toBe(-0.5)
    })

    it('should default vs-currency to usd', async () => {
      const mockFetch = vi.fn().mockResolvedValue(mockFetchResponse(SIMPLE_PRICE_FIXTURE))
      vi.stubGlobal('fetch', mockFetch)

      await provider.getPrice('bitcoin')

      const calledUrl = mockFetch.mock.calls[0][0] as string
      expect(calledUrl).toContain('vs_currencies=usd')
    })

    it('should leave change24h null when the response omits it', async () => {
      const fixture = { bitcoin: { usd: 71234.56 } }
      vi.stubGlobal('fetch', vi.fn().mockResolvedValue(mockFetchResponse(fixture)))

      const quote = await provider.getPrice('bitcoin')

      expect(quote.change24h).toBeNull()
    })

    it('should throw when the coin id is missing from the response', async () => {
      vi.stubGlobal('fetch', vi.fn().mockResolvedValue(mockFetchResponse({})))

      await expect(provider.getPrice('bitcoin')).rejects.toThrow(/no price data for coin 'bitcoin'/)
    })

    it('should throw when the requested vs-currency is missing', async () => {
      vi.stubGlobal(
        'fetch',
        vi.fn().mockResolvedValue(mockFetchResponse({ bitcoin: { eur: 65000 } })),
      )

      await expect(provider.getPrice('bitcoin', 'usd')).rejects.toThrow(
        /no 'usd' price for coin 'bitcoin'/,
      )
    })
  })

  describe('listCoins', () => {
    it('should map /coins/markets rows into normalized rows', async () => {
      vi.stubGlobal('fetch', vi.fn().mockResolvedValue(mockFetchResponse(COINS_MARKETS_FIXTURE)))

      const rows = await provider.listCoins()

      expect(rows).toHaveLength(2)
      expect(rows[0]).toEqual({
        id: 'bitcoin',
        symbol: 'btc',
        name: 'Bitcoin',
        vsCurrency: 'usd',
        price: 71234.56,
        rank: 1,
        change24h: 1.23,
        asOf: new Date('2026-05-01T12:00:00.000Z'),
      })
    })

    it('should pass the limit, page, vsCurrency, and order through', async () => {
      const mockFetch = vi.fn().mockResolvedValue(mockFetchResponse(COINS_MARKETS_FIXTURE))
      vi.stubGlobal('fetch', mockFetch)

      await provider.listCoins({ limit: 25, page: 2, vsCurrency: 'eur', order: 'market-cap-asc' })

      const calledUrl = mockFetch.mock.calls[0][0] as string
      expect(calledUrl).toContain('per_page=25')
      expect(calledUrl).toContain('page=2')
      expect(calledUrl).toContain('vs_currency=eur')
      expect(calledUrl).toContain('order=market_cap_asc')
    })

    it('should default to descending market-cap order', async () => {
      const mockFetch = vi.fn().mockResolvedValue(mockFetchResponse(COINS_MARKETS_FIXTURE))
      vi.stubGlobal('fetch', mockFetch)

      await provider.listCoins()

      const calledUrl = mockFetch.mock.calls[0][0] as string
      expect(calledUrl).toContain('order=market_cap_desc')
    })

    it('should preserve null rank and null change24h', async () => {
      const fixture = [
        {
          id: 'newcoin',
          symbol: 'new',
          name: 'NewCoin',
          current_price: 0.01,
          market_cap_rank: null,
          price_change_percentage_24h: null,
          last_updated: '2026-05-01T12:00:00.000Z',
        },
      ]
      vi.stubGlobal('fetch', vi.fn().mockResolvedValue(mockFetchResponse(fixture)))

      const rows = await provider.listCoins()

      expect(rows[0].rank).toBeNull()
      expect(rows[0].change24h).toBeNull()
    })
  })

  describe('getHistorical', () => {
    it('should map prices tuples into ts/price points', async () => {
      vi.stubGlobal('fetch', vi.fn().mockResolvedValue(mockFetchResponse(MARKET_CHART_FIXTURE)))

      const points = await provider.getHistorical('bitcoin', 7)

      expect(points).toHaveLength(3)
      expect(points[0].ts).toEqual(new Date(1714473600000))
      expect(points[0].price).toBe(70000.1)
      expect(points[2].price).toBe(70400.0)
    })

    it('should call /coins/{id}/market_chart with days and vs_currency', async () => {
      const mockFetch = vi.fn().mockResolvedValue(mockFetchResponse(MARKET_CHART_FIXTURE))
      vi.stubGlobal('fetch', mockFetch)

      await provider.getHistorical('bitcoin', 30, 'eur')

      const calledUrl = mockFetch.mock.calls[0][0] as string
      expect(calledUrl).toContain('/coins/bitcoin/market_chart?')
      expect(calledUrl).toContain('days=30')
      expect(calledUrl).toContain('vs_currency=eur')
    })

    it('should encode coin ids that contain reserved characters', async () => {
      const mockFetch = vi.fn().mockResolvedValue(mockFetchResponse(MARKET_CHART_FIXTURE))
      vi.stubGlobal('fetch', mockFetch)

      await provider.getHistorical('weird/id', 7)

      const calledUrl = mockFetch.mock.calls[0][0] as string
      expect(calledUrl).toContain('/coins/weird%2Fid/market_chart?')
    })
  })

  describe('getMarketStats', () => {
    it('should map /coins/{id} market_data into normalized stats', async () => {
      vi.stubGlobal('fetch', vi.fn().mockResolvedValue(mockFetchResponse(COIN_DETAIL_FIXTURE)))

      const stats = await provider.getMarketStats('bitcoin')

      expect(stats.id).toBe('bitcoin')
      expect(stats.vsCurrency).toBe('usd')
      expect(stats.price).toBe(71234.56)
      expect(stats.marketCap).toBe(1_400_000_000_000)
      expect(stats.volume24h).toBe(25_000_000_000)
      expect(stats.circulatingSupply).toBe(19_700_000)
      expect(stats.totalSupply).toBe(21_000_000)
      expect(stats.change24h).toBe(1.23)
      expect(stats.asOf).toEqual(new Date('2026-05-01T12:00:00.000Z'))
    })

    it('should call /coins/{id} with localization=false&tickers=false', async () => {
      const mockFetch = vi.fn().mockResolvedValue(mockFetchResponse(COIN_DETAIL_FIXTURE))
      vi.stubGlobal('fetch', mockFetch)

      await provider.getMarketStats('bitcoin')

      const calledUrl = mockFetch.mock.calls[0][0] as string
      expect(calledUrl).toContain('/coins/bitcoin?')
      expect(calledUrl).toContain('localization=false')
      expect(calledUrl).toContain('tickers=false')
    })

    it('should default missing market_data fields to null', async () => {
      const fixture = {
        id: 'bitcoin',
        market_data: { current_price: { usd: 1 } },
      }
      vi.stubGlobal('fetch', vi.fn().mockResolvedValue(mockFetchResponse(fixture)))

      const stats = await provider.getMarketStats('bitcoin')

      expect(stats.marketCap).toBeNull()
      expect(stats.volume24h).toBeNull()
      expect(stats.circulatingSupply).toBeNull()
      expect(stats.totalSupply).toBeNull()
      expect(stats.change24h).toBeNull()
    })

    it('should throw when the requested vs-currency is missing from market_data', async () => {
      const fixture = {
        id: 'bitcoin',
        market_data: { current_price: { eur: 1 } },
      }
      vi.stubGlobal('fetch', vi.fn().mockResolvedValue(mockFetchResponse(fixture)))

      await expect(provider.getMarketStats('bitcoin', 'usd')).rejects.toThrow(
        /no 'usd' price in market_data/,
      )
    })
  })

  describe('listSupportedSymbols', () => {
    it('should return the array of coin ids from /coins/list', async () => {
      vi.stubGlobal('fetch', vi.fn().mockResolvedValue(mockFetchResponse(COINS_LIST_FIXTURE)))

      const ids = await provider.listSupportedSymbols()

      expect(ids).toEqual(['bitcoin', 'ethereum', 'solana'])
    })

    it('should hit /coins/list', async () => {
      const mockFetch = vi.fn().mockResolvedValue(mockFetchResponse(COINS_LIST_FIXTURE))
      vi.stubGlobal('fetch', mockFetch)

      await provider.listSupportedSymbols()

      const calledUrl = mockFetch.mock.calls[0][0] as string
      expect(calledUrl).toBe('https://api.coingecko.com/api/v3/coins/list')
    })
  })

  describe('Pro tier (apiKey)', () => {
    it('should use the Pro base URL and send the x-cg-pro-api-key header', async () => {
      const p = createProvider({ apiKey: 'pro-secret' })
      const mockFetch = vi.fn().mockResolvedValue(mockFetchResponse(SIMPLE_PRICE_FIXTURE))
      vi.stubGlobal('fetch', mockFetch)

      await p.getPrice('bitcoin')

      const calledUrl = mockFetch.mock.calls[0][0] as string
      const calledOpts = mockFetch.mock.calls[0][1] as { headers: Record<string, string> }
      expect(calledUrl.startsWith('https://pro-api.coingecko.com/api/v3/')).toBe(true)
      expect(calledOpts.headers['x-cg-pro-api-key']).toBe('pro-secret')
    })

    it('should respect a custom baseUrl override even when apiKey is set', async () => {
      const p = createProvider({ apiKey: 'pro-secret', baseUrl: 'https://example.test/v3' })
      const mockFetch = vi.fn().mockResolvedValue(mockFetchResponse(SIMPLE_PRICE_FIXTURE))
      vi.stubGlobal('fetch', mockFetch)

      await p.getPrice('bitcoin')

      const calledUrl = mockFetch.mock.calls[0][0] as string
      expect(calledUrl.startsWith('https://example.test/v3/')).toBe(true)
    })

    it('should NOT send the x-cg-pro-api-key header when no key is set', async () => {
      const mockFetch = vi.fn().mockResolvedValue(mockFetchResponse(SIMPLE_PRICE_FIXTURE))
      vi.stubGlobal('fetch', mockFetch)

      await provider.getPrice('bitcoin')

      const calledOpts = mockFetch.mock.calls[0][1] as { headers: Record<string, string> }
      expect(calledOpts.headers['x-cg-pro-api-key']).toBeUndefined()
    })
  })

  describe('error handling', () => {
    it('should throw a CoinGeckoRateLimitedError on HTTP 429', async () => {
      vi.stubGlobal(
        'fetch',
        vi.fn().mockResolvedValue(mockFetchResponse({}, 429, { 'retry-after': '42' })),
      )

      const error = await provider.getPrice('bitcoin').then(
        () => null,
        (err: unknown) => err,
      )

      expect(error).toBeInstanceOf(CoinGeckoRateLimitedError)
      expect((error as CoinGeckoRateLimitedError).code).toBe(RATE_LIMITED)
      expect((error as CoinGeckoRateLimitedError).retryAfterSeconds).toBe(42)
    })

    it('should leave retryAfterSeconds null when the header is absent', async () => {
      vi.stubGlobal('fetch', vi.fn().mockResolvedValue(mockFetchResponse({}, 429)))

      const error = await provider.getPrice('bitcoin').then(
        () => null,
        (err: unknown) => err,
      )

      expect(error).toBeInstanceOf(CoinGeckoRateLimitedError)
      expect((error as CoinGeckoRateLimitedError).retryAfterSeconds).toBeNull()
    })

    it('should accept an HTTP-date Retry-After header', async () => {
      const future = new Date(Date.now() + 30_000).toUTCString()
      vi.stubGlobal(
        'fetch',
        vi.fn().mockResolvedValue(mockFetchResponse({}, 429, { 'retry-after': future })),
      )

      const error = await provider.getPrice('bitcoin').then(
        () => null,
        (err: unknown) => err,
      )

      expect(error).toBeInstanceOf(CoinGeckoRateLimitedError)
      const seconds = (error as CoinGeckoRateLimitedError).retryAfterSeconds
      expect(seconds).not.toBeNull()
      expect(seconds!).toBeGreaterThan(0)
      expect(seconds!).toBeLessThanOrEqual(31)
    })

    it('should not include the API key in the rate-limited error', async () => {
      const p = createProvider({ apiKey: 'super-secret-key' })
      vi.stubGlobal('fetch', vi.fn().mockResolvedValue(mockFetchResponse({}, 429)))

      const error = await p.getPrice('bitcoin').then(
        () => null,
        (err: unknown) => err,
      )

      expect(error).toBeInstanceOf(CoinGeckoRateLimitedError)
      expect((error as Error).message).not.toContain('super-secret-key')
    })

    it('should throw on other HTTP errors with the status in the message', async () => {
      vi.stubGlobal('fetch', vi.fn().mockResolvedValue(mockFetchResponse({}, 500)))

      await expect(provider.getPrice('bitcoin')).rejects.toThrow(/failed with status 500/)
    })

    it('should not include the API key in non-429 HTTP errors', async () => {
      const p = createProvider({ apiKey: 'super-secret-key' })
      vi.stubGlobal('fetch', vi.fn().mockResolvedValue(mockFetchResponse({}, 500)))

      const error = await p.getPrice('bitcoin').then(
        () => null,
        (err: unknown) => err,
      )

      expect(error).toBeInstanceOf(Error)
      expect((error as Error).message).not.toContain('super-secret-key')
    })

    it('should reject when fetch is aborted by timeout', async () => {
      const p = createProvider({ timeout: 25 })
      vi.stubGlobal(
        'fetch',
        vi.fn().mockImplementation(
          (_url: string, options: { signal: AbortSignal }) =>
            new Promise((_resolve, reject) => {
              options.signal.addEventListener('abort', () => {
                reject(new DOMException('The operation was aborted.', 'AbortError'))
              })
            }),
        ),
      )

      await expect(p.getPrice('bitcoin')).rejects.toThrow()
    })
  })
})
