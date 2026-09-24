/**
 * Proves the module-level `@example` in `src/index.ts` (rendered as the README
 * Quick Start) works exactly as written. Only the network (`fetch` to
 * `www.ecb.europa.eu`) is stubbed with the real daily-feed XML shape.
 *
 * @module
 */
import { afterEach, describe, expect, it, vi } from 'vitest'

import { convert, getDailyRates, getRate, setProvider } from '@molecule/api-fx-rates'

import { createProvider } from '../index.js'

const dailyXml = `<?xml version="1.0" encoding="UTF-8"?>
<gesmes:Envelope xmlns:gesmes="http://www.gesmes.org/xml/2002-08-01" xmlns="http://www.ecb.int/vocabulary/2002-08-01/eurofxref">
  <gesmes:subject>Reference rates</gesmes:subject>
  <gesmes:Sender><gesmes:name>European Central Bank</gesmes:name></gesmes:Sender>
  <Cube>
    <Cube time='2026-04-30'>
      <Cube currency='USD' rate='1.1000'/>
      <Cube currency='JPY' rate='168.45'/>
      <Cube currency='GBP' rate='0.88000'/>
    </Cube>
  </Cube>
</gesmes:Envelope>`

describe('README @example', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
    vi.restoreAllMocks()
  })

  it('reads a cross rate, converts minor units and returns the EUR-pivot snapshot', async () => {
    const fetchMock = vi.fn(
      async (_input: string | URL | Request) => new Response(dailyXml, { status: 200 }),
    )
    vi.stubGlobal('fetch', fetchMock)
    const log = vi.spyOn(console, 'log').mockImplementation(() => undefined)

    setProvider(createProvider({ cacheTtlMs: 60 * 60 * 1000 }))

    const usdToGbp = await getRate('USD', 'GBP')
    const pence = await convert(12_50, 'USD', 'GBP')
    const today = await getDailyRates()
    console.log(usdToGbp, pence, today.asOf.toISOString().slice(0, 10))

    expect(usdToGbp).toBeCloseTo(0.8, 10)
    expect(pence).toBe(1000)
    expect(today).toEqual({
      pivot: 'EUR',
      asOf: new Date('2026-04-30T00:00:00Z'),
      rates: { EUR: 1, USD: 1.1, JPY: 168.45, GBP: 0.88 },
    })
    expect(log).toHaveBeenCalledWith(usdToGbp, 1000, '2026-04-30')
    // The in-memory cache serves the second and third call.
    expect(fetchMock).toHaveBeenCalledTimes(1)
    expect(String(fetchMock.mock.calls[0]?.[0])).toBe(
      'https://www.ecb.europa.eu/stats/eurofxref/eurofxref-daily.xml',
    )
  })
})
