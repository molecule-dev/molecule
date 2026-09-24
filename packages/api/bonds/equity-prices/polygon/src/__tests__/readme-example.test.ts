/**
 * Proves the module-level `@example` in `src/index.ts` (rendered as the README
 * Quick Start) works exactly as written. Only the network (`fetch` to
 * `api.polygon.io`) is stubbed.
 *
 * @module
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { getHistorical, getQuote, setProvider } from '@molecule/api-equity-prices'

import { createProvider, RATE_LIMITED } from '../index.js'

const json = (data: unknown, status = 200, headers: Record<string, string> = {}): Response =>
  new Response(JSON.stringify(data), {
    status,
    headers: { 'content-type': 'application/json', ...headers },
  })

const route = (url: string): Response => {
  if (url.includes('/v2/last/trade/AAPL'))
    return json({ status: 'OK', ticker: 'AAPL', results: { p: 189.42, t: 1777564800000000000 } })
  if (url.includes('/v2/aggs/ticker/AAPL/range/1/day/'))
    return json({
      status: 'OK',
      ticker: 'AAPL',
      results: Array.from({ length: 21 }, (_, i) => ({
        c: 170 + i,
        t: 1775001600000 + i * 86_400_000,
      })),
    })
  return json({ status: 'NOT_FOUND' }, 404)
}

/**
 * Runs the example body as written.
 *
 * @returns Nothing; logs or warns like the example.
 */
const runExample = async (): Promise<void> => {
  setProvider(createProvider({ apiKey: process.env.POLYGON_API_KEY }))

  try {
    const quote = await getQuote('AAPL')
    const month = await getHistorical('AAPL', '1m')
    console.log(quote.price, month.length)
  } catch (error) {
    const cause = (error as Error).cause as
      { code?: string; retryAfterSeconds?: number } | undefined
    if (cause?.code !== RATE_LIMITED) throw error
    console.warn(`Polygon rate-limited; retry in ${cause.retryAfterSeconds ?? 60}s`)
  }
}

describe('README @example', () => {
  const originalEnv = process.env

  beforeEach(() => {
    process.env = { ...originalEnv, POLYGON_API_KEY: 'test-key' }
  })

  afterEach(() => {
    process.env = originalEnv
    vi.unstubAllGlobals()
    vi.restoreAllMocks()
  })

  it('reads the last trade and a month of daily bars through the core', async () => {
    const fetchMock = vi.fn(async (input: string | URL | Request) => route(String(input)))
    vi.stubGlobal('fetch', fetchMock)
    const log = vi.spyOn(console, 'log').mockImplementation(() => undefined)

    await runExample()

    expect(log).toHaveBeenCalledWith(189.42, 21)
    const urls = fetchMock.mock.calls.map(([input]) => String(input))
    expect(urls[0]).toBe('https://api.polygon.io/v2/last/trade/AAPL?apiKey=test-key')
    expect(await getQuote('AAPL')).toEqual({
      symbol: 'AAPL',
      price: 189.42,
      currency: 'USD',
      ts: new Date(1777564800000),
    })
    const month = await getHistorical('AAPL', '1m')
    expect(month[0]).toEqual({ ts: new Date(1775001600000), close: 170 })
  })

  it('surfaces HTTP 429 as a RATE_LIMITED cause with retryAfterSeconds', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => json({ status: 'ERROR' }, 429, { 'retry-after': '30' })),
    )
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined)

    await runExample()

    expect(warn).toHaveBeenCalledWith('Polygon rate-limited; retry in 30s')
  })
})
