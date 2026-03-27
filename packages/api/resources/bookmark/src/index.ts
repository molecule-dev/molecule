/**
 * Bookmark/favorite resource for molecule.dev.
 *
 * Allows users to bookmark any resource, organize into folders, and check
 * bookmark status.
 *
 * @module
 * @example
 * ```typescript
 * import { routes, requestHandlerMap } from '@molecule/api-resource-bookmark'
 *
 * // Wire routes into your Express app via mlcl inject
 * // POST   /bookmarks
 * // GET    /bookmarks
 * // GET    /bookmarks/folders
 * // GET    /bookmarks/check/:resourceType/:resourceId
 * // DELETE /bookmarks/:resourceType/:resourceId
 * ```
 */

export * from './authorizers/index.js'
export * from './handlers/index.js'
export * from './requestHandlerMap.js'
export * from './routes.js'
export * from './service.js'
export * from './types.js'
export * from './validation.js'
