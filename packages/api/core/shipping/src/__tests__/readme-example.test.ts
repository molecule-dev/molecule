/**
 * Proves the module-level `@example` in `src/index.ts` (rendered as the README
 * Quick Start) works exactly as written, through the real EasyPost bond with
 * only `fetch` (the EasyPost REST API) mocked.
 *
 * @module
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { provider } from '@molecule/api-shipping-easypost'

import { createLabel, createShipment, setProvider, trackPackage } from '../index.js'

const json = (body: unknown): Response =>
  new Response(JSON.stringify(body), {
    status: 200,
    headers: { 'content-type': 'application/json' },
  })

describe('README @example', () => {
  const fetchMock = vi.fn<typeof fetch>()

  beforeEach(() => {
    process.env.EASYPOST_API_KEY = 'test-key'
    vi.stubGlobal('fetch', fetchMock)
    fetchMock
      .mockResolvedValueOnce(
        json({
          id: 'shp_123',
          rates: [
            { id: 'rate_1', carrier: 'USPS', service: 'Priority', rate: '7.58', currency: 'USD' },
          ],
        }),
      )
      .mockResolvedValueOnce(
        json({
          id: 'shp_123',
          tracking_code: '9400100000000000000000',
          postage_label: { label_url: 'https://easypost-files.example.com/label.png' },
          selected_rate: {
            id: 'rate_1',
            carrier: 'USPS',
            service: 'Priority',
            rate: '7.58',
            currency: 'USD',
          },
        }),
      )
      .mockResolvedValueOnce(
        json({
          carrier: 'USPS',
          tracking_code: '9400100000000000000000',
          status: 'pre_transit',
          tracking_details: [],
        }),
      )
  })

  afterEach(() => {
    vi.unstubAllGlobals()
    delete process.env.EASYPOST_API_KEY
  })

  it('quotes, buys a label for the quoted rate, and tracks it', async () => {
    setProvider(provider)

    const { shipmentId, rates } = await createShipment({
      from: {
        street1: '417 Montgomery St',
        city: 'San Francisco',
        state: 'CA',
        postalCode: '94104',
        country: 'US',
      },
      to: {
        street1: '179 N Harbor Dr',
        city: 'Redondo Beach',
        state: 'CA',
        postalCode: '90277',
        country: 'US',
      },
      parcels: [{ length: 10, width: 6, height: 4, weight: 2, distanceUnit: 'in', massUnit: 'lb' }],
    })
    expect(shipmentId).toBe('shp_123')
    expect(rates[0]).toMatchObject({
      carrier: 'usps',
      rateId: 'rate_1',
      amount: { amount: '7.58' },
    })

    const label = await createLabel(shipmentId, rates[0]!)
    expect(label.trackingNumber).toBe('9400100000000000000000')
    expect(label.labelUrl).toBe('https://easypost-files.example.com/label.png')

    const status = await trackPackage(label.carrier, label.trackingNumber)
    expect(status.status).toBe('pre_transit')

    const [, buyInit] = fetchMock.mock.calls[1]!
    expect(fetchMock.mock.calls[1]![0]).toBe('https://api.easypost.com/v2/shipments/shp_123/buy')
    expect(JSON.parse(String(buyInit?.body))).toEqual({ rate: { id: 'rate_1' } })
  })
})
