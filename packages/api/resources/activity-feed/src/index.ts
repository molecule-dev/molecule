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
 */

export * from './authorizers/index.js'
export * from './handlers/index.js'
export * from './requestHandlerMap.js'
export * from './routes.js'
export * from './service.js'
export * from './types.js'
export * from './validation.js'
