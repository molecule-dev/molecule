import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import type { EquityPricesProvider } from '@molecule/api-equity-prices'

import { createProvider, sanitizeUrl } from '../provider.js'

/**
 * Builds a fake `Response` for `vi.stubGlobal('fetch', ...)`.
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
      get(name: string): string | null {
        const lower = name.toLowerCase()
        for (const [k, v] of Object.entries(headers)) {
          if (k.toLowerCase() === lower) {
            return v
          }
        }
        return null
      },
    },
    json: () => Promise.resolve(data),
  }) as unknown as Response

/** Realistic Polygon `/v2/last/trade/AAPL` payload. */
const lastTradeFixture = {
  status: 'OK',
  ticker: 'AAPL',
  results: {
    p: 189.42,
    // 2026-04-30T20:00:00Z — Polygon emits nanoseconds since epoch.
    t: new Date('2026-04-30T20:00:00Z').getTime() * 1_000_000,
    x: 11,
  },
}

/** Realistic Polygon `/v2/aggs/...` daily payload (3 bars, ascending). */
const aggregatesFixture = {
  status: 'OK',
  ticker: 'AAPL',
  results: [
    { c: 185.9, t: new Date('2026-04-28T00:00:00Z').getTime() },
    { c: 188.05, t: new Date('2026-04-29T00:00:00Z').getTime() },
    { c: 189.42, t: new Date('2026-04-30T00:00:00Z').getTime() },
  ],
}

/** Realistic Polygon `/v3/reference/tickers?search=...` payload. */
const tickersSearchFixture = {
  status: 'OK',
  results: [
    {
      ticker: 'AAPL',
      name: 'Apple Inc.',
      primary_exchange: 'XNAS',
      currency_name: 'usd',
      market: 'stocks',
      type: 'CS',
      active: true,
    },
    {
      ticker: 'AAPL.MX',
      name: 'Apple Inc. (Mexico)',
      primary_exchange: 'XMEX',
      currency_name: 'mxn',
      market: 'stocks',
      type: 'CS',
      active: true,
    },
  ],
}

/** Realistic Polygon `/v3/reference/tickers/AAPL` payload. */
const tickerDetailsFixture = {
  status: 'OK',
  results: {
    ticker: 'AAPL',
    name: 'Apple Inc.',
    market_cap: 2_950_000_000_000,
    currency_name: 'usd',
    weighted_shares_outstanding: 15_500_000_000,
  },
}

/** Realistic Polygon `/vX/reference/financials?ticker=AAPL&limit=1` payload. */
const financialsFixture = {
  status: 'OK',
  results: [
    {
      financials: {
        income_statement: {
          basic_earnings_per_share: { value: 6.21 },
          diluted_earnings_per_share: { value: 6.03 },
        },
      },
    },
  ],
}

/** Realistic Polygon `/v3/reference/exchanges?asset_class=stocks` payload. */
const exchangesFixture = {
  status: 'OK',
  results: [
    {
      acronym: 'NASDAQ',
      mic: 'XNAS',
      operating_mic: 'XNAS',
      asset_class: 'stocks',
      type: 'exchange',
      name: 'Nasdaq Stock Market',
    },
    {
      acronym: 'NYSE',
      mic: 'XNYS',
      operating_mic: 'XNYS',
      asset_class: 'stocks',
      type: 'exchange',
      name: 'New York Stock Exchange',
    },
    {
      acronym: 'AMEX',
      mic: 'XASE',
      operating_mic: 'XNYS',
      asset_class: 'stocks',
      type: 'exchange',
      name: 'NYSE American',
    },
    // Trade-reporting facility — should be filtered out.
    {
      mic: 'FINY',
      asset_class: 'stocks',
      type: 'TRF',
      name: 'NYSE TRF',
    },
  ],
}

describe('polygon equity-prices provider', () => {
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
    it('should redact the apiKey query parameter', () => {
      const url = 'https://api.polygon.io/v2/last/trade/AAPL?apiKey=secret-token'
      expect(sanitizeUrl(url)).toBe(
        'https://api.polygon.io/v2/last/trade/AAPL?apiKey=REDACTED',
      )
    })

    it('should redact apiKey when followed by additional parameters', () => {
      const url =
        'https://api.polygon.io/v3/reference/tickers?search=apple&apiKey=secret&limit=10'
      expect(sanitizeUrl(url)).toBe(
        'https://api.polygon.io/v3/reference/tickers?search=apple&apiKey=REDACTED&limit=10',
      )
    })

    it('should leave URLs without an apiKey untouched', () => {
      const url = 'https://api.polygon.io/v2/last/trade/AAPL?foo=bar'
      expect(sanitizeUrl(url)).toBe(url)
    })
  })

  describe('getQuote', () => {
    it('should map last-trade to a normalized EquityQuote', async () => {
      vi.stubGlobal('fetch', vi.fn().mockResolvedValue(mockFetchResponse(lastTradeFixture)))

      const quote = await provider.getQuote('AAPL')

      expect(quote.symbol).toBe('AAPL')
      expect(quote.price).toBe(189.42)
      expect(quote.currency).toBe('USD')
      expect(quote.ts).toEqual(new Date('2026-04-30T20:00:00Z'))
    })

    it('should call /v2/last/trade with the apiKey', async () => {
      const mockFetch = vi.fn().mockResolvedValue(mockFetchResponse(lastTradeFixture))
      vi.stubGlobal('fetch', mockFetch)

      await provider.getQuote('AAPL')

      const calledUrl = mockFetch.mock.calls[0][0] as string
      expect(calledUrl).toContain('https://api.polygon.io/v2/last/trade/AAPL?')
      expect(calledUrl).toContain('apiKey=test-key')
    })

    it('should URL-encode awkward symbols in the path', async () => {
      const mockFetch = vi.fn().mockResolvedValue(mockFetchResponse(lastTradeFixture))
      vi.stubGlobal('fetch', mockFetch)

      await provider.getQuote('BRK.B')

      const calledUrl = mockFetch.mock.calls[0][0] as string
      expect(calledUrl).toContain('/v2/last/trade/BRK.B?')
    })

    it('should throw a structured rate-limit error on HTTP 429', async () => {
      vi.stubGlobal(
        'fetch',
        vi.fn().mockResolvedValue(mockFetchResponse({}, 429, { 'Retry-After': '60' })),
      )

      let caught: Error | undefined
      try {
        await provider.getQuote('AAPL')
      } catch (error) {
        caught = error as Error
      }

      expect(caught).toBeDefined()
      expect(caught?.message).toContain('rate limit')
      const cause = caught?.cause as { code?: string; retryAfterSeconds?: number } | undefined
      expect(cause?.code).toBe('RATE_LIMITED')
      expect(cause?.retryAfterSeconds).toBe(60)
    })

    it('should parse Retry-After HTTP-date values', async () => {
      const future = new Date(Date.now() + 30_000).toUTCString()
      vi.stubGlobal(
        'fetch',
        vi.fn().mockResolvedValue(mockFetchResponse({}, 429, { 'Retry-After': future })),
      )

      let caught: Error | undefined
      try {
        await provider.getQuote('AAPL')
      } catch (error) {
        caught = error as Error
      }
      const cause = caught?.cause as { retryAfterSeconds?: number } | undefined
      expect(cause?.retryAfterSeconds).toBeGreaterThanOrEqual(0)
      expect(cause?.retryAfterSeconds).toBeLessThanOrEqual(31)
    })

    it('should omit retryAfterSeconds when no Retry-After header is set', async () => {
      vi.stubGlobal('fetch', vi.fn().mockResolvedValue(mockFetchResponse({}, 429)))

      let caught: Error | undefined
      try {
        await provider.getQuote('AAPL')
      } catch (error) {
        caught = error as Error
      }
      const cause = caught?.cause as { code?: string; retryAfterSeconds?: number } | undefined
      expect(cause?.code).toBe('RATE_LIMITED')
      expect(cause?.retryAfterSeconds).toBeUndefined()
    })

    it('should throw an upstream error when results are missing', async () => {
      vi.stubGlobal(
        'fetch',
        vi.fn().mockResolvedValue(mockFetchResponse({ status: 'OK', ticker: 'AAPL' })),
      )

      await expect(provider.getQuote('AAPL')).rejects.toThrow(
        'Polygon.io returned no quote for symbol AAPL',
      )
    })

    it('should throw an upstream error when Polygon returns a non-OK status', async () => {
      vi.stubGlobal(
        'fetch',
        vi.fn().mockResolvedValue(
          mockFetchResponse({
            status: 'ERROR',
            error: 'Unknown ticker XYZ',
          }),
        ),
      )

      let caught: Error | undefined
      try {
        await provider.getQuote('XYZ')
      } catch (error) {
        caught = error as Error
      }
      expect(caught?.message).toContain('Unknown ticker XYZ')
      const cause = caught?.cause as { code?: string } | undefined
      expect(cause?.code).toBe('UPSTREAM_ERROR')
    })

    it('should throw a missing-key error if no apiKey is configured and env var is unset', async () => {
      const original = process.env['POLYGON_API_KEY']
      delete process.env['POLYGON_API_KEY']
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
          process.env['POLYGON_API_KEY'] = original
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
      expect(caught?.message).toContain('apiKey=REDACTED')
      expect(caught?.message).toContain('status 500')
    })
  })

  describe('getHistorical', () => {
    it('should map aggregate results to ascending-order bars', async () => {
      vi.stubGlobal('fetch', vi.fn().mockResolvedValue(mockFetchResponse(aggregatesFixture)))

      const bars = await provider.getHistorical('AAPL', '1m')

      expect(bars).toHaveLength(3)
      expect(bars[0].ts).toEqual(new Date('2026-04-28T00:00:00Z'))
      expect(bars[0].close).toBe(185.9)
      expect(bars[2].ts).toEqual(new Date('2026-04-30T00:00:00Z'))
      expect(bars[2].close).toBe(189.42)
    })

    it('should request /v2/aggs with the correct multiplier and timespan for 1m', async () => {
      const mockFetch = vi.fn().mockResolvedValue(mockFetchResponse(aggregatesFixture))
      vi.stubGlobal('fetch', mockFetch)

      await provider.getHistorical('AAPL', '1m')

      const calledUrl = mockFetch.mock.calls[0][0] as string
      expect(calledUrl).toMatch(/\/v2\/aggs\/ticker\/AAPL\/range\/1\/day\/\d{4}-\d{2}-\d{2}\/\d{4}-\d{2}-\d{2}\?/u)
      expect(calledUrl).toContain('apiKey=test-key')
      expect(calledUrl).toContain('adjusted=true')
      expect(calledUrl).toContain('sort=asc')
    })

    it('should use minute timespan for short intraday ranges', async () => {
      const mockFetch = vi.fn().mockResolvedValue(mockFetchResponse(aggregatesFixture))
      vi.stubGlobal('fetch', mockFetch)

      await provider.getHistorical('AAPL', '1d')

      const calledUrl = mockFetch.mock.calls[0][0] as string
      expect(calledUrl).toMatch(/\/v2\/aggs\/ticker\/AAPL\/range\/5\/minute\//u)
    })

    it('should use week timespan for 5y', async () => {
      const mockFetch = vi.fn().mockResolvedValue(mockFetchResponse(aggregatesFixture))
      vi.stubGlobal('fetch', mockFetch)

      await provider.getHistorical('AAPL', '5y')

      const calledUrl = mockFetch.mock.calls[0][0] as string
      expect(calledUrl).toMatch(/\/v2\/aggs\/ticker\/AAPL\/range\/1\/week\//u)
    })

    it('should use month timespan for max', async () => {
      const mockFetch = vi.fn().mockResolvedValue(mockFetchResponse(aggregatesFixture))
      vi.stubGlobal('fetch', mockFetch)

      await provider.getHistorical('AAPL', 'max')

      const calledUrl = mockFetch.mock.calls[0][0] as string
      expect(calledUrl).toMatch(/\/v2\/aggs\/ticker\/AAPL\/range\/1\/month\//u)
    })

    it('should slice to the configured maxBars per range', async () => {
      // Build 30 daily bars; '1m' caps at 22.
      const results = []
      for (let i = 0; i < 30; i += 1) {
        const day = String(i + 1).padStart(2, '0')
        results.push({
          c: 100 + i,
          t: new Date(`2026-04-${day}T00:00:00Z`).getTime(),
        })
      }
      vi.stubGlobal(
        'fetch',
        vi.fn().mockResolvedValue(mockFetchResponse({ status: 'OK', results })),
      )

      const bars = await provider.getHistorical('AAPL', '1m')

      expect(bars).toHaveLength(22)
      expect(bars[0].ts).toEqual(new Date('2026-04-09T00:00:00Z'))
      expect(bars[21].ts).toEqual(new Date('2026-04-30T00:00:00Z'))
    })

    it('should return an empty array when results are missing', async () => {
      vi.stubGlobal('fetch', vi.fn().mockResolvedValue(mockFetchResponse({ status: 'OK' })))

      const bars = await provider.getHistorical('AAPL', '1m')

      expect(bars).toEqual([])
    })

    it('should surface rate limits during historical requests', async () => {
      vi.stubGlobal('fetch', vi.fn().mockResolvedValue(mockFetchResponse({}, 429)))

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
    it('should map results to normalized EquitySymbolMatch entries', async () => {
      vi.stubGlobal('fetch', vi.fn().mockResolvedValue(mockFetchResponse(tickersSearchFixture)))

      const matches = await provider.searchSymbol('apple')

      expect(matches).toHaveLength(2)
      expect(matches[0].symbol).toBe('AAPL')
      expect(matches[0].name).toBe('Apple Inc.')
      expect(matches[0].exchange).toBe('XNAS')
      expect(matches[0].currency).toBe('USD')
      expect(matches[1].currency).toBe('MXN')
    })

    it('should issue a /v3/reference/tickers request with the search keyword', async () => {
      const mockFetch = vi.fn().mockResolvedValue(mockFetchResponse(tickersSearchFixture))
      vi.stubGlobal('fetch', mockFetch)

      await provider.searchSymbol('apple inc')

      const calledUrl = mockFetch.mock.calls[0][0] as string
      expect(calledUrl).toContain('/v3/reference/tickers?')
      expect(calledUrl).toContain('search=apple+inc')
      expect(calledUrl).toContain('active=true')
      expect(calledUrl).toContain('market=stocks')
    })

    it('should return an empty array when there are no matches', async () => {
      vi.stubGlobal(
        'fetch',
        vi.fn().mockResolvedValue(mockFetchResponse({ status: 'OK', results: [] })),
      )

      const matches = await provider.searchSymbol('zzz')

      expect(matches).toEqual([])
    })

    it('should skip rows that lack a ticker or name', async () => {
      vi.stubGlobal(
        'fetch',
        vi.fn().mockResolvedValue(
          mockFetchResponse({
            status: 'OK',
            results: [
              { ticker: 'AAPL', name: 'Apple Inc.' },
              { ticker: 'NONAME' },
              { name: 'Missing ticker' },
            ],
          }),
        ),
      )

      const matches = await provider.searchSymbol('apple')

      expect(matches).toHaveLength(1)
      expect(matches[0].symbol).toBe('AAPL')
    })
  })

  describe('getFundamentals', () => {
    it('should combine ticker-details + financials + quote into a normalized snapshot', async () => {
      const mockFetch = vi.fn().mockImplementation((url: string) => {
        if (url.includes('/v3/reference/tickers/AAPL')) {
          return Promise.resolve(mockFetchResponse(tickerDetailsFixture))
        }
        if (url.includes('/vX/reference/financials')) {
          return Promise.resolve(mockFetchResponse(financialsFixture))
        }
        if (url.includes('/v2/last/trade')) {
          return Promise.resolve(mockFetchResponse(lastTradeFixture))
        }
        throw new Error(`Unexpected URL ${url}`)
      })
      vi.stubGlobal('fetch', mockFetch)

      const fundamentals = await provider.getFundamentals('AAPL')

      expect(fundamentals.symbol).toBe('AAPL')
      expect(fundamentals.marketCap).toBe(2_950_000_000_000)
      expect(fundamentals.currency).toBe('USD')
      // Diluted EPS is preferred.
      expect(fundamentals.eps).toBe(6.03)
      // peRatio = 189.42 / 6.03 ≈ 31.412...
      expect(fundamentals.peRatio).toBeCloseTo(189.42 / 6.03, 6)
    })

    it('should still return fundamentals when the quote fetch fails', async () => {
      const mockFetch = vi.fn().mockImplementation((url: string) => {
        if (url.includes('/v3/reference/tickers/AAPL')) {
          return Promise.resolve(mockFetchResponse(tickerDetailsFixture))
        }
        if (url.includes('/vX/reference/financials')) {
          return Promise.resolve(mockFetchResponse(financialsFixture))
        }
        if (url.includes('/v2/last/trade')) {
          return Promise.resolve(mockFetchResponse({}, 500))
        }
        throw new Error(`Unexpected URL ${url}`)
      })
      vi.stubGlobal('fetch', mockFetch)

      const fundamentals = await provider.getFundamentals('AAPL')

      expect(fundamentals.symbol).toBe('AAPL')
      expect(fundamentals.eps).toBe(6.03)
      // No quote → no derived peRatio.
      expect(fundamentals.peRatio).toBeUndefined()
    })

    it('should handle a missing financials block', async () => {
      const mockFetch = vi.fn().mockImplementation((url: string) => {
        if (url.includes('/v3/reference/tickers/AAPL')) {
          return Promise.resolve(mockFetchResponse(tickerDetailsFixture))
        }
        if (url.includes('/vX/reference/financials')) {
          return Promise.resolve(mockFetchResponse({ status: 'OK', results: [] }))
        }
        if (url.includes('/v2/last/trade')) {
          return Promise.resolve(mockFetchResponse(lastTradeFixture))
        }
        throw new Error(`Unexpected URL ${url}`)
      })
      vi.stubGlobal('fetch', mockFetch)

      const fundamentals = await provider.getFundamentals('AAPL')

      expect(fundamentals.symbol).toBe('AAPL')
      expect(fundamentals.marketCap).toBe(2_950_000_000_000)
      expect(fundamentals.eps).toBeUndefined()
      expect(fundamentals.peRatio).toBeUndefined()
    })

    it('should call /v3/reference/tickers/:symbol and /vX/reference/financials', async () => {
      const calls: string[] = []
      const mockFetch = vi.fn().mockImplementation((url: string) => {
        calls.push(url)
        if (url.includes('/v3/reference/tickers/AAPL')) {
          return Promise.resolve(mockFetchResponse(tickerDetailsFixture))
        }
        if (url.includes('/vX/reference/financials')) {
          return Promise.resolve(mockFetchResponse(financialsFixture))
        }
        if (url.includes('/v2/last/trade')) {
          return Promise.resolve(mockFetchResponse(lastTradeFixture))
        }
        throw new Error(`Unexpected URL ${url}`)
      })
      vi.stubGlobal('fetch', mockFetch)

      await provider.getFundamentals('AAPL')

      expect(calls.some((u) => u.includes('/v3/reference/tickers/AAPL?'))).toBe(true)
      expect(
        calls.some((u) => u.includes('/vX/reference/financials?') && u.includes('ticker=AAPL')),
      ).toBe(true)
    })
  })

  describe('listSupportedExchanges', () => {
    it('should return the major US exchange acronyms', async () => {
      vi.stubGlobal('fetch', vi.fn().mockResolvedValue(mockFetchResponse(exchangesFixture)))

      const exchanges = await provider.listSupportedExchanges()

      expect(exchanges).toContain('NYSE')
      expect(exchanges).toContain('NASDAQ')
      expect(exchanges).toContain('AMEX')
    })

    it('should filter out trade-reporting facilities', async () => {
      vi.stubGlobal('fetch', vi.fn().mockResolvedValue(mockFetchResponse(exchangesFixture)))

      const exchanges = await provider.listSupportedExchanges()

      expect(exchanges).not.toContain('FINY')
    })

    it('should request /v3/reference/exchanges with the stocks asset class', async () => {
      const mockFetch = vi.fn().mockResolvedValue(mockFetchResponse(exchangesFixture))
      vi.stubGlobal('fetch', mockFetch)

      await provider.listSupportedExchanges()

      const calledUrl = mockFetch.mock.calls[0][0] as string
      expect(calledUrl).toContain('/v3/reference/exchanges?')
      expect(calledUrl).toContain('asset_class=stocks')
    })

    it('should return an empty array when results are missing', async () => {
      vi.stubGlobal('fetch', vi.fn().mockResolvedValue(mockFetchResponse({ status: 'OK' })))

      const exchanges = await provider.listSupportedExchanges()

      expect(exchanges).toEqual([])
    })
  })

  describe('config overrides', () => {
    it('should respect a custom baseUrl', async () => {
      const p = createProvider({ apiKey: 'test-key', baseUrl: 'https://proxy.example/polygon' })
      const mockFetch = vi.fn().mockResolvedValue(mockFetchResponse(lastTradeFixture))
      vi.stubGlobal('fetch', mockFetch)

      await p.getQuote('AAPL')

      const calledUrl = mockFetch.mock.calls[0][0] as string
      expect(calledUrl.startsWith('https://proxy.example/polygon/v2/last/trade/AAPL?')).toBe(true)
    })

    it('should strip trailing slashes from a custom baseUrl', async () => {
      const p = createProvider({ apiKey: 'test-key', baseUrl: 'https://proxy.example/polygon/' })
      const mockFetch = vi.fn().mockResolvedValue(mockFetchResponse(lastTradeFixture))
      vi.stubGlobal('fetch', mockFetch)

      await p.getQuote('AAPL')

      const calledUrl = mockFetch.mock.calls[0][0] as string
      expect(calledUrl.startsWith('https://proxy.example/polygon/v2/last/trade/AAPL?')).toBe(true)
      expect(calledUrl).not.toContain('//v2/')
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
