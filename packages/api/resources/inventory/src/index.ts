/**
 * Inventory resource for molecule.dev.
 *
 * Provides stock tracking with reservations, low-stock alerts,
 * movement history, and bulk update support.
 *
 * @module
 * @example
 * ```typescript
 * import express from 'express'
 *
 * import { setStore } from '@molecule/api-database'
 * import { store } from '@molecule/api-database-postgresql'
 * import { requestHandlerMap as Inventory } from '@molecule/api-resource-inventory'
 *
 * // Startup: bond the DataStore once (the postgresql bond reads DATABASE_URL).
 * setStore(store)
 *
 * // Mount AFTER the app's global auth middleware (it sets res.locals.session). Static paths
 * // (`/inventory/alerts`, `/inventory/bulk`, `/inventory/reservations/…`) go BEFORE `/:productId`.
 * export const router = express.Router()
 * router.get('/inventory/alerts', Inventory.getAlerts)
 * router.post('/inventory/bulk', Inventory.requireInventoryAdmin, Inventory.bulkUpdate)
 * router.post('/inventory/reservations/:reservationId/confirm', Inventory.confirm)
 * router.delete('/inventory/reservations/:reservationId', Inventory.release)
 * router.get('/inventory/:productId', Inventory.getStock)
 * router.put('/inventory/:productId', Inventory.requireInventoryAdmin, Inventory.updateStock)
 * router.post('/inventory/:productId/reserve', Inventory.reserve)
 * router.get('/inventory/:productId/movements', Inventory.getMovements)
 *
 * // Admin client: PUT /inventory/prod-1 { type: 'add', quantity: 25 } // 'add' | 'remove' | 'set'
 * //   → 200 { productId: 'prod-1', total: 25, reserved: 0, available: 25, isLowStock: false, ... }
 * // Checkout:     POST /inventory/prod-1/reserve { quantity: 2, orderId: 'order-9' }
 * //   → 201 { id, productId: 'prod-1', quantity: 2, orderId: 'order-9', ... } (409 if short)
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
 * `POST /inventory/bulk` are role-gated and DENY BY DEFAULT: the session needs
 * an admin claim (`isAdmin: true`, `role`/`roles` `'admin'`, or an `'admin'` /
 * `'inventory:manage'` entry in `permissions`) — there is NO
 * `@molecule/api-permissions` lookup, so set the claim in your auth middleware.
 * The gate is enforced both as the `requireInventoryAdmin` route middleware and
 * inside the handlers (fail-closed). Out of the box no one can mutate stock — grant the role
 * first; never "fix" the 403 by removing the gate.
 *
 * Reservation flow: `POST /inventory/:productId/reserve` holds quantity →
 * `POST /inventory/reservations/:id/confirm` deducts it,
 * `DELETE /inventory/reservations/:id` releases the hold. All handlers read
 * the authenticated user from `res.locals.session` (mount behind your global
 * auth middleware; 401 otherwise). `routes` lists `'authenticate'` as a
 * middleware but `requestHandlerMap` has no such key — authentication is YOUR
 * global middleware's job.
 *
 * Route order matters in Express: `GET /inventory/:productId` declared before
 * `GET /inventory/alerts` swallows the alerts request (it looks up a product
 * named `alerts` and 404s) — register the static paths first, as above.
 * A first `PUT` on an unknown product CREATES its stock row
 * (`lowStockThreshold: 10`); `reserve` on an unknown product 404s.
 *
 * The `requireInventoryAdmin` middleware rejects by calling `next(message)` — the status comes
 * from YOUR Express error handler (the mlcl scaffold's answers 500), not a 403.
 * The handlers re-check and answer 401/403 JSON themselves, so routes wired
 * without the middleware still fail closed with a proper status.
 *
 * @e2e
 * Integration checklist — drive the real UI (live preview, no mocks), adapt
 * each item to this app's actual stock/admin screens, and check every box off
 * one by one. Correctness is the whole point here: a box you can't check is a
 * bug to fix, not a skip.
 * - [ ] Setting stock (`PUT /inventory/:productId`, `type:'set'`) then
 *   reloading `GET /inventory/:productId` shows the exact `total`/`available`
 *   you set — it persisted, not just optimistic UI. `available` = `total` -
 *   `reserved`.
 * - [ ] `type:'add' N` raises `total` by exactly N and `type:'remove' N`
 *   lowers it by exactly N — verify the arithmetic on the specific
 *   `productId`/`variantId`; variant stock is tracked independently, so
 *   adjusting one variant must not move another.
 * - [ ] Stock never goes negative: removing or `set`ting below the currently
 *   reserved quantity is rejected with a visible 409 error
 *   (`inventory.error.insufficientStock`) and the stored `total` is unchanged
 *   — never persisted as a negative; reserving more than `available` is
 *   likewise rejected (409 `insufficientAvailable`).
 * - [ ] Low-stock crossing flags the item: when `available` falls to or below
 *   `lowStockThreshold` (default 10) it reads `isLowStock:true` and appears in
 *   `GET /inventory/alerts`; raising stock back above the threshold clears it.
 * - [ ] Every mutation appends an `inventory_movements` row shown in
 *   `GET /inventory/:productId/movements` with the signed delta (`+N`/`-N`),
 *   type (adjustment/reservation/confirmation), timestamp, and `referenceId`
 *   (orderId/reservationId); the acting user is recorded on the reservation.
 *   The movement log must reconstruct the current total.
 * - [ ] Concurrency: two reservations or removals fired at once that together
 *   exceed `available` don't double-spend the last unit — exactly one
 *   succeeds, and final `total`/`reserved` stay consistent (`available` never
 *   goes negative).
 * - [ ] AUTHORIZATION — stock mutation is admin-only and denies by default:
 *   `PUT /inventory/:productId` and `POST /inventory/bulk` return 403 for a
 *   normal signed-in user (no `isAdmin`/`role:'admin'`/`roles`/`permissions`
 *   claim) and 401 when signed out; only an admin session can change stock. A
 *   customer cannot mutate the shared catalog stock through any endpoint, and
 *   one user cannot release/confirm another user's reservation (403
 *   `reservationForbidden`).
 */

export * from './authorizers/index.js'
export * from './browser-guard.js'
export * from './handlers/index.js'
export * from './i18n.js'
export * from './requestHandlerMap.js'
export * from './routes.js'
export * from './types.js'
export * from './utilities.js'
