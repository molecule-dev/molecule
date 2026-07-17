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
 *
 * @remarks
 * - **List endpoints return a PAGINATED envelope** `{ data, total, limit, offset }`, not a
 *   bare array — read the rows off `result.data` (server) / `res.data.data` (client, after the
 *   HttpResponse wrapper). Treating the response as a bare array — or `unwrapList`, which only
 *   peels a PURE single-key `{ data }` — yields an EMPTY list.
 * SINGLE-USER BY DESIGN — a thread is PRIVATE to its creator. Every read and
 * write, including `GET /threads/:threadId`, `GET /threads/:threadId/messages`,
 * and POSTING a message, is authorized against `thread.creatorId === userId`;
 * any other (or anonymous) caller gets 404 — existence is not leaked. Out of
 * the box this resource does NOT support multi-participant conversations: for
 * user-to-user messaging use `@molecule/api-resource-message` (participant
 * model), or put your own participant/role gate (e.g. via
 * `@molecule/api-resource-share`) in front of these handlers. Messages cannot
 * be added to a `closed` thread.
 *
 * Session-auth prerequisite: handlers read the caller from
 * `res.locals.session.userId` and fail closed with 401 — mount the routes
 * behind your global auth middleware. The two routes declared without an
 * `authenticate` middleware (`read`, `listMessages`) still require a session
 * in-handler (defense-in-depth for scanners that drop bare middleware
 * strings).
 *
 * Tables: `src/__setup__/threads.sql` creates `threads`, `thread_messages`,
 * and `thread_read_status`. An mlcl-scaffolded API replays `__setup__/*.sql`
 * automatically on migrate; anywhere else run it once — nothing at runtime
 * creates them.
 */

export * from './browser-guard.js'
export * from './authorizers/index.js'
export * from './handlers/index.js'
export * from './requestHandlerMap.js'
export * from './routes.js'
export * from './service.js'
export * from './types.js'
export * from './validation.js'
