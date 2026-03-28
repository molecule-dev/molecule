/**
 * Threaded discussion resource for molecule.dev.
 *
 * Conversation threads with messages, read-tracking, and unread counts.
 * Threads can optionally attach to any resource via `resourceType`/`resourceId`.
 *
 * @module
 * @example
 * ```typescript
 * import { routes, requestHandlerMap } from '@molecule/api-resource-thread'
 *
 * // Wire routes into your Express app via mlcl inject
 * // POST   /threads
 * // GET    /threads
 * // GET    /threads/unread
 * // GET    /threads/:threadId
 * // PATCH  /threads/:threadId
 * // DELETE /threads/:threadId
 * // GET    /threads/:threadId/messages
 * // POST   /threads/:threadId/messages
 * // PUT    /threads/messages/:messageId
 * // DELETE /threads/messages/:messageId
 * // POST   /threads/:threadId/read
 * ```
 */

export * from './authorizers/index.js'
export * from './handlers/index.js'
export * from './requestHandlerMap.js'
export * from './routes.js'
export * from './service.js'
export * from './types.js'
export * from './validation.js'
