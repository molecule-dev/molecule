/**
 * Follow/unfollow resource for molecule.dev.
 *
 * Polymorphic follow system for users or any resource type. Supports
 * followers list, following list, and follow status checks.
 *
 * @module
 * @example
 * ```typescript
 * import { routes, requestHandlerMap } from '@molecule/api-resource-follow'
 *
 * // Wire routes into your Express app via mlcl inject
 * // POST   /follow/:targetType/:targetId
 * // DELETE /follow/:targetType/:targetId
 * // GET    /:targetType/:targetId/followers
 * // GET    /following
 * // GET    /follow/check/:targetType/:targetId
 * ```
 *
 * @remarks
 * Table: `src/__setup__/follows.sql` creates the single `follows` table. An
 * mlcl-scaffolded API replays `__setup__/*.sql` automatically on migrate;
 * anywhere else run it once — nothing at runtime creates it.
 *
 * The follower is ALWAYS the authenticated user: handlers read
 * `res.locals.session` (populated by your global auth middleware) and 401
 * without it — never accept a follower userId from the body or params.
 * `GET /:targetType/:targetId/followers` is deliberately PUBLIC; gate it
 * yourself if follower lists are private in your app.
 *
 * `targetType` is a free-form string (`user`, `post`, …) — the package does
 * not validate it against your schema, so constrain accepted values in your
 * app if arbitrary types would be a problem.
 */

export * from './browser-guard.js'
export * from './authorizers/index.js'
export * from './handlers/index.js'
export * from './requestHandlerMap.js'
export * from './routes.js'
export * from './service.js'
export * from './types.js'
