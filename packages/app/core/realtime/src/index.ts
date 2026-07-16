/**
 * Realtime client core interface for molecule.dev.
 *
 * Provides a framework-agnostic contract for WebSocket / SSE client connections
 * with rooms, presence tracking, events, and automatic reconnection. Bond a
 * provider (e.g. `@molecule/app-realtime-socketio`) at startup, then use
 * {@link connect} anywhere.
 *
 * @example
 * ```typescript
 * import { setProvider, connect } from '@molecule/app-realtime'
 * import { provider } from '@molecule/app-realtime-socketio'
 *
 * setProvider(provider)
 *
 * const connection = await connect('wss://api.example.com', {
 *   autoReconnect: true,
 *   auth: { token: 'my-jwt' },
 * })
 *
 * await connection.joinRoom('chat-room-1')
 * connection.on('message', (data) => console.log('Received:', data))
 * connection.sendTo('chat-room-1', 'message', { text: 'Hello!' })
 * ```
 *
 * @remarks
 * - **The client needs a realtime SERVER counterpart.** Wire the matching bond
 *   pair across the stack — e.g. `@molecule/app-realtime-socketio` in the app
 *   with `@molecule/api-realtime-socketio` in the API — and connect to YOUR
 *   API's URL. A client bond alone has nothing to connect to.
 * - **Clean up on unmount/screen change.** Registering `on(event, handler)` in
 *   a render/effect without the matching `off(event, handler)` (plus
 *   `leaveRoom`/`disconnect`) re-registers on every re-render — events then
 *   fire N times.
 * - Anything a client `send`s is UNTRUSTED server-side: the API must validate
 *   and authorize every event (room membership, ownership) — never trust
 *   client-supplied ids or roles.
 * - Pass credentials via `ConnectionOptions.auth` at connect time, never in
 *   the URL query string (URLs leak into logs).
 *
 * @e2e
 * Integration checklist — drive the real UI (live preview, no mocks), adapt
 * each item to this app's actual screens/flows, and check every box off one
 * by one. A box you can't check is an integration bug to fix — not a skip:
 * - [ ] The client connects when the relevant screen loads (no connection
 *   errors in the console) and live data renders without a manual reload.
 * - [ ] Two sessions in the same room see each other's messages/updates appear
 *   live (within about a second).
 * - [ ] Presence indicators (if surfaced) update when a participant joins or
 *   leaves.
 * - [ ] After a dropped connection (offline/online toggle), the client
 *   auto-reconnects, the UI's connection state (if shown) is truthful, and
 *   live updates resume.
 * - [ ] Leaving a room/screen stops that room's events from affecting the UI.
 *
 * @module
 */

export * from './provider.js'
export * from './types.js'
