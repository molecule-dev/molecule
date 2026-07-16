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
 *
 * // Wire routes into your Express app via mlcl inject
 * // GET    /room-types          (public)
 * // GET    /room-types/:id      (public)
 * // POST   /room-types          (admin-only)
 * // PATCH  /room-types/:id      (admin-only)
 * // DELETE /room-types/:id      (admin-only)
 * ```
 *
 * @remarks
 * Mutations are ADMIN-ONLY and DENY by default. A room type has no per-user
 * owner column (it carries a `propertyId`, not a `userId`), so
 * `create`/`update`/`del` are gated by the `requireAdmin` middleware AND
 * re-checked inside every mutation handler via `isRoomTypeAdmin` — fail-closed
 * defense-in-depth that holds even if a route scanner drops the middleware.
 * "Admin" resolves as: an admin session claim (`isAdmin: true`,
 * `role: 'admin'`, `roles` containing `'admin'`, or a `'roomType:manage'` /
 * `'admin'` entry in `session.permissions`) OR a bonded
 * `@molecule/api-permissions` grant of `manage` on `roomType`. Until the app
 * grants one of those, every mutation is denied — that is intentional: grant
 * the claim/permission at startup, do NOT strip the gate. An app that models
 * per-property ownership should grant the permission after its own
 * property-ownership check.
 *
 * The read routes are PUBLIC by design so listings work without a session.
 * `propertyId` is NOT validated against a property resource — enforce
 * referential integrity in your app if it matters.
 *
 * Tables: `src/__setup__/room-types.sql` creates `room_types`. An
 * mlcl-scaffolded API replays `__setup__/*.sql` automatically on migrate;
 * anywhere else run it once — nothing at runtime creates them.
 *
 * @e2e
 * Integration checklist — drive the real UI (live preview, no mocks), adapt
 * each item to this app's actual screens/flows, and check every box off one
 * by one. A box you can't check is an integration bug to fix — not a skip:
 * - [ ] Creating a room type persists its real fields — `name`, `capacity`,
 *   `baseRateCents`, `currency`, `totalUnits`, `amenities`, `photos` — and the
 *   new type then appears in the listing under its own `propertyId` (scoped to
 *   the right property, not shown globally).
 * - [ ] Price and capacity render correctly on the card/detail: the rate shows
 *   as a per-night price in the room type's `currency` with `baseRateCents`
 *   converted back to major units (cents → dollars, no off-by-100), and
 *   capacity reads as the max guest count.
 * - [ ] Inventory (`totalUnits`) is respected end-to-end: where the app has a
 *   booking/availability flow, available count = `totalUnits` minus units
 *   already booked for the dates, and a booking that would push a room type
 *   past its `totalUnits` is refused — no overbooking below zero available.
 *   Editing `totalUnits` up or down changes what the availability view offers.
 * - [ ] Any per-night / seasonal rate layer the app models (rate plans are NOT
 *   in this resource — `baseRateCents` is only the baseline) applies on top of
 *   the baseline for the selected dates; with no such layer, the baseline rate
 *   is what's quoted.
 * - [ ] Toggling `active` controls bookability: an inactive room type is hidden
 *   from the public/guest listing (or shown as unavailable) and cannot be
 *   booked; flipping it back `active` makes it offered again, and `?activeOnly`
 *   on the list endpoint returns only bookable types.
 * - [ ] `amenities` and `photos` render — amenity codes map to labels/icons and
 *   photos load from the app's own uploads/storage (not hotlinked externals).
 * - [ ] AUTHORIZATION: a public/guest visitor (no session) can browse and read
 *   bookable room types, but every mutation is owner/manager-gated — a
 *   non-admin or unauthenticated caller's create/edit/delete or inventory/price
 *   change is refused (401 unauthenticated, 403 non-admin) — and a room type is
 *   scoped to its property: an owner/manager of one property cannot
 *   create/edit/delete another property's room types.
 */

export * from './browser-guard.js'
export * from './authorizers/index.js'
export * from './handlers/index.js'
export * from './i18n.js'
export * from './requestHandlerMap.js'
export * from './routes.js'
export * from './types.js'
export * from './utilities.js'
