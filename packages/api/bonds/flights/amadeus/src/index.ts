/**
 * Amadeus flights provider for molecule.dev.
 *
 * Implements the `FlightsProvider` interface against the Amadeus
 * Self-Service v2 flight-offers and v1 flight-offers pricing endpoints.
 * Defaults to the test sandbox (`https://test.api.amadeus.com`); set
 * `AMADEUS_USE_PRODUCTION=true` to route to production.
 *
 * @example
 * ```typescript
 * import { setProvider } from '@molecule/api-flights'
 * import { provider } from '@molecule/api-flights-amadeus'
 *
 * setProvider(provider)
 * ```
 *
 * @module
 */

export * from './provider.js'
export * from './types.js'
