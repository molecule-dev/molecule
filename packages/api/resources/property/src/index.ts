/**
 * Property resource for molecule.dev.
 *
 * Provides CRUD handlers for properties (apartments, houses, hotels) with soft-delete,
 * pagination, status / type / city filtering, and units, photos, and amenities sub-resources.
 * All user-facing text is i18n-ready via the companion `@molecule/api-locales-property` bond.
 *
 * @module
 * @example
 * ```typescript
 * import { routes, requestHandlerMap } from '@molecule/api-resource-property'
 * ```
 *
 * @remarks
 * Tables: `src/__setup__/properties.sql` creates `properties`,
 * `property_units`, `property_photos`, and `property_amenities`. An
 * mlcl-scaffolded API replays `__setup__/*.sql` automatically on migrate;
 * anywhere else run it once.
 *
 * Listing-site visibility semantics: `list`/`read` (and the units/photos/
 * amenities reads) are PUBLIC for `active` properties; a non-active
 * (draft/inactive/archived) or soft-deleted property 404s for everyone but
 * its owner — 404, not 403, so its existence isn't leaked. If your app's
 * inventory is private, gate the read routes yourself.
 *
 * Writes are OWNER-scoped and fail closed: `create` reads the caller from
 * `res.locals.session` (401 without one; mount behind your global auth
 * middleware) and stamps `ownerId` from it — never accept an ownerId from the
 * request body. `update`/`del` and sub-resource writes reject any caller
 * whose session userId ≠ `ownerId`; legacy rows with `ownerId: null` are
 * immutable through the API.
 */

export * from './browser-guard.js'
export * from './authorizers/index.js'
export * from './handlers/index.js'
export * from './i18n.js'
export * from './requestHandlerMap.js'
export * from './routes.js'
export * from './types.js'
