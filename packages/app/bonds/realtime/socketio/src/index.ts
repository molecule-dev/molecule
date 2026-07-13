/**
 * Socket.io realtime client provider for molecule.dev.
 *
 * A real socket.io-client transport implementing `RealtimeClientProvider`
 * from `@molecule/app-realtime`: rooms, presence, event buffering, and
 * reconnect-rejoin over a live Socket.io connection. The matching server
 * bond (`@molecule/api-realtime-socketio`) attaches a Socket.io Server to
 * the API's HTTP server at `/socket.io`, so client and server share one
 * port.
 *
 * URL convention: `connect('')` or `connect('/')` connects same-origin
 * (`io()` with no URL — in dev, Vite proxies `/socket.io` to the API); an
 * absolute URL connects directly to that server. `ConnectionOptions.auth`
 * is passed through as the socket.io handshake `auth` payload, which the
 * server evaluates in its room join guards.
 *
 * Reserved protocol events (client → server `molecule:join` /
 * `molecule:leave` / `molecule:room-send`, server → client
 * `molecule:joined` / `molecule:left` / `molecule:join-denied` /
 * `molecule:presence`) are handled internally and never dispatched to
 * app-level `on()` handlers. Rooms are keyed by name (arbitrary string,
 * e.g. `'channel:<uuid>'`).
 *
 * @example
 * ```typescript
 * import { setProvider, getProvider } from '@molecule/app-realtime'
 * import { provider } from '@molecule/app-realtime-socketio'
 *
 * setProvider(provider)
 *
 * // connect() resolves immediately (state 'connecting') — never blocks the UI.
 * const connection = await getProvider().connect('/', {
 *   auth: { token: authToken },
 * })
 *
 * // Resolves when the server confirms; rejects with the reason if denied.
 * await connection.joinRoom('channel:general')
 *
 * connection.on('message:created', (data) => {
 *   console.log('new message', data)
 * })
 * connection.sendTo('channel:general', 'message:created', { body: 'hi' })
 *
 * // Or with custom configuration:
 * import { createSocketioProvider } from '@molecule/app-realtime-socketio'
 *
 * setProvider(createSocketioProvider({
 *   transports: ['websocket'],
 *   bufferEvents: true,
 *   maxBufferSize: 200,
 * }))
 * ```
 *
 * @remarks
 * - `joinRoom()` promises are deferred while disconnected: the join is
 *   emitted on (re)connect and the promise stays pending until the server
 *   confirms with `molecule:joined` (or rejects it via
 *   `molecule:join-denied`). Don't `await` a join as a startup gate if the
 *   server may be unreachable.
 * - `sendTo(room, ...)` only reaches other clients if THIS client has
 *   protocol-joined the room (`joinRoom()` confirmed) — the server drops
 *   room sends from non-members.
 * - Vite dev servers need a `/socket.io` websocket proxy to the API —
 *   `@molecule/app-vite-config-default` provides it; without it, same-origin
 *   (`'/'`) connections fail in dev.
 * - Events sent while disconnected are buffered (default 100 max) and
 *   flushed in order on (re)connect; beyond the cap (or with
 *   `bufferEvents: false`) they are silently dropped.
 * - `disconnect()` is terminal for the connection object: it tears down the
 *   socket and rejects pending joins. Create a new connection via the
 *   provider to reconnect.
 * - `onPresenceChange(handler)` registers ONE handler that fires for EVERY
 *   joined room's presence update, so `handler`'s second argument (`roomId`)
 *   is which room the update is FOR — a consumer joined to more than one
 *   room must branch on it (e.g. `if (roomId === activeRoomId) render(...)`)
 *   instead of assuming the update is always for "the" room.
 *
 * @module
 */

export * from './provider.js'
export * from './types.js'
