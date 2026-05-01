import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import type { EquityPricesProvider } from '@molecule/api-equity-prices'

import { createProvider, sanitizeUrl } from '../provider.js'

/**
 * Builds a fake `Response` for `vi.stubGlobal('fetch', ...)`.
 */
const mockFetchResponse = (data: unknown, status = 200): Response =>
  ({
    ok: status >= 200 && status < 300,
    status,
    json: () => Promise.resolve(data),
  }) as Response

/** Realistic IEX `/stock/AAPL/quote` payload. */
const quoteFixture = {
  symbol: 'AAPL',
  latestPrice: 189.42,
  close: 188.05,
  currency: 'USD',
  latestUpdate: 1_745_000_000_000,
  primaryExchange: 'NASDAQ',
}

/** Realistic IEX `/stock/AAPL/chart/1m` payload (3 daily bars, ascending). */
const chartDailyFixture = [
  { date: '2026-04-28', close: 185.9 },
  { date: '2026-04-29', close: 188.05 },
  { date: '2026-04-30', close: 189.42 },
]

/** Realistic IEX `/stock/AAPL/chart/1d` intraday payload. */
const chartIntradayFixture = [
  { date: '2026-04-30', minute: '14:00', close: 188.75 },
  { date: '2026-04-30', minute: '15:00', close: 189.1 },
  { date: '2026-04-30', minute: '16:00', close: 189.42 },
]

/** Realistic IEX `/search/apple` payload. */
const searchFixture = [
  {
    symbol: 'AAPL',
    securityName: 'Apple Inc',
    securityType: 'cs',
    exchange: 'NASDAQ',
    currency: 'USD',
  },
  {
    symbol: 'AAPL.MX',
    securityName: 'Apple Inc',
    securityType: 'cs',
    exchange: 'MEX',
    currency: 'MXN',
  },
]

/** Realistic IEX `/stock/AAPL/company` payload. */
const companyFixture = {
  symbol: 'AAPL',
  companyName: 'Apple Inc',
}

/** Realistic IEX `/stock/AAPL/stats` payload. */
const statsFixture = {
  marketcap: 2_950_000_000_000,
  peRatio: 31.42,
  ttmEPS: 6.03,
  // IEX returns dividendYield as percentage (0.46 → 0.46%); core contract is fraction.
  dividendYield: 0.46,
}

describe('iex equity-prices provider', () => {
  let provider: EquityPricesProvider

  beforeEach(() => {
    provider = createProvider({ apiKey: 'test-key' })
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('createProvider', () => {
    it('should expose the EquityPricesProvider methods', () => {
      expect(provider.getQuote).toBeInstanceOf(Function)
      expect(provider.getHistorical).toBeInstanceOf(Function)
      expect(provider.getFundamentals).toBeInstanceOf(Function)
      expect(provider.searchSymbol).toBeInstanceOf(Function)
      expect(provider.listSupportedExchanges).toBeInstanceOf(Function)
    })
  })

  describe('sanitizeUrl', () => {
    it('should redact the token query parameter', () => {
      const url = 'https://cloud.iexapis.com/stable/stock/AAPL/quote?token=secret-token'
      expect(sanitizeUrl(url)).toBe(
        'https://cloud.iexapis.com/stable/stock/AAPL/quote?token=REDACTED',
      )
    })

    it('should redact token when followed by additional params', () => {
      const url = 'https://cloud.iexapis.com/stable/stock/AAPL/chart/1m?token=secret&foo=bar'
      expect(sanitizeUrl(url)).toBe(
        'https://cloud.iexapis.com/stable/stock/AAPL/chart/1m?token=REDACTED&foo=bar',
      )
    })

    it('should leave URLs without a token untouched', () => {
      const url = 'https://cloud.iexapis.com/stable/stock/AAPL/quote'
      expect(sanitizeUrl(url)).toBe(url)
    })
  })

  describe('getQuote', () => {
    it('should map quote response to a normalized EquityQuote', async () => {
      vi.stubGlobal('fetch', vi.fn().mockResolvedValue(mockFetchResponse(quoteFixture)))

      const quote = await provider.getQuote('AAPL')

      expect(quote.symbol).toBe('AAPL')
      expect(quote.price).toBe(189.42)
      expect(quote.currency).toBe('USD')
      expect(quote.exchange).toBe('NASDAQ')
      expect(quote.ts).toEqual(new Date(1_745_000_000_000))
    })

    it('should fall back to close when latestPrice is missing', async () => {
      vi.stubGlobal(
        'fetch',
        vi.fn().mockResolvedValue(
          mockFetchResponse({
            symbol: 'AAPL',
            close: 188.05,
            currency: 'USD',
            latestUpdate: 1_745_000_000_000,
          }),
        ),
      )

      const quote = await provider.getQuote('AAPL')

      expect(quote.price).toBe(188.05)
    })

    it('should call /stock/:symbol/quote with the token query parameter', async () => {
      const mockFetch = vi.fn().mockResolvedValue(mockFetchResponse(quoteFixture))
      vi.stubGlobal('fetch', mockFetch)

      await provider.getQuote('AAPL')

      const calledUrl = mockFetch.mock.calls[0][0] as string
      expect(calledUrl).toContain('https://cloud.iexapis.com/stable/stock/AAPL/quote')
      expect(calledUrl).toContain('token=test-key')
    })

    it('should throw a structured rate-limit error on HTTP 402', async () => {
      vi.stubGlobal('fetch', vi.fn().mockResolvedValue(mockFetchResponse({}, 402)))

      let caught: Error | undefined
      try {
        await provider.getQuote('AAPL')
      } catch (error) {
        caught = error as Error
      }

      expect(caught).toBeDefined()
      expect(caught?.message).toContain('quota exhausted or payment required')
      const cause = caught?.cause as { code?: string } | undefined
      expect(cause?.code).toBe('RATE_LIMITED')
    })

    it('should throw an upstream error when no price is available', async () => {
      vi.stubGlobal(
        'fetch',
        vi.fn().mockResolvedValue(mockFetchResponse({ symbol: 'AAPL', currency: 'USD' })),
      )

      let caught: Error | undefined
      try {
        await provider.getQuote('AAPL')
      } catch (error) {
        caught = error as Error
      }

      expect(caught?.message).toContain('IEX Cloud returned no price for symbol AAPL')
      const cause = caught?.cause as { code?: string } | undefined
      expect(cause?.code).toBe('UPSTREAM_ERROR')
    })

    it('should throw an upstream error on non-OK / non-402 status', async () => {
      vi.stubGlobal('fetch', vi.fn().mockResolvedValue(mockFetchResponse({}, 500)))

      let caught: Error | undefined
      try {
        await provider.getQuote('AAPL')
      } catch (error) {
        caught = error as Error
      }

      expect(caught?.message).toContain('status 500')
      const cause = caught?.cause as { code?: string } | undefined
      expect(cause?.code).toBe('UPSTREAM_ERROR')
    })

    it('should throw a missing-key error if no apiKey is configured and env var is unset', async () => {
      const original = process.env['IEX_API_KEY']
      delete process.env['IEX_API_KEY']
      try {
        const p = createProvider()
        let caught: Error | undefined
        try {
          await p.getQuote('AAPL')
        } catch (error) {
          caught = error as Error
        }
        expect(caught?.message).toContain('API key not configured')
        const cause = caught?.cause as { code?: string } | undefined
        expect(cause?.code).toBe('MISSING_API_KEY')
      } finally {
        if (original !== undefined) {
          process.env['IEX_API_KEY'] = original
        }
      }
    })

    it('should never include the API key in HTTP error messages', async () => {
      const p = createProvider({ apiKey: 'super-secret-key' })
      vi.stubGlobal('fetch', vi.fn().mockResolvedValue(mockFetchResponse({}, 500)))

      let caught: Error | undefined
      try {
        await p.getQuote('AAPL')
      } catch (error) {
        caught = error as Error
      }

      expect(caught).toBeDefined()
      expect(caught?.message).not.toContain('super-secret-key')
      expect(caught?.message).toContain('token=REDACTED')
    })

    it('should never include the API key in 402 error messages', async () => {
      const p = createProvider({ apiKey: 'super-secret-key' })
      vi.stubGlobal('fetch', vi.fn().mockResolvedValue(mockFetchResponse({}, 402)))

      let caught: Error | undefined
      try {
        await p.getQuote('AAPL')
      } catch (error) {
        caught = error as Error
      }

      expect(caught).toBeDefined()
      expect(caught?.message).not.toContain('super-secret-key')
      expect(caught?.message).toContain('token=REDACTED')
    })
  })

  describe('getHistorical', () => {
    it('should map daily chart response to ascending-order bars', async () => {
      vi.stubGlobal('fetch', vi.fn().mockResolvedValue(mockFetchResponse(chartDailyFixture)))

      const bars = await provider.getHistorical('AAPL', '1m')

      expect(bars).toHaveLength(3)
      expect(bars[0].ts).toEqual(new Date('2026-04-28T00:00:00Z'))
      expect(bars[0].close).toBe(185.9)
      expect(bars[2].ts).toEqual(new Date('2026-04-30T00:00:00Z'))
      expect(bars[2].close).toBe(189.42)
    })

    it('should request the IEX range path segment for the requested core range', async () => {
      const mockFetch = vi.fn().mockResolvedValue(mockFetchResponse(chartDailyFixture))
      vi.stubGlobal('fetch', mockFetch)

      await provider.getHistorical('AAPL', '1y')

      const calledUrl = mockFetch.mock.calls[0][0] as string
      expect(calledUrl).toContain('/stock/AAPL/chart/1y')
      expect(calledUrl).toContain('token=test-key')
    })

    it('should use the 1d range path for intraday and combine date+minute into ts', async () => {
      const mockFetch = vi.fn().mockResolvedValue(mockFetchResponse(chartIntradayFixture))
      vi.stubGlobal('fetch', mockFetch)

      const bars = await provider.getHistorical('AAPL', '1d')

      const calledUrl = mockFetch.mock.calls[0][0] as string
      expect(calledUrl).toContain('/stock/AAPL/chart/1d')
      expect(bars).toHaveLength(3)
      expect(bars[0].ts).toEqual(new Date('2026-04-30T14:00:00Z'))
      expect(bars[2].ts).toEqual(new Date('2026-04-30T16:00:00Z'))
      expect(bars[2].close).toBe(189.42)
    })

    it('should skip bars missing close or date', async () => {
      vi.stubGlobal(
        'fetch',
        vi
          .fn()
          .mockResolvedValue(
            mockFetchResponse([
              { date: '2026-04-28', close: 100 },
              { date: '2026-04-29' },
              { close: 101 },
              { date: '2026-04-30', close: 102 },
            ]),
          ),
      )

      const bars = await provider.getHistorical('AAPL', '1m')

      expect(bars).toHaveLength(2)
      expect(bars[0].close).toBe(100)
      expect(bars[1].close).toBe(102)
    })

    it('should return an empty array when the response is not an array', async () => {
      vi.stubGlobal('fetch', vi.fn().mockResolvedValue(mockFetchResponse({})))

      const bars = await provider.getHistorical('AAPL', '1m')

      expect(bars).toEqual([])
    })

    it('should surface rate limits during historical requests', async () => {
      vi.stubGlobal('fetch', vi.fn().mockResolvedValue(mockFetchResponse({}, 402)))

      let caught: Error | undefined
      try {
        await provider.getHistorical('AAPL', '1m')
      } catch (error) {
        caught = error as Error
      }
      const cause = caught?.cause as { code?: string } | undefined
      expect(cause?.code).toBe('RATE_LIMITED')
    })
  })

  describe('searchSymbol', () => {
    it('should map matches to normalized EquitySymbolMatch entries', async () => {
      vi.stubGlobal('fetch', vi.fn().mockResolvedValue(mockFetchResponse(searchFixture)))

      const matches = await provider.searchSymbol('apple')

      expect(matches).toHaveLength(2)
      expect(matches[0].symbol).toBe('AAPL')
      expect(matches[0].name).toBe('Apple Inc')
      expect(matches[0].exchange).toBe('NASDAQ')
      expect(matches[0].currency).toBe('USD')
      expect(matches[1].currency).toBe('MXN')
    })

    it('should issue a /search/:query request', async () => {
      const mockFetch = vi.fn().mockResolvedValue(mockFetchResponse(searchFixture))
      vi.stubGlobal('fetch', mockFetch)

      await provider.searchSymbol('apple inc')

      const calledUrl = mockFetch.mock.calls[0][0] as string
      expect(calledUrl).toContain('/search/apple%20inc')
      expect(calledUrl).toContain('token=test-key')
    })

    it('should skip rows missing symbol or name', async () => {
      vi.stubGlobal(
        'fetch',
        vi
          .fn()
          .mockResolvedValue(
            mockFetchResponse([
              { symbol: 'AAPL', securityName: 'Apple Inc' },
              { symbol: 'NONAME' },
              { securityName: 'Lonely Corp' },
            ]),
          ),
      )

      const matches = await provider.searchSymbol('a')

      expect(matches).toHaveLength(1)
      expect(matches[0].symbol).toBe('AAPL')
    })

    it('should return an empty array when there are no matches', async () => {
      vi.stubGlobal('fetch', vi.fn().mockResolvedValue(mockFetchResponse([])))

      const matches = await provider.searchSymbol('zzz')

      expect(matches).toEqual([])
    })
  })

  describe('getFundamentals', () => {
    it('should combine /company and /stats into a normalized snapshot', async () => {
      const mockFetch = vi
        .fn()
        .mockImplementation((url: string) =>
          url.includes('/company')
            ? Promise.resolve(mockFetchResponse(companyFixture))
            : Promise.resolve(mockFetchResponse(statsFixture)),
        )
      vi.stubGlobal('fetch', mockFetch)

      const fundamentals = await provider.getFundamentals('AAPL')

      expect(fundamentals.symbol).toBe('AAPL')
      expect(fundamentals.marketCap).toBe(2_950_000_000_000)
      expect(fundamentals.peRatio).toBe(31.42)
      expect(fundamentals.eps).toBe(6.03)
      // IEX returns dividend yield as percent (0.46 → core fraction 0.0046).
      expect(fundamentals.dividendYield).toBeCloseTo(0.0046, 6)
    })

    it('should treat missing fields as undefined', async () => {
      const mockFetch = vi
        .fn()
        .mockImplementation((url: string) =>
          url.includes('/company')
            ? Promise.resolve(mockFetchResponse({ symbol: 'XYZ' }))
            : Promise.resolve(mockFetchResponse({})),
        )
      vi.stubGlobal('fetch', mockFetch)

      const fundamentals = await provider.getFundamentals('XYZ')

      expect(fundamentals.symbol).toBe('XYZ')
      expect(fundamentals.marketCap).toBeUndefined()
      expect(fundamentals.peRatio).toBeUndefined()
      expect(fundamentals.eps).toBeUndefined()
      expect(fundamentals.dividendYield).toBeUndefined()
    })

    it('should call both /company and /stats endpoints', async () => {
      const mockFetch = vi
        .fn()
        .mockImplementation((url: string) =>
          url.includes('/company')
            ? Promise.resolve(mockFetchResponse(companyFixture))
            : Promise.resolve(mockFetchResponse(statsFixture)),
        )
      vi.stubGlobal('fetch', mockFetch)

      await provider.getFundamentals('AAPL')

      const urls = mockFetch.mock.calls.map((call: unknown[]) => call[0] as string)
      expect(urls.some((u) => u.includes('/stock/AAPL/company'))).toBe(true)
      expect(urls.some((u) => u.includes('/stock/AAPL/stats'))).toBe(true)
    })
  })

  describe('listSupportedExchanges', () => {
    it('should return a static list including the major US exchanges', async () => {
      const exchanges = await provider.listSupportedExchanges()

      expect(exchanges).toContain('NYSE')
      expect(exchanges).toContain('NASDAQ')
      expect(exchanges).toContain('AMEX')
      expect(exchanges).toContain('IEX')
    })

    it('should return a fresh array each call (caller cannot mutate the source list)', async () => {
      const a = await provider.listSupportedExchanges()
      const b = await provider.listSupportedExchanges()

      expect(a).not.toBe(b)
      a.push('FAKE')
      const c = await provider.listSupportedExchanges()
      expect(c).not.toContain('FAKE')
    })
  })

  describe('config overrides', () => {
    it('should respect a custom baseUrl', async () => {
      const p = createProvider({
        apiKey: 'test-key',
        baseUrl: 'https://sandbox.iexapis.com/stable',
      })
      const mockFetch = vi.fn().mockResolvedValue(mockFetchResponse(quoteFixture))
      vi.stubGlobal('fetch', mockFetch)

      await p.getQuote('AAPL')

      const calledUrl = mockFetch.mock.calls[0][0] as string
      expect(calledUrl.startsWith('https://sandbox.iexapis.com/stable/stock/AAPL/quote')).toBe(true)
    })

    it('should normalize a baseUrl with a trailing slash', async () => {
      const p = createProvider({
        apiKey: 'test-key',
        baseUrl: 'https://sandbox.iexapis.com/stable/',
      })
      const mockFetch = vi.fn().mockResolvedValue(mockFetchResponse(quoteFixture))
      vi.stubGlobal('fetch', mockFetch)

      await p.getQuote('AAPL')

      const calledUrl = mockFetch.mock.calls[0][0] as string
      expect(calledUrl).not.toContain('//stock/')
      expect(calledUrl.startsWith('https://sandbox.iexapis.com/stable/stock/AAPL/quote')).toBe(true)
    })

    it('should reject when fetch is aborted by timeout', async () => {
      const p = createProvider({ apiKey: 'test-key', timeout: 25 })
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

      await expect(p.getQuote('AAPL')).rejects.toThrow()
    })
  })
})
