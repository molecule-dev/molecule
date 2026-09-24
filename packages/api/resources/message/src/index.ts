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
 * import express from 'express'
 *
 * import { setStore } from '@molecule/api-database'
 * import { store } from '@molecule/api-database-postgresql'
 * import {
 *   getOrCreateThread,
 *   getTotalUnreadCount,
 *   markRead,
 *   requestHandlerMap as Message,
 *   sendMessage,
 * } from '@molecule/api-resource-message'
 *
 * // Startup: bond the DataStore once (the postgresql bond reads DATABASE_URL).
 * setStore(store)
 *
 * // What `mlcl inject` generates from `routes`. Mount AFTER the app's global auth middleware
 * // (it sets res.locals.session; without it every route answers 401).
 * export const router = express.Router()
 * router.post('/message-threads', Message.createThread) // body { participantId }
 * router.get('/message-threads', Message.listThreads)
 * router.get('/message-threads/unread-count', Message.unreadCount) // before /:threadId
 * router.get('/message-threads/:threadId', Message.readThread)
 * router.get('/message-threads/:threadId/messages', Message.listMessages)
 * router.post('/message-threads/:threadId/messages', Message.sendMessage) // body { body, attachments? }
 * router.post('/message-threads/:threadId/read', Message.markRead)
 * router.patch('/message-threads/messages/:messageId', Message.editMessage)
 * router.delete('/message-threads/messages/:messageId', Message.deleteMessage)
 *
 * // Server-side (e.g. a system DM): the service THROWS on a non-participant or empty body.
 * const thread = await getOrCreateThread('user-alice', 'user-bob') // same row for (bob, alice)
 * await sendMessage(thread.id, 'user-alice', 'Your order has shipped!')
 * console.log(await getTotalUnreadCount('user-bob')) // 1
 * await markRead(thread.id, 'user-bob') // resets bob's counter to 0
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
 * **Bond the DataStore first** (`setStore(...)` from `@molecule/api-database`).
 * The service functions do NOT return `null` for bad input — `sendMessage` /
 * `markRead` throw when the thread is missing or the user is not a
 * participant, and `getOrCreateThread` throws for the same user on both sides.
 * They also do NOT check that the other participant exists or that the caller
 * may message them — gate that in your app. `GET …/:threadId/messages` returns
 * `{ data, limit }`, newest first (paginate with `?before=<ISO timestamp>`);
 * deleted messages stay in the list with `deletedAt` set and an empty body.
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

export * from './authorizers/index.js'
export * from './browser-guard.js'
export * from './handlers/index.js'
export * from './i18n.js'
export * from './requestHandlerMap.js'
export * from './routes.js'
export * from './service.js'
export * from './types.js'
export * from './validation.js'
