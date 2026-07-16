/**
 * Inventory resource for molecule.dev.
 *
 * Provides stock tracking with reservations, low-stock alerts,
 * movement history, and bulk update support.
 *
 * @module
 * @example
 * ```typescript
 * import { routes, requestHandlerMap } from '@molecule/api-resource-inventory'
 * ```
 *
 * @remarks
 * Tables: `src/__setup__/inventory.sql` creates `inventory_stock`,
 * `inventory_reservations`, and `inventory_movements`. An mlcl-scaffolded API
 * replays `__setup__/*.sql` automatically on migrate; anywhere else run it
 * once — nothing at runtime creates them.
 *
 * Stock rows are keyed by `productId` — SHARED app-wide state, not per-user
 * rows. Writing stock (`PUT /inventory/:productId`) and
 * `POST /inventory/bulk` are role-gated and DENY BY DEFAULT (admin session
 * claim or an `@molecule/api-permissions` grant), enforced both as the
 * `requireInventoryAdmin` route middleware and inside the handlers
 * (fail-closed). Out of the box no one can mutate stock — grant the role
 * first; never "fix" the 403 by removing the gate.
 *
 * Reservation flow: `POST /inventory/:productId/reserve` holds quantity →
 * `POST /inventory/reservations/:id/confirm` deducts it,
 * `DELETE /inventory/reservations/:id` releases the hold. All handlers read
 * the authenticated user from `res.locals.session` (mount behind your global
 * auth middleware; 401 otherwise).
 */

export * from './browser-guard.js'
export * from './authorizers/index.js'
export * from './handlers/index.js'
export * from './i18n.js'
export * from './requestHandlerMap.js'
export * from './routes.js'
export * from './types.js'
export * from './utilities.js'
