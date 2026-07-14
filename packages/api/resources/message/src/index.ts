/**
 * 1:1 messaging resource for molecule.dev.
 *
 * Direct-message threads between two participants with read-tracking,
 * unread counters, optional attachments, and realtime broadcast over
 * `@molecule/api-realtime` when bonded.
 *
 * @module
 * @example
 * ```typescript
 * import { routes, requestHandlerMap } from '@molecule/api-resource-message'
 *
 * // Wire routes into your Express app via mlcl inject
 * // POST   /message-threads
 * // GET    /message-threads
 * // GET    /message-threads/unread-count
 * // GET    /message-threads/:threadId
 * // GET    /message-threads/:threadId/messages
 * // POST   /message-threads/:threadId/messages
 * // POST   /message-threads/:threadId/read
 * // PATCH  /message-threads/messages/:messageId
 * // DELETE /message-threads/messages/:messageId
 * ```
 *
 * @remarks
 * Realtime delivery is best-effort — messages are persisted before any
 * broadcast attempt and a missing realtime bond is silently a no-op.
 * Subscribers should listen on `threadRoomId(threadId)` for
 * {@link MESSAGE_REALTIME_EVENTS} payloads.
 */

export * from './browser-guard.js'
export * from './authorizers/index.js'
export * from './handlers/index.js'
export * from './requestHandlerMap.js'
export * from './routes.js'
export * from './service.js'
export * from './types.js'
export * from './validation.js'
