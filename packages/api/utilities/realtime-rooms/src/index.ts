/**
 * Realtime-rooms utility for molecule.dev.
 *
 * Authenticated, capacity-bounded, role-aware named pub/sub rooms built
 * on top of `@molecule/api-realtime`'s transport bond and persisted via
 * `@molecule/api-database`'s abstract DataStore.
 *
 * Solves the IDOR pattern flagged in flagship realtime apps
 * (quiz-platform live sessions, virtual-classroom rooms) where any
 * authenticated user could subscribe to / broadcast on any channel —
 * {@link assertCanAct} is the central guard.
 *
 * @example
 * ```typescript
 * import {
 *   createRoom,
 *   joinRoom,
 *   broadcast,
 *   subscribe,
 *   assertCanAct,
 * } from '@molecule/api-realtime-rooms'
 *
 * // Host creates a private room with a join code.
 * const room = await createRoom({
 *   kind: 'quiz-session',
 *   ownerId: hostUserId,
 *   capacity: 30,
 *   joinCode: 'ABC123',
 * })
 *
 * // Guest joins.
 * await joinRoom(room.id, guestUserId, 'ABC123')
 *
 * // Broadcast a question — handler must authorise first.
 * await assertCanAct(room.id, hostUserId, 'host')
 * await broadcast(room.id, { kind: 'question-asked', payload: { qid: 1 } })
 * ```
 *
 * @remarks
 * Tables: the .sql file under `src/__setup__` creates `realtime_rooms` +
 * `realtime_room_members`. An mlcl-scaffolded API replays .sql files under
 * `__setup__` automatically on migrate; anywhere else run it once — nothing
 * at runtime creates them. The shipped DDL is PostgreSQL-flavoured
 * (`gen_random_uuid()`, `TIMESTAMPTZ`); adapt the column types for
 * SQLite/MySQL — the service itself is dialect-agnostic (abstract DataStore).
 *
 * Wiring prereqs: a database bond must be wired (any `@molecule/api-database-*`
 * provider) AND a realtime transport must be set via `@molecule/api-realtime`'s
 * `setProvider()` (e.g. the `@molecule/api-realtime-socketio` provider) before
 * `broadcast`/`subscribe` deliver anything. `subscribe()` registrations made
 * before the transport is set are buffered by api-realtime and flushed when
 * it is; `broadcast()` before then throws "Realtime provider not configured".
 *
 * `subscribe()` does NOT install a transport-level listener per call. The
 * package installs exactly ONE shared `onMessage` listener for the whole
 * process (at import) and multiplexes it to per-room handlers; `subscribe()`
 * registers a handler and the returned unsubscribe fully removes it. Listeners
 * never accumulate, so subscribing / unsubscribing per request is safe.
 *
 * @module
 */

export * from './browser-guard.js'
export * from './errors.js'
export * from './service.js'
export * from './types.js'
