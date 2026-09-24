/**
 * Threaded discussion resource for molecule.dev.
 *
 * Conversation threads with messages, read-tracking, and unread counts.
 * Threads can optionally attach to any resource via `resourceType`/`resourceId`.
 *
 * @module
 * @example
 * ```typescript
 * import { setStore } from '@molecule/api-database'
 * import { store } from '@molecule/api-database-postgresql'
 * import {
 *   addMessage,
 *   createThread,
 *   getMessages,
 *   getUnreadCount,
 *   markRead,
 * } from '@molecule/api-resource-thread'
 *
 * // Startup: bond the DataStore once (the postgresql bond reads DATABASE_URL). `mlcl inject`
 * // mounts `routes` onto `requestHandlerMap` (POST/GET /threads, GET /threads/unread,
 * // GET/PATCH/DELETE /threads/:threadId, GET/POST /threads/:threadId/messages,
 * // PUT/DELETE /threads/messages/:messageId, POST /threads/:threadId/read { lastReadMessageId }).
 * setStore(store)
 *
 * // Server-side code: the caller is always the SESSION user (res.locals.session.userId).
 * const userId = 'user-1'
 * const thread = await createThread(userId, { title: 'Launch notes', resourceType: 'project', resourceId: 'p-1' })
 * await addMessage(thread.id, userId, { body: 'Draft is up' })
 * const last = await addMessage(thread.id, userId, { body: 'Reviewed' }) // null if closed / not the owner
 *
 * console.log(await getUnreadCount(userId)) // 1 — threads with unread messages, not messages
 * if (last) await markRead(thread.id, userId, last.id)
 * const page = await getMessages(thread.id) // { data: oldest-first messages, total: 2, limit: 50, offset: 0 }
 * console.log(page.total, await getUnreadCount(userId)) // 2, 0
 * ```
 *
 * @remarks
 * - **Bond the DataStore before any call** (`setStore(...)`), or every service function and
 *   handler throws.
 * - `addMessage()` returns `null` (the handler answers 404) when the thread is closed, missing,
 *   or not owned by the caller — check it before using the message.
 * - **List endpoints return a PAGINATED envelope** `{ data, total, limit, offset }`, not a
 *   bare array — read the rows off `result.data` (server). On the client, `unwrapList(res)`
 *   from `@molecule/app-http` normalizes this envelope (pass it the whole HttpResponse), so
 *   the rows come back; reading the response as a bare array — or `res.data` alone (which is
 *   the envelope) — yields an EMPTY list.
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

export * from './authorizers/index.js'
export * from './browser-guard.js'
export * from './handlers/index.js'
export * from './requestHandlerMap.js'
export * from './routes.js'
export * from './service.js'
export * from './types.js'
export * from './validation.js'
