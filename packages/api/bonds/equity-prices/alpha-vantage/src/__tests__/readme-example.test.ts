/**
 * Proves the module-level `@example` in `src/index.ts` (rendered as the README
 * Quick Start) works exactly as written. Only the network (`fetch` to
 * `www.alphavantage.co`) is stubbed.
 *
 * @module
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { getHistorical, getQuote, setProvider } from '@molecule/api-equity-prices'

import { createProvider, RATE_LIMITED } from '../index.js'

const json = (data: unknown): Response =>
  new Response(JSON.stringify(data), {
    status: 200,
    headers: { 'content-type': 'application/json' },
  })

const daily: Record<string, { '4. close': string }> = {}
for (let day = 1; day <= 30; day++) {
  daily[`2026-04-${String(day).padStart(2, '0')}`] = { '4. close': String(160 + day) }
}

const route = (url: string): Response => {
  if (url.includes('function=GLOBAL_QUOTE'))
    return json({
      'Global Quote': {
        '01. symbol': 'AAPL',
        '05. price': '189.4200',
        '07. latest trading day': '2026-04-30',
      },
    })
  if (url.includes('function=TIME_SERIES_DAILY')) return json({ 'Time Series (Daily)': daily })
  return json({ 'Error Message': 'Invalid API call' })
}

/**
 * Runs the example body as written.
 *
 * @returns Nothing; logs or warns like the example.
 */
const runExample = async (): Promise<void> => {
  setProvider(createProvider({ apiKey: process.env.ALPHA_VANTAGE_API_KEY }))

  try {
    const quote = await getQuote('AAPL')
    const month = await getHistorical('AAPL', '1m')
    console.log(quote.price, month.length)
  } catch (error) {
    const cause = (error as Error).cause as { code?: string } | undefined
    if (cause?.code !== RATE_LIMITED) throw error
    console.warn('Alpha Vantage free tier exhausted (5/min, 500/day); retry later')
  }
}

describe('README @example', () => {
  const originalEnv = process.env

  beforeEach(() => {
    process.env = { ...originalEnv, ALPHA_VANTAGE_API_KEY: 'test-key' }
  })

  afterEach(() => {
    process.env = originalEnv
    vi.unstubAllGlobals()
    vi.restoreAllMocks()
  })

  it('reads a quote and a month of daily bars through the core', async () => {
    const fetchMock = vi.fn(async (input: string | URL | Request) => route(String(input)))
    vi.stubGlobal('fetch', fetchMock)
    const log = vi.spyOn(console, 'log').mockImplementation(() => undefined)

    await runExample()

    expect(log).toHaveBeenCalledWith(189.42, 22)
    const urls = fetchMock.mock.calls.map(([input]) => String(input))
    expect(urls[0]).toContain('apikey=test-key')
    expect(urls[0]).toContain('symbol=AAPL')

    const month = await getHistorical('AAPL', '1m')
    expect(month[0]).toEqual({ ts: new Date('2026-04-09T00:00:00Z'), close: 169 })
    const quote = await getQuote('AAPL')
    expect(quote).toEqual({
      symbol: 'AAPL',
      price: 189.42,
      currency: 'USD',
      ts: new Date('2026-04-30T00:00:00Z'),
    })
  })

  it('turns the HTTP 200 rate-limit note into a RATE_LIMITED cause', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () =>
        json({ Note: 'Thank you for using Alpha Vantage! Our standard API call frequency is 5' }),
      ),
    )
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined)

    await runExample()

    expect(warn).toHaveBeenCalledWith(
      'Alpha Vantage free tier exhausted (5/min, 500/day); retry later',
    )
  })
})
