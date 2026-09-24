/**
 * Proves the module-level `@example` in `src/index.ts` (rendered as the README
 * Quick Start) works exactly as written. Only the network (`fetch` to
 * `api.goshippo.com`) is stubbed.
 *
 * @module
 */
import { afterEach, describe, expect, it, vi } from 'vitest'

import { createLabel, createShipment, setProvider } from '@molecule/api-shipping'

import { provider } from '../index.js'

const json = (body: unknown): Response =>
  new Response(JSON.stringify(body), {
    status: 200,
    headers: { 'content-type': 'application/json' },
  })

describe('README @example', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
    vi.unstubAllEnvs()
  })

  it('quotes a shipment and buys the cheapest rate as a transaction', async () => {
    vi.stubEnv('SHIPPO_API_KEY', 'test-key')
    vi.stubEnv('SHIPPO_API_URL', undefined)
    const fetchMock = vi.fn(async (input: string | URL | Request, _init?: RequestInit) => {
      const url = String(input)
      if (url.endsWith('/shipments/')) {
        return json({
          object_id: 'shp_abc',
          rates: [
            {
              object_id: 'rate_ups',
              provider: 'UPS',
              servicelevel: { name: 'Ground' },
              amount: '12.40',
              currency: 'USD',
            },
            {
              object_id: 'rate_usps',
              provider: 'USPS',
              servicelevel: { name: 'Ground Advantage' },
              amount: '7.58',
              currency: 'USD',
              estimated_days: 3,
            },
          ],
        })
      }
      return json({
        object_id: 'txn_789',
        status: 'SUCCESS',
        tracking_number: '9400100000000000000000',
        label_url: 'https://shippo-files.example.com/label.pdf',
      })
    })
    vi.stubGlobal('fetch', fetchMock)

    setProvider(provider)

    const { shipmentId, rates } = await createShipment({
      from: {
        name: 'Acme Store',
        street1: '417 Montgomery St',
        city: 'San Francisco',
        state: 'CA',
        postalCode: '94104',
        country: 'US',
      },
      to: {
        name: 'Ada Lovelace',
        street1: '179 N Harbor Dr',
        city: 'Redondo Beach',
        state: 'CA',
        postalCode: '90277',
        country: 'US',
      },
      parcels: [{ length: 10, width: 8, height: 4, weight: 2, distanceUnit: 'in', massUnit: 'lb' }],
    })

    const cheapest = [...rates].sort((a, b) => Number(a.amount.amount) - Number(b.amount.amount))[0]
    if (!cheapest) throw new Error('No rates returned for this shipment')

    const label = await createLabel(shipmentId, cheapest)

    expect(shipmentId).toBe('shp_abc')
    expect(cheapest.rateId).toBe('rate_usps')
    expect(label).toEqual({
      id: 'txn_789',
      trackingNumber: '9400100000000000000000',
      labelUrl: 'https://shippo-files.example.com/label.pdf',
      carrier: 'usps',
      service: 'Ground Advantage',
      amount: { amount: '7.58', currency: 'USD' },
    })

    const [quoteUrl, quoteInit] = fetchMock.mock.calls[0] ?? []
    expect(String(quoteUrl)).toBe('https://api.goshippo.com/shipments/')
    expect((quoteInit?.headers as Record<string, string>).Authorization).toBe(
      'ShippoToken test-key',
    )
    expect(JSON.parse(String(quoteInit?.body)).parcels).toEqual([
      { length: '10', width: '8', height: '4', distance_unit: 'in', weight: '2', mass_unit: 'lb' },
    ])
    const [buyUrl, buyInit] = fetchMock.mock.calls[1] ?? []
    expect(String(buyUrl)).toBe('https://api.goshippo.com/transactions/')
    expect(JSON.parse(String(buyInit?.body))).toEqual({
      rate: 'rate_usps',
      label_file_type: 'PDF',
      async: false,
    })
  })
})
