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
 * import express from 'express'
 *
 * import { setStore } from '@molecule/api-database'
 * import { store } from '@molecule/api-database-postgresql'
 * import { requestHandlerMap as Property } from '@molecule/api-resource-property'
 *
 * // Startup: bond the DataStore once (the postgresql bond reads DATABASE_URL).
 * setStore(store)
 *
 * // What `mlcl inject` generates from `routes`. Mount AFTER the app's global auth middleware
 * // (it sets res.locals.session; writes answer 401 without it, reads stay public).
 * export const router = express.Router()
 * router.post('/properties', Property.create)
 * router.get('/properties', Property.list) // ?type=&city=&page=&perPage= — ACTIVE only
 * router.get('/properties/:id', Property.read)
 * router.patch('/properties/:id', Property.update)
 * router.delete('/properties/:id', Property.del)
 * router.get('/properties/:id/units', Property.listUnits)
 * router.post('/properties/:id/units', Property.createUnit)
 * router.get('/properties/:id/photos', Property.listPhotos)
 * router.post('/properties/:id/photos', Property.createPhoto)
 * router.get('/properties/:id/amenities', Property.listAmenities)
 * router.post('/properties/:id/amenities', Property.createAmenity)
 *
 * // Owner client:
 * // POST /properties { name: 'Harbour View', addressLine1: '1 Quay St', city: 'Lisbon',
 * //   countryCode: 'pt' } → 201 { id, ownerId, slug: 'harbour-view', status: 'draft', countryCode: 'PT', ... }
 * // PATCH /properties/:id { status: 'active' } → now visible in GET /properties { data, page, perPage }
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
 * **A new property is `'draft'` and INVISIBLE in `GET /properties`** until the
 * owner PATCHes `status: 'active'`. `addressLine1`, `city` and `countryCode`
 * are required (400 otherwise); `type` defaults to `'apartment'`. The list
 * answers `{ data, page, perPage }` (no `total`). `unitCount` is maintained by
 * `POST …/units` — don't set it yourself.
 *
 * Writes are OWNER-scoped and fail closed: `create` reads the caller from
 * `res.locals.session` (401 without one; mount behind your global auth
 * middleware) and stamps `ownerId` from it — never accept an ownerId from the
 * request body. `update`/`del` and sub-resource writes reject any caller
 * whose session userId ≠ `ownerId`; legacy rows with `ownerId: null` are
 * immutable through the API.
 *
 * @e2e
 * Integration checklist — drive the real UI (live preview, no mocks), adapt
 * each item to this app's actual screens/flows, and check every box off one
 * by one. A box you can't check is an integration bug to fix — not a skip:
 * - [ ] Creating a listing persists its real fields — `name`, `type`
 *   (apartment/house/condo/townhouse/hotel/commercial/land), and full address
 *   (`addressLine1`, `city`, `region`, `postalCode`, `countryCode`) — and the
 *   saved listing shows them back on its detail page; a property's units carry
 *   their specs (`bedrooms`, `bathrooms`, `areaSquareMetres`, `maxOccupancy`)
 *   and those render as real numbers, not placeholders. (There is no price
 *   field on this resource — don't invent one; if the app charges rent, model
 *   it explicitly and render its own currency/amount, never a stub.)
 * - [ ] A new listing defaults to `draft` and does NOT show in the public
 *   listings until its `status` is set to `active`; publish it and it appears,
 *   then flip it back to draft/inactive/archived and it disappears from the
 *   public list AND 404s by id for a signed-out visitor (existence not leaked).
 * - [ ] Search/filter narrows to the query, not everything: a `type`, `city`,
 *   or `status` filter (the real `list` params) returns ONLY matching `active`
 *   listings — confirm a non-matching listing is absent and a matching one is
 *   present, so results reflect the filter rather than the whole catalog.
 * - [ ] Photos render from the app's own uploads (`coverImageUrl` plus a
 *   property's `property_photos`), served by this app's storage — not a
 *   hotlinked external URL that can break; a listing with no photo shows a real
 *   placeholder, not a broken-image icon.
 * - [ ] Authorization: a signed-out visitor can browse and read `active`
 *   listings, but create/edit/delete require a session (401 without one) and
 *   only the LISTING OWNER may mutate their own row — a non-owner's edit or
 *   delete is refused (403), and `ownerId` is stamped from the session, never
 *   accepted from the request body. No draft/inactive/archived listing leaks to
 *   a non-owner by id.
 */

export * from './authorizers/index.js'
export * from './browser-guard.js'
export * from './handlers/index.js'
export * from './i18n.js'
export * from './requestHandlerMap.js'
export * from './routes.js'
export * from './types.js'
