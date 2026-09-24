/**
 * Proves the module-level `@example` in `src/index.ts` (rendered as the README
 * Quick Start) works exactly as written, through the ECB bond. Only `fetch`
 * (the ECB XML feed) is stubbed, the same way the bond's own tests stub it.
 *
 * @module
 */
import { afterEach, describe, expect, it, vi } from 'vitest'

import { createProvider } from '@molecule/api-fx-rates-ecb'

import { convert, getRate, listSupportedCurrencies, setProvider } from '../index.js'

const dailyXml = `<?xml version="1.0" encoding="UTF-8"?>
<gesmes:Envelope xmlns:gesmes="http://www.gesmes.org/xml/2002-08-01" xmlns="http://www.ecb.int/vocabulary/2002-08-01/eurofxref">
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
  })

  it('bonds ECB, lists currencies, reads a rate and converts minor units', async () => {
    const fetchMock = vi.fn(
      async () => ({ ok: true, status: 200, text: async () => dailyXml }) as unknown as Response,
    )
    vi.stubGlobal('fetch', fetchMock)

    setProvider(createProvider({ cacheTtlMs: 60 * 60 * 1000 }))

    const supported = await listSupportedCurrencies()
    expect(supported).toEqual(['EUR', 'GBP', 'JPY', 'USD'])

    const eurUsd = await getRate('EUR', 'USD')
    expect(eurUsd).toBeCloseTo(1.1)

    const usdCents = await convert(10_000, 'EUR', 'USD')
    const label = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(
      usdCents / 100,
    )
    expect(usdCents).toBe(11_000)
    expect(label).toBe('$110.00')

    // The 1h in-memory cache means the feed was fetched once for all three calls.
    expect(fetchMock).toHaveBeenCalledTimes(1)
    await expect(getRate('EUR', 'ZZZ')).rejects.toThrow('ZZZ')
  })
})
