/**
 * Tests for the EasyPost shipping provider.
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
  // Explicit imperial units: EasyPost's native inches + ounces, so
  // `toEasyPostParcel` is an identity conversion and the payload matches 1:1.
  parcels: [{ length: 10, width: 6, height: 4, weight: 12, distanceUnit: 'in', massUnit: 'oz' }],
}

const mockShipmentResponse = {
  id: 'shp_abc123',
  rates: [
    {
      id: 'rate_1',
      carrier: 'USPS',
      service: 'Priority',
      rate: '7.30',
      currency: 'USD',
      delivery_days: 2,
      delivery_date: '2026-05-05T00:00:00Z',
    },
    {
      id: 'rate_2',
      carrier: 'UPS',
      service: 'Ground',
      rate: '12.45',
      currency: 'USD',
      delivery_days: 3,
      delivery_date: null,
    },
  ],
}

const mockBoughtShipment = {
  id: 'shp_abc123',
  rates: mockShipmentResponse.rates,
  selected_rate: {
    id: 'rate_1',
    carrier: 'USPS',
    service: 'Priority',
    rate: '7.30',
    currency: 'USD',
  },
  postage_label: { label_url: 'https://easypost-files.s3.amazonaws.com/label.pdf' },
  tracking_code: '9400111899223197428490',
}

const mockTracker = {
  carrier: 'USPS',
  tracking_code: '9400111899223197428490',
  status: 'in_transit',
  est_delivery_date: '2026-05-06T00:00:00Z',
  tracking_details: [
    {
      datetime: '2026-05-01T08:00:00Z',
      status: 'pre_transit',
      message: 'Shipment information sent to USPS',
      tracking_location: { city: 'San Francisco', state: 'CA', country: 'US' },
    },
    {
      datetime: '2026-05-02T15:30:00Z',
      status: 'in_transit',
      message: 'In transit to next facility',
      tracking_location: { city: 'Oakland', state: 'CA', country: 'US' },
    },
  ],
}

const makeFetchResponse = (status: number, body: unknown): Response => {
  const text = typeof body === 'string' ? body : JSON.stringify(body)
  return {
    ok: status >= 200 && status < 300,
    status,
    text: () => Promise.resolve(text),
  } as unknown as Response
}

describe('EasyPost Shipping Provider', () => {
  const originalEnv = process.env
  const originalFetch = globalThis.fetch
  let fetchMock: ReturnType<typeof vi.fn>

  beforeEach(() => {
    vi.resetModules()
    process.env = { ...originalEnv }
    process.env.EASYPOST_API_KEY = 'EZTKtest_abcdef0123456789'
    delete process.env.EASYPOST_API_URL
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
    it('POSTs to /shipments and returns normalized rates', async () => {
      fetchMock.mockResolvedValueOnce(makeFetchResponse(201, mockShipmentResponse))
      const { getRates } = await import('../provider.js')

      const rates = await getRates(validShipment)

      expect(fetchMock).toHaveBeenCalledTimes(1)
      const [url, init] = fetchMock.mock.calls[0]!
      expect(url).toBe('https://api.easypost.com/v2/shipments')
      expect((init as RequestInit).method).toBe('POST')
      const body = JSON.parse((init as RequestInit).body as string)
      expect(body.shipment.to_address.zip).toBe('90277')
      expect(body.shipment.from_address.zip).toBe('94104')
      expect(body.shipment.parcel).toEqual({ length: 10, width: 6, height: 4, weight: 12 })

      expect(rates).toHaveLength(2)
      expect(rates[0]).toMatchObject({
        carrier: 'usps',
        service: 'Priority',
        amount: { amount: '7.30', currency: 'USD' },
        rateId: 'rate_1',
      })
      expect(rates[0]!.deliveryEstimate?.businessDays).toBe(2)
      expect(rates[0]!.deliveryEstimate?.latest).toBeInstanceOf(Date)
      expect(rates[1]!.carrier).toBe('ups')
    })

    it('uses Basic auth with the EasyPost API key', async () => {
      fetchMock.mockResolvedValueOnce(makeFetchResponse(201, mockShipmentResponse))
      const { getRates } = await import('../provider.js')

      await getRates(validShipment)

      const headers = (fetchMock.mock.calls[0]![1] as RequestInit).headers as Record<string, string>
      expect(headers.Authorization).toMatch(/^Basic /)
      const decoded = Buffer.from(headers.Authorization!.replace('Basic ', ''), 'base64').toString()
      expect(decoded).toBe('EZTKtest_abcdef0123456789:')
      expect(headers['Content-Type']).toBe('application/json')
    })

    it('respects EASYPOST_API_URL override', async () => {
      process.env.EASYPOST_API_URL = 'https://example.test/v2/'
      fetchMock.mockResolvedValueOnce(makeFetchResponse(201, mockShipmentResponse))
      const { getRates } = await import('../provider.js')

      await getRates(validShipment)

      expect(fetchMock.mock.calls[0]![0]).toBe('https://example.test/v2/shipments')
    })

    it('throws when no parcels are supplied', async () => {
      const { getRates } = await import('../provider.js')
      await expect(getRates({ ...validShipment, parcels: [] })).rejects.toThrow(
        /at least one parcel/,
      )
      expect(fetchMock).not.toHaveBeenCalled()
    })

    it('throws when EASYPOST_API_KEY is missing', async () => {
      delete process.env.EASYPOST_API_KEY
      const { getRates } = await import('../provider.js')
      await expect(getRates(validShipment)).rejects.toThrow(/EASYPOST_API_KEY/)
      expect(fetchMock).not.toHaveBeenCalled()
    })

    it('sanitizes API key out of error messages on non-2xx responses', async () => {
      fetchMock.mockResolvedValueOnce(
        makeFetchResponse(401, {
          error: { message: 'Unauthorized for key EZTKtest_abcdef0123456789' },
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
      expect(captured!.message).not.toContain('EZTKtest_abcdef0123456789')
      expect(captured!.message).toContain('[redacted]')
    })

    it('sanitizes Basic auth strings out of error messages', async () => {
      fetchMock.mockResolvedValueOnce(makeFetchResponse(500, 'Bad request: Basic RVpUS3Rlc3Q6'))
      const { getRates } = await import('../provider.js')
      let msg = ''
      try {
        await getRates(validShipment)
      } catch (err) {
        msg = (err as Error).message
      }
      expect(msg).toContain('Basic [redacted]')
      expect(msg).not.toContain('RVpUS3Rlc3Q6')
    })

    it('wraps fetch network errors with sanitized message', async () => {
      fetchMock.mockRejectedValueOnce(new Error('ECONNREFUSED EZTKtest_abcdef0123456789'))
      const { getRates } = await import('../provider.js')
      await expect(getRates(validShipment)).rejects.toThrow(/EasyPost request failed/)
      try {
        await getRates(validShipment)
      } catch (err) {
        expect((err as Error).message).not.toContain('EZTKtest_abcdef0123456789')
      }
    })

    it('converts a metric (cm/kg) parcel to inches/ounces — never prices it as imperial', async () => {
      fetchMock.mockResolvedValueOnce(makeFetchResponse(201, mockShipmentResponse))
      const { getRates } = await import('../provider.js')

      await getRates({
        ...validShipment,
        // 25.4cm→10in, 15.24cm→6in, 10.16cm→4in; 1kg→35.274oz.
        parcels: [
          {
            length: 25.4,
            width: 15.24,
            height: 10.16,
            weight: 1,
            distanceUnit: 'cm',
            massUnit: 'kg',
          },
        ],
      })

      const body = JSON.parse((fetchMock.mock.calls[0]![1] as RequestInit).body as string)
      const parcel = body.shipment.parcel
      expect(parcel.length).toBeCloseTo(10, 4)
      expect(parcel.width).toBeCloseTo(6, 4)
      expect(parcel.height).toBeCloseTo(4, 4)
      expect(parcel.weight).toBeCloseTo(35.274, 3)
      // The raw metric numbers must NOT be sent as-is — that is the mispricing bug.
      expect(parcel.length).not.toBe(25.4)
      expect(parcel.weight).not.toBe(1)
    })

    it('converts pounds, grams, and ounces to ounces with the correct factors', async () => {
      const { getRates } = await import('../provider.js')

      // 2 lb → 32 oz
      fetchMock.mockResolvedValueOnce(makeFetchResponse(201, mockShipmentResponse))
      await getRates({
        ...validShipment,
        parcels: [
          { length: 5, width: 5, height: 5, weight: 2, distanceUnit: 'in', massUnit: 'lb' },
        ],
      })
      expect(
        JSON.parse((fetchMock.mock.calls[0]![1] as RequestInit).body as string).shipment.parcel
          .weight,
      ).toBeCloseTo(32, 4)

      // 500 g → 17.6371 oz
      fetchMock.mockResolvedValueOnce(makeFetchResponse(201, mockShipmentResponse))
      await getRates({
        ...validShipment,
        parcels: [
          { length: 5, width: 5, height: 5, weight: 500, distanceUnit: 'in', massUnit: 'g' },
        ],
      })
      expect(
        JSON.parse((fetchMock.mock.calls[1]![1] as RequestInit).body as string).shipment.parcel
          .weight,
      ).toBeCloseTo(17.6371, 3)

      // 12 oz → 12 oz (identity)
      fetchMock.mockResolvedValueOnce(makeFetchResponse(201, mockShipmentResponse))
      await getRates({
        ...validShipment,
        parcels: [
          { length: 5, width: 5, height: 5, weight: 12, distanceUnit: 'in', massUnit: 'oz' },
        ],
      })
      expect(
        JSON.parse((fetchMock.mock.calls[2]![1] as RequestInit).body as string).shipment.parcel
          .weight,
      ).toBe(12)
    })

    it('defaults unspecified units to inches/pounds (consistent with the -shippo bond)', async () => {
      fetchMock.mockResolvedValueOnce(makeFetchResponse(201, mockShipmentResponse))
      const { getRates } = await import('../provider.js')

      // No distanceUnit/massUnit: dims are inches (as-is), weight is POUNDS → ×16 oz.
      await getRates({
        ...validShipment,
        parcels: [{ length: 10, width: 6, height: 4, weight: 3 }],
      })

      const body = JSON.parse((fetchMock.mock.calls[0]![1] as RequestInit).body as string)
      expect(body.shipment.parcel).toEqual({ length: 10, width: 6, height: 4, weight: 48 })
    })

    it('throws — never silently drops cargo — when more than one parcel is supplied', async () => {
      const { getRates, createShipment } = await import('../provider.js')
      const multiParcel: Shipment = {
        ...validShipment,
        parcels: [
          { length: 10, width: 6, height: 4, weight: 12, distanceUnit: 'in', massUnit: 'oz' },
          { length: 8, width: 5, height: 3, weight: 6, distanceUnit: 'in', massUnit: 'oz' },
        ],
      }

      await expect(getRates(multiParcel)).rejects.toThrow(/single parcel per shipment; got 2/)
      await expect(createShipment(multiParcel)).rejects.toThrow(/single parcel/)
      expect(fetchMock).not.toHaveBeenCalled()
    })
  })

  describe('createShipment', () => {
    it('POSTs to /shipments and returns the shipment ID alongside rates', async () => {
      fetchMock.mockResolvedValueOnce(makeFetchResponse(201, mockShipmentResponse))
      const { createShipment } = await import('../provider.js')
      const result = await createShipment(validShipment)

      const [url, init] = fetchMock.mock.calls[0]!
      expect(url).toBe('https://api.easypost.com/v2/shipments')
      expect((init as RequestInit).method).toBe('POST')
      expect(result.shipmentId).toBe('shp_abc123')
      expect(result.rates).toHaveLength(2)
      expect(result.rates[0]).toMatchObject({ carrier: 'usps', rateId: 'rate_1' })
    })

    it('throws when no parcels are supplied', async () => {
      const { createShipment } = await import('../provider.js')
      await expect(createShipment({ ...validShipment, parcels: [] })).rejects.toThrow(
        /at least one parcel/,
      )
      expect(fetchMock).not.toHaveBeenCalled()
    })
  })

  describe('createLabel', () => {
    it('POSTs to /shipments/:id/buy with rate ID and returns normalized label', async () => {
      fetchMock.mockResolvedValueOnce(makeFetchResponse(200, mockBoughtShipment))
      const { createLabel } = await import('../provider.js')
      const rate: ShippingRate = {
        carrier: 'usps',
        service: 'Priority',
        amount: { amount: '7.30', currency: 'USD' },
        rateId: 'rate_1',
      }

      const label = await createLabel('shp_abc123', rate)

      expect(fetchMock).toHaveBeenCalledTimes(1)
      const [url, init] = fetchMock.mock.calls[0]!
      expect(url).toBe('https://api.easypost.com/v2/shipments/shp_abc123/buy')
      expect((init as RequestInit).method).toBe('POST')
      expect(JSON.parse((init as RequestInit).body as string)).toEqual({ rate: { id: 'rate_1' } })

      expect(label).toEqual({
        id: 'shp_abc123',
        trackingNumber: '9400111899223197428490',
        labelUrl: 'https://easypost-files.s3.amazonaws.com/label.pdf',
        carrier: 'usps',
        service: 'Priority',
        amount: { amount: '7.30', currency: 'USD' },
      })
    })

    it('buys with the shipmentId + rate returned by createShipment (end-to-end)', async () => {
      // Step 1: createShipment returns the real EasyPost shipment id.
      fetchMock.mockResolvedValueOnce(makeFetchResponse(201, mockShipmentResponse))
      // Step 2: the buy call resolves the bought shipment.
      fetchMock.mockResolvedValueOnce(makeFetchResponse(200, mockBoughtShipment))
      const { createShipment, createLabel } = await import('../provider.js')

      const { shipmentId, rates } = await createShipment(validShipment)
      const label = await createLabel(shipmentId, rates[0]!)

      // The buy URL must carry the real shipment id from createShipment — proving
      // the core path (not a caller-invented id) drives the purchase.
      expect(fetchMock.mock.calls[1]![0]).toBe(
        'https://api.easypost.com/v2/shipments/shp_abc123/buy',
      )
      expect(JSON.parse((fetchMock.mock.calls[1]![1] as RequestInit).body as string)).toEqual({
        rate: { id: 'rate_1' },
      })
      expect(label.id).toBe('shp_abc123')
      expect(label.trackingNumber).toBe('9400111899223197428490')
    })

    it('throws when rate.rateId is missing', async () => {
      const { createLabel } = await import('../provider.js')
      await expect(
        createLabel('shp_abc123', {
          carrier: 'usps',
          service: 'Priority',
          amount: { amount: '7.30', currency: 'USD' },
        }),
      ).rejects.toThrow(/rate\.rateId/)
      expect(fetchMock).not.toHaveBeenCalled()
    })

    it('falls back to the supplied rate when selected_rate is missing', async () => {
      fetchMock.mockResolvedValueOnce(
        makeFetchResponse(200, {
          id: 'shp_abc123',
          rates: [],
          selected_rate: null,
          postage_label: { label_url: 'https://x/label.pdf' },
          tracking_code: 'TRACK1',
        }),
      )
      const { createLabel } = await import('../provider.js')
      const rate: ShippingRate = {
        carrier: 'usps',
        service: 'Priority',
        amount: { amount: '7.30', currency: 'USD' },
        rateId: 'rate_1',
      }
      const label = await createLabel('shp_abc123', rate)
      expect(label.amount).toEqual({ amount: '7.30', currency: 'USD' })
      expect(label.carrier).toBe('usps')
      expect(label.service).toBe('Priority')
    })

    it('surfaces API errors with sanitized output', async () => {
      fetchMock.mockResolvedValueOnce(
        makeFetchResponse(402, { error: { message: 'Insufficient funds for EZAKlive_secret' } }),
      )
      const { createLabel } = await import('../provider.js')
      let msg = ''
      try {
        await createLabel('shp_abc123', {
          carrier: 'usps',
          service: 'Priority',
          amount: { amount: '7.30', currency: 'USD' },
          rateId: 'rate_1',
        })
      } catch (err) {
        msg = (err as Error).message
      }
      expect(msg).toContain('402')
      expect(msg).not.toContain('EZAKlive_secret')
    })
  })

  describe('voidLabel', () => {
    it('POSTs to /shipments/:id/refund', async () => {
      fetchMock.mockResolvedValueOnce(makeFetchResponse(200, { id: 'shp_abc123' }))
      const { voidLabel } = await import('../provider.js')

      await voidLabel('shp_abc123')

      const [url, init] = fetchMock.mock.calls[0]!
      expect(url).toBe('https://api.easypost.com/v2/shipments/shp_abc123/refund')
      expect((init as RequestInit).method).toBe('POST')
    })

    it('propagates errors from the refund endpoint', async () => {
      fetchMock.mockResolvedValueOnce(
        makeFetchResponse(409, { error: { message: 'Label cannot be refunded' } }),
      )
      const { voidLabel } = await import('../provider.js')
      await expect(voidLabel('shp_abc123')).rejects.toThrow(/EasyPost API error \(409\)/)
    })
  })

  describe('trackPackage', () => {
    it('POSTs to /trackers and returns normalized tracking status', async () => {
      fetchMock.mockResolvedValueOnce(makeFetchResponse(201, mockTracker))
      const { trackPackage } = await import('../provider.js')

      const status = await trackPackage('USPS', '9400111899223197428490')

      const [url, init] = fetchMock.mock.calls[0]!
      expect(url).toBe('https://api.easypost.com/v2/trackers')
      expect(JSON.parse((init as RequestInit).body as string)).toEqual({
        tracker: { carrier: 'USPS', tracking_code: '9400111899223197428490' },
      })
      expect(status.carrier).toBe('usps')
      expect(status.trackingNumber).toBe('9400111899223197428490')
      expect(status.status).toBe('in_transit')
      expect(status.events).toHaveLength(2)
      expect(status.events[0]!.status).toBe('pre_transit')
      expect(status.events[0]!.location).toBe('San Francisco, CA, US')
      expect(status.events[0]!.timestamp).toBeInstanceOf(Date)
      expect(status.estimatedDelivery?.latest).toBeInstanceOf(Date)
    })

    it('maps unknown EasyPost statuses to "unknown"', async () => {
      fetchMock.mockResolvedValueOnce(
        makeFetchResponse(201, {
          carrier: 'UPS',
          tracking_code: 'X',
          status: 'lost_in_orbit',
          tracking_details: [],
        }),
      )
      const { trackPackage } = await import('../provider.js')
      const result = await trackPackage('UPS', 'X')
      expect(result.status).toBe('unknown')
    })

    it('handles missing tracking_details array', async () => {
      fetchMock.mockResolvedValueOnce(
        makeFetchResponse(201, {
          carrier: 'FedEx',
          tracking_code: 'FX1',
          status: 'delivered',
        }),
      )
      const { trackPackage } = await import('../provider.js')
      const result = await trackPackage('FedEx', 'FX1')
      expect(result.events).toEqual([])
      expect(result.status).toBe('delivered')
    })

    it('maps cancelled and error EasyPost statuses to "failure"', async () => {
      fetchMock.mockResolvedValueOnce(
        makeFetchResponse(201, {
          carrier: 'DHL',
          tracking_code: 'D1',
          status: 'cancelled',
          tracking_details: [],
        }),
      )
      const { trackPackage } = await import('../provider.js')
      const result = await trackPackage('DHL', 'D1')
      expect(result.status).toBe('failure')
    })
  })

  describe('provider conformance', () => {
    it('exports a typed provider object with every required method', async () => {
      const { provider } = await import('../provider.js')
      expect(typeof provider.listSupportedCarriers).toBe('function')
      expect(typeof provider.createShipment).toBe('function')
      expect(typeof provider.getRates).toBe('function')
      expect(typeof provider.createLabel).toBe('function')
      expect(typeof provider.voidLabel).toBe('function')
      expect(typeof provider.trackPackage).toBe('function')
    })

    it('exposes everything via the barrel', async () => {
      const exports = await import('../index.js')
      expect(exports.provider).toBeDefined()
      expect(exports.listSupportedCarriers).toBeDefined()
      expect(exports.createShipment).toBeDefined()
      expect(exports.getRates).toBeDefined()
      expect(exports.createLabel).toBeDefined()
      expect(exports.voidLabel).toBeDefined()
      expect(exports.trackPackage).toBeDefined()
    })

    it('registers its secret definitions at import time', async () => {
      await import('../index.js')
      const { getSecretDefinition } = await import('@molecule/api-secrets')
      expect(getSecretDefinition('EASYPOST_API_KEY')).toBeDefined()
    })
  })
})
