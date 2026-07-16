/**
 * Like/emoji reactions resource for molecule.dev.
 *
 * Polymorphic reactions that attach to any resource type. Supports multiple
 * reaction types (like, love, laugh, etc.) with idempotent add/remove.
 *
 * @module
 * @example
 * ```typescript
 * import { routes, requestHandlerMap } from '@molecule/api-resource-reaction'
 *
 * // Wire routes into your Express app via mlcl inject
 * // POST   /:resourceType/:resourceId/reactions
 * // DELETE /:resourceType/:resourceId/reactions
 * // GET    /:resourceType/:resourceId/reactions
 * ```
 *
 * @remarks
 * Session-auth prerequisite: `create` and `del` read the caller from
 * `res.locals.session.userId` and fail closed with 401 — mount the routes
 * behind your global auth middleware (the declared `authenticate` middleware
 * string). Reactions are always owner-scoped: handlers derive the reacting
 * user from the SESSION, never from the request body, and `del` removes only
 * the caller's own reactions (optionally a single `type` via `?type=`).
 *
 * The GET summary route is PUBLIC by default (no `authenticate`) so anonymous
 * visitors can see counts; when a session is present it also includes the
 * current user's reactions. This resource does NOT validate that the target
 * resource exists or that the caller may see it — if reactions attach to
 * private resources in your app, gate these routes behind the parent
 * resource's own access check; this package cannot know who owns an arbitrary
 * `(resourceType, resourceId)`.
 *
 * Tables: `src/__setup__/reactions.sql` creates `reactions` (unique per
 * `(resourceType, resourceId, userId, type)` — add is idempotent). An
 * mlcl-scaffolded API replays `__setup__/*.sql` automatically on migrate;
 * anywhere else run it once — nothing at runtime creates them.
 */

export * from './browser-guard.js'
export * from './authorizers/index.js'
export * from './handlers/index.js'
export * from './requestHandlerMap.js'
export * from './routes.js'
export * from './service.js'
export * from './types.js'
export * from './validation.js'
