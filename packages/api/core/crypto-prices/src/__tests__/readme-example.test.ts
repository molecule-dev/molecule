/**
 * Proves the module-level `@example` in `src/index.ts` (rendered as the README
 * Quick Start) works exactly as written, through the CoinGecko bond with only
 * the network (`fetch`) stubbed.
 *
 * @module
 */
import { afterEach, describe, expect, it, vi } from 'vitest'

import { createProvider } from '@molecule/api-crypto-prices-coingecko'

import { getHistorical, getPrice, listCoins, setProvider } from '../index.js'

const json = (data: unknown): Response =>
  new Response(JSON.stringify(data), { headers: { 'content-type': 'application/json' } })

const route = (url: string): Response => {
  if (url.includes('/coins/markets'))
    return json([
      {
        id: 'bitcoin',
        symbol: 'btc',
        name: 'Bitcoin',
        current_price: 71234.56,
        market_cap_rank: 1,
        price_change_percentage_24h: 1.23,
        last_updated: '2026-05-01T12:00:00.000Z',
      },
      {
        id: 'ethereum',
        symbol: 'eth',
        name: 'Ethereum',
        current_price: 3000,
        market_cap_rank: 2,
        price_change_percentage_24h: -0.5,
        last_updated: '2026-05-01T12:00:00.000Z',
      },
    ])
  if (url.includes('/simple/price'))
    return json({ bitcoin: { usd: 71234.56, usd_24h_change: 1.23, last_updated_at: 1714560000 } })
  if (url.includes('/coins/bitcoin/market_chart'))
    return json({
      prices: Array.from({ length: 7 }, (_, i) => [1714560000000 + i * 86_400_000, 70000 + i]),
    })
  return new Response(JSON.stringify({ error: 'not found' }), { status: 404 })
}

describe('README @example', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
    vi.restoreAllMocks()
  })

  it('lists the market, resolves the coin id at runtime, then quotes and charts it', async () => {
    const fetchMock = vi.fn(async (input: string | URL | Request) => route(String(input)))
    vi.stubGlobal('fetch', fetchMock)
    const log = vi.spyOn(console, 'log').mockImplementation(() => undefined)

    setProvider(createProvider({ apiKey: process.env.COINGECKO_API_KEY }))

    const top = await listCoins({ vsCurrency: 'usd', limit: 10 })
    const btcId = top.find((coin) => coin.symbol.toLowerCase() === 'btc')?.id ?? 'bitcoin'
    const quote = await getPrice(btcId, 'usd')
    const week = await getHistorical(btcId, 7, 'usd')
    console.log(`${quote.price} USD`, top.length, week.length)

    expect(btcId).toBe('bitcoin')
    expect(quote).toEqual({
      id: 'bitcoin',
      vsCurrency: 'usd',
      price: 71234.56,
      change24h: 1.23,
      asOf: new Date(1714560000 * 1000),
    })
    expect(week[0]).toEqual({ ts: new Date(1714560000000), price: 70000 })
    expect(log).toHaveBeenCalledWith('71234.56 USD', 2, 7)
    expect(String(fetchMock.mock.calls[0]?.[0])).toContain('per_page=10')
  })
})
