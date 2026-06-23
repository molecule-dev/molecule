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
 * @module
 */

export * from './authorizers/index.js'
export * from './handlers/index.js'
export * from './i18n.js'
export * from './registry.js'
export * from './requestHandlerMap.js'
export * from './routes.js'
export * from './types.js'
