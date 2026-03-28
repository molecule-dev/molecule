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
 */

export * from './authorizers/index.js'
export * from './handlers/index.js'
export * from './requestHandlerMap.js'
export * from './routes.js'
export * from './service.js'
export * from './types.js'
