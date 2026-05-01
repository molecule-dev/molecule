import { beforeEach, describe, expect, it, vi } from 'vitest'

import type * as ProviderModule from '../provider.js'
import type {
  HotelBooking,
  HotelGuestInfo,
  HotelOffer,
  HotelSearchResult,
  HotelsProvider,
} from '../types.js'

// We need to reset the module state between tests so the bond registry
// is not contaminated across cases.
let setProvider: typeof ProviderModule.setProvider
let getProvider: typeof ProviderModule.getProvider
let hasProvider: typeof ProviderModule.hasProvider
let searchHotels: typeof ProviderModule.searchHotels
let getHotelOffers: typeof ProviderModule.getHotelOffers
let bookHotel: typeof ProviderModule.bookHotel

const buildProvider = (overrides: Partial<HotelsProvider> = {}): HotelsProvider => ({
  searchHotels: vi.fn(),
  getHotelOffers: vi.fn(),
  bookHotel: vi.fn(),
  ...overrides,
})

const sampleGuest: HotelGuestInfo = {
  firstName: 'Ada',
  lastName: 'Lovelace',
  email: 'ada@example.com',
}

describe('hotels provider', () => {
  beforeEach(async () => {
    vi.resetModules()
    const providerModule = await import('../provider.js')
    setProvider = providerModule.setProvider
    getProvider = providerModule.getProvider
    hasProvider = providerModule.hasProvider
    searchHotels = providerModule.searchHotels
    getHotelOffers = providerModule.getHotelOffers
    bookHotel = providerModule.bookHotel
  })

  describe('provider management', () => {
    it('should throw when no provider is set', () => {
      expect(() => getProvider()).toThrow(
        'Hotels provider not configured. Call setProvider() first.',
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

  describe('searchHotels', () => {
    it('should throw when no provider is set', async () => {
      await expect(
        searchHotels({ cityCode: 'PAR', checkInDate: '2026-06-01', checkOutDate: '2026-06-04' }),
      ).rejects.toThrow('Hotels provider not configured')
    })

    it('should call provider.searchHotels with the criteria and return results', async () => {
      const results: HotelSearchResult[] = [
        {
          hotelId: 'MCLONGHM',
          name: 'Hotel de Paris',
          cityCode: 'PAR',
          rating: 5,
          latitude: 48.8566,
          longitude: 2.3522,
        },
      ]
      const mockSearch = vi.fn().mockResolvedValue(results)
      setProvider(buildProvider({ searchHotels: mockSearch }))

      const result = await searchHotels({
        cityCode: 'PAR',
        checkInDate: '2026-06-01',
        checkOutDate: '2026-06-04',
        adults: 2,
        rooms: 1,
      })

      expect(mockSearch).toHaveBeenCalledWith({
        cityCode: 'PAR',
        checkInDate: '2026-06-01',
        checkOutDate: '2026-06-04',
        adults: 2,
        rooms: 1,
      })
      expect(result).toBe(results)
    })

    it('should pass through location-based criteria unchanged', async () => {
      const mockSearch = vi.fn().mockResolvedValue([])
      setProvider(buildProvider({ searchHotels: mockSearch }))

      await searchHotels({
        location: { lat: 48.8566, lon: 2.3522, radius: 5 },
        checkInDate: '2026-06-01',
        checkOutDate: '2026-06-04',
        ratings: [4, 5],
      })

      expect(mockSearch).toHaveBeenCalledWith({
        location: { lat: 48.8566, lon: 2.3522, radius: 5 },
        checkInDate: '2026-06-01',
        checkOutDate: '2026-06-04',
        ratings: [4, 5],
      })
    })
  })

  describe('getHotelOffers', () => {
    it('should throw when no provider is set', async () => {
      await expect(
        getHotelOffers('MCLONGHM', { checkInDate: '2026-06-01', checkOutDate: '2026-06-04' }),
      ).rejects.toThrow('Hotels provider not configured')
    })

    it('should call provider.getHotelOffers with hotelId and criteria', async () => {
      const offers: HotelOffer[] = [
        {
          offerId: 'offer-1',
          hotelId: 'MCLONGHM',
          checkInDate: '2026-06-01',
          checkOutDate: '2026-06-04',
          price: { total: 720, currency: 'EUR' },
          roomDescription: 'Deluxe King Room',
          adults: 2,
        },
      ]
      const mockGet = vi.fn().mockResolvedValue(offers)
      setProvider(buildProvider({ getHotelOffers: mockGet }))

      const result = await getHotelOffers('MCLONGHM', {
        checkInDate: '2026-06-01',
        checkOutDate: '2026-06-04',
        adults: 2,
      })

      expect(mockGet).toHaveBeenCalledWith('MCLONGHM', {
        checkInDate: '2026-06-01',
        checkOutDate: '2026-06-04',
        adults: 2,
      })
      expect(result).toEqual(offers)
    })
  })

  describe('bookHotel', () => {
    it('should throw when no provider is set', async () => {
      await expect(bookHotel('offer-1', sampleGuest)).rejects.toThrow(
        'Hotels provider not configured',
      )
    })

    it('should call provider.bookHotel and return the confirmation record', async () => {
      const booking: HotelBooking = {
        bookingId: 'BK-001',
        hotelId: 'MCLONGHM',
        offerId: 'offer-1',
        price: { total: 720, currency: 'EUR' },
        checkInDate: '2026-06-01',
        checkOutDate: '2026-06-04',
        guest: sampleGuest,
        confirmationNumber: 'CONF-XYZ',
      }
      const mockBook = vi.fn().mockResolvedValue(booking)
      setProvider(buildProvider({ bookHotel: mockBook }))

      const result = await bookHotel('offer-1', sampleGuest)

      expect(mockBook).toHaveBeenCalledWith('offer-1', sampleGuest)
      expect(result).toBe(booking)
    })

    it('should propagate booking-not-supported errors from providers', async () => {
      const mockBook = vi.fn().mockRejectedValue(
        new Error('Direct booking not supported by this provider', {
          cause: { code: 'BOOKING_NOT_SUPPORTED' },
        }),
      )
      setProvider(buildProvider({ bookHotel: mockBook }))

      let caught: Error | undefined
      try {
        await bookHotel('offer-1', sampleGuest)
      } catch (error) {
        caught = error as Error
      }

      expect(caught?.message).toContain('Direct booking not supported')
      const cause = caught?.cause as { code?: string } | undefined
      expect(cause?.code).toBe('BOOKING_NOT_SUPPORTED')
    })
  })
})

describe('hotels types', () => {
  it('should accept a minimal HotelsProvider implementation', () => {
    const provider: HotelsProvider = {
      searchHotels: async () => [],
      getHotelOffers: async () => [],
      bookHotel: async (offerId) => ({
        bookingId: 'BK',
        hotelId: 'H',
        offerId,
        price: { total: 0, currency: 'USD' },
        checkInDate: '2026-06-01',
        checkOutDate: '2026-06-02',
        guest: sampleGuest,
      }),
    }
    expect(typeof provider.searchHotels).toBe('function')
    expect(typeof provider.getHotelOffers).toBe('function')
    expect(typeof provider.bookHotel).toBe('function')
  })

  it('should accept a HotelSearchResult with optional address + distance', () => {
    const hit: HotelSearchResult = {
      hotelId: 'MCLONGHM',
      name: 'Hotel de Paris',
      cityCode: 'PAR',
      rating: 5,
      address: { countryCode: 'FR', cityName: 'Paris', postalCode: '75001' },
      distance: 0.5,
      fromPrice: { total: 240, currency: 'EUR' },
    }
    expect(hit.hotelId).toBe('MCLONGHM')
    expect(hit.address?.countryCode).toBe('FR')
    expect(hit.fromPrice?.currency).toBe('EUR')
  })

  it('should accept a HotelOffer with refundable + rateCode set', () => {
    const offer: HotelOffer = {
      offerId: 'offer-1',
      hotelId: 'MCLONGHM',
      checkInDate: '2026-06-01',
      checkOutDate: '2026-06-04',
      price: { total: 720, currency: 'EUR' },
      refundable: false,
      rateCode: 'BAR',
    }
    expect(offer.refundable).toBe(false)
    expect(offer.rateCode).toBe('BAR')
  })
})
