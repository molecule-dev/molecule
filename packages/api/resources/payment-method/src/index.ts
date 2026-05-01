/**
 * Saved payment-method resource for molecule.dev.
 *
 * Wraps the Stripe SetupIntent flow (and any future card-style provider) into
 * a database-backed list of saved payment methods with a per-user default.
 *
 * @module
 * @example
 * ```typescript
 * import { routes, requestHandlerMap } from '@molecule/api-resource-payment-method'
 *
 * // Mount via mlcl-generated router; service-level usage:
 * import {
 *   createSetupIntent,
 *   attachPaymentMethod,
 *   listPaymentMethods,
 *   setDefaultPaymentMethod,
 *   deletePaymentMethod,
 * } from '@molecule/api-resource-payment-method'
 * ```
 */

export * from './i18n.js'
export * from './requestHandlerMap.js'
export * from './routes.js'
export * from './service.js'
export * from './types.js'
export * from './utilities.js'
