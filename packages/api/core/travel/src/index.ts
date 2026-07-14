/**
 * Provider-agnostic travel trip-planning interface for molecule.dev.
 *
 * Defines the {@link TravelProvider} interface for aggregate trip
 * planning across flights, hotels, cars and activities. Bond packages
 * (Amadeus, Travelport, Sabre, etc.) implement this interface.
 * Application code uses the convenience functions (`searchTripOptions`,
 * `searchActivities`, `searchCars`) which delegate to the bonded
 * provider.
 *
 * @example
 * ```typescript
 * import { setProvider, searchTripOptions } from '@molecule/api-travel'
 * import { provider as amadeus } from '@molecule/api-travel-amadeus'
 *
 * setProvider(amadeus)
 * const trip = await searchTripOptions({
 *   origin: 'JFK',
 *   destination: 'PAR',
 *   departureDate: '2026-07-15',
 *   returnDate: '2026-07-22',
 *   travelers: { adults: 2 },
 *   includeFlights: true,
 *   includeHotels: true,
 * })
 * console.log(trip.flights.length, trip.hotels.length)
 * ```
 *
 * @module
 */

// Type exports
export * from './browser-guard.js'
export * from './types.js'

// Provider exports
export * from './provider.js'
