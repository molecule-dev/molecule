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

export * from './browser-guard.js'
export * from './authorizers/index.js'
export * from './handlers/index.js'
export * from './i18n.js'
export * from './requestHandlerMap.js'
export * from './routes.js'
export * from './types.js'
