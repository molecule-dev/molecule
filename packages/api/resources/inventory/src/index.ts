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

export * from './browser-guard.js'
export * from './authorizers/index.js'
export * from './handlers/index.js'
export * from './i18n.js'
export * from './requestHandlerMap.js'
export * from './routes.js'
export * from './types.js'
export * from './utilities.js'
