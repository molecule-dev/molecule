/**
 * Shipping core interface for molecule.dev.
 *
 * Defines the standard interface for shipping/carrier providers
 * (EasyPost, Shippo, etc.). Used for rate quotes, label generation,
 * label voiding, and package tracking.
 *
 * @module
 * @example
 * ```typescript
 * import { setProvider, getRates, createLabel, trackPackage } from '@molecule/api-shipping'
 *
 * // Bond a provider at startup
 * setProvider(easypostProvider)
 *
 * // Quote rates
 * const rates = await getRates({
 *   from: { street1: '...', city: '...', postalCode: '...', country: 'US' },
 *   to: { street1: '...', city: '...', postalCode: '...', country: 'US' },
 *   parcels: [{ length: 10, width: 6, height: 4, weight: 2 }],
 * })
 *
 * // Purchase a label
 * const label = await createLabel('shp_123', rates[0])
 *
 * // Track the package
 * const status = await trackPackage(label.carrier, label.trackingNumber)
 * ```
 */

export * from './browser-guard.js'
export * from './provider.js'
export * from './shipping.js'
export * from './types.js'
