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
 * Tables: `src/__setup__/messages.sql` creates `message_threads` + `messages`.
 * An mlcl-scaffolded API replays `__setup__/*.sql` automatically on migrate;
 * anywhere else run it once — nothing at runtime creates them.
 *
 * Threads are strictly 1:1 — a canonicalised participant pair (creating a
 * thread with yourself throws) — and PARTICIPANT-SCOPED: every handler reads
 * the authenticated user from `res.locals.session` (401 without a session;
 * mount behind your global auth middleware) and rejects non-participants with
 * 403/404. The sender is always the session user — never accept a sender id
 * from the request body.
 *
 * Realtime delivery is best-effort — messages are persisted before any
 * broadcast attempt and a missing realtime bond is silently a no-op.
 * Subscribers should listen on `threadRoomId(threadId)` for
 * {@link MESSAGE_REALTIME_EVENTS} payloads.
 *
 * User-facing strings go through `t(key, …, { defaultValue })`; translations
 * ship in the companion `@molecule/api-locales-resource-message` bond.
 */

export * from './browser-guard.js'
export * from './authorizers/index.js'
export * from './handlers/index.js'
export * from './requestHandlerMap.js'
export * from './routes.js'
export * from './service.js'
export * from './types.js'
export * from './validation.js'
