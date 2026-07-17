import { beforeEach, describe, expect, it, vi } from 'vitest'

import type * as ProviderModule from '../provider.js'
import type * as ShippingModule from '../shipping.js'
import type {
  Parcel,
  Shipment,
  ShipmentQuote,
  ShippingAddress,
  ShippingLabel,
  ShippingProvider,
  ShippingRate,
  TrackingEvent,
  TrackingStatus,
} from '../types.js'

let setProvider: typeof ProviderModule.setProvider
let getProvider: typeof ProviderModule.getProvider
let hasProvider: typeof ProviderModule.hasProvider
let listSupportedCarriers: typeof ShippingModule.listSupportedCarriers
let createShipment: typeof ShippingModule.createShipment
let getRates: typeof ShippingModule.getRates
let createLabel: typeof ShippingModule.createLabel
let voidLabel: typeof ShippingModule.voidLabel
let trackPackage: typeof ShippingModule.trackPackage

const sampleAddress = (overrides?: Partial<ShippingAddress>): ShippingAddress => ({
  street1: '1 Market St',
  city: 'San Francisco',
  state: 'CA',
  postalCode: '94105',
  country: 'US',
  ...overrides,
})

const sampleParcel = (overrides?: Partial<Parcel>): Parcel => ({
  length: 10,
  width: 6,
  height: 4,
  weight: 2,
  distanceUnit: 'in',
  massUnit: 'lb',
  ...overrides,
})

const sampleShipment = (overrides?: Partial<Shipment>): Shipment => ({
  from: sampleAddress(),
  to: sampleAddress({ street1: '350 5th Ave', city: 'New York', state: 'NY', postalCode: '10118' }),
  parcels: [sampleParcel()],
  ...overrides,
})

const sampleRate = (overrides?: Partial<ShippingRate>): ShippingRate => ({
  carrier: 'usps',
  service: 'Priority',
  amount: { amount: '7.50', currency: 'USD' },
  rateId: 'rate_abc',
  ...overrides,
})

describe('shipping provider', () => {
  beforeEach(async () => {
    vi.resetModules()
    const providerModule = await import('../provider.js')
    const shippingModule = await import('../shipping.js')
    setProvider = providerModule.setProvider
    getProvider = providerModule.getProvider
    hasProvider = providerModule.hasProvider
    listSupportedCarriers = shippingModule.listSupportedCarriers
    createShipment = shippingModule.createShipment
    getRates = shippingModule.getRates
    createLabel = shippingModule.createLabel
    voidLabel = shippingModule.voidLabel
    trackPackage = shippingModule.trackPackage
  })

  describe('provider management', () => {
    it('should throw when no provider is set', () => {
      expect(() => getProvider()).toThrow(
        'Shipping provider not configured. Call setProvider() first.',
      )
    })

    it('should report no provider via hasProvider', () => {
      expect(hasProvider()).toBe(false)
    })

    it('should set and get provider', () => {
      const mockProvider = createMockProvider()
      setProvider(mockProvider)
      expect(getProvider()).toBe(mockProvider)
    })

    it('should report provider via hasProvider after setting', () => {
      setProvider(createMockProvider())
      expect(hasProvider()).toBe(true)
    })
  })

  describe('listSupportedCarriers', () => {
    it('should throw when no provider is set', async () => {
      await expect(listSupportedCarriers()).rejects.toThrow('Shipping provider not configured')
    })

    it('should delegate to provider', async () => {
      const carriers = ['usps', 'ups', 'fedex']
      const mockProvider = createMockProvider({
        listSupportedCarriers: vi.fn().mockResolvedValue(carriers),
      })
      setProvider(mockProvider)

      const res = await listSupportedCarriers()
      expect(res).toBe(carriers)
      expect(mockProvider.listSupportedCarriers).toHaveBeenCalledOnce()
    })
  })

  describe('createShipment', () => {
    it('should throw when no provider is set', async () => {
      await expect(createShipment(sampleShipment())).rejects.toThrow(
        'Shipping provider not configured',
      )
    })

    it('should delegate to provider and surface the shipmentId with rates', async () => {
      const shipment = sampleShipment()
      const quote: ShipmentQuote = {
        shipmentId: 'shp_core_1',
        rates: [
          sampleRate(),
          sampleRate({ carrier: 'ups', service: 'Ground', rateId: 'rate_ups' }),
        ],
      }
      const mockProvider = createMockProvider({
        createShipment: vi.fn().mockResolvedValue(quote),
      })
      setProvider(mockProvider)

      const res = await createShipment(shipment)
      expect(res).toBe(quote)
      expect(res.shipmentId).toBe('shp_core_1')
      expect(res.rates).toHaveLength(2)
      expect(mockProvider.createShipment).toHaveBeenCalledWith(shipment)
    })

    it('should feed its shipmentId + rate straight into createLabel (end-to-end)', async () => {
      const shipment = sampleShipment()
      const quote: ShipmentQuote = { shipmentId: 'shp_core_2', rates: [sampleRate()] }
      const label: ShippingLabel = {
        id: 'lbl_core',
        trackingNumber: 'TRK_CORE',
        labelUrl: 'https://example.com/labels/lbl_core.pdf',
        carrier: 'usps',
        service: 'Priority',
        amount: quote.rates[0]!.amount,
      }
      const createLabelMock = vi.fn().mockResolvedValue(label)
      const mockProvider = createMockProvider({
        createShipment: vi.fn().mockResolvedValue(quote),
        createLabel: createLabelMock,
      })
      setProvider(mockProvider)

      const { shipmentId, rates } = await createShipment(shipment)
      const purchased = await createLabel(shipmentId, rates[0]!)

      expect(purchased).toBe(label)
      expect(createLabelMock).toHaveBeenCalledWith('shp_core_2', rates[0])
    })
  })

  describe('getRates', () => {
    it('should throw when no provider is set', async () => {
      await expect(getRates(sampleShipment())).rejects.toThrow('Shipping provider not configured')
    })

    it('should delegate to provider', async () => {
      const shipment = sampleShipment()
      const rates: ShippingRate[] = [
        sampleRate(),
        sampleRate({ carrier: 'ups', service: 'Ground' }),
      ]
      const mockProvider = createMockProvider({
        getRates: vi.fn().mockResolvedValue(rates),
      })
      setProvider(mockProvider)

      const res = await getRates(shipment)
      expect(res).toBe(rates)
      expect(mockProvider.getRates).toHaveBeenCalledWith(shipment)
    })
  })

  describe('createLabel', () => {
    it('should throw when no provider is set', async () => {
      await expect(createLabel('shp_1', sampleRate())).rejects.toThrow(
        'Shipping provider not configured',
      )
    })

    it('should delegate to provider', async () => {
      const rate = sampleRate()
      const label: ShippingLabel = {
        id: 'lbl_123',
        trackingNumber: '9400111899223344556677',
        labelUrl: 'https://example.com/labels/lbl_123.pdf',
        carrier: 'usps',
        service: 'Priority',
        amount: rate.amount,
      }
      const mockProvider = createMockProvider({
        createLabel: vi.fn().mockResolvedValue(label),
      })
      setProvider(mockProvider)

      const res = await createLabel('shp_1', rate)
      expect(res).toBe(label)
      expect(mockProvider.createLabel).toHaveBeenCalledWith('shp_1', rate)
    })
  })

  describe('voidLabel', () => {
    it('should throw when no provider is set', async () => {
      await expect(voidLabel('lbl_1')).rejects.toThrow('Shipping provider not configured')
    })

    it('should delegate to provider', async () => {
      const mockProvider = createMockProvider({
        voidLabel: vi.fn().mockResolvedValue(undefined),
      })
      setProvider(mockProvider)

      await voidLabel('lbl_1')
      expect(mockProvider.voidLabel).toHaveBeenCalledWith('lbl_1')
    })
  })

  describe('trackPackage', () => {
    it('should throw when no provider is set', async () => {
      await expect(trackPackage('usps', '9400111899223344556677')).rejects.toThrow(
        'Shipping provider not configured',
      )
    })

    it('should delegate to provider', async () => {
      const events: TrackingEvent[] = [
        {
          timestamp: new Date('2026-04-29T10:00:00Z'),
          status: 'pre_transit',
          description: 'Label created',
          location: 'San Francisco, CA',
        },
        {
          timestamp: new Date('2026-04-30T08:00:00Z'),
          status: 'in_transit',
          description: 'Departed facility',
          location: 'Oakland, CA',
        },
      ]
      const status: TrackingStatus = {
        carrier: 'usps',
        trackingNumber: '9400111899223344556677',
        status: 'in_transit',
        events,
      }
      const mockProvider = createMockProvider({
        trackPackage: vi.fn().mockResolvedValue(status),
      })
      setProvider(mockProvider)

      const res = await trackPackage('usps', '9400111899223344556677')
      expect(res).toEqual(status)
      expect(mockProvider.trackPackage).toHaveBeenCalledWith('usps', '9400111899223344556677')
    })
  })
})

describe('shipping types', () => {
  it('should export ShippingAddress type', () => {
    const address: ShippingAddress = sampleAddress()
    expect(address.street1).toBe('1 Market St')
    expect(address.country).toBe('US')
  })

  it('should export Parcel type with optional units', () => {
    const parcel: Parcel = { length: 1, width: 1, height: 1, weight: 1 }
    expect(parcel.distanceUnit).toBeUndefined()
    expect(parcel.massUnit).toBeUndefined()
  })

  it('should export Shipment type', () => {
    const shipment: Shipment = sampleShipment()
    expect(shipment.parcels).toHaveLength(1)
    expect(shipment.from.country).toBe('US')
  })

  it('should export ShippingRate type', () => {
    const rate: ShippingRate = sampleRate()
    expect(rate.carrier).toBe('usps')
    expect(rate.amount.currency).toBe('USD')
  })

  it('should export ShipmentQuote type carrying shipmentId + rates', () => {
    const quote: ShipmentQuote = { shipmentId: 'shp_1', rates: [sampleRate()] }
    expect(quote.shipmentId).toBe('shp_1')
    expect(quote.rates[0]?.rateId).toBe('rate_abc')
  })

  it('should export ShippingLabel type', () => {
    const label: ShippingLabel = {
      id: 'lbl_1',
      trackingNumber: 'TRK',
      labelUrl: 'https://example.com/x.pdf',
      carrier: 'usps',
      service: 'Priority',
    }
    expect(label.id).toBe('lbl_1')
  })

  it('should export TrackingStatus type with events', () => {
    const status: TrackingStatus = {
      carrier: 'usps',
      trackingNumber: 'TRK',
      status: 'delivered',
      events: [
        {
          timestamp: new Date(),
          status: 'delivered',
          description: 'Delivered',
        },
      ],
    }
    expect(status.events[0]?.status).toBe('delivered')
  })

  it('should export ShippingProvider type', () => {
    const provider: ShippingProvider = createMockProvider()
    expect(typeof provider.listSupportedCarriers).toBe('function')
    expect(typeof provider.createShipment).toBe('function')
    expect(typeof provider.getRates).toBe('function')
    expect(typeof provider.createLabel).toBe('function')
    expect(typeof provider.voidLabel).toBe('function')
    expect(typeof provider.trackPackage).toBe('function')
  })
})

function createMockProvider(overrides?: Partial<ShippingProvider>): ShippingProvider {
  return {
    listSupportedCarriers: vi.fn().mockResolvedValue(['usps']),
    createShipment: vi.fn().mockResolvedValue({
      shipmentId: 'shp_1',
      rates: [],
    } satisfies ShipmentQuote),
    getRates: vi.fn().mockResolvedValue([]),
    createLabel: vi.fn().mockResolvedValue({
      id: 'lbl_1',
      trackingNumber: 'TRK',
      labelUrl: 'https://example.com/x.pdf',
      carrier: 'usps',
      service: 'Priority',
    } satisfies ShippingLabel),
    voidLabel: vi.fn().mockResolvedValue(undefined),
    trackPackage: vi.fn().mockResolvedValue({
      carrier: 'usps',
      trackingNumber: 'TRK',
      status: 'pre_transit',
      events: [],
    } satisfies TrackingStatus),
    ...overrides,
  }
}
