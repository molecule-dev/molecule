/**
 * Booking/reservation resource for molecule.dev.
 *
 * Provides availability checking, booking creation, lifecycle management
 * (confirm, cancel, complete), rescheduling, and resource-scoped queries.
 *
 * @module
 * @example
 * ```typescript
 * import { routes, requestHandlerMap } from '@molecule/api-resource-booking'
 * ```
 */

export * from './authorizers/index.js'
export * from './handlers/index.js'
export * from './i18n.js'
export * from './requestHandlerMap.js'
export * from './routes.js'
export * from './types.js'
export * from './utilities.js'
