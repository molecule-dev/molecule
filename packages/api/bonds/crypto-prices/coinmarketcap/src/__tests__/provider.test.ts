import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import type { CryptoPricesProvider } from '@molecule/api-crypto-prices'

import { createProvider } from '../provider.js'
import { CoinMarketCapRateLimitedError, RATE_LIMITED } from '../types.js'

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

const QUOTES_LATEST_FIXTURE = {
  data: {
    BTC: {
      id: 1,
      name: 'Bitcoin',
      symbol: 'BTC',
      cmc_rank: 1,
      circulating_supply: 19_700_000,
      total_supply: 21_000_000,
      last_updated: '2026-05-01T12:00:00.000Z',
      quote: {
        USD: {
          price: 71234.56,
          volume_24h: 25_000_000_000,
          percent_change_24h: 1.23,
          market_cap: 1_400_000_000_000,
          last_updated: '2026-05-01T12:00:00.000Z',
        },
      },
    },
  },
}

const LISTINGS_LATEST_FIXTURE = {
  data: [
    {
      id: 1,
      name: 'Bitcoin',
      symbol: 'BTC',
      cmc_rank: 1,
      last_updated: '2026-05-01T12:00:00.000Z',
      quote: {
        USD: {
          price: 71234.56,
          percent_change_24h: 1.23,
          last_updated: '2026-05-01T12:00:00.000Z',
        },
      },
    },
    {
      id: 1027,
      name: 'Ethereum',
      symbol: 'ETH',
      cmc_rank: 2,
      last_updated: '2026-05-01T12:00:00.000Z',
      quote: {
        USD: {
          price: 3456.78,
          percent_change_24h: -0.45,
          last_updated: '2026-05-01T12:00:00.000Z',
        },
      },
    },
  ],
}

const QUOTES_HISTORICAL_FIXTURE = {
  data: {
    BTC: {
      symbol: 'BTC',
      quotes: [
        {
          timestamp: '2026-04-30T00:00:00.000Z',
          quote: { USD: { price: 70000.1, timestamp: '2026-04-30T00:00:00.000Z' } },
        },
        {
          timestamp: '2026-04-30T01:00:00.000Z',
          quote: { USD: { price: 70250.4, timestamp: '2026-04-30T01:00:00.000Z' } },
        },
        {
          timestamp: '2026-04-30T02:00:00.000Z',
          quote: { USD: { price: 70400.0, timestamp: '2026-04-30T02:00:00.000Z' } },
        },
      ],
    },
  },
}

describe('coinmarketcap crypto-prices provider', () => {
  let provider: CryptoPricesProvider

  beforeEach(() => {
    provider = createProvider({ apiKey: 'test-key' })
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
    it('should map /cryptocurrency/quotes/latest into a normalized quote', async () => {
      vi.stubGlobal('fetch', vi.fn().mockResolvedValue(mockFetchResponse(QUOTES_LATEST_FIXTURE)))

      const quote = await provider.getPrice('BTC')

      expect(quote.id).toBe('BTC')
      expect(quote.vsCurrency).toBe('usd')
      expect(quote.price).toBe(71234.56)
      expect(quote.change24h).toBe(1.23)
      expect(quote.asOf).toEqual(new Date('2026-05-01T12:00:00.000Z'))
    })

    it('should call /cryptocurrency/quotes/latest with the requested vs-currency (upper-cased)', async () => {
      const fixture = {
        data: {
          BTC: {
            id: 1,
            name: 'Bitcoin',
            symbol: 'BTC',
            quote: {
              EUR: {
                price: 65000,
                percent_change_24h: -0.5,
                last_updated: '2026-05-01T12:00:00.000Z',
              },
            },
          },
        },
      }
      const mockFetch = vi.fn().mockResolvedValue(mockFetchResponse(fixture))
      vi.stubGlobal('fetch', mockFetch)

      const quote = await provider.getPrice('BTC', 'eur')

      const calledUrl = mockFetch.mock.calls[0][0] as string
      expect(calledUrl).toContain(
        'https://pro-api.coinmarketcap.com/v1/cryptocurrency/quotes/latest?',
      )
      expect(calledUrl).toContain('symbol=BTC')
      expect(calledUrl).toContain('convert=EUR')
      expect(quote.price).toBe(65000)
      expect(quote.change24h).toBe(-0.5)
      expect(quote.vsCurrency).toBe('eur')
    })

    it('should default vs-currency to usd', async () => {
      const mockFetch = vi.fn().mockResolvedValue(mockFetchResponse(QUOTES_LATEST_FIXTURE))
      vi.stubGlobal('fetch', mockFetch)

      await provider.getPrice('BTC')

      const calledUrl = mockFetch.mock.calls[0][0] as string
      expect(calledUrl).toContain('convert=USD')
    })

    it('should leave change24h null when the response omits it', async () => {
      const fixture = {
        data: {
          BTC: {
            id: 1,
            name: 'Bitcoin',
            symbol: 'BTC',
            quote: { USD: { price: 71234.56 } },
          },
        },
      }
      vi.stubGlobal('fetch', vi.fn().mockResolvedValue(mockFetchResponse(fixture)))

      const quote = await provider.getPrice('BTC')

      expect(quote.change24h).toBeNull()
    })

    it('should accept array-shaped data entries (multi-coin symbol collisions)', async () => {
      const fixture = {
        data: {
          BTC: [
            {
              id: 1,
              name: 'Bitcoin',
              symbol: 'BTC',
              quote: {
                USD: { price: 71234.56, last_updated: '2026-05-01T12:00:00.000Z' },
              },
            },
          ],
        },
      }
      vi.stubGlobal('fetch', vi.fn().mockResolvedValue(mockFetchResponse(fixture)))

      const quote = await provider.getPrice('BTC')

      expect(quote.price).toBe(71234.56)
    })

    it('should throw when the coin id is missing from the response', async () => {
      vi.stubGlobal('fetch', vi.fn().mockResolvedValue(mockFetchResponse({ data: {} })))

      await expect(provider.getPrice('BTC')).rejects.toThrow(/no price data for coin 'BTC'/)
    })

    it('should throw when the requested vs-currency is missing', async () => {
      const fixture = {
        data: {
          BTC: {
            id: 1,
            name: 'Bitcoin',
            symbol: 'BTC',
            quote: { EUR: { price: 65000 } },
          },
        },
      }
      vi.stubGlobal('fetch', vi.fn().mockResolvedValue(mockFetchResponse(fixture)))

      await expect(provider.getPrice('BTC', 'usd')).rejects.toThrow(/no 'usd' price for coin 'BTC'/)
    })
  })

  describe('listCoins', () => {
    it('should map /cryptocurrency/listings/latest rows into normalized rows', async () => {
      vi.stubGlobal('fetch', vi.fn().mockResolvedValue(mockFetchResponse(LISTINGS_LATEST_FIXTURE)))

      const rows = await provider.listCoins()

      expect(rows).toHaveLength(2)
      expect(rows[0]).toEqual({
        id: '1',
        symbol: 'BTC',
        name: 'Bitcoin',
        vsCurrency: 'usd',
        price: 71234.56,
        rank: 1,
        change24h: 1.23,
        asOf: new Date('2026-05-01T12:00:00.000Z'),
      })
    })

    it('should pass the limit, page (as start), vsCurrency, and order through', async () => {
      const mockFetch = vi.fn().mockResolvedValue(mockFetchResponse(LISTINGS_LATEST_FIXTURE))
      vi.stubGlobal('fetch', mockFetch)

      await provider.listCoins({
        limit: 25,
        page: 2,
        vsCurrency: 'eur',
        order: 'market-cap-asc',
      })

      const calledUrl = mockFetch.mock.calls[0][0] as string
      expect(calledUrl).toContain('limit=25')
      // page 2, limit 25 → start 26
      expect(calledUrl).toContain('start=26')
      expect(calledUrl).toContain('convert=EUR')
      expect(calledUrl).toContain('sort_dir=asc')
      expect(calledUrl).toContain('sort=market_cap')
    })

    it('should default to descending market-cap order at start=1', async () => {
      const mockFetch = vi.fn().mockResolvedValue(mockFetchResponse(LISTINGS_LATEST_FIXTURE))
      vi.stubGlobal('fetch', mockFetch)

      await provider.listCoins()

      const calledUrl = mockFetch.mock.calls[0][0] as string
      expect(calledUrl).toContain('sort_dir=desc')
      expect(calledUrl).toContain('start=1')
    })

    it('should preserve null rank and null change24h', async () => {
      const fixture = {
        data: [
          {
            id: 9999,
            name: 'NewCoin',
            symbol: 'NEW',
            cmc_rank: null,
            last_updated: '2026-05-01T12:00:00.000Z',
            quote: { USD: { price: 0.01, last_updated: '2026-05-01T12:00:00.000Z' } },
          },
        ],
      }
      vi.stubGlobal('fetch', vi.fn().mockResolvedValue(mockFetchResponse(fixture)))

      const rows = await provider.listCoins()

      expect(rows[0].rank).toBeNull()
      expect(rows[0].change24h).toBeNull()
    })
  })

  describe('getHistorical', () => {
    it('should map quotes samples into ts/price points', async () => {
      vi.stubGlobal('fetch', vi.fn().mockResolvedValue(mockFetchResponse(QUOTES_HISTORICAL_FIXTURE)))

      const points = await provider.getHistorical('BTC', 7)

      expect(points).toHaveLength(3)
      expect(points[0].ts).toEqual(new Date('2026-04-30T00:00:00.000Z'))
      expect(points[0].price).toBe(70000.1)
      expect(points[2].price).toBe(70400.0)
    })

    it('should call /cryptocurrency/quotes/historical with time_start, time_end, symbol, convert', async () => {
      const mockFetch = vi.fn().mockResolvedValue(mockFetchResponse(QUOTES_HISTORICAL_FIXTURE))
      vi.stubGlobal('fetch', mockFetch)

      await provider.getHistorical('BTC', 30, 'eur')

      const calledUrl = mockFetch.mock.calls[0][0] as string
      expect(calledUrl).toContain('/cryptocurrency/quotes/historical?')
      expect(calledUrl).toContain('symbol=BTC')
      expect(calledUrl).toContain('convert=EUR')
      expect(calledUrl).toMatch(/time_start=[^&]+/)
      expect(calledUrl).toMatch(/time_end=[^&]+/)
    })

    it('should compute time_start ~= now - days*86400s', async () => {
      const fixedNow = new Date('2026-05-01T12:00:00.000Z').getTime()
      vi.useFakeTimers()
      vi.setSystemTime(fixedNow)

      const mockFetch = vi.fn().mockResolvedValue(mockFetchResponse(QUOTES_HISTORICAL_FIXTURE))
      vi.stubGlobal('fetch', mockFetch)

      try {
        await provider.getHistorical('BTC', 7)

        const calledUrl = mockFetch.mock.calls[0][0] as string
        const decoded = decodeURIComponent(calledUrl)
        expect(decoded).toContain('time_start=2026-04-24T12:00:00.000Z')
        expect(decoded).toContain('time_end=2026-05-01T12:00:00.000Z')
      } finally {
        vi.useRealTimers()
      }
    })

    it('should return [] when CMC has no rows for the symbol', async () => {
      vi.stubGlobal('fetch', vi.fn().mockResolvedValue(mockFetchResponse({ data: {} })))

      const points = await provider.getHistorical('BTC', 7)

      expect(points).toEqual([])
    })
  })

  describe('getMarketStats', () => {
    it('should map quote sub-object into normalized stats', async () => {
      vi.stubGlobal('fetch', vi.fn().mockResolvedValue(mockFetchResponse(QUOTES_LATEST_FIXTURE)))

      const stats = await provider.getMarketStats('BTC')

      expect(stats.id).toBe('BTC')
      expect(stats.vsCurrency).toBe('usd')
      expect(stats.price).toBe(71234.56)
      expect(stats.marketCap).toBe(1_400_000_000_000)
      expect(stats.volume24h).toBe(25_000_000_000)
      expect(stats.circulatingSupply).toBe(19_700_000)
      expect(stats.totalSupply).toBe(21_000_000)
      expect(stats.change24h).toBe(1.23)
      expect(stats.asOf).toEqual(new Date('2026-05-01T12:00:00.000Z'))
    })

    it('should call /cryptocurrency/quotes/latest with symbol and convert', async () => {
      const mockFetch = vi.fn().mockResolvedValue(mockFetchResponse(QUOTES_LATEST_FIXTURE))
      vi.stubGlobal('fetch', mockFetch)

      await provider.getMarketStats('BTC')

      const calledUrl = mockFetch.mock.calls[0][0] as string
      expect(calledUrl).toContain('/cryptocurrency/quotes/latest?')
      expect(calledUrl).toContain('symbol=BTC')
      expect(calledUrl).toContain('convert=USD')
    })

    it('should default missing market_data fields to null', async () => {
      const fixture = {
        data: {
          BTC: {
            id: 1,
            name: 'Bitcoin',
            symbol: 'BTC',
            quote: { USD: { price: 1, last_updated: '2026-05-01T12:00:00.000Z' } },
          },
        },
      }
      vi.stubGlobal('fetch', vi.fn().mockResolvedValue(mockFetchResponse(fixture)))

      const stats = await provider.getMarketStats('BTC')

      expect(stats.marketCap).toBeNull()
      expect(stats.volume24h).toBeNull()
      expect(stats.circulatingSupply).toBeNull()
      expect(stats.totalSupply).toBeNull()
      expect(stats.change24h).toBeNull()
    })

    it('should throw when the requested vs-currency is missing from quote', async () => {
      const fixture = {
        data: {
          BTC: {
            id: 1,
            name: 'Bitcoin',
            symbol: 'BTC',
            quote: { EUR: { price: 1 } },
          },
        },
      }
      vi.stubGlobal('fetch', vi.fn().mockResolvedValue(mockFetchResponse(fixture)))

      await expect(provider.getMarketStats('BTC', 'usd')).rejects.toThrow(
        /no 'usd' price in market_data/,
      )
    })
  })

  describe('listSupportedSymbols', () => {
    it('should return CMC numeric ids stringified', async () => {
      vi.stubGlobal('fetch', vi.fn().mockResolvedValue(mockFetchResponse(LISTINGS_LATEST_FIXTURE)))

      const ids = await provider.listSupportedSymbols()

      expect(ids).toEqual(['1', '1027'])
    })

    it('should hit /cryptocurrency/listings/latest with limit=5000', async () => {
      const mockFetch = vi.fn().mockResolvedValue(mockFetchResponse(LISTINGS_LATEST_FIXTURE))
      vi.stubGlobal('fetch', mockFetch)

      await provider.listSupportedSymbols()

      const calledUrl = mockFetch.mock.calls[0][0] as string
      expect(calledUrl).toContain('/cryptocurrency/listings/latest?')
      expect(calledUrl).toContain('limit=5000')
      expect(calledUrl).toContain('start=1')
    })

    it('should paginate via start when a full page is returned', async () => {
      // Build a 5000-item page, then a short page → loop should stop after 2.
      const fullPage = {
        data: Array.from({ length: 5000 }, (_, i) => ({
          id: i + 1,
          name: `Coin${String(i + 1)}`,
          symbol: `C${String(i + 1)}`,
          quote: {},
        })),
      }
      const shortPage = {
        data: [{ id: 999_999, name: 'Tail', symbol: 'TAIL', quote: {} }],
      }
      const mockFetch = vi
        .fn()
        .mockResolvedValueOnce(mockFetchResponse(fullPage))
        .mockResolvedValueOnce(mockFetchResponse(shortPage))
      vi.stubGlobal('fetch', mockFetch)

      const ids = await provider.listSupportedSymbols()

      expect(mockFetch).toHaveBeenCalledTimes(2)
      const firstUrl = mockFetch.mock.calls[0][0] as string
      const secondUrl = mockFetch.mock.calls[1][0] as string
      expect(firstUrl).toContain('start=1')
      expect(secondUrl).toContain('start=5001')
      expect(ids).toHaveLength(5001)
      expect(ids[5000]).toBe('999999')
    })
  })

  describe('Auth (apiKey)', () => {
    it('should send the X-CMC_PRO_API_KEY header on every request', async () => {
      const p = createProvider({ apiKey: 'super-secret-key' })
      const mockFetch = vi.fn().mockResolvedValue(mockFetchResponse(QUOTES_LATEST_FIXTURE))
      vi.stubGlobal('fetch', mockFetch)

      await p.getPrice('BTC')

      const calledOpts = mockFetch.mock.calls[0][1] as { headers: Record<string, string> }
      expect(calledOpts.headers['X-CMC_PRO_API_KEY']).toBe('super-secret-key')
    })

    it('should respect a custom baseUrl override', async () => {
      const p = createProvider({ apiKey: 'k', baseUrl: 'https://example.test/v1' })
      const mockFetch = vi.fn().mockResolvedValue(mockFetchResponse(QUOTES_LATEST_FIXTURE))
      vi.stubGlobal('fetch', mockFetch)

      await p.getPrice('BTC')

      const calledUrl = mockFetch.mock.calls[0][0] as string
      expect(calledUrl.startsWith('https://example.test/v1/')).toBe(true)
    })

    it('should NOT send the X-CMC_PRO_API_KEY header when no key is set', async () => {
      const p = createProvider() // no apiKey
      const mockFetch = vi.fn().mockResolvedValue(mockFetchResponse(QUOTES_LATEST_FIXTURE))
      vi.stubGlobal('fetch', mockFetch)

      await p.getPrice('BTC')

      const calledOpts = mockFetch.mock.calls[0][1] as { headers: Record<string, string> }
      expect(calledOpts.headers['X-CMC_PRO_API_KEY']).toBeUndefined()
    })
  })

  describe('error handling', () => {
    it('should throw a CoinMarketCapRateLimitedError on HTTP 429', async () => {
      vi.stubGlobal(
        'fetch',
        vi.fn().mockResolvedValue(mockFetchResponse({}, 429, { 'retry-after': '42' })),
      )

      const error = await provider.getPrice('BTC').then(
        () => null,
        (err: unknown) => err,
      )

      expect(error).toBeInstanceOf(CoinMarketCapRateLimitedError)
      expect((error as CoinMarketCapRateLimitedError).code).toBe(RATE_LIMITED)
      expect((error as CoinMarketCapRateLimitedError).retryAfterSeconds).toBe(42)
    })

    it('should leave retryAfterSeconds null when the header is absent', async () => {
      vi.stubGlobal('fetch', vi.fn().mockResolvedValue(mockFetchResponse({}, 429)))

      const error = await provider.getPrice('BTC').then(
        () => null,
        (err: unknown) => err,
      )

      expect(error).toBeInstanceOf(CoinMarketCapRateLimitedError)
      expect((error as CoinMarketCapRateLimitedError).retryAfterSeconds).toBeNull()
    })

    it('should accept an HTTP-date Retry-After header', async () => {
      const future = new Date(Date.now() + 30_000).toUTCString()
      vi.stubGlobal(
        'fetch',
        vi.fn().mockResolvedValue(mockFetchResponse({}, 429, { 'retry-after': future })),
      )

      const error = await provider.getPrice('BTC').then(
        () => null,
        (err: unknown) => err,
      )

      expect(error).toBeInstanceOf(CoinMarketCapRateLimitedError)
      const seconds = (error as CoinMarketCapRateLimitedError).retryAfterSeconds
      expect(seconds).not.toBeNull()
      expect(seconds!).toBeGreaterThan(0)
      expect(seconds!).toBeLessThanOrEqual(31)
    })

    it('should not include the API key in the rate-limited error', async () => {
      const p = createProvider({ apiKey: 'super-secret-key' })
      vi.stubGlobal('fetch', vi.fn().mockResolvedValue(mockFetchResponse({}, 429)))

      const error = await p.getPrice('BTC').then(
        () => null,
        (err: unknown) => err,
      )

      expect(error).toBeInstanceOf(CoinMarketCapRateLimitedError)
      expect((error as Error).message).not.toContain('super-secret-key')
    })

    it('should throw on other HTTP errors with the status in the message', async () => {
      vi.stubGlobal('fetch', vi.fn().mockResolvedValue(mockFetchResponse({}, 500)))

      await expect(provider.getPrice('BTC')).rejects.toThrow(/failed with status 500/)
    })

    it('should not include the API key in non-429 HTTP errors', async () => {
      const p = createProvider({ apiKey: 'super-secret-key' })
      vi.stubGlobal('fetch', vi.fn().mockResolvedValue(mockFetchResponse({}, 401)))

      const error = await p.getPrice('BTC').then(
        () => null,
        (err: unknown) => err,
      )

      expect(error).toBeInstanceOf(Error)
      expect((error as Error).message).not.toContain('super-secret-key')
    })

    it('should reject when fetch is aborted by timeout', async () => {
      const p = createProvider({ apiKey: 'k', timeout: 25 })
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

      await expect(p.getPrice('BTC')).rejects.toThrow()
    })
  })
})
