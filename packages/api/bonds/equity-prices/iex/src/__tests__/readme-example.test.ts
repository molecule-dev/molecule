/**
 * Proves the module-level `@example` in `src/index.ts` (rendered as the README
 * Quick Start) works exactly as written. Only the network (`fetch` to
 * `cloud.iexapis.com`) is stubbed.
 *
 * @module
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { getFundamentals, getQuote, setProvider } from '@molecule/api-equity-prices'

import { createProvider, RATE_LIMITED } from '../index.js'

const json = (data: unknown, status = 200): Response =>
  new Response(JSON.stringify(data), {
    status,
    headers: { 'content-type': 'application/json' },
  })

const route = (url: string): Response => {
  if (url.includes('/stock/AAPL/quote'))
    return json({
      symbol: 'AAPL',
      latestPrice: 189.42,
      currency: 'USD',
      latestUpdate: 1777564800000,
      primaryExchange: 'NASDAQ',
    })
  if (url.includes('/stock/AAPL/company')) return json({ symbol: 'AAPL' })
  if (url.includes('/stock/AAPL/stats'))
    return json({ marketcap: 2.9e12, peRatio: 29.1, ttmEPS: 6.5, dividendYield: 0.52 })
  return json({}, 404)
}

/**
 * Runs the example body as written.
 *
 * @returns Nothing; logs or warns like the example.
 */
const runExample = async (): Promise<void> => {
  setProvider(createProvider({ apiKey: process.env.IEX_API_KEY }))

  try {
    const quote = await getQuote('AAPL')
    const stats = await getFundamentals('AAPL')
    console.log(quote.price, stats.dividendYield)
  } catch (error) {
    const cause = (error as Error).cause as { code?: string } | undefined
    if (cause?.code !== RATE_LIMITED) throw error
    console.warn('IEX Cloud quota exhausted (HTTP 402); upgrade the plan or retry next cycle')
  }
}

describe('README @example', () => {
  const originalEnv = process.env

  beforeEach(() => {
    process.env = { ...originalEnv, IEX_API_KEY: 'test-key' }
  })

  afterEach(() => {
    process.env = originalEnv
    vi.unstubAllGlobals()
    vi.restoreAllMocks()
  })

  it('reads a quote and fundamentals through the core', async () => {
    const fetchMock = vi.fn(async (input: string | URL | Request) => route(String(input)))
    vi.stubGlobal('fetch', fetchMock)
    const log = vi.spyOn(console, 'log').mockImplementation(() => undefined)

    await runExample()

    expect(log).toHaveBeenCalledWith(189.42, 0.0052)
    const urls = fetchMock.mock.calls.map(([input]) => String(input))
    expect(urls[0]).toBe('https://cloud.iexapis.com/stable/stock/AAPL/quote?token=test-key')
    expect(urls).toHaveLength(3)
    expect(await getQuote('AAPL')).toEqual({
      symbol: 'AAPL',
      price: 189.42,
      currency: 'USD',
      ts: new Date(1777564800000),
      exchange: 'NASDAQ',
    })
  })

  it('maps HTTP 402 to a RATE_LIMITED cause', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => json({}, 402)),
    )
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined)

    await runExample()

    expect(warn).toHaveBeenCalledWith(
      'IEX Cloud quota exhausted (HTTP 402); upgrade the plan or retry next cycle',
    )
  })
})
