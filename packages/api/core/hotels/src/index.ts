/**
 * Provider-agnostic hotels interface for molecule.dev.
 *
 * Defines the `HotelsProvider` interface for hotel inventory aggregators —
 * search, priced offers, and booking confirmation. Bond packages (Amadeus,
 * Booking.com Affiliate, Expedia Rapid, etc.) implement this interface.
 * Application code uses the convenience functions (`searchHotels`,
 * `getHotelOffers`, `bookHotel`) which delegate to the bonded provider.
 *
 * Prices carry an explicit ISO 4217 currency so multi-market callers can
 * reconcile across providers. Hotel and offer IDs are kept as plain
 * strings so providers can use whatever opaque catalogue identifier they
 * expose.
 *
 * @example
 * ```typescript
 * import { setProvider, searchHotels, getHotelOffers } from '@molecule/api-hotels'
 * import { provider as amadeus } from '@molecule/api-hotels-amadeus'
 *
 * setProvider(amadeus)
 * const hits = await searchHotels({
 *   cityCode: 'PAR',
 *   checkInDate: '2026-06-01',
 *   checkOutDate: '2026-06-04',
 *   adults: 2,
 * })
 * const offers = await getHotelOffers(hits[0].hotelId, {
 *   checkInDate: '2026-06-01',
 *   checkOutDate: '2026-06-04',
 *   adults: 2,
 * })
 * ```
 *
 * @module
 */

// Type exports
export * from './browser-guard.js'
export * from './types.js'

// Provider exports
export * from './provider.js'
