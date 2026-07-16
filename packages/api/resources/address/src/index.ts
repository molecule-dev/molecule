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
 *
 * @remarks
 * - **Migration required.** `src/__setup__/addresses.sql` ships with this package
 *   and must exist in the target database before use (scaffolded apps apply it
 *   automatically; existing apps must apply it first).
 * - **Owner-scoped via the session.** All routes require `authenticate` and the
 *   service filters every read/write by the session `userId` — never accept a
 *   `userId` from the client and never look an address up by `:id` alone (IDOR).
 * - **Default flags are per-kind and exclusive.** Creating/updating with
 *   `isDefaultShipping`/`isDefaultBilling`, or `POST /addresses/:id/default`
 *   with `{ kind: 'shipping' | 'billing' }`, atomically clears the previous
 *   default of that kind for the user — don't hand-roll default toggling.
 * - Validation is shape-level and country-aware, not postal verification — treat
 *   address correctness as user-owned data; deliverability checks (if needed)
 *   are your app's concern at checkout time.
 */

export * from './browser-guard.js'
export * from './authorizers/index.js'
export * from './handlers/index.js'
export * from './requestHandlerMap.js'
export * from './routes.js'
export * from './service.js'
export * from './types.js'
export * from './validation.js'
