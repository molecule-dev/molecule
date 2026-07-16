/**
 * Tag resource for molecule.dev.
 *
 * Provides CRUD for tags (name, slug, color, description) and a join-table
 * system for tagging any entity. Includes popular-tag and slug-based lookups.
 *
 * @example
 * ```typescript
 * import { routes, requestHandlerMap } from '@molecule/api-resource-tag'
 *
 * // Wire routes into your Express app via mlcl inject
 * // Routes: POST/GET/PATCH/DELETE /tags, GET /tags/popular,
 * //         GET /tags/:slug/resources, POST/DELETE /:resourceType/:resourceId/tags
 * ```
 *
 * @remarks
 * The cross-resource tag routes (`POST /:resourceType/:resourceId/tags`,
 * `DELETE /:resourceType/:resourceId/tags/:tagId`) are **fail-closed**: they
 * return 404 until you register an ownership resolver for each taggable resource
 * type. Skipping this leaves the routes denying ALL tag writes (it never opens a
 * cross-tenant hole, but real tagging won't work). Wire it at startup:
 *
 * ```typescript
 * import { registerTagOwnershipResolver } from '@molecule/api-resource-tag'
 * import { findById } from '@molecule/api-database'
 *
 * // Allow tag writes only by the owner of the parent resource.
 * registerTagOwnershipResolver('posts', async ({ resourceId, userId }) => {
 *   const post = await findById('posts', resourceId)
 *   return post?.userId === userId
 * })
 * ```
 *
 * Taxonomy mutations are ADMIN-ONLY and DENY by default: `POST/PATCH/DELETE
 * /tags` are gated by the `requireAdmin` middleware AND re-checked in-handler
 * (fail-closed). "Admin" = an admin session claim (`isAdmin`, `role: 'admin'`,
 * a `'tag:manage'`/`'admin'` permission string) OR a bonded
 * `@molecule/api-permissions` grant of `manage` on `tag` — grant one of those
 * at startup or every taxonomy write is denied; do NOT strip the gate. The
 * tag read routes (`list`, `popular`, `read`, `getBySlug`) are PUBLIC by
 * design.
 *
 * Tables: `src/__setup__/tags.sql` creates `tags` and `resource_tags`. An
 * mlcl-scaffolded API replays `__setup__/*.sql` automatically on migrate;
 * anywhere else run it once — nothing at runtime creates them.
 *
 * @e2e
 * Integration checklist — drive the real UI (live preview, no mocks), adapt
 * each item to this app's actual screens/flows, and check every box off one
 * by one. A box you can't check is an integration bug to fix — not a skip:
 * - [ ] Creating a tag (name, color) through the UI adds it to the tag list and it
 *   persists across a reload.
 * - [ ] Assigning a tag to a resource the user owns succeeds and the tag chip
 *   renders on that resource. If EVERY tag write 404s, the ownership resolver
 *   was never registered (the routes are fail-closed) — that is an integration
 *   bug to fix, not a pass.
 * - [ ] Filtering/browsing by a tag shows exactly the resources carrying it.
 * - [ ] Removing a tag from a resource updates the UI immediately and stays
 *   removed after a reload.
 * - [ ] A user cannot tag or untag another user's resource (denied, no change).
 * - [ ] If a popular-tags surface exists, it reflects actual tag usage.
 *
 * @module
 */

export * from './browser-guard.js'
export * from './authorizers/index.js'
export * from './handlers/index.js'
export * from './i18n.js'
export * from './registry.js'
export * from './requestHandlerMap.js'
export * from './routes.js'
export * from './types.js'
