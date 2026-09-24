/**
 * Proves the module-level `@example` in `src/index.ts` (rendered as the README
 * Quick Start) works exactly as written, through the Alpha Vantage bond with
 * only the network (`fetch`) stubbed.
 *
 * @module
 */
import { afterEach, describe, expect, it, vi } from 'vitest'

import { createProvider } from '@molecule/api-equity-prices-alpha-vantage'

import { getHistorical, getQuote, searchSymbol, setProvider } from '../index.js'

const json = (data: unknown): Response =>
  new Response(JSON.stringify(data), { headers: { 'content-type': 'application/json' } })

const route = (url: string): Response => {
  const fn = new URL(url).searchParams.get('function')
  if (fn === 'SYMBOL_SEARCH')
    return json({
      bestMatches: [
        {
          '1. symbol': 'AAPL',
          '2. name': 'Apple Inc',
          '4. region': 'United States',
          '8. currency': 'USD',
        },
      ],
    })
  if (fn === 'GLOBAL_QUOTE')
    return json({
      'Global Quote': {
        '01. symbol': 'AAPL',
        '05. price': '189.4200',
        '07. latest trading day': '2026-04-30',
      },
    })
  if (fn === 'TIME_SERIES_DAILY')
    return json({
      'Time Series (Daily)': {
        '2026-04-30': { '4. close': '189.4200' },
        '2026-04-29': { '4. close': '188.0500' },
        '2026-04-28': { '4. close': '185.9000' },
      },
    })
  return json({ 'Error Message': 'unexpected call' })
}

describe('README @example', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
    vi.unstubAllEnvs()
    vi.restoreAllMocks()
  })

  it('resolves a ticker via search, formats the quote in its currency, and loads bars', async () => {
    const fetchMock = vi.fn(async (input: string | URL | Request) => route(String(input)))
    vi.stubGlobal('fetch', fetchMock)
    const log = vi.spyOn(console, 'log').mockImplementation(() => undefined)

    vi.stubEnv('ALPHA_VANTAGE_API_KEY', 'test-key')
    setProvider(createProvider({ apiKey: process.env.ALPHA_VANTAGE_API_KEY }))

    const [match] = await searchSymbol('apple')
    const symbol = match?.symbol ?? 'AAPL'
    expect(match).toMatchObject({ symbol: 'AAPL', name: 'Apple Inc', currency: 'USD' })

    const quote = await getQuote(symbol)
    const display = new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: quote.currency,
    }).format(quote.price)

    const bars = await getHistorical(symbol, '1m')
    console.log(display, bars.length)

    expect(quote).toMatchObject({ symbol: 'AAPL', price: 189.42, currency: 'USD' })
    expect(display).toBe('$189.42')
    expect(bars.map((bar) => bar.close)).toEqual([185.9, 188.05, 189.42])
    expect(log).toHaveBeenCalledWith('$189.42', 3)
  })
})
