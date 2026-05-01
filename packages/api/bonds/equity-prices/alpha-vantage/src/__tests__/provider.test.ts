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

/** Realistic Alpha Vantage `GLOBAL_QUOTE` payload for AAPL. */
const globalQuoteFixture = {
  'Global Quote': {
    '01. symbol': 'AAPL',
    '02. open': '188.4500',
    '03. high': '189.9300',
    '04. low': '187.6000',
    '05. price': '189.4200',
    '06. volume': '53281930',
    '07. latest trading day': '2026-04-30',
    '08. previous close': '188.0500',
    '09. change': '1.3700',
    '10. change percent': '0.7287%',
  },
}

/** Realistic Alpha Vantage `TIME_SERIES_DAILY` payload (3 bars). */
const timeSeriesDailyFixture = {
  'Meta Data': {
    '1. Information': 'Daily Prices (open, high, low, close) and Volumes',
    '2. Symbol': 'AAPL',
    '3. Last Refreshed': '2026-04-30',
    '4. Output Size': 'Compact',
    '5. Time Zone': 'US/Eastern',
  },
  // Alpha Vantage returns the series in DESCENDING order. The provider
  // must reverse it to ascending.
  'Time Series (Daily)': {
    '2026-04-30': {
      '1. open': '188.4500',
      '2. high': '189.9300',
      '3. low': '187.6000',
      '4. close': '189.4200',
      '5. volume': '53281930',
    },
    '2026-04-29': {
      '1. open': '186.0000',
      '2. high': '188.5000',
      '3. low': '185.7500',
      '4. close': '188.0500',
      '5. volume': '50122100',
    },
    '2026-04-28': {
      '1. open': '184.5000',
      '2. high': '186.6000',
      '3. low': '183.9000',
      '4. close': '185.9000',
      '5. volume': '47889400',
    },
  },
}

/** Realistic Alpha Vantage `TIME_SERIES_INTRADAY` (`60min`) payload. */
const timeSeriesIntradayFixture = {
  'Meta Data': {
    '1. Information': 'Intraday (60min)',
    '2. Symbol': 'AAPL',
    '3. Last Refreshed': '2026-04-30 16:00:00',
    '4. Interval': '60min',
    '5. Output Size': 'Compact',
    '6. Time Zone': 'US/Eastern',
  },
  'Time Series (60min)': {
    '2026-04-30 16:00:00': { '4. close': '189.4200' },
    '2026-04-30 15:00:00': { '4. close': '189.1000' },
    '2026-04-30 14:00:00': { '4. close': '188.7500' },
  },
}

/** Realistic Alpha Vantage `SYMBOL_SEARCH` payload. */
const symbolSearchFixture = {
  bestMatches: [
    {
      '1. symbol': 'AAPL',
      '2. name': 'Apple Inc',
      '3. type': 'Equity',
      '4. region': 'United States',
      '5. marketOpen': '09:30',
      '6. marketClose': '16:00',
      '7. timezone': 'UTC-04',
      '8. currency': 'USD',
      '9. matchScore': '1.0000',
    },
    {
      '1. symbol': 'AAPL.MX',
      '2. name': 'Apple Inc',
      '3. type': 'Equity',
      '4. region': 'Mexico',
      '5. marketOpen': '08:30',
      '6. marketClose': '15:00',
      '7. timezone': 'UTC-06',
      '8. currency': 'MXN',
      '9. matchScore': '0.7273',
    },
  ],
}

/** Realistic Alpha Vantage `OVERVIEW` (fundamentals) payload. */
const overviewFixture = {
  Symbol: 'AAPL',
  Currency: 'USD',
  MarketCapitalization: '2950000000000',
  PERatio: '31.42',
  EPS: '6.03',
  DividendYield: '0.0046',
}

/** Alpha Vantage's canonical rate-limit response shape. */
const rateLimitFixture = {
  Note: 'Thank you for using Alpha Vantage! Our standard API call frequency is 5 calls per minute and 500 calls per day.',
}

describe('alpha-vantage equity-prices provider', () => {
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
    it('should redact the apikey query parameter', () => {
      const url =
        'https://www.alphavantage.co/query?function=GLOBAL_QUOTE&symbol=AAPL&apikey=secret-token'
      expect(sanitizeUrl(url)).toBe(
        'https://www.alphavantage.co/query?function=GLOBAL_QUOTE&symbol=AAPL&apikey=REDACTED',
      )
    })

    it('should redact apikey when it is the first query parameter', () => {
      const url = 'https://www.alphavantage.co/query?apikey=secret&function=GLOBAL_QUOTE'
      expect(sanitizeUrl(url)).toBe(
        'https://www.alphavantage.co/query?apikey=REDACTED&function=GLOBAL_QUOTE',
      )
    })

    it('should leave URLs without an apikey untouched', () => {
      const url = 'https://www.alphavantage.co/query?function=GLOBAL_QUOTE&symbol=AAPL'
      expect(sanitizeUrl(url)).toBe(url)
    })
  })

  describe('getQuote', () => {
    it('should map Global Quote to a normalized EquityQuote', async () => {
      vi.stubGlobal('fetch', vi.fn().mockResolvedValue(mockFetchResponse(globalQuoteFixture)))

      const quote = await provider.getQuote('AAPL')

      expect(quote.symbol).toBe('AAPL')
      expect(quote.price).toBe(189.42)
      expect(quote.currency).toBe('USD')
      expect(quote.ts).toEqual(new Date('2026-04-30T00:00:00Z'))
    })

    it('should call GLOBAL_QUOTE with the symbol and apikey', async () => {
      const mockFetch = vi.fn().mockResolvedValue(mockFetchResponse(globalQuoteFixture))
      vi.stubGlobal('fetch', mockFetch)

      await provider.getQuote('AAPL')

      const calledUrl = mockFetch.mock.calls[0][0] as string
      expect(calledUrl).toContain('https://www.alphavantage.co/query?')
      expect(calledUrl).toContain('function=GLOBAL_QUOTE')
      expect(calledUrl).toContain('symbol=AAPL')
      expect(calledUrl).toContain('apikey=test-key')
    })

    it('should throw a structured rate-limit error when Alpha Vantage returns a Note', async () => {
      vi.stubGlobal('fetch', vi.fn().mockResolvedValue(mockFetchResponse(rateLimitFixture)))

      let caught: Error | undefined
      try {
        await provider.getQuote('AAPL')
      } catch (error) {
        caught = error as Error
      }

      expect(caught).toBeDefined()
      expect(caught?.message).toContain('rate limit')
      const cause = caught?.cause as { code?: string } | undefined
      expect(cause?.code).toBe('RATE_LIMITED')
    })

    it('should throw an upstream error when Global Quote is empty', async () => {
      vi.stubGlobal('fetch', vi.fn().mockResolvedValue(mockFetchResponse({ 'Global Quote': {} })))

      await expect(provider.getQuote('AAPL')).rejects.toThrow(
        'Alpha Vantage returned no quote for symbol AAPL',
      )
    })

    it('should throw an upstream error when Alpha Vantage returns an Error Message', async () => {
      vi.stubGlobal(
        'fetch',
        vi
          .fn()
          .mockResolvedValue(
            mockFetchResponse({ 'Error Message': 'Invalid API call. Please retry...' }),
          ),
      )

      let caught: Error | undefined
      try {
        await provider.getQuote('AAPL')
      } catch (error) {
        caught = error as Error
      }

      expect(caught?.message).toContain('Invalid API call')
      const cause = caught?.cause as { code?: string } | undefined
      expect(cause?.code).toBe('UPSTREAM_ERROR')
    })

    it('should throw a missing-key error if no apiKey is configured and env var is unset', async () => {
      const original = process.env['ALPHA_VANTAGE_API_KEY']
      delete process.env['ALPHA_VANTAGE_API_KEY']
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
          process.env['ALPHA_VANTAGE_API_KEY'] = original
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
      expect(caught?.message).toContain('apikey=REDACTED')
      expect(caught?.message).toContain('status 500')
    })
  })

  describe('getHistorical', () => {
    it('should map TIME_SERIES_DAILY response to ascending-order bars', async () => {
      vi.stubGlobal('fetch', vi.fn().mockResolvedValue(mockFetchResponse(timeSeriesDailyFixture)))

      const bars = await provider.getHistorical('AAPL', '1m')

      expect(bars).toHaveLength(3)
      expect(bars[0].ts).toEqual(new Date('2026-04-28T00:00:00Z'))
      expect(bars[0].close).toBe(185.9)
      expect(bars[2].ts).toEqual(new Date('2026-04-30T00:00:00Z'))
      expect(bars[2].close).toBe(189.42)
    })

    it('should request TIME_SERIES_DAILY with outputsize for daily ranges', async () => {
      const mockFetch = vi.fn().mockResolvedValue(mockFetchResponse(timeSeriesDailyFixture))
      vi.stubGlobal('fetch', mockFetch)

      await provider.getHistorical('AAPL', '1y')

      const calledUrl = mockFetch.mock.calls[0][0] as string
      expect(calledUrl).toContain('function=TIME_SERIES_DAILY')
      expect(calledUrl).toContain('symbol=AAPL')
      expect(calledUrl).toContain('outputsize=full')
    })

    it('should use TIME_SERIES_INTRADAY with 60min interval for short ranges', async () => {
      const mockFetch = vi.fn().mockResolvedValue(mockFetchResponse(timeSeriesIntradayFixture))
      vi.stubGlobal('fetch', mockFetch)

      const bars = await provider.getHistorical('AAPL', '1d')

      const calledUrl = mockFetch.mock.calls[0][0] as string
      expect(calledUrl).toContain('function=TIME_SERIES_INTRADAY')
      expect(calledUrl).toContain('interval=60min')
      expect(bars).toHaveLength(3)
      expect(bars[0].close).toBe(188.75)
      expect(bars[2].close).toBe(189.42)
    })

    it('should slice to the configured maxBars per range', async () => {
      // Build a fixture with 30 daily bars; '1m' range caps at 22.
      const series: Record<string, { '4. close': string }> = {}
      for (let i = 0; i < 30; i += 1) {
        const day = String(i + 1).padStart(2, '0')
        series[`2026-04-${day}`] = { '4. close': String(100 + i) }
      }
      vi.stubGlobal(
        'fetch',
        vi.fn().mockResolvedValue(mockFetchResponse({ 'Time Series (Daily)': series })),
      )

      const bars = await provider.getHistorical('AAPL', '1m')

      expect(bars).toHaveLength(22)
      // Should keep the most recent 22 (oldest of the kept group is day 9).
      expect(bars[0].ts).toEqual(new Date('2026-04-09T00:00:00Z'))
      expect(bars[21].ts).toEqual(new Date('2026-04-30T00:00:00Z'))
    })

    it('should return an empty array when the time series is missing', async () => {
      vi.stubGlobal('fetch', vi.fn().mockResolvedValue(mockFetchResponse({})))

      const bars = await provider.getHistorical('AAPL', '1m')

      expect(bars).toEqual([])
    })

    it('should surface rate limits during historical requests', async () => {
      vi.stubGlobal('fetch', vi.fn().mockResolvedValue(mockFetchResponse(rateLimitFixture)))

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
    it('should map bestMatches to normalized EquitySymbolMatch entries', async () => {
      vi.stubGlobal('fetch', vi.fn().mockResolvedValue(mockFetchResponse(symbolSearchFixture)))

      const matches = await provider.searchSymbol('apple')

      expect(matches).toHaveLength(2)
      expect(matches[0].symbol).toBe('AAPL')
      expect(matches[0].name).toBe('Apple Inc')
      expect(matches[0].exchange).toBe('United States')
      expect(matches[0].currency).toBe('USD')
      expect(matches[1].currency).toBe('MXN')
    })

    it('should issue a SYMBOL_SEARCH request with the keywords parameter', async () => {
      const mockFetch = vi.fn().mockResolvedValue(mockFetchResponse(symbolSearchFixture))
      vi.stubGlobal('fetch', mockFetch)

      await provider.searchSymbol('apple inc')

      const calledUrl = mockFetch.mock.calls[0][0] as string
      expect(calledUrl).toContain('function=SYMBOL_SEARCH')
      expect(calledUrl).toContain('keywords=apple+inc')
    })

    it('should return an empty array when there are no matches', async () => {
      vi.stubGlobal('fetch', vi.fn().mockResolvedValue(mockFetchResponse({ bestMatches: [] })))

      const matches = await provider.searchSymbol('zzz')

      expect(matches).toEqual([])
    })
  })

  describe('getFundamentals', () => {
    it('should map OVERVIEW to a normalized EquityFundamentals snapshot', async () => {
      vi.stubGlobal('fetch', vi.fn().mockResolvedValue(mockFetchResponse(overviewFixture)))

      const fundamentals = await provider.getFundamentals('AAPL')

      expect(fundamentals.symbol).toBe('AAPL')
      expect(fundamentals.marketCap).toBe(2_950_000_000_000)
      expect(fundamentals.peRatio).toBe(31.42)
      expect(fundamentals.eps).toBe(6.03)
      expect(fundamentals.dividendYield).toBe(0.0046)
      expect(fundamentals.currency).toBe('USD')
    })

    it('should treat "None" values as missing', async () => {
      vi.stubGlobal(
        'fetch',
        vi.fn().mockResolvedValue(
          mockFetchResponse({
            Symbol: 'XYZ',
            Currency: 'None',
            MarketCapitalization: 'None',
            PERatio: 'None',
            EPS: 'None',
            DividendYield: 'None',
          }),
        ),
      )

      const fundamentals = await provider.getFundamentals('XYZ')

      expect(fundamentals.symbol).toBe('XYZ')
      expect(fundamentals.marketCap).toBeUndefined()
      expect(fundamentals.peRatio).toBeUndefined()
      expect(fundamentals.eps).toBeUndefined()
      expect(fundamentals.dividendYield).toBeUndefined()
      expect(fundamentals.currency).toBeUndefined()
    })

    it('should call OVERVIEW with the symbol parameter', async () => {
      const mockFetch = vi.fn().mockResolvedValue(mockFetchResponse(overviewFixture))
      vi.stubGlobal('fetch', mockFetch)

      await provider.getFundamentals('AAPL')

      const calledUrl = mockFetch.mock.calls[0][0] as string
      expect(calledUrl).toContain('function=OVERVIEW')
      expect(calledUrl).toContain('symbol=AAPL')
    })
  })

  describe('listSupportedExchanges', () => {
    it('should return a static list including the major US exchanges', async () => {
      const exchanges = await provider.listSupportedExchanges()

      expect(exchanges).toContain('NYSE')
      expect(exchanges).toContain('NASDAQ')
      expect(exchanges).toContain('AMEX')
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
      const p = createProvider({ apiKey: 'test-key', baseUrl: 'https://proxy.example/av' })
      const mockFetch = vi.fn().mockResolvedValue(mockFetchResponse(globalQuoteFixture))
      vi.stubGlobal('fetch', mockFetch)

      await p.getQuote('AAPL')

      const calledUrl = mockFetch.mock.calls[0][0] as string
      expect(calledUrl.startsWith('https://proxy.example/av/query?')).toBe(true)
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
