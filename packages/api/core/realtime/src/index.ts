/**
 * Realtime core interface for molecule.dev.
 *
 * Defines the standard interface for real-time communication providers
 * (WebSocket, SSE, Socket.io, etc.), including the client-initiated room-join
 * protocol with pluggable authorization.
 *
 * ## Client-initiated room-join protocol
 *
 * Connected clients join rooms **by name** (any string, e.g.
 * `channel:<uuid>`) with the reserved `molecule:join` event
 * (payload `{ room }`). The server replies `molecule:joined` `{ room }` on
 * success or `molecule:join-denied` `{ room, reason? }` on rejection, sends
 * `molecule:leave` acks as `molecule:left` `{ room }`, and emits
 * `molecule:presence` `{ room, presence: [{ clientId }] }` to the room on
 * every join/leave/disconnect. Clients send app messages into a joined room
 * with `molecule:room-send` `{ room, event, data }`, which dispatches to
 * server `onMessage` handlers. Protocol room names live in the same
 * namespace `broadcast(roomId, ...)` uses, so server code pushes to a
 * protocol room by its name. The managed `createRoom()`/`joinRoom()` API
 * (server-driven, `room_N` ids) is unchanged and coexists.
 *
 * Authorization is pluggable via {@link onJoinRequest} guards: no guards →
 * every join is allowed; multiple guards → ALL must return `true` (AND); a
 * guard that throws → the join is denied (the bond logs the error).
 *
 * @module
 * @example
 * ```typescript
 * import { setProvider, createRoom, broadcast, onMessage, onJoinRequest } from '@molecule/api-realtime'
 *
 * // Bond a provider at startup
 * setProvider(socketioProvider)
 *
 * // Authorize client-initiated joins (REQUIRED for apps with private rooms)
 * onJoinRequest(async ({ clientId, room, auth }) => {
 *   const userId = await verifyToken(auth.token)
 *   return userId !== undefined && (await canAccessRoom(userId, room))
 * })
 *
 * // Push to a client-joined room by NAME
 * await broadcast('channel:general', 'message', { text: 'Hello!' })
 *
 * // Managed (server-driven) rooms still work unchanged
 * const room = await createRoom('chat')
 * await broadcast(room.id, 'message', { text: 'Hello!' })
 *
 * // Listen for incoming messages (including molecule:room-send dispatches)
 * onMessage((roomId, clientId, event, data) => {
 *   console.log(`${clientId} sent ${event} in ${roomId}:`, data)
 * })
 * ```
 * @remarks
 * - **Pick the provider by your host's server model (read this FIRST).** SSE
 *   (`@molecule/api-realtime-sse`) is HTTP-native: it streams from an ordinary
 *   route/endpoint and needs NO long-lived socket server, so it is the ONLY
 *   realtime that fits a serverless / no-persistent-server host — e.g. **Next.js
 *   App Router** or edge. There, mount its endpoint in a route handler and
 *   publish from server code (Next's `instrumentation.ts` runs at server start).
 *   Reach for WS (`-ws`) or Socket.io (`-socketio`) ONLY where you own a
 *   persistent Node server (a standalone process, or a separate API on its own
 *   port). Do NOT bolt a WS/Socket.io server onto Next.js App Router with a
 *   custom `server.ts` — you give up Next's managed server and fight its
 *   lifecycle. The interface below is identical for every provider; only the
 *   bond and where you attach its transport change.
 * - **Without a registered join guard ANY connected client may join ANY room
 *   by name** — apps with private rooms MUST register `onJoinRequest` and
 *   validate the request's `auth` payload (e.g. verify a token grants access
 *   to `request.room`). `auth` is the client's handshake auth (Socket.io:
 *   `socket.handshake.auth`; ws/SSE: connection query params).
 * - `onJoinRequest` (like `onMessage`/`onConnection`) is buffered when called
 *   before a provider is bonded and flushed on `setProvider()` — safe to call
 *   in postBondsSetup.
 * - `molecule:room-send` only dispatches to server `onMessage` handlers —
 *   there is NO automatic relay to the room. Server code decides what (if
 *   anything) to `broadcast` back.
 * - Reserved `molecule:*` events are never dispatched to `onMessage`.
 * - `RealtimeProvider.onJoinRequest` is optional: providers whose transport
 *   has no client-initiated join path (e.g. the yjs bond with its injected
 *   transport) leave it undefined, and guards registered against them are
 *   logged as unenforceable rather than silently dropped.
 *
 * @e2e
 * Integration checklist — drive the real UI (live preview, no mocks), adapt
 * each item to this app's actual screens/flows, and check every box off one
 * by one. A box you can't check is an integration bug to fix — not a skip:
 * - [ ] With the app open in TWO sessions (separate browser contexts/users), an
 *   action in one (send a message, update a shared record) appears in the
 *   other WITHOUT a manual reload.
 * - [ ] Updates reach only the sessions in the same room/scope — a session
 *   viewing a different room/record receives nothing.
 * - [ ] Private rooms enforce the join guard: an unauthorized session's join is
 *   denied and no data leaks to it. If ANY client can join any private room,
 *   `onJoinRequest` was never registered — an integration bug.
 * - [ ] Presence (if surfaced) updates when a participant joins and leaves.
 * - [ ] After a dropped connection (offline/online toggle or server restart),
 *   the client reconnects and live events flow again.
 */

export * from './browser-guard.js'
export * from './provider.js'
export * from './realtime.js'
export * from './types.js'
