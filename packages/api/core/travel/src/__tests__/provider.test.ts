import { beforeEach, describe, expect, it, vi } from 'vitest'

import type * as ProviderModule from '../provider.js'
import type {
  ActivityOffer,
  CarOffer,
  FlightOffer,
  HotelOffer,
  TravelProvider,
  TripSearchResult,
} from '../types.js'

// We need to reset the module state between tests so the bond registry
// is not contaminated across cases.
let setProvider: typeof ProviderModule.setProvider
let getProvider: typeof ProviderModule.getProvider
let hasProvider: typeof ProviderModule.hasProvider
let searchTripOptions: typeof ProviderModule.searchTripOptions
let searchActivities: typeof ProviderModule.searchActivities
let searchCars: typeof ProviderModule.searchCars

const buildProvider = (overrides: Partial<TravelProvider> = {}): TravelProvider => ({
  searchTripOptions: vi.fn(),
  searchActivities: vi.fn(),
  searchCars: vi.fn(),
  ...overrides,
})

const sampleFlight: FlightOffer = {
  id: 'flight-1',
  price: { total: 542.5, currency: 'USD' },
  duration: 'PT8H30M',
  segments: [
    {
      departure: { airport: 'JFK', at: '2026-07-15T19:00:00-04:00', terminal: '4' },
      arrival: { airport: 'CDG', at: '2026-07-16T07:30:00+02:00', terminal: '2E' },
      carrier: 'AF',
      flightNumber: '23',
      duration: 'PT7H30M',
    },
  ],
}

const sampleHotel: HotelOffer = {
  id: 'hotel-offer-1',
  hotelId: 'PARHTL',
  name: 'Hotel de Paris',
  price: { total: 720, currency: 'EUR' },
  checkInDate: '2026-07-15',
  checkOutDate: '2026-07-22',
  rating: 5,
  roomDescription: 'Deluxe King',
  refundable: true,
}

const sampleCar: CarOffer = {
  id: 'car-1',
  vendor: 'Hertz',
  vehicleDescription: 'Compact SUV or similar',
  price: { total: 320, currency: 'EUR' },
  pickupLocation: 'CDG',
  pickupAt: '2026-07-15T08:00:00+02:00',
  returnAt: '2026-07-22T08:00:00+02:00',
  unlimitedMileage: true,
}

const sampleActivity: ActivityOffer = {
  id: 'activity-1',
  name: 'Eiffel Tower skip-the-line',
  description: 'Priority access to the second floor',
  price: { total: 65, currency: 'EUR' },
  location: { lat: 48.8584, lon: 2.2945 },
  minimumDuration: 'PT2H',
}

describe('travel provider', () => {
  beforeEach(async () => {
    vi.resetModules()
    const providerModule = await import('../provider.js')
    setProvider = providerModule.setProvider
    getProvider = providerModule.getProvider
    hasProvider = providerModule.hasProvider
    searchTripOptions = providerModule.searchTripOptions
    searchActivities = providerModule.searchActivities
    searchCars = providerModule.searchCars
  })

  describe('provider management', () => {
    it('should throw when no provider is set', () => {
      expect(() => getProvider()).toThrow(
        'Travel provider not configured. Call setProvider() first.',
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

  describe('searchTripOptions', () => {
    it('should throw when no provider is set', async () => {
      await expect(
        searchTripOptions({
          origin: 'JFK',
          destination: 'PAR',
          departureDate: '2026-07-15',
          returnDate: '2026-07-22',
        }),
      ).rejects.toThrow('Travel provider not configured')
    })

    it('should pass search options through to the provider', async () => {
      const result: TripSearchResult = {
        flights: [sampleFlight],
        hotels: [sampleHotel],
        cars: [],
        activities: [],
      }
      const mockSearch = vi.fn().mockResolvedValue(result)
      setProvider(buildProvider({ searchTripOptions: mockSearch }))

      const opts = {
        origin: 'JFK',
        destination: 'PAR',
        departureDate: '2026-07-15',
        returnDate: '2026-07-22',
        travelers: { adults: 2, children: 1 },
        includeFlights: true,
        includeHotels: true,
        includeCars: false,
        includeActivities: false,
        maxResultsPerCategory: 5,
      }
      const out = await searchTripOptions(opts)

      expect(mockSearch).toHaveBeenCalledWith(opts)
      expect(out).toBe(result)
    })

    it('should return all four arrays even when some are empty', async () => {
      const result: TripSearchResult = {
        flights: [sampleFlight],
        hotels: [],
        cars: [sampleCar],
        activities: [sampleActivity],
      }
      const mockSearch = vi.fn().mockResolvedValue(result)
      setProvider(buildProvider({ searchTripOptions: mockSearch }))

      const out = await searchTripOptions({
        origin: 'JFK',
        destination: 'PAR',
        departureDate: '2026-07-15',
      })

      expect(out.flights).toHaveLength(1)
      expect(out.hotels).toHaveLength(0)
      expect(out.cars).toHaveLength(1)
      expect(out.activities).toHaveLength(1)
    })
  })

  describe('searchActivities', () => {
    it('should throw when no provider is set', async () => {
      await expect(searchActivities({ destination: 'PAR' })).rejects.toThrow(
        'Travel provider not configured',
      )
    })

    it('should pass criteria through to the provider', async () => {
      const mockSearch = vi.fn().mockResolvedValue([sampleActivity])
      setProvider(buildProvider({ searchActivities: mockSearch }))

      const criteria = {
        destination: { lat: 48.8566, lon: 2.3522, radius: 5 },
        dates: { start: '2026-07-15', end: '2026-07-22' },
        maxResults: 20,
      }
      const out = await searchActivities(criteria)

      expect(mockSearch).toHaveBeenCalledWith(criteria)
      expect(out).toEqual([sampleActivity])
    })
  })

  describe('searchCars', () => {
    it('should throw when no provider is set', async () => {
      await expect(
        searchCars({
          pickupLocation: 'CDG',
          pickupDate: '2026-07-15',
          returnDate: '2026-07-22',
        }),
      ).rejects.toThrow('Travel provider not configured')
    })

    it('should pass criteria through to the provider', async () => {
      const mockSearch = vi.fn().mockResolvedValue([sampleCar])
      setProvider(buildProvider({ searchCars: mockSearch }))

      const criteria = {
        pickupLocation: 'CDG',
        pickupDate: '2026-07-15T08:00:00+02:00',
        returnDate: '2026-07-22T08:00:00+02:00',
        dropoffLocation: 'ORY',
        maxResults: 10,
      }
      const out = await searchCars(criteria)

      expect(mockSearch).toHaveBeenCalledWith(criteria)
      expect(out).toEqual([sampleCar])
    })

    it('should return an empty array when the provider has no car API', async () => {
      const mockSearch = vi.fn().mockResolvedValue([])
      setProvider(buildProvider({ searchCars: mockSearch }))

      const out = await searchCars({
        pickupLocation: 'CDG',
        pickupDate: '2026-07-15',
        returnDate: '2026-07-22',
      })

      expect(out).toEqual([])
    })
  })
})

describe('travel types', () => {
  it('should accept a minimal TravelProvider implementation', () => {
    const provider: TravelProvider = {
      searchTripOptions: async () => ({ flights: [], hotels: [], cars: [], activities: [] }),
      searchActivities: async () => [],
      searchCars: async () => [],
    }
    expect(typeof provider.searchTripOptions).toBe('function')
    expect(typeof provider.searchActivities).toBe('function')
    expect(typeof provider.searchCars).toBe('function')
  })

  it('should accept a TripSearchResult mixing all four verticals', () => {
    const result: TripSearchResult = {
      flights: [sampleFlight],
      hotels: [sampleHotel],
      cars: [sampleCar],
      activities: [sampleActivity],
    }
    expect(result.flights[0].segments).toHaveLength(1)
    expect(result.hotels[0].rating).toBe(5)
    expect(result.cars[0].vendor).toBe('Hertz')
    expect(result.activities[0].location?.lat).toBeCloseTo(48.8584)
  })

  it('should accept activity destinations as either string or geo', () => {
    const byCode: { destination: string | { lat: number; lon: number } } = {
      destination: 'PAR',
    }
    const byGeo: { destination: string | { lat: number; lon: number } } = {
      destination: { lat: 48.8566, lon: 2.3522 },
    }
    expect(typeof byCode.destination).toBe('string')
    expect(typeof byGeo.destination).toBe('object')
  })
})
