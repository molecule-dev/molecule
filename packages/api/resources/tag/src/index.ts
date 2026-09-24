/**
 * Tag resource for molecule.dev.
 *
 * Provides CRUD for tags (name, slug, color, description) and a join-table
 * system for tagging any entity. Includes popular-tag and slug-based lookups.
 *
 * @example
 * ```typescript
 * import express from 'express'
 *
 * import { setStore } from '@molecule/api-database'
 * import { store } from '@molecule/api-database-postgresql'
 * import {
 *   registerTagOwnershipResolver,
 *   requestHandlerMap as Tag,
 * } from '@molecule/api-resource-tag'
 *
 * // Startup: bond the DataStore (the postgresql bond reads DATABASE_URL), and say who may tag
 * // each resource type — without a resolver every POST/DELETE /:type/:id/tags answers 404.
 * setStore(store)
 * const postAuthors = new Map([['post-1', 'user-1']])
 * registerTagOwnershipResolver('posts', ({ resourceId, userId }) => postAuthors.get(resourceId) === userId)
 *
 * // What `mlcl inject` generates from `routes`, mounted AFTER the global auth middleware.
 * export const router = express.Router()
 * router.get('/tags', Tag.list)
 * router.get('/tags/popular', Tag.popular) // before /tags/:id
 * router.get('/tags/:id', Tag.read)
 * router.get('/tags/:slug/resources', Tag.getBySlug) // ?resourceType=posts
 * router.post('/tags', Tag.requireAdmin, Tag.create)
 * router.patch('/tags/:id', Tag.requireAdmin, Tag.update)
 * router.delete('/tags/:id', Tag.requireAdmin, Tag.del)
 * router.post('/:resourceType/:resourceId/tags', Tag.addTag) // { tagId }
 * router.delete('/:resourceType/:resourceId/tags/:tagId', Tag.removeTag)
 *
 * // Admin: POST /tags { name: 'Type Script', color: '#3178c6' } → 201 { id, slug: 'type-script', ... }
 * // Author of post-1: POST /posts/post-1/tags { tagId } → 201 (anyone else → 404)
 * // Anyone: GET /tags/type-script/resources → { tag, resources: [{ resourceType: 'posts',
 * //   resourceId: 'post-1', taggedAt }] }
 * ```
 *
 * @remarks
 * - **Bond the DataStore before mounting** (`setStore(...)`), or every handler answers 500.
 * - The slug is DERIVED from `name` (lowercased, non-alphanumerics → `-`); a clashing slug gets a
 *   time-based suffix instead of a 409. `getBySlug` takes the slug, `read`/`update`/`del` the id.
 * - `requireAdmin` rejects via `next(message)`, so without an app error handler Express answers
 *   500 (the handlers themselves answer 401/403 JSON if the middleware is skipped).
 *
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

export * from './authorizers/index.js'
export * from './browser-guard.js'
export * from './handlers/index.js'
export * from './i18n.js'
export * from './registry.js'
export * from './requestHandlerMap.js'
export * from './routes.js'
export * from './types.js'
