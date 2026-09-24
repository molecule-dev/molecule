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
 * import express from 'express'
 *
 * import { setStore } from '@molecule/api-database'
 * import { store } from '@molecule/api-database-postgresql'
 * import { requestHandlerMap as RoomType } from '@molecule/api-resource-room-type'
 *
 * // Startup: bond the DataStore once (the postgresql bond reads DATABASE_URL).
 * setStore(store)
 *
 * // What `mlcl inject` generates from `routes`. Mount AFTER the app's global auth middleware
 * // (it sets res.locals.session). Reads are public; writes need an ADMIN session
 * // (`isAdmin: true`, `role: 'admin'`, or the `'roomType:manage'` permission).
 * export const router = express.Router()
 * router.get('/room-types', RoomType.list) // ?propertyId=&activeOnly=true&minCapacity=2&page=1&limit=20
 * router.get('/room-types/:id', RoomType.read)
 * router.post('/room-types', RoomType.requireAdmin, RoomType.create)
 * router.patch('/room-types/:id', RoomType.requireAdmin, RoomType.update)
 * router.delete('/room-types/:id', RoomType.requireAdmin, RoomType.del)
 *
 * // Admin: POST /room-types { propertyId: 'prop-1', name: 'Deluxe King', capacity: 2,
 * //   baseRateCents: 18900, currency: 'USD', totalUnits: 12, amenities: ['wifi'] }
 * //   → 201 { id, name, amenities: ['wifi'], active: true, ... }
 * // Anyone: GET /room-types?propertyId=prop-1 → 200 { data: [...], total, page, limit }
 * ```
 *
 * @remarks
 * - **Bond the DataStore before mounting.** Every handler goes through
 *   `@molecule/api-database`; without `setStore(...)` at startup they answer 500.
 * - **Money is in minor units** (`baseRateCents: 18900` = 189.00) and `capacity`/`totalUnits`
 *   are required numbers — a missing field answers 400 with an `errorKey`.
 * - **`requireAdmin` rejects via `next(message)`, not a 403 body.** Without an app error
 *   handler Express turns that into a 500; the handlers themselves answer 401/403 JSON with an
 *   `errorKey` if the middleware is skipped.
 * - **List is a PAGE envelope** `{ data, total, page, limit }` (page-based, not offset).
 *
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

export * from './authorizers/index.js'
export * from './browser-guard.js'
export * from './handlers/index.js'
export * from './i18n.js'
export * from './requestHandlerMap.js'
export * from './routes.js'
export * from './types.js'
export * from './utilities.js'
