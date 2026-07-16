/**
 * Activity feed resource for molecule.dev.
 *
 * Activity timeline with logging, feed queries, resource timelines, and
 * unseen-count tracking. Activities can reference any resource type.
 *
 * @module
 * @example
 * ```typescript
 * import { routes, requestHandlerMap } from '@molecule/api-resource-activity-feed'
 *
 * // Wire routes into your Express app via mlcl inject
 * // POST /activities           — log an activity
 * // GET  /activities/feed      — paginated user feed
 * // GET  /activities/unseen    — unseen count
 * // POST /activities/seen      — mark seen up to ID
 * // GET  /activities/:resourceType/:resourceId — resource timeline
 * ```
 *
 * @remarks
 * - **Migration required.** `src/__setup__/activity-feeds.sql` ships with this
 *   package (two tables: `activities`, `activity_seen_status`) and must exist in
 *   the target database before use (scaffolded apps apply it automatically).
 * - **The feed is GLOBAL, not per-user.** `getFeed()` returns activities from ALL
 *   actors (its userId param is reserved) — right for public/social timelines.
 *   In an app with private data, do NOT mount `GET /activities/feed` as-is: it
 *   exposes every user's actions to any authenticated user. Filter by
 *   actor/resource in your own handler instead. Unseen counts are global too.
 * - **`GET /activities/:resourceType/:resourceId` (timeline) ships with NO auth
 *   middleware** — resource timelines are public by default; add an authorizer
 *   when the underlying resources are private.
 * - **The actor is always the authenticated caller.** `POST /activities` strips
 *   any client-supplied `actorId` (feed-entry forgery guard). Keep that property
 *   in custom paths — and prefer calling `logActivity(actorId, data)` directly
 *   from your server-side domain handlers over round-tripping the HTTP route.
 * - `resourceType`/`resourceId` are free-form (no FK): pick canonical type slugs
 *   and reuse them across comments/bookmarks/reactions so timelines line up.
 */

export * from './browser-guard.js'
export * from './authorizers/index.js'
export * from './handlers/index.js'
export * from './requestHandlerMap.js'
export * from './routes.js'
export * from './service.js'
export * from './types.js'
export * from './validation.js'
