import { beforeEach, describe, expect, it, vi } from 'vitest'

import type * as ProviderModule from '../provider.js'
import type { FlightOffer, FlightOfferDetail, FlightsProvider, PricingResult } from '../types.js'

// We need to reset the module state between tests so the bond registry
// is not contaminated across cases.
let setProvider: typeof ProviderModule.setProvider
let getProvider: typeof ProviderModule.getProvider
let hasProvider: typeof ProviderModule.hasProvider
let searchFlights: typeof ProviderModule.searchFlights
let getOffer: typeof ProviderModule.getOffer
let priceOffer: typeof ProviderModule.priceOffer

const buildProvider = (overrides: Partial<FlightsProvider> = {}): FlightsProvider => ({
  searchFlights: vi.fn(),
  getOffer: vi.fn(),
  priceOffer: vi.fn(),
  ...overrides,
})

const sampleOffer: FlightOffer = {
  id: 'offer-123',
  price: 542.5,
  currency: 'USD',
  duration: 'PT8H30M',
  segments: [
    {
      departure: { airport: 'JFK', at: '2026-07-15T19:00:00-04:00', terminal: '4' },
      arrival: { airport: 'LHR', at: '2026-07-16T07:30:00+01:00', terminal: '3' },
      carrier: 'BA',
      flightNumber: '178',
      aircraft: '777',
      duration: 'PT7H30M',
    },
  ],
}

describe('flights provider', () => {
  beforeEach(async () => {
    vi.resetModules()
    const providerModule = await import('../provider.js')
    setProvider = providerModule.setProvider
    getProvider = providerModule.getProvider
    hasProvider = providerModule.hasProvider
    searchFlights = providerModule.searchFlights
    getOffer = providerModule.getOffer
    priceOffer = providerModule.priceOffer
  })

  describe('provider management', () => {
    it('should throw when no provider is set', () => {
      expect(() => getProvider()).toThrow(
        'Flights provider not configured. Call setProvider() first.',
      )
    })

    it('should return false when no provider is configured', () => {
      expect(hasProvider()).toBe(false)
    })

    it('should set and get provider', () => {
      const mockProvider = buildProvider()
      setProvider(mockProvider)
      expect(getProvider()).toBe(mockProvider)
    })

    it('should return true when provider is configured', () => {
      const mockProvider = buildProvider()
      setProvider(mockProvider)
      expect(hasProvider()).toBe(true)
    })
  })

  describe('searchFlights', () => {
    it('should throw when no provider is set', async () => {
      await expect(
        searchFlights({ origin: 'JFK', destination: 'LHR', departureDate: '2026-07-15' }),
      ).rejects.toThrow('Flights provider not configured')
    })

    it('should pass search options through to the provider', async () => {
      const mockSearch = vi.fn().mockResolvedValue([sampleOffer])
      setProvider(buildProvider({ searchFlights: mockSearch }))

      const opts = {
        origin: 'JFK',
        destination: 'LHR',
        departureDate: '2026-07-15',
        returnDate: '2026-07-22',
        adults: 2,
        children: 1,
        infants: 0,
        cabin: 'business' as const,
        maxResults: 10,
      }
      const result = await searchFlights(opts)

      expect(mockSearch).toHaveBeenCalledWith(opts)
      expect(result).toEqual([sampleOffer])
    })
  })

  describe('getOffer', () => {
    it('should throw when no provider is set', async () => {
      await expect(getOffer('offer-123')).rejects.toThrow('Flights provider not configured')
    })

    it('should pass the offer id through to the provider', async () => {
      const detail: FlightOfferDetail = {
        ...sampleOffer,
        travelerPricings: [
          { travelerId: '1', travelerType: 'adult', price: 542.5, cabin: 'economy' },
        ],
      }
      const mockGet = vi.fn().mockResolvedValue(detail)
      setProvider(buildProvider({ getOffer: mockGet }))

      const result = await getOffer('offer-123')

      expect(mockGet).toHaveBeenCalledWith('offer-123')
      expect(result).toBe(detail)
    })
  })

  describe('priceOffer', () => {
    it('should throw when no provider is set', async () => {
      await expect(priceOffer('offer-123')).rejects.toThrow('Flights provider not configured')
    })

    it('should pass the offer id through to the provider', async () => {
      const pricing: PricingResult = {
        offerId: 'offer-123',
        price: 558.0,
        currency: 'USD',
        travelerPricings: null,
        pricedAt: new Date('2026-05-01T12:00:00.000Z'),
      }
      const mockPrice = vi.fn().mockResolvedValue(pricing)
      setProvider(buildProvider({ priceOffer: mockPrice }))

      const result = await priceOffer('offer-123')

      expect(mockPrice).toHaveBeenCalledWith('offer-123')
      expect(result).toBe(pricing)
    })
  })
})

describe('flights types', () => {
  it('should accept a minimal FlightsProvider implementation', () => {
    const provider: FlightsProvider = {
      searchFlights: async () => [],
      getOffer: async (offerId) => ({
        id: offerId,
        price: 0,
        currency: 'USD',
        duration: 'PT0M',
        segments: [],
        travelerPricings: null,
      }),
      priceOffer: async (offerId) => ({
        offerId,
        price: 0,
        currency: 'USD',
        travelerPricings: null,
        pricedAt: new Date(0),
      }),
    }
    expect(typeof provider.searchFlights).toBe('function')
    expect(typeof provider.getOffer).toBe('function')
    expect(typeof provider.priceOffer).toBe('function')
  })

  it('should accept a FlightOffer value with multi-segment itinerary', () => {
    const offer: FlightOffer = {
      id: 'a-b-c',
      price: 1200,
      currency: 'EUR',
      duration: 'PT13H45M',
      segments: [
        {
          departure: { airport: 'LAX', at: '2026-08-01T10:00:00-07:00' },
          arrival: { airport: 'JFK', at: '2026-08-01T18:30:00-04:00' },
          carrier: 'DL',
          flightNumber: '410',
        },
        {
          departure: { airport: 'JFK', at: '2026-08-01T21:00:00-04:00' },
          arrival: { airport: 'CDG', at: '2026-08-02T10:15:00+02:00' },
          carrier: 'DL',
          flightNumber: '116',
        },
      ],
    }
    expect(offer.segments).toHaveLength(2)
    expect(offer.segments[0].carrier).toBe('DL')
  })
})
