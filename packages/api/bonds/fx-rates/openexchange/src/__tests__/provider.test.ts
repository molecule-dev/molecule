import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { bond, reset, unexpectBond } from '@molecule/api-bond'
import type { FxRatesProvider } from '@molecule/api-fx-rates'

import { computeRate, createProvider, snapshotFromBody } from '../provider.js'

const APP_ID = 'test-app-id-shhh'
const SECRET_QS = `app_id=${APP_ID}`

/**
 * Realistic `latest.json` body. USD-pivot rates with a representative set
 * of currencies; structural code path is exercised regardless of the
 * specific list.
 */
const latestBody = {
  disclaimer: 'Usage subject to terms.',
  license: 'https://openexchangerates.org/license',
  timestamp: 1_777_000_000, // 2026-04-24T03:06:40Z (deterministic)
  base: 'USD',
  rates: {
    EUR: 0.92,
    GBP: 0.81,
    JPY: 153.2,
    CHF: 0.9,
    CAD: 1.37,
  },
}

/**
 * Realistic `historical/2026-04-15.json` body — different rates so the
 * test can distinguish historical from latest.
 */
const historicalBody = {
  timestamp: 1_776_000_000,
  base: 'USD',
  rates: {
    EUR: 0.93,
    GBP: 0.82,
    JPY: 152.0,
  },
}

/**
 * Realistic `currencies.json` body — code -> human name.
 */
const currenciesBody: Record<string, string> = {
  USD: 'United States Dollar',
  EUR: 'Euro',
  GBP: 'British Pound Sterling',
  JPY: 'Japanese Yen',
  CHF: 'Swiss Franc',
  CAD: 'Canadian Dollar',
}

/**
 * Builds a minimal `Response`-shaped object suitable for `vi.stubGlobal('fetch', ...)`.
 *
 * @param body - JSON body or string body for the response.
 * @param status - Response status code.
 */
const mockJsonResponse = (body: unknown, status = 200): Response =>
  ({
    ok: status >= 200 && status < 300,
    status,
    json: () => Promise.resolve(body),
    text: () => Promise.resolve(typeof body === 'string' ? body : JSON.stringify(body)),
  }) as Response

/**
 * Builds a fetch mock that routes latest / historical / currencies requests
 * to the right fixture body and counts each call separately so tests can
 * assert on which endpoints were hit.
 */
const buildFetchMock = (): {
  fetch: ReturnType<typeof vi.fn>
  latestCalls: () => number
  historicalCalls: () => number
  currenciesCalls: () => number
  capturedUrls: () => string[]
} => {
  let latestCalls = 0
  let historicalCalls = 0
  let currenciesCalls = 0
  const capturedUrls: string[] = []
  const fetchFn = vi.fn(async (url: string) => {
    capturedUrls.push(url)
    if (url.includes('/latest.json')) {
      latestCalls += 1
      return mockJsonResponse(latestBody)
    }
    if (url.includes('/historical/')) {
      historicalCalls += 1
      return mockJsonResponse(historicalBody)
    }
    if (url.includes('/currencies.json')) {
      currenciesCalls += 1
      return mockJsonResponse(currenciesBody)
    }
    return mockJsonResponse({}, 404)
  })
  return {
    fetch: fetchFn,
    latestCalls: () => latestCalls,
    historicalCalls: () => historicalCalls,
    currenciesCalls: () => currenciesCalls,
    capturedUrls: () => capturedUrls,
  }
}

describe('openexchange fx-rates provider', () => {
  let provider: FxRatesProvider

  beforeEach(() => {
    // Disable the in-memory snapshot cache for most tests so each call is
    // exercised against the (mocked) upstream. Specific tests opt back in.
    provider = createProvider({ appId: APP_ID, cacheTtlMs: 0 })
    const fetchStub = buildFetchMock()
    vi.stubGlobal('fetch', fetchStub.fetch)
  })

  afterEach(() => {
    vi.restoreAllMocks()
    reset()
    delete process.env['OPENEXCHANGE_APP_ID']
  })

  describe('snapshotFromBody', () => {
    it('should normalise upstream JSON into a snapshot with base=1', () => {
      const snapshot = snapshotFromBody(latestBody)
      expect(snapshot.base).toBe('USD')
      expect(snapshot.rates.USD).toBe(1)
      expect(snapshot.rates.EUR).toBe(0.92)
      expect(snapshot.asOf.toISOString()).toBe('2026-04-24T03:06:40.000Z')
    })
  })

  describe('computeRate', () => {
    it('should return 1 when from === to', () => {
      const snapshot = snapshotFromBody(latestBody)
      expect(computeRate(snapshot, 'USD', 'USD')).toBe(1)
      expect(computeRate(snapshot, 'EUR', 'EUR')).toBe(1)
    })

    it('should read base -> X straight from the snapshot', () => {
      const snapshot = snapshotFromBody(latestBody)
      expect(computeRate(snapshot, 'USD', 'EUR')).toBe(0.92)
      expect(computeRate(snapshot, 'USD', 'JPY')).toBe(153.2)
    })

    it('should invert for X -> base', () => {
      const snapshot = snapshotFromBody(latestBody)
      expect(computeRate(snapshot, 'EUR', 'USD')).toBeCloseTo(1 / 0.92, 12)
    })

    it('should pivot through base for cross rates', () => {
      const snapshot = snapshotFromBody(latestBody)
      // 1 EUR = (GBP / EUR) GBP
      expect(computeRate(snapshot, 'EUR', 'GBP')).toBeCloseTo(0.81 / 0.92, 12)
      // Round-trip should land back at 1.
      const there = computeRate(snapshot, 'EUR', 'GBP')
      const back = computeRate(snapshot, 'GBP', 'EUR')
      expect(there * back).toBeCloseTo(1, 12)
    })

    it('should throw if either currency is missing from the snapshot', () => {
      const snapshot = snapshotFromBody(latestBody)
      expect(() => computeRate(snapshot, 'XYZ', 'USD')).toThrow(/source currency: XYZ/)
      expect(() => computeRate(snapshot, 'USD', 'XYZ')).toThrow(/target currency: XYZ/)
    })
  })

  describe('getRate', () => {
    it('should hit latest.json when no asOf is supplied', async () => {
      const result = await provider.getRate('USD', 'EUR')
      expect(result).toBe(0.92)
      const calledUrl = (vi.mocked(fetch).mock.calls[0][0] ?? '') as string
      expect(calledUrl).toContain('/latest.json')
      expect(calledUrl).toContain('base=USD')
    })

    it('should compute cross rates correctly via the USD pivot (free-tier path)', async () => {
      // 1 EUR -> JPY = JPY/EUR = 153.2 / 0.92
      const result = await provider.getRate('EUR', 'JPY')
      expect(result).toBeCloseTo(153.2 / 0.92, 12)
    })

    it('should hit historical/YYYY-MM-DD.json for an explicit asOf', async () => {
      const result = await provider.getRate('USD', 'EUR', { asOf: new Date('2026-04-15') })
      expect(result).toBe(0.93)
      const calls = vi.mocked(fetch).mock.calls.map((c) => c[0] as string)
      expect(calls.some((u) => u.includes('/historical/2026-04-15.json'))).toBe(true)
    })
  })

  describe('getDailyRates', () => {
    it('should return USD-pivoted rates for the latest day', async () => {
      const daily = await provider.getDailyRates()
      expect(daily.pivot).toBe('USD')
      expect(daily.asOf.toISOString()).toBe('2026-04-24T03:06:40.000Z')
      expect(daily.rates.USD).toBe(1)
      expect(daily.rates.EUR).toBe(0.92)
    })

    it('should return historical pivot rates for an explicit asOf', async () => {
      const daily = await provider.getDailyRates({ asOf: new Date('2026-04-15') })
      expect(daily.pivot).toBe('USD')
      expect(daily.rates.EUR).toBe(0.93)
    })
  })

  describe('convert', () => {
    it('should multiply minor-unit amount by the rate and round to integer', async () => {
      // 10000 USD cents -> EUR cents at 0.92 USD/EUR = 9200 EUR cents
      const result = await provider.convert(10_000, 'USD', 'EUR')
      expect(result).toBe(9_200)
    })

    it('should round to the nearest integer minor unit', async () => {
      // 12345 USD cents -> CHF cents at 0.9 = 11110.5 -> 11111 (banker's-not, plain Math.round)
      const result = await provider.convert(12_345, 'USD', 'CHF')
      expect(result).toBe(11_111)
    })

    it('should preserve the amount when from === to', async () => {
      const result = await provider.convert(99_999, 'EUR', 'EUR')
      expect(result).toBe(99_999)
    })
  })

  describe('listSupportedCurrencies', () => {
    it('should fetch currencies.json and return sorted ISO codes', async () => {
      const codes = await provider.listSupportedCurrencies()
      expect(codes).toEqual(['CAD', 'CHF', 'EUR', 'GBP', 'JPY', 'USD'])
    })

    it('should cache the currencies list across calls when cache is enabled', async () => {
      const fetchStub = buildFetchMock()
      vi.stubGlobal('fetch', fetchStub.fetch)
      const p = createProvider({ appId: APP_ID, cacheTtlMs: 60_000 })
      await p.listSupportedCurrencies()
      await p.listSupportedCurrencies()
      expect(fetchStub.currenciesCalls()).toBe(1)
    })
  })

  describe('caching', () => {
    it('should hit the network only once across two getRate calls when cache is enabled', async () => {
      const fetchStub = buildFetchMock()
      vi.stubGlobal('fetch', fetchStub.fetch)
      const p = createProvider({ appId: APP_ID, cacheTtlMs: 60_000 })
      await p.getRate('USD', 'EUR')
      await p.getRate('EUR', 'GBP')
      expect(fetchStub.latestCalls()).toBe(1)
    })

    it('should write through to the bonded cache when one is registered', async () => {
      const cacheStore = new Map<string, unknown>()
      const setSpy = vi.fn(async (key: string, value: unknown) => {
        cacheStore.set(key, value)
      })
      const getSpy = vi.fn(async (key: string) => cacheStore.get(key))
      bond('cache', { get: getSpy, set: setSpy })

      const p = createProvider({ appId: APP_ID, cacheTtlMs: 60_000 })
      await p.getRate('USD', 'EUR')

      expect(setSpy).toHaveBeenCalled()
      const writtenKey = setSpy.mock.calls[0][0] as string
      expect(writtenKey.startsWith('molecule:fx-rates:openexchange:')).toBe(true)
    })

    it('should serve a cold in-memory cache from the bonded cache without re-fetching', async () => {
      const cacheStore = new Map<string, unknown>()
      bond('cache', {
        get: async (key: string) => cacheStore.get(key),
        set: async (key: string, value: unknown) => {
          cacheStore.set(key, value)
        },
      })

      // Warm: provider A populates the bonded cache.
      const fetchStub1 = buildFetchMock()
      vi.stubGlobal('fetch', fetchStub1.fetch)
      const a = createProvider({ appId: APP_ID, cacheTtlMs: 60_000 })
      await a.getRate('USD', 'EUR')
      expect(fetchStub1.latestCalls()).toBe(1)

      // Cold: provider B has an empty in-memory cache; the bonded cache
      // should serve the snapshot without a fresh HTTP fetch.
      const fetchStub2 = buildFetchMock()
      vi.stubGlobal('fetch', fetchStub2.fetch)
      const b = createProvider({ appId: APP_ID, cacheTtlMs: 60_000 })
      await b.getRate('USD', 'EUR')
      expect(fetchStub2.latestCalls()).toBe(0)
    })

    it('should not throw if the bonded cache rejects on set', async () => {
      bond('cache', {
        get: async () => undefined,
        set: async () => {
          throw new Error('cache write failure')
        },
      })
      const p = createProvider({ appId: APP_ID, cacheTtlMs: 60_000 })
      await expect(p.getRate('USD', 'EUR')).resolves.toBe(0.92)
    })

    it('should ignore a missing cache bond gracefully', async () => {
      // No `bond('cache', ...)` registered, and the bond infra has not been
      // told to expect 'cache' — `tryGetCacheBond` must swallow this.
      unexpectBond('cache')
      const p = createProvider({ appId: APP_ID, cacheTtlMs: 60_000 })
      await expect(p.getRate('USD', 'EUR')).resolves.toBe(0.92)
    })
  })

  describe('config and env', () => {
    it('should fall back to OPENEXCHANGE_APP_ID env var when config.appId is omitted', async () => {
      process.env['OPENEXCHANGE_APP_ID'] = 'env-app-id'
      const p = createProvider({ cacheTtlMs: 0 })
      await p.getRate('USD', 'EUR')
      // No assertion needed beyond not throwing — the lack of error proves
      // the env var was picked up. The captured URL also includes app_id
      // but we don't validate that here (the secret-leak test does).
    })

    it('should throw a sanitized error when no app_id is available anywhere', async () => {
      const p = createProvider({ cacheTtlMs: 0 })
      await expect(p.getRate('USD', 'EUR')).rejects.toThrow(/missing app_id/)
    })

    it('should use a custom base URL', async () => {
      const fetchStub = buildFetchMock()
      vi.stubGlobal('fetch', fetchStub.fetch)
      const p = createProvider({
        appId: APP_ID,
        baseUrl: 'https://example.test/oxr',
        cacheTtlMs: 0,
      })
      await p.getRate('USD', 'EUR')
      const calledUrl = fetchStub.fetch.mock.calls[0][0] as string
      expect(calledUrl.startsWith('https://example.test/oxr/')).toBe(true)
    })

    it('should use a custom base currency on paid plans', async () => {
      const fetchStub = buildFetchMock()
      vi.stubGlobal('fetch', fetchStub.fetch)
      const p = createProvider({
        appId: APP_ID,
        base: 'EUR',
        cacheTtlMs: 0,
      })
      await p.getRate('EUR', 'GBP')
      const calledUrl = fetchStub.fetch.mock.calls[0][0] as string
      expect(calledUrl).toContain('base=EUR')
    })
  })

  describe('error sanitization', () => {
    it('should never include the app_id in a non-OK status error', async () => {
      vi.stubGlobal('fetch', vi.fn().mockResolvedValue(mockJsonResponse('forbidden', 401)))
      let caught: Error | undefined
      try {
        await provider.getRate('USD', 'EUR')
      } catch (error) {
        caught = error as Error
      }
      expect(caught).toBeDefined()
      expect(caught?.message ?? '').not.toContain(APP_ID)
      expect(caught?.message ?? '').not.toContain(SECRET_QS)
    })

    it('should never include the app_id when fetch itself rejects with a URL-bearing error', async () => {
      vi.stubGlobal(
        'fetch',
        vi.fn(async (url: string) => {
          // Simulate an error whose message embeds the full URL (some
          // runtimes do this for DNS / TLS failures).
          throw new Error(`network error fetching ${url}`)
        }),
      )
      let caught: Error | undefined
      try {
        await provider.getRate('USD', 'EUR')
      } catch (error) {
        caught = error as Error
      }
      expect(caught).toBeDefined()
      expect(caught?.message ?? '').not.toContain(APP_ID)
      expect(caught?.message ?? '').not.toContain(SECRET_QS)
    })
  })

  describe('error handling', () => {
    it('should throw on a non-OK HTTP response', async () => {
      vi.stubGlobal('fetch', vi.fn().mockResolvedValue(mockJsonResponse('', 503)))
      await expect(provider.getRate('USD', 'EUR')).rejects.toThrow(/failed with status 503/)
    })

    it('should reject when fetch is aborted by timeout', async () => {
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
      const p = createProvider({ appId: APP_ID, timeout: 25, cacheTtlMs: 0 })
      await expect(p.getRate('USD', 'EUR')).rejects.toThrow()
    })
  })
})
