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
 */

export * from './browser-guard.js'
export * from './authorizers/index.js'
export * from './handlers/index.js'
export * from './i18n.js'
export * from './requestHandlerMap.js'
export * from './routes.js'
export * from './types.js'
export * from './utilities.js'
