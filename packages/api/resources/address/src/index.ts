/**
 * Address resource for molecule.dev.
 *
 * Per-user saved shipping/billing addresses with default flag, country-aware
 * fields, and validation. Drop-in replacement for the per-app `addresses`
 * tables currently duplicated across e-commerce flagships (food-delivery,
 * grocery-delivery, multi-vendor-marketplace, online-store, subscription-box).
 *
 * @module
 * @example
 * ```typescript
 * import { routes, requestHandlerMap } from '@molecule/api-resource-address'
 *
 * // Wire routes into your Express app via mlcl inject:
 * // POST   /addresses
 * // GET    /addresses
 * // GET    /addresses/:id
 * // PATCH  /addresses/:id
 * // POST   /addresses/:id/default     { kind: 'shipping' | 'billing' }
 * // DELETE /addresses/:id
 * ```
 */

export * from './authorizers/index.js'
export * from './handlers/index.js'
export * from './requestHandlerMap.js'
export * from './routes.js'
export * from './service.js'
export * from './types.js'
export * from './validation.js'
