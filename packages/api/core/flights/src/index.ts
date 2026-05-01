/**
 * Provider-agnostic flights interface for molecule.dev.
 *
 * Defines the {@link FlightsProvider} interface for flight search +
 * pricing. Bond packages (Amadeus, Duffel, Sabre, etc.) implement this
 * interface. Application code uses the convenience functions
 * (`searchFlights`, `getOffer`, `priceOffer`) which delegate to the bonded
 * provider.
 *
 * @example
 * ```typescript
 * import { setProvider, searchFlights, priceOffer } from '@molecule/api-flights'
 * import { provider as amadeus } from '@molecule/api-flights-amadeus'
 *
 * setProvider(amadeus)
 * const offers = await searchFlights({
 *   origin: 'JFK',
 *   destination: 'LHR',
 *   departureDate: '2026-07-15',
 *   adults: 1,
 * })
 * const priced = await priceOffer(offers[0].id)
 * ```
 *
 * @module
 */

// Type exports
export * from './types.js'

// Provider exports
export * from './provider.js'
