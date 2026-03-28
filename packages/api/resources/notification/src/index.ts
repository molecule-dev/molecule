/**
 * Notification resource for molecule.dev.
 *
 * Provides Express route handlers for in-app notification management
 * including listing, read status, deletion, and preference management.
 *
 * @module
 * @example
 * ```typescript
 * import { routes, requestHandlerMap } from '@molecule/api-resource-notification'
 *
 * // Routes are registered automatically by mlcl inject
 * // Manual usage:
 * for (const route of routes) {
 *   app[route.method](route.path, requestHandlerMap[route.handler])
 * }
 * ```
 */

export * from './handlers/index.js'
export * from './requestHandlerMap.js'
export * from './routes.js'
export * from './types.js'
