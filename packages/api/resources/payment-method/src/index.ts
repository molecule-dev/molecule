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
 *
 * @remarks
 * Bond ordering: the service resolves the provider with
 * `get('payments', 'stripe')` — wire `@molecule/api-payments-stripe` under the
 * name `stripe` (`bond('payments', 'stripe', provider)`) BEFORE any route
 * runs, and set `STRIPE_SECRET_KEY`. The provider name is currently fixed
 * (`PROVIDER_NAME = 'stripe'`); other card-style providers plug in by
 * implementing the same SetupIntent-shaped `PaymentProvider` surface.
 *
 * Table: `src/__setup__/payment_methods.sql` creates `payment_methods`. An
 * mlcl-scaffolded API replays `__setup__/*.sql` automatically on migrate;
 * anywhere else run it once.
 *
 * All routes are SELF-scoped under `/me/payment-methods` and read the
 * authenticated user from `res.locals.session` (401 without a session) — a
 * user can only list/attach/default/delete their OWN methods; never accept a
 * target userId from the client. Raw card data never touches your API: the
 * client confirms the SetupIntent with the provider and only the provider's
 * payment-method id is attached and stored.
 */

export * from './browser-guard.js'
export * from './i18n.js'
export * from './requestHandlerMap.js'
export * from './routes.js'
export * from './secrets.js'
export * from './service.js'
export * from './types.js'
export * from './utilities.js'
