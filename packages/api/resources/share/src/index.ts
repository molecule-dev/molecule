/**
 * Resource-share resource for molecule.dev.
 *
 * Generic ACL primitive: collaborator role grants keyed by
 * (resourceType, resourceId, principalType, principalId), plus a separate
 * public link-share token table. Includes service helpers for role lookup,
 * effective-role resolution across user/team/public grants, and access
 * predicates that downstream resources can compose into their own
 * authorization checks.
 *
 * @module
 * @example
 * ```typescript
 * import { routes, requestHandlerMap } from '@molecule/api-resource-share'
 *
 * // Wire routes into your Express app via mlcl inject
 * // POST   /resource-shares
 * // GET    /resource-shares/:resourceType/:resourceId
 * // GET    /resource-shares/:resourceType/:resourceId/role
 * // PATCH  /resource-shares/:id
 * // DELETE /resource-shares/:id
 * // POST   /resource-share-links
 * // GET    /resource-share-links/:resourceType/:resourceId
 * // DELETE /resource-share-links/:id
 * // GET    /resource-share-links/resolve/:slug   (public)
 * ```
 *
 * @example
 * ```typescript
 * import { canAccess, requireRole } from '@molecule/api-resource-share'
 *
 * // Inside another resource's handler:
 * await requireRole('document', docId, 'editor', userId, teamIds)
 * ```
 */

export * from './authorizers/index.js'
export * from './handlers/index.js'
export * from './requestHandlerMap.js'
export * from './routes.js'
export * from './service.js'
export * from './types.js'
export * from './validation.js'
