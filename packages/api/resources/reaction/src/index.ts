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
 */

export * from './authorizers/index.js'
export * from './handlers/index.js'
export * from './requestHandlerMap.js'
export * from './routes.js'
export * from './service.js'
export * from './types.js'
export * from './validation.js'
