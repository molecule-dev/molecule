import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { bond, reset, unexpectBond } from '@molecule/api-bond'
import type { FxRatesProvider } from '@molecule/api-fx-rates'

import { computeRate, createProvider, parseEcbXml } from '../provider.js'

/**
 * Realistic ECB daily-feed XML body (single dated cube). Trimmed down to a
 * representative set of currencies; the parser code path is structural so
 * the exact list does not matter for correctness.
 */
const dailyXml = `<?xml version="1.0" encoding="UTF-8"?>
<gesmes:Envelope xmlns:gesmes="http://www.gesmes.org/xml/2002-08-01" xmlns="http://www.ecb.int/vocabulary/2002-08-01/eurofxref">
  <gesmes:subject>Reference rates</gesmes:subject>
  <gesmes:Sender><gesmes:name>European Central Bank</gesmes:name></gesmes:Sender>
  <Cube>
    <Cube time='2026-04-30'>
      <Cube currency='USD' rate='1.1000'/>
      <Cube currency='JPY' rate='168.45'/>
      <Cube currency='GBP' rate='0.88000'/>
      <Cube currency='CHF' rate='0.97500'/>
      <Cube currency='CAD' rate='1.5050'/>
    </Cube>
  </Cube>
</gesmes:Envelope>`

/**
 * Realistic ECB historical 90-day feed XML body. Three sequential business
 * days of EUR-pivot rates; the newest is 2026-04-29 (the day before the
 * "latest" daily snapshot above, so the daily and historical paths cover
 * different dates).
 */
const historicalXml = `<?xml version="1.0" encoding="UTF-8"?>
<gesmes:Envelope xmlns:gesmes="http://www.gesmes.org/xml/2002-08-01" xmlns="http://www.ecb.int/vocabulary/2002-08-01/eurofxref">
  <gesmes:subject>Reference rates</gesmes:subject>
  <gesmes:Sender><gesmes:name>European Central Bank</gesmes:name></gesmes:Sender>
  <Cube>
    <Cube time='2026-04-29'>
      <Cube currency='USD' rate='1.0980'/>
      <Cube currency='GBP' rate='0.87800'/>
      <Cube currency='JPY' rate='168.10'/>
    </Cube>
    <Cube time='2026-04-28'>
      <Cube currency='USD' rate='1.0950'/>
      <Cube currency='GBP' rate='0.87500'/>
      <Cube currency='JPY' rate='167.80'/>
    </Cube>
    <Cube time='2026-04-25'>
      <Cube currency='USD' rate='1.0900'/>
      <Cube currency='GBP' rate='0.87000'/>
      <Cube currency='JPY' rate='167.20'/>
    </Cube>
  </Cube>
</gesmes:Envelope>`

/**
 * Builds a minimal `Response`-shaped object suitable for
 * `vi.stubGlobal('fetch', ...)`. Only the methods our provider actually
 * calls (`text`, `ok`, `status`) are populated.
 */
const mockFetchTextResponse = (body: string, status = 200): Response =>
  ({
    ok: status >= 200 && status < 300,
    status,
    text: () => Promise.resolve(body),
  }) as Response

/**
 * Builds a fetch mock that routes daily vs historical requests to the right
 * fixture body and counts each call separately. The test can then assert on
 * which endpoint was hit.
 */
const buildFetchMock = (): {
  fetch: ReturnType<typeof vi.fn>
  dailyCalls: () => number
  historicalCalls: () => number
} => {
  let dailyCalls = 0
  let historicalCalls = 0
  const fetchFn = vi.fn(async (url: string) => {
    if (url.includes('eurofxref-hist-90d')) {
      historicalCalls += 1
      return mockFetchTextResponse(historicalXml)
    }
    dailyCalls += 1
    return mockFetchTextResponse(dailyXml)
  })
  return {
    fetch: fetchFn,
    dailyCalls: () => dailyCalls,
    historicalCalls: () => historicalCalls,
  }
}

describe('ecb fx-rates provider', () => {
  let provider: FxRatesProvider

  beforeEach(() => {
    // Disable the in-memory snapshot cache for most tests so each call is
    // exercised against the (mocked) upstream. Specific tests opt back in.
    provider = createProvider({ cacheTtlMs: 0 })
    const fetchStub = buildFetchMock()
    vi.stubGlobal('fetch', fetchStub.fetch)
  })

  afterEach(() => {
    vi.restoreAllMocks()
    reset()
  })

  describe('parseEcbXml', () => {
    it('should parse a single-day daily feed into one snapshot', () => {
      const snapshots = parseEcbXml(dailyXml)
      expect(snapshots).toHaveLength(1)
      expect(snapshots[0].asOf.toISOString().slice(0, 10)).toBe('2026-04-30')
      expect(snapshots[0].rates.EUR).toBe(1)
      expect(snapshots[0].rates.USD).toBe(1.1)
      expect(snapshots[0].rates.JPY).toBe(168.45)
    })

    it('should parse a multi-day historical feed sorted newest-first', () => {
      const snapshots = parseEcbXml(historicalXml)
      expect(snapshots.map((s) => s.asOf.toISOString().slice(0, 10))).toEqual([
        '2026-04-29',
        '2026-04-28',
        '2026-04-25',
      ])
      // Newest snapshot's rates should be from the 2026-04-29 row.
      expect(snapshots[0].rates.USD).toBe(1.098)
    })

    it('should always include EUR with rate 1', () => {
      for (const snapshot of parseEcbXml(historicalXml)) {
        expect(snapshot.rates.EUR).toBe(1)
      }
    })

    it('should throw on a malformed envelope with no dated cubes', () => {
      const empty = `<?xml version="1.0"?><gesmes:Envelope xmlns:gesmes="x"><gesmes:subject>r</gesmes:subject></gesmes:Envelope>`
      expect(() => parseEcbXml(empty)).toThrow(/did not contain any dated <Cube>/)
    })
  })

  describe('computeRate', () => {
    it('should return 1 when from === to (even for non-pivot)', () => {
      const snapshot = parseEcbXml(dailyXml)[0]
      expect(computeRate(snapshot, 'USD', 'USD')).toBe(1)
      expect(computeRate(snapshot, 'EUR', 'EUR')).toBe(1)
    })

    it('should read EUR -> X straight from the snapshot', () => {
      const snapshot = parseEcbXml(dailyXml)[0]
      expect(computeRate(snapshot, 'EUR', 'USD')).toBe(1.1)
      expect(computeRate(snapshot, 'EUR', 'JPY')).toBe(168.45)
    })

    it('should invert for X -> EUR', () => {
      const snapshot = parseEcbXml(dailyXml)[0]
      expect(computeRate(snapshot, 'USD', 'EUR')).toBeCloseTo(1 / 1.1, 12)
    })

    it('should pivot through EUR for cross rates', () => {
      const snapshot = parseEcbXml(dailyXml)[0]
      // 1 USD = (GBP / USD) GBP = 0.88 / 1.1 = 0.8 GBP
      expect(computeRate(snapshot, 'USD', 'GBP')).toBeCloseTo(0.88 / 1.1, 12)
      // Round-trip: USD -> GBP -> USD should land back at 1.
      const there = computeRate(snapshot, 'USD', 'GBP')
      const back = computeRate(snapshot, 'GBP', 'USD')
      expect(there * back).toBeCloseTo(1, 12)
    })

    it('should throw if either currency is missing from the snapshot', () => {
      const snapshot = parseEcbXml(dailyXml)[0]
      expect(() => computeRate(snapshot, 'XYZ', 'USD')).toThrow(/source currency: XYZ/)
      expect(() => computeRate(snapshot, 'USD', 'XYZ')).toThrow(/target currency: XYZ/)
    })
  })

  describe('getRate', () => {
    it('should hit the daily feed when no asOf is supplied', async () => {
      const result = await provider.getRate('EUR', 'USD')
      expect(result).toBe(1.1)
      const lastUrl = (vi.mocked(fetch).mock.calls[0][0] ?? '') as string
      expect(lastUrl).toContain('eurofxref-daily.xml')
    })

    it('should compute cross rates correctly', async () => {
      // 1 USD -> JPY = JPY/USD = 168.45 / 1.1
      const result = await provider.getRate('USD', 'JPY')
      expect(result).toBeCloseTo(168.45 / 1.1, 12)
    })

    it('should fall back to the historical feed for an older asOf', async () => {
      const result = await provider.getRate('EUR', 'USD', { asOf: new Date('2026-04-28') })
      expect(result).toBe(1.095)
      const calls = vi.mocked(fetch).mock.calls.map((c) => c[0] as string)
      expect(calls.some((u) => u.includes('eurofxref-hist-90d.xml'))).toBe(true)
    })

    it('should pick the newest snapshot at or before a non-trading-day asOf', async () => {
      // 2026-04-26 is a Sunday in the fixture (no row); the closest snapshot
      // at or before is 2026-04-25.
      const result = await provider.getRate('EUR', 'USD', { asOf: new Date('2026-04-26') })
      expect(result).toBe(1.09)
    })

    it('should throw when the historical feed has no snapshot at or before asOf', async () => {
      // 2026-04-24 is older than every snapshot in the historical fixture.
      await expect(
        provider.getRate('EUR', 'USD', { asOf: new Date('2026-04-24') }),
      ).rejects.toThrow(/no snapshot at or before/)
    })

    it('should reuse the daily snapshot when asOf matches the daily publication day', async () => {
      const fetchStub = buildFetchMock()
      vi.stubGlobal('fetch', fetchStub.fetch)
      const p = createProvider({ cacheTtlMs: 0 })
      await p.getRate('EUR', 'USD', { asOf: new Date('2026-04-30') })
      expect(fetchStub.dailyCalls()).toBe(1)
      expect(fetchStub.historicalCalls()).toBe(0)
    })
  })

  describe('getDailyRates', () => {
    it('should return EUR-pivoted rates for the latest day', async () => {
      const daily = await provider.getDailyRates()
      expect(daily.pivot).toBe('EUR')
      expect(daily.asOf.toISOString().slice(0, 10)).toBe('2026-04-30')
      expect(daily.rates.EUR).toBe(1)
      expect(daily.rates.USD).toBe(1.1)
      expect(daily.rates.GBP).toBe(0.88)
    })

    it('should return historical pivot rates for an older asOf', async () => {
      const daily = await provider.getDailyRates({ asOf: new Date('2026-04-28') })
      expect(daily.pivot).toBe('EUR')
      expect(daily.asOf.toISOString().slice(0, 10)).toBe('2026-04-28')
      expect(daily.rates.USD).toBe(1.095)
    })
  })

  describe('convert', () => {
    it('should multiply minor-unit amount by the rate and round to integer', async () => {
      // 10000 EUR cents -> USD cents at 1.1 EUR/USD = 11000 USD cents
      const result = await provider.convert(10_000, 'EUR', 'USD')
      expect(result).toBe(11_000)
    })

    it('should round to the nearest integer minor unit', async () => {
      // 12345 EUR cents -> CHF cents at 0.975 = 12036.375 -> 12036
      const result = await provider.convert(12_345, 'EUR', 'CHF')
      expect(result).toBe(12_036)
    })

    it('should preserve the amount when from === to', async () => {
      const result = await provider.convert(99_999, 'USD', 'USD')
      expect(result).toBe(99_999)
    })
  })

  describe('listSupportedCurrencies', () => {
    it('should return EUR plus every quote currency in the daily feed, sorted', async () => {
      const codes = await provider.listSupportedCurrencies()
      expect(codes).toEqual(['CAD', 'CHF', 'EUR', 'GBP', 'JPY', 'USD'])
    })
  })

  describe('caching', () => {
    it('should hit the network only once across two getRate calls when cache is enabled', async () => {
      const fetchStub = buildFetchMock()
      vi.stubGlobal('fetch', fetchStub.fetch)
      const p = createProvider({ cacheTtlMs: 60_000 })
      await p.getRate('EUR', 'USD')
      await p.getRate('USD', 'GBP')
      expect(fetchStub.dailyCalls()).toBe(1)
    })

    it('should write through to the bonded cache when one is registered', async () => {
      const cacheStore = new Map<string, unknown>()
      const setSpy = vi.fn(async (key: string, value: unknown) => {
        cacheStore.set(key, value)
      })
      const getSpy = vi.fn(async (key: string) => cacheStore.get(key))
      bond('cache', { get: getSpy, set: setSpy })

      const p = createProvider({ cacheTtlMs: 60_000 })
      await p.getRate('EUR', 'USD')

      expect(setSpy).toHaveBeenCalled()
      const writtenKey = setSpy.mock.calls[0][0] as string
      expect(writtenKey.startsWith('molecule:fx-rates:ecb:')).toBe(true)
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
      const a = createProvider({ cacheTtlMs: 60_000 })
      await a.getRate('EUR', 'USD')
      expect(fetchStub1.dailyCalls()).toBe(1)

      // Cold: provider B has an empty in-memory cache; the bonded cache
      // should serve the snapshot without a fresh HTTP fetch.
      const fetchStub2 = buildFetchMock()
      vi.stubGlobal('fetch', fetchStub2.fetch)
      const b = createProvider({ cacheTtlMs: 60_000 })
      await b.getRate('EUR', 'USD')
      expect(fetchStub2.dailyCalls()).toBe(0)
    })

    it('should not throw if the bonded cache rejects on set', async () => {
      bond('cache', {
        get: async () => undefined,
        set: async () => {
          throw new Error('cache write failure')
        },
      })
      const p = createProvider({ cacheTtlMs: 60_000 })
      await expect(p.getRate('EUR', 'USD')).resolves.toBe(1.1)
    })

    it('should ignore a missing cache bond gracefully', async () => {
      // No `bond('cache', ...)` registered, and the bond infra has not been
      // told to expect 'cache' — `tryGetCacheBond` must swallow this.
      unexpectBond('cache')
      const p = createProvider({ cacheTtlMs: 60_000 })
      await expect(p.getRate('EUR', 'USD')).resolves.toBe(1.1)
    })
  })

  describe('config overrides', () => {
    it('should use a custom base URL', async () => {
      const fetchStub = buildFetchMock()
      vi.stubGlobal('fetch', fetchStub.fetch)
      const p = createProvider({
        baseUrl: 'https://example.test/ecb',
        cacheTtlMs: 0,
      })
      await p.getRate('EUR', 'USD')
      const calledUrl = fetchStub.fetch.mock.calls[0][0] as string
      expect(calledUrl.startsWith('https://example.test/ecb/')).toBe(true)
    })

    it('should respect custom dailyPath / historicalPath overrides', async () => {
      const fetchStub = buildFetchMock()
      vi.stubGlobal('fetch', fetchStub.fetch)
      const p = createProvider({
        dailyPath: 'mirror-daily.xml',
        historicalPath: 'mirror-hist.xml',
        cacheTtlMs: 0,
      })
      await p.getRate('EUR', 'USD')
      const calledUrl = fetchStub.fetch.mock.calls[0][0] as string
      expect(calledUrl).toContain('mirror-daily.xml')
    })
  })

  describe('error handling', () => {
    it('should throw on a non-OK HTTP response', async () => {
      vi.stubGlobal('fetch', vi.fn().mockResolvedValue(mockFetchTextResponse('', 503)))
      await expect(provider.getRate('EUR', 'USD')).rejects.toThrow(/failed with status 503/)
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
      const p = createProvider({ timeout: 25, cacheTtlMs: 0 })
      await expect(p.getRate('EUR', 'USD')).rejects.toThrow()
    })
  })
})
