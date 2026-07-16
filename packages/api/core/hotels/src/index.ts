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
 * @remarks
 * - **Not every provider can complete a booking server-side.** Many hotel APIs
 *   only support search + priced offers and hand the guest to the provider's
 *   own checkout. Such bonds throw from `bookHotel` with
 *   `cause.code === 'BOOKING_NOT_SUPPORTED'` — handle that path (link out /
 *   deep-link to the provider) instead of assuming an in-app booking form works
 *   for every bond.
 * - **Offers are short-lived quotes, not reservations.** An `offerId` from
 *   `getHotelOffers` expires; book promptly after selection, and on a booking
 *   failure re-fetch offers and re-confirm the price with the user — never
 *   retry a stale offer id or present a cached price as bookable.
 * - Booking is a real-money, PII-bearing call: keep it SERVER-SIDE behind an
 *   authenticated endpoint (provider API keys live in the bond's config, never
 *   in app code), validate `guestInfo` server-side, and persist the returned
 *   `HotelBooking.bookingId` before reporting success to the user.
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
