/**
 * Room-type resource for molecule.dev.
 *
 * Models a category of bookable unit within a property — capacity, rate
 * baselines, amenities, photos. Used by hotel-booking and
 * rental-marketplace flagship apps.
 *
 * @module
 * @example
 * ```typescript
 * import { routes, requestHandlerMap } from '@molecule/api-resource-room-type'
 * ```
 */

export * from './browser-guard.js'
export * from './authorizers/index.js'
export * from './handlers/index.js'
export * from './i18n.js'
export * from './requestHandlerMap.js'
export * from './routes.js'
export * from './types.js'
export * from './utilities.js'
