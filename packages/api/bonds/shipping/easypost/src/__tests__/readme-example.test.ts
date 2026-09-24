/**
 * Proves the module-level `@example` in `src/index.ts` (rendered as the README
 * Quick Start) works exactly as written. Only the network (`fetch` to
 * `api.easypost.com`) is stubbed.
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

  it('quotes a shipment and buys the cheapest rate with the same shipment id', async () => {
    vi.stubEnv('EASYPOST_API_KEY', 'test-key')
    vi.stubEnv('EASYPOST_API_URL', undefined)
    const fetchMock = vi.fn(async (input: string | URL | Request, _init?: RequestInit) => {
      const url = String(input)
      if (url.endsWith('/shipments')) {
        return json({
          id: 'shp_123',
          rates: [
            { id: 'rate_ups', carrier: 'UPS', service: 'Ground', rate: '12.40', currency: 'USD' },
            {
              id: 'rate_usps',
              carrier: 'USPS',
              service: 'GroundAdvantage',
              rate: '7.58',
              currency: 'USD',
              delivery_days: 3,
            },
          ],
        })
      }
      return json({
        id: 'shp_123',
        tracking_code: '9400100000000000000000',
        postage_label: { label_url: 'https://easypost-files.example.com/label.png' },
        selected_rate: {
          id: 'rate_usps',
          carrier: 'USPS',
          service: 'GroundAdvantage',
          rate: '7.58',
          currency: 'USD',
        },
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

    expect(shipmentId).toBe('shp_123')
    expect(cheapest.rateId).toBe('rate_usps')
    expect(label).toEqual({
      id: 'shp_123',
      trackingNumber: '9400100000000000000000',
      labelUrl: 'https://easypost-files.example.com/label.png',
      carrier: 'usps',
      service: 'GroundAdvantage',
      amount: { amount: '7.58', currency: 'USD' },
    })

    const [quoteUrl, quoteInit] = fetchMock.mock.calls[0] ?? []
    expect(String(quoteUrl)).toBe('https://api.easypost.com/v2/shipments')
    expect(JSON.parse(String(quoteInit?.body)).shipment.parcel).toEqual({
      length: 10,
      width: 8,
      height: 4,
      weight: 32, // 2 lb → ounces
    })
    const [buyUrl, buyInit] = fetchMock.mock.calls[1] ?? []
    expect(String(buyUrl)).toBe('https://api.easypost.com/v2/shipments/shp_123/buy')
    expect(JSON.parse(String(buyInit?.body))).toEqual({ rate: { id: 'rate_usps' } })
  })
})
