/**
 * Proves the module-level `@example` in `src/index.ts` (rendered as the README
 * Quick Start) works exactly as written. Only the network (`fetch`) is stubbed.
 *
 * @module
 */
import { afterEach, describe, expect, it, vi } from 'vitest'

import { getHistorical, getPrice, listCoins, setProvider } from '@molecule/api-crypto-prices'

import { CoinGeckoRateLimitedError, provider } from '../index.js'

const json = (data: unknown, status = 200, headers: Record<string, string> = {}): Response =>
  new Response(JSON.stringify(data), {
    status,
    headers: { 'content-type': 'application/json', ...headers },
  })

const route = (url: string): Response => {
  if (url.includes('/simple/price'))
    return json({ bitcoin: { usd: 71234.56, usd_24h_change: 1.23, last_updated_at: 1714560000 } })
  if (url.includes('/coins/markets'))
    return json(
      Array.from({ length: 10 }, (_, i) => ({
        id: `coin-${i}`,
        symbol: `c${i}`,
        name: `Coin ${i}`,
        current_price: 100 - i,
        market_cap_rank: i + 1,
        price_change_percentage_24h: 0.5,
        last_updated: '2026-05-01T12:00:00.000Z',
      })),
    )
  if (url.includes('/coins/ethereum/market_chart'))
    return json({
      prices: Array.from({ length: 7 }, (_, i) => [1714560000000 + i * 86_400_000, 3000 + i]),
    })
  return json({ error: 'not found' }, 404)
}

describe('README @example', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
    vi.restoreAllMocks()
  })

  it('reads a price, the top coins and a week of history through the core', async () => {
    const fetchMock = vi.fn(async (input: string | URL | Request) => route(String(input)))
    vi.stubGlobal('fetch', fetchMock)
    const log = vi.spyOn(console, 'log').mockImplementation(() => undefined)

    setProvider(provider)

    try {
      const btc = await getPrice('bitcoin', 'usd')
      const top10 = await listCoins({ vsCurrency: 'usd', limit: 10 })
      const week = await getHistorical('ethereum', 7, 'usd')
      console.log(btc.price, top10.length, week.length)

      expect(btc).toEqual({
        id: 'bitcoin',
        vsCurrency: 'usd',
        price: 71234.56,
        change24h: 1.23,
        asOf: new Date(1714560000 * 1000),
      })
      expect(top10[0]).toMatchObject({ id: 'coin-0', rank: 1, vsCurrency: 'usd' })
      expect(week[0]).toEqual({ ts: new Date(1714560000000), price: 3000 })
    } catch (error) {
      if (error instanceof CoinGeckoRateLimitedError) {
        console.warn(`CoinGecko rate-limited; retry in ${error.retryAfterSeconds ?? 60}s`)
      } else {
        throw error
      }
    }

    expect(log).toHaveBeenCalledWith(71234.56, 10, 7)
    const urls = fetchMock.mock.calls.map(([input]) => String(input))
    expect(urls[1]).toContain('per_page=10')
    expect(urls[2]).toContain('days=7')
  })

  it('surfaces HTTP 429 as CoinGeckoRateLimitedError with retryAfterSeconds', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => json({ status: 'rate limited' }, 429, { 'retry-after': '30' })),
    )
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined)

    setProvider(provider)

    try {
      await getPrice('bitcoin', 'usd')
      throw new Error('expected a rate-limit error')
    } catch (error) {
      if (error instanceof CoinGeckoRateLimitedError) {
        console.warn(`CoinGecko rate-limited; retry in ${error.retryAfterSeconds ?? 60}s`)
      } else {
        throw error
      }
    }

    expect(warn).toHaveBeenCalledWith('CoinGecko rate-limited; retry in 30s')
  })
})
