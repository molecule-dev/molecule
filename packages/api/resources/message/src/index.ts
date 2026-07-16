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
 *
 * @e2e
 * Integration checklist — drive the real messaging UI (live preview, no
 * mocks), adapt each item to this app's actual threads/screens, and check
 * every box off one by one. A box you can't check is an integration bug to
 * fix — not a skip. Messaging PRIVACY is the point here, so the last item is
 * not optional:
 * - [ ] Sending a message in a thread persists it and it appears in that
 *   thread for BOTH participants in chronological (`createdAt`) order, stamped
 *   with the sender and a timestamp. Send from each side and confirm both see
 *   the same ordered transcript.
 * - [ ] Read / unread works: a message you send is unread for the recipient —
 *   their thread badge and `GET /message-threads/unread-count` increment;
 *   opening the thread and marking it read (`POST /message-threads/:threadId/read`)
 *   clears that side's unread count to zero and the total badge drops to match.
 * - [ ] Editing a message shows an edited state (an "edited" marker /
 *   `editedAt`) and deleting it removes it or renders a "message was deleted"
 *   tombstone (`deletedAt`) — and ONLY the author can edit or delete their OWN
 *   message: the other participant gets no edit/delete affordance and a forged
 *   PATCH/DELETE on someone else's message is rejected, never applied.
 * - [ ] Delivery to the other participant: with `@molecule/api-realtime`
 *   bonded, a new message appears in their already-open thread WITHOUT a
 *   reload; with no realtime bond it appears on their next load/refresh.
 * - [ ] PRIVACY / AUTHORIZATION — a thread and its messages are visible ONLY
 *   to its two participants. Sign in as a THIRD user and confirm they cannot
 *   read the thread or any message by guessing its id (403/404), cannot post
 *   into a thread they are not part of (403), and cannot spoof the sender —
 *   the sender is always the session user, never a request-body field.
 */

export * from './browser-guard.js'
export * from './authorizers/index.js'
export * from './handlers/index.js'
export * from './requestHandlerMap.js'
export * from './routes.js'
export * from './service.js'
export * from './types.js'
export * from './validation.js'
