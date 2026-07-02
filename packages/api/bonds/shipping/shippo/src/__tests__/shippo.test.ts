/**
 * Tests for the Shippo shipping provider.
 *
 * @module
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import type { Shipment, ShippingRate } from '@molecule/api-shipping'

vi.mock('@molecule/api-bond', () => ({
  getLogger: () => ({
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
  }),
}))

vi.mock('@molecule/api-shipping', () => ({}))

const validShipment: Shipment = {
  from: {
    name: 'Sender',
    street1: '417 Montgomery St',
    city: 'San Francisco',
    state: 'CA',
    postalCode: '94104',
    country: 'US',
  },
  to: {
    name: 'Recipient',
    street1: '179 N Harbor Dr',
    city: 'Redondo Beach',
    state: 'CA',
    postalCode: '90277',
    country: 'US',
  },
  parcels: [{ length: 10, width: 6, height: 4, weight: 12 }],
}

const mockShipmentResponse = {
  object_id: 'shp_abc123',
  rates: [
    {
      object_id: 'rate_1',
      provider: 'USPS',
      servicelevel: { name: 'Priority Mail', token: 'usps_priority' },
      amount: '7.30',
      currency: 'USD',
      estimated_days: 2,
    },
    {
      object_id: 'rate_2',
      provider: 'UPS',
      servicelevel: { name: 'Ground', token: 'ups_ground' },
      amount: '12.45',
      currency: 'USD',
      estimated_days: 3,
    },
  ],
}

const mockTransactionSuccess = {
  object_id: 'txn_xyz789',
  status: 'SUCCESS',
  tracking_number: '9400111899223197428490',
  label_url: 'https://shippo-delivery.s3.amazonaws.com/label.pdf',
  rate: 'rate_1',
}

const mockTransactionError = {
  object_id: 'txn_xyz789',
  status: 'ERROR',
  messages: [{ text: 'Insufficient postage balance', code: 'INSUFFICIENT_FUNDS' }],
}

const mockTrack = {
  carrier: 'USPS',
  tracking_number: '9400111899223197428490',
  tracking_status: {
    status: 'TRANSIT',
    status_details: 'In transit to next facility',
    status_date: '2026-05-02T15:30:00Z',
    location: { city: 'Oakland', state: 'CA', country: 'US' },
  },
  tracking_history: [
    {
      status: 'PRE_TRANSIT',
      status_details: 'Shipment information sent to USPS',
      status_date: '2026-05-01T08:00:00Z',
      location: { city: 'San Francisco', state: 'CA', country: 'US' },
    },
    {
      status: 'TRANSIT',
      status_details: 'In transit to next facility',
      status_date: '2026-05-02T15:30:00Z',
      location: { city: 'Oakland', state: 'CA', country: 'US' },
    },
  ],
  eta: '2026-05-06T00:00:00Z',
}

const makeFetchResponse = (status: number, body: unknown): Response => {
  const text = typeof body === 'string' ? body : JSON.stringify(body)
  return {
    ok: status >= 200 && status < 300,
    status,
    text: () => Promise.resolve(text),
  } as unknown as Response
}

describe('Shippo Shipping Provider', () => {
  const originalEnv = process.env
  const originalFetch = globalThis.fetch
  let fetchMock: ReturnType<typeof vi.fn>

  beforeEach(() => {
    vi.resetModules()
    process.env = { ...originalEnv }
    process.env.SHIPPO_API_KEY = 'shippo_test_abcdef0123456789'
    delete process.env.SHIPPO_API_URL
    fetchMock = vi.fn()
    globalThis.fetch = fetchMock as unknown as typeof fetch
  })

  afterEach(() => {
    process.env = originalEnv
    globalThis.fetch = originalFetch
    vi.clearAllMocks()
  })

  describe('listSupportedCarriers', () => {
    it('returns a non-empty list of carrier identifiers', async () => {
      const { listSupportedCarriers } = await import('../provider.js')
      const carriers = await listSupportedCarriers()
      expect(carriers).toContain('usps')
      expect(carriers).toContain('ups')
      expect(carriers).toContain('fedex')
      expect(carriers.length).toBeGreaterThan(5)
    })

    it('returns a fresh array each call (caller cannot mutate internal state)', async () => {
      const { listSupportedCarriers } = await import('../provider.js')
      const a = await listSupportedCarriers()
      a.push('mutated')
      const b = await listSupportedCarriers()
      expect(b).not.toContain('mutated')
    })
  })

  describe('getRates', () => {
    it('POSTs to /shipments/ and returns normalized rates', async () => {
      fetchMock.mockResolvedValueOnce(makeFetchResponse(201, mockShipmentResponse))
      const { getRates } = await import('../provider.js')

      const rates = await getRates(validShipment)

      expect(fetchMock).toHaveBeenCalledTimes(1)
      const [url, init] = fetchMock.mock.calls[0]!
      expect(url).toBe('https://api.goshippo.com/shipments/')
      expect((init as RequestInit).method).toBe('POST')
      const body = JSON.parse((init as RequestInit).body as string)
      expect(body.address_to.zip).toBe('90277')
      expect(body.address_from.zip).toBe('94104')
      expect(body.parcels[0]).toMatchObject({
        length: '10',
        width: '6',
        height: '4',
        weight: '12',
        distance_unit: 'in',
        mass_unit: 'lb',
      })
      expect(body.async).toBe(false)

      expect(rates).toHaveLength(2)
      expect(rates[0]).toMatchObject({
        carrier: 'usps',
        service: 'Priority Mail',
        amount: { amount: '7.30', currency: 'USD' },
        rateId: 'rate_1',
      })
      expect(rates[0]!.deliveryEstimate?.businessDays).toBe(2)
      expect(rates[1]!.carrier).toBe('ups')
    })

    it('uses ShippoToken auth with the API key', async () => {
      fetchMock.mockResolvedValueOnce(makeFetchResponse(201, mockShipmentResponse))
      const { getRates } = await import('../provider.js')

      await getRates(validShipment)

      const headers = (fetchMock.mock.calls[0]![1] as RequestInit).headers as Record<string, string>
      expect(headers.Authorization).toBe('ShippoToken shippo_test_abcdef0123456789')
      expect(headers['Content-Type']).toBe('application/json')
    })

    it('respects SHIPPO_API_URL override', async () => {
      process.env.SHIPPO_API_URL = 'https://example.test/'
      fetchMock.mockResolvedValueOnce(makeFetchResponse(201, mockShipmentResponse))
      const { getRates } = await import('../provider.js')

      await getRates(validShipment)

      expect(fetchMock.mock.calls[0]![0]).toBe('https://example.test/shipments/')
    })

    it('passes through caller-supplied distanceUnit / massUnit', async () => {
      fetchMock.mockResolvedValueOnce(makeFetchResponse(201, mockShipmentResponse))
      const { getRates } = await import('../provider.js')
      await getRates({
        ...validShipment,
        parcels: [
          { length: 25, width: 15, height: 10, weight: 1.5, distanceUnit: 'cm', massUnit: 'kg' },
        ],
      })
      const body = JSON.parse((fetchMock.mock.calls[0]![1] as RequestInit).body as string)
      expect(body.parcels[0].distance_unit).toBe('cm')
      expect(body.parcels[0].mass_unit).toBe('kg')
    })

    it('throws when no parcels are supplied', async () => {
      const { getRates } = await import('../provider.js')
      await expect(getRates({ ...validShipment, parcels: [] })).rejects.toThrow(
        /at least one parcel/,
      )
      expect(fetchMock).not.toHaveBeenCalled()
    })

    it('throws when SHIPPO_API_KEY is missing', async () => {
      delete process.env.SHIPPO_API_KEY
      const { getRates } = await import('../provider.js')
      await expect(getRates(validShipment)).rejects.toThrow(/SHIPPO_API_KEY/)
      expect(fetchMock).not.toHaveBeenCalled()
    })

    it('sanitizes API token out of error messages on non-2xx responses', async () => {
      fetchMock.mockResolvedValueOnce(
        makeFetchResponse(401, {
          detail: 'Unauthorized for token shippo_test_abcdef0123456789',
        }),
      )
      const { getRates } = await import('../provider.js')
      let captured: Error | null = null
      try {
        await getRates(validShipment)
      } catch (err) {
        captured = err as Error
      }
      expect(captured).toBeTruthy()
      expect(captured!.message).not.toContain('shippo_test_abcdef0123456789')
      expect(captured!.message).toContain('[redacted]')
    })

    it('sanitizes ShippoToken auth strings out of error messages', async () => {
      fetchMock.mockResolvedValueOnce(
        makeFetchResponse(500, 'Bad request: ShippoToken shippo_live_secrethex'),
      )
      const { getRates } = await import('../provider.js')
      let msg = ''
      try {
        await getRates(validShipment)
      } catch (err) {
        msg = (err as Error).message
      }
      // Token regex matches the bare token, so we get [redacted] either way.
      expect(msg).not.toContain('shippo_live_secrethex')
      expect(msg).toContain('[redacted]')
    })

    it('wraps fetch network errors with sanitized message', async () => {
      fetchMock.mockRejectedValueOnce(new Error('ECONNREFUSED shippo_test_abcdef0123456789'))
      const { getRates } = await import('../provider.js')
      await expect(getRates(validShipment)).rejects.toThrow(/Shippo request failed/)
      try {
        await getRates(validShipment)
      } catch (err) {
        expect((err as Error).message).not.toContain('shippo_test_abcdef0123456789')
      }
    })

    it('falls back to servicelevel.token when name is missing', async () => {
      fetchMock.mockResolvedValueOnce(
        makeFetchResponse(201, {
          object_id: 'shp_x',
          rates: [
            {
              object_id: 'rate_x',
              provider: 'FedEx',
              servicelevel: { token: 'fedex_ground' },
              amount: '8.00',
              currency: 'USD',
            },
          ],
        }),
      )
      const { getRates } = await import('../provider.js')
      const rates = await getRates(validShipment)
      expect(rates[0]!.service).toBe('fedex_ground')
    })

    it('omits deliveryEstimate when estimated_days is null', async () => {
      fetchMock.mockResolvedValueOnce(
        makeFetchResponse(201, {
          object_id: 'shp_x',
          rates: [
            {
              object_id: 'rate_x',
              provider: 'USPS',
              servicelevel: { name: 'First Class' },
              amount: '3.00',
              currency: 'USD',
              estimated_days: null,
            },
          ],
        }),
      )
      const { getRates } = await import('../provider.js')
      const rates = await getRates(validShipment)
      expect(rates[0]!.deliveryEstimate).toBeUndefined()
    })

    it('handles missing rates array gracefully', async () => {
      fetchMock.mockResolvedValueOnce(makeFetchResponse(201, { object_id: 'shp_x' }))
      const { getRates } = await import('../provider.js')
      const rates = await getRates(validShipment)
      expect(rates).toEqual([])
    })
  })

  describe('createLabel', () => {
    it('POSTs to /transactions/ with rate ID and returns normalized label', async () => {
      fetchMock.mockResolvedValueOnce(makeFetchResponse(201, mockTransactionSuccess))
      const { createLabel } = await import('../provider.js')
      const rate: ShippingRate = {
        carrier: 'usps',
        service: 'Priority Mail',
        amount: { amount: '7.30', currency: 'USD' },
        rateId: 'rate_1',
      }

      const label = await createLabel('shp_abc123', rate)

      expect(fetchMock).toHaveBeenCalledTimes(1)
      const [url, init] = fetchMock.mock.calls[0]!
      expect(url).toBe('https://api.goshippo.com/transactions/')
      expect((init as RequestInit).method).toBe('POST')
      expect(JSON.parse((init as RequestInit).body as string)).toEqual({
        rate: 'rate_1',
        label_file_type: 'PDF',
        async: false,
      })

      expect(label).toEqual({
        id: 'txn_xyz789',
        trackingNumber: '9400111899223197428490',
        labelUrl: 'https://shippo-delivery.s3.amazonaws.com/label.pdf',
        carrier: 'usps',
        service: 'Priority Mail',
        amount: { amount: '7.30', currency: 'USD' },
      })
    })

    it('throws when rate.rateId is missing', async () => {
      const { createLabel } = await import('../provider.js')
      await expect(
        createLabel('shp_abc123', {
          carrier: 'usps',
          service: 'Priority Mail',
          amount: { amount: '7.30', currency: 'USD' },
        }),
      ).rejects.toThrow(/rate\.rateId/)
      expect(fetchMock).not.toHaveBeenCalled()
    })

    it('throws when transaction returns ERROR status with sanitized messages', async () => {
      fetchMock.mockResolvedValueOnce(makeFetchResponse(201, mockTransactionError))
      const { createLabel } = await import('../provider.js')
      const rate: ShippingRate = {
        carrier: 'usps',
        service: 'Priority Mail',
        amount: { amount: '7.30', currency: 'USD' },
        rateId: 'rate_1',
      }
      await expect(createLabel('shp_abc123', rate)).rejects.toThrow(
        /Shippo transaction failed.*Insufficient postage balance/,
      )
    })

    it('surfaces API errors with sanitized output', async () => {
      fetchMock.mockResolvedValueOnce(
        makeFetchResponse(402, { detail: 'Insufficient funds for shippo_live_secrethex' }),
      )
      const { createLabel } = await import('../provider.js')
      let msg = ''
      try {
        await createLabel('shp_abc123', {
          carrier: 'usps',
          service: 'Priority Mail',
          amount: { amount: '7.30', currency: 'USD' },
          rateId: 'rate_1',
        })
      } catch (err) {
        msg = (err as Error).message
      }
      expect(msg).toContain('402')
      expect(msg).not.toContain('shippo_live_secrethex')
    })

    it('treats absent status as success (label is returned)', async () => {
      fetchMock.mockResolvedValueOnce(
        makeFetchResponse(201, {
          object_id: 'txn_2',
          tracking_number: 'TRK2',
          label_url: 'https://x/label.pdf',
        }),
      )
      const { createLabel } = await import('../provider.js')
      const label = await createLabel('shp_abc123', {
        carrier: 'usps',
        service: 'Priority',
        amount: { amount: '7.30', currency: 'USD' },
        rateId: 'rate_1',
      })
      expect(label.id).toBe('txn_2')
      expect(label.trackingNumber).toBe('TRK2')
    })
  })

  describe('voidLabel (refund)', () => {
    it('POSTs to /refunds/ with the transaction ID', async () => {
      fetchMock.mockResolvedValueOnce(makeFetchResponse(201, { object_id: 'ref_1' }))
      const { voidLabel } = await import('../provider.js')

      await voidLabel('txn_xyz789')

      const [url, init] = fetchMock.mock.calls[0]!
      expect(url).toBe('https://api.goshippo.com/refunds/')
      expect((init as RequestInit).method).toBe('POST')
      expect(JSON.parse((init as RequestInit).body as string)).toEqual({
        transaction: 'txn_xyz789',
        async: false,
      })
    })

    it('propagates errors from the refund endpoint', async () => {
      fetchMock.mockResolvedValueOnce(
        makeFetchResponse(409, { detail: 'Label cannot be refunded' }),
      )
      const { voidLabel } = await import('../provider.js')
      await expect(voidLabel('txn_xyz789')).rejects.toThrow(/Shippo API error \(409\)/)
    })
  })

  describe('trackPackage', () => {
    it('GETs /tracks/:carrier/:tracking_number and returns normalized status', async () => {
      fetchMock.mockResolvedValueOnce(makeFetchResponse(200, mockTrack))
      const { trackPackage } = await import('../provider.js')

      const status = await trackPackage('USPS', '9400111899223197428490')

      expect(fetchMock).toHaveBeenCalledTimes(1)
      const [url, init] = fetchMock.mock.calls[0]!
      expect(url).toBe('https://api.goshippo.com/tracks/usps/9400111899223197428490')
      // GET requests don't set a method explicitly; absence/get both fine.
      expect((init as RequestInit).method ?? 'GET').toBe('GET')

      expect(status.carrier).toBe('usps')
      expect(status.trackingNumber).toBe('9400111899223197428490')
      expect(status.status).toBe('in_transit')
      expect(status.events).toHaveLength(2)
      expect(status.events[0]!.status).toBe('pre_transit')
      expect(status.events[0]!.location).toBe('San Francisco, CA, US')
      expect(status.events[0]!.timestamp).toBeInstanceOf(Date)
      expect(status.estimatedDelivery?.latest).toBeInstanceOf(Date)
    })

    it('URI-encodes carrier and tracking number', async () => {
      fetchMock.mockResolvedValueOnce(
        makeFetchResponse(200, {
          carrier: 'dhl_express',
          tracking_number: 'X 1/2',
          tracking_status: { status: 'DELIVERED' },
          tracking_history: [],
        }),
      )
      const { trackPackage } = await import('../provider.js')
      await trackPackage('DHL_Express', 'X 1/2')
      expect(fetchMock.mock.calls[0]![0]).toBe(
        'https://api.goshippo.com/tracks/dhl_express/X%201%2F2',
      )
    })

    it('maps unknown Shippo statuses to "unknown"', async () => {
      fetchMock.mockResolvedValueOnce(
        makeFetchResponse(200, {
          carrier: 'UPS',
          tracking_number: 'X',
          tracking_status: { status: 'LOST_IN_ORBIT' },
          tracking_history: [],
        }),
      )
      const { trackPackage } = await import('../provider.js')
      const result = await trackPackage('ups', 'X')
      expect(result.status).toBe('unknown')
    })

    it('handles missing tracking_history array', async () => {
      fetchMock.mockResolvedValueOnce(
        makeFetchResponse(200, {
          carrier: 'FedEx',
          tracking_number: 'FX1',
          tracking_status: { status: 'DELIVERED' },
        }),
      )
      const { trackPackage } = await import('../provider.js')
      const result = await trackPackage('fedex', 'FX1')
      expect(result.events).toEqual([])
      expect(result.status).toBe('delivered')
    })

    it('maps RETURNED to return_to_sender', async () => {
      fetchMock.mockResolvedValueOnce(
        makeFetchResponse(200, {
          carrier: 'USPS',
          tracking_number: 'R1',
          tracking_status: { status: 'RETURNED' },
          tracking_history: [],
        }),
      )
      const { trackPackage } = await import('../provider.js')
      const result = await trackPackage('usps', 'R1')
      expect(result.status).toBe('return_to_sender')
    })

    it('maps FAILURE to failure', async () => {
      fetchMock.mockResolvedValueOnce(
        makeFetchResponse(200, {
          carrier: 'DHL',
          tracking_number: 'D1',
          tracking_status: { status: 'FAILURE' },
          tracking_history: [],
        }),
      )
      const { trackPackage } = await import('../provider.js')
      const result = await trackPackage('dhl_express', 'D1')
      expect(result.status).toBe('failure')
    })
  })

  describe('provider conformance', () => {
    it('exports a typed provider object with every required method', async () => {
      const { provider } = await import('../provider.js')
      expect(typeof provider.listSupportedCarriers).toBe('function')
      expect(typeof provider.getRates).toBe('function')
      expect(typeof provider.createLabel).toBe('function')
      expect(typeof provider.voidLabel).toBe('function')
      expect(typeof provider.trackPackage).toBe('function')
    })

    it('exposes everything via the barrel', async () => {
      const exports = await import('../index.js')
      expect(exports.provider).toBeDefined()
      expect(exports.listSupportedCarriers).toBeDefined()
      expect(exports.getRates).toBeDefined()
      expect(exports.createLabel).toBeDefined()
      expect(exports.voidLabel).toBeDefined()
      expect(exports.trackPackage).toBeDefined()
    })

    it('registers its secret definitions at import time', async () => {
      await import('../index.js')
      const { getSecretDefinition } = await import('@molecule/api-secrets')
      expect(getSecretDefinition('SHIPPO_API_KEY')).toBeDefined()
    })
  })
})
