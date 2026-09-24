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
 * - **Nothing works until a provider is bonded** — every function throws before
 *   `setProvider()`. `@molecule/api-hotels-amadeus` needs `AMADEUS_CLIENT_ID` /
 *   `AMADEUS_CLIENT_SECRET` and ALWAYS throws `BOOKING_NOT_SUPPORTED` from
 *   `bookHotel()`.
 * - `searchHotels()` needs `cityCode` OR `location` (`{ lat, lon }` — `lon`,
 *   not `lng`); dates must be exact `YYYY-MM-DD` strings, not `Date` objects.
 * - Booking is a real-money, PII-bearing call: keep it SERVER-SIDE behind an
 *   authenticated endpoint (provider API keys live in the bond's config, never
 *   in app code), validate `guestInfo` server-side, and persist the returned
 *   `HotelBooking.bookingId` before reporting success to the user.
 *
 * @example
 * ```typescript
 * import { bookHotel, getHotelOffers, searchHotels, setProvider } from '@molecule/api-hotels'
 * import { createProvider } from '@molecule/api-hotels-amadeus'
 *
 * // Startup (server only): bond one provider. Credentials come from the server env.
 * setProvider(
 *   createProvider({
 *     clientId: process.env.AMADEUS_CLIENT_ID,
 *     clientSecret: process.env.AMADEUS_CLIENT_SECRET,
 *   }),
 * )
 *
 * // IATA city code + ISO YYYY-MM-DD dates. `fromPrice` is filled when the provider has one.
 * const stay = { checkInDate: '2026-06-01', checkOutDate: '2026-06-04', adults: 2 }
 * const hotels = await searchHotels({ cityCode: 'PAR', ...stay })
 * const hotel = hotels[0]
 * if (!hotel) throw new Error('No hotels found for this city and dates')
 *
 * // Live, short-lived quotes for the chosen hotel.
 * const offers = await getHotelOffers(hotel.hotelId, stay)
 * const offer = offers[0]
 * if (!offer) throw new Error('No rooms available')
 *
 * // Booking is optional per provider — fall back to the provider's hosted checkout.
 * try {
 *   const booking = await bookHotel(offer.offerId, {
 *     firstName: 'Ada',
 *     lastName: 'Lovelace',
 *     email: 'ada@example.com',
 *   })
 * } catch (error) {
 *   const code = ((error as Error).cause as { code?: string } | undefined)?.code
 *   if (code !== 'BOOKING_NOT_SUPPORTED') throw error
 *   // Amadeus lands here: send the guest to the hosted checkout with `offer.offerId`.
 * }
 * ```
 *
 * @e2e
 * Integration checklist — drive the real UI (live preview, no mocks), adapt
 * each item to this app's actual screens/flows, and check every box off one
 * by one. A box you can't check is an integration bug to fix — not a skip:
 * - [ ] A search for a real location + check-in/check-out dates + guest count
 *   (`searchHotels` with a `cityCode` or `location`) returns REAL
 *   `HotelSearchResult`s rendered in the UI — each with a name, its city /
 *   `address`, and a `fromPrice` for the stay — never an empty list, a stuck
 *   spinner, or placeholder cards. Results match the query: the right city, and
 *   the dates / occupancy you entered are reflected in the prices shown.
 * - [ ] Any exposed filter or sort (price, star `rating`, amenities) actually
 *   narrows / reorders the rendered list — e.g. a price sort puts the lowest
 *   `HotelPrice.total` first; a 4–5 star filter drops lower-rated properties.
 * - [ ] Availability is respected: a sold-out or invalid-date search (e.g.
 *   `checkOutDate` not strictly after `checkInDate`) shows a visible "no
 *   availability" empty state — never a crash, a blank screen, or fabricated
 *   results.
 * - [ ] Prices total correctly and every amount shows its currency: a shown
 *   `HotelOffer.price.total` equals nights × nightly rate + any fees, in its
 *   ISO 4217 `HotelPrice.currency` (no bare "123" with no symbol or code).
 * - [ ] If hotel detail / booking is exposed, opening a hotel calls
 *   `getHotelOffers` and shows its real rooms / rates (`roomDescription` +
 *   `price`); selecting one records the chosen `offerId` in the app. Booking
 *   itself goes out-of-band to the vendor (or `bookHotel` throws
 *   `BOOKING_NOT_SUPPORTED` → a redirect) — verify the app's RECORDED
 *   selection, not a fake in-app confirmation.
 * - [ ] A provider error (upstream down / rate-limited) surfaces as a graceful,
 *   visible message — not a blank page or an unhandled rejection — and the
 *   provider API key stays server-side: search / offers / booking all run on
 *   the server, and no key appears in network responses or page source.
 *
 * @module
 */

// Type exports
export * from './browser-guard.js'
export * from './types.js'

// Provider exports
export * from './provider.js'
