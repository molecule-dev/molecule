/**
 * Proves the module-level `@example` in `src/index.ts` (rendered as the README
 * Quick Start) works exactly as written. Only the network (`fetch`) is stubbed.
 *
 * @module
 */
import { afterEach, describe, expect, it, vi } from 'vitest'

import { getMarketStats, getPrice, listCoins, setProvider } from '@molecule/api-crypto-prices'

import { CoinMarketCapRateLimitedError, createProvider } from '../index.js'

const json = (data: unknown, status = 200, headers: Record<string, string> = {}): Response =>
  new Response(JSON.stringify(data), {
    status,
    headers: { 'content-type': 'application/json', ...headers },
  })

const btcRow = {
  id: 1,
  name: 'Bitcoin',
  symbol: 'BTC',
  cmc_rank: 1,
  circulating_supply: 19_700_000,
  total_supply: 19_700_000,
  last_updated: '2026-05-01T12:00:00.000Z',
  quote: {
    USD: {
      price: 71234.56,
      percent_change_24h: 1.23,
      market_cap: 1_400_000_000_000,
      volume_24h: 30_000_000_000,
      last_updated: '2026-05-01T12:00:00.000Z',
    },
  },
}

const route = (url: string): Response => {
  if (url.includes('/quotes/latest') && url.includes('symbol=BTC'))
    return json({ data: { BTC: [btcRow] } })
  if (url.includes('/quotes/latest') && url.includes('id=1')) return json({ data: { '1': btcRow } })
  if (url.includes('/listings/latest')) return json({ data: [btcRow] })
  return json({ status: { error_message: 'not found' } }, 404)
}

describe('README @example', () => {
  const originalKey = process.env.COINMARKETCAP_API_KEY

  afterEach(() => {
    if (originalKey === undefined) delete process.env.COINMARKETCAP_API_KEY
    else process.env.COINMARKETCAP_API_KEY = originalKey
    vi.unstubAllGlobals()
    vi.restoreAllMocks()
  })

  it('reads a price by symbol and market stats by a listCoins id, authenticated', async () => {
    process.env.COINMARKETCAP_API_KEY = 'cmc-test-key'
    const fetchMock = vi.fn(async (input: string | URL | Request, _init?: RequestInit) =>
      route(String(input)),
    )
    vi.stubGlobal('fetch', fetchMock)
    const log = vi.spyOn(console, 'log').mockImplementation(() => undefined)

    setProvider(createProvider({ apiKey: process.env.COINMARKETCAP_API_KEY, timeout: 10_000 }))

    try {
      const btc = await getPrice('BTC', 'usd')
      const top10 = await listCoins({ vsCurrency: 'usd', limit: 10 })
      const leader = await getMarketStats(top10[0]?.id ?? '1', 'usd')
      console.log(btc.price, leader.marketCap, leader.volume24h)

      expect(btc).toMatchObject({ id: 'BTC', vsCurrency: 'usd', price: 71234.56, change24h: 1.23 })
      expect(top10[0]?.id).toBe('1')
      expect(leader).toMatchObject({ id: '1', circulatingSupply: 19_700_000 })
    } catch (error) {
      if (error instanceof CoinMarketCapRateLimitedError) {
        console.warn(`CoinMarketCap rate-limited; retry in ${error.retryAfterSeconds ?? 60}s`)
      } else {
        throw error
      }
    }

    expect(log).toHaveBeenCalledWith(71234.56, 1_400_000_000_000, 30_000_000_000)
    for (const [input, init] of fetchMock.mock.calls) {
      expect(String(input)).toContain('convert=USD')
      expect((init?.headers as Record<string, string>)['X-CMC_PRO_API_KEY']).toBe('cmc-test-key')
    }
  })

  it('surfaces HTTP 429 as CoinMarketCapRateLimitedError', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => json({}, 429, { 'retry-after': '45' })),
    )
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined)

    setProvider(createProvider({ apiKey: 'cmc-test-key', timeout: 10_000 }))

    try {
      await getPrice('BTC', 'usd')
      throw new Error('expected a rate-limit error')
    } catch (error) {
      if (error instanceof CoinMarketCapRateLimitedError) {
        console.warn(`CoinMarketCap rate-limited; retry in ${error.retryAfterSeconds ?? 60}s`)
      } else {
        throw error
      }
    }

    expect(warn).toHaveBeenCalledWith('CoinMarketCap rate-limited; retry in 45s')
  })
})
