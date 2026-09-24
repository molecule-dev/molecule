/**
 * Proves the module-level `@example` in `src/index.ts` (rendered as the README
 * Quick Start) works exactly as written. Only the network (`fetch` to
 * `openexchangerates.org`) is stubbed.
 *
 * @module
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { convert, getRate, setProvider } from '@molecule/api-fx-rates'

import { createProvider } from '../index.js'

const json = (data: unknown, status = 200): Response =>
  new Response(JSON.stringify(data), {
    status,
    headers: { 'content-type': 'application/json' },
  })

const route = (url: string): Response => {
  if (url.includes('/latest.json'))
    return json({ timestamp: 1790208000, base: 'USD', rates: { EUR: 0.8, GBP: 0.72 } })
  if (url.includes('/historical/2025-09-24.json'))
    return json({ timestamp: 1758672000, base: 'USD', rates: { EUR: 0.85, GBP: 0.74 } })
  return json({ error: true, status: 404 }, 404)
}

describe('README @example', () => {
  const originalEnv = process.env

  beforeEach(() => {
    process.env = { ...originalEnv, OPENEXCHANGE_APP_ID: 'test-app-id' }
  })

  afterEach(() => {
    process.env = originalEnv
    vi.unstubAllGlobals()
    vi.restoreAllMocks()
  })

  it('computes cross rates through USD, converts minor units and reads history', async () => {
    const fetchMock = vi.fn(async (input: string | URL | Request) => route(String(input)))
    vi.stubGlobal('fetch', fetchMock)
    const log = vi.spyOn(console, 'log').mockImplementation(() => undefined)

    setProvider(createProvider({ appId: process.env.OPENEXCHANGE_APP_ID }))

    const eurToGbp = await getRate('EUR', 'GBP')
    const pence = await convert(25_00, 'EUR', 'GBP')
    const lastYear = await getRate('USD', 'EUR', { asOf: new Date('2025-09-24') })
    console.log(eurToGbp, pence, lastYear)

    expect(eurToGbp).toBeCloseTo(0.9, 10)
    expect(pence).toBe(2250)
    expect(lastYear).toBe(0.85)
    expect(log).toHaveBeenCalledWith(eurToGbp, 2250, 0.85)
    const urls = fetchMock.mock.calls.map(([input]) => String(input))
    expect(urls[0]).toBe(
      'https://openexchangerates.org/api/latest.json?base=USD&app_id=test-app-id',
    )
    expect(urls).toContain(
      'https://openexchangerates.org/api/historical/2025-09-24.json?base=USD&app_id=test-app-id',
    )
  })
})
