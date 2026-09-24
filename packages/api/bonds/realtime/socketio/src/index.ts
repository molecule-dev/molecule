/**
 * Socket.io realtime provider for molecule.dev.
 *
 * Provides a Socket.io-backed implementation of the
 * `@molecule/api-realtime` {@link RealtimeProvider} interface.
 *
 * @remarks
 * - **Zero-config `createProvider()` BINDS a standalone Socket.io server immediately**
 *   on `SOCKETIO_PORT`, else `PORT + 1000`, else `3000` — unlike the `-sse`/`-ws`
 *   bonds, which never bind without an explicit `port`/`httpServer`. In a real
 *   deployment pass `{ httpServer }`, or `{ deferAttach: true }` +
 *   `provider.attachHttpServer(server)` once the API's HTTP server exists, so
 *   Socket.io shares the API port at `/socket.io/` instead of a standalone port a
 *   container/proxy may not expose.
 * - **`broadcast()` to a room with no members (or that never existed) is a safe
 *   no-op** — native Socket.io emit semantics. The `-sse`/`-ws` bonds THROW for a
 *   room that doesn't exist; don't rely on the silent behavior if the app might swap
 *   transports.
 * - Protocol rooms are native Socket.io rooms keyed by NAME — the same namespace
 *   `broadcast(roomId, …)` emits to, so `broadcast('channel:x', …)` reaches
 *   protocol-joined clients directly. The guard's `auth` payload is the client's
 *   `socket.handshake.auth`.
 * - **Cross-origin browsers need CORS** — Socket.io v4 allows none by default and this bond
 *   adds none. When the app is served from another origin than the API, pass
 *   `serverOptions: { cors: { origin, credentials: true } }`.
 * - Without a registered `onJoinRequest` guard, ANY connected client may join ANY room by name.
 *
 * @example
 * ```typescript
 * import http from 'node:http'
 *
 * import { getLogger } from '@molecule/api-bond'
 * import { broadcast, onJoinRequest, onMessage, setProvider } from '@molecule/api-realtime'
 * import { createProvider } from '@molecule/api-realtime-socketio'
 *
 * const logger = getLogger()
 *
 * // Startup: share the API's HTTP server (served at /socket.io/) instead of a standalone port.
 * const server = http.createServer()
 * const realtime = createProvider({
 *   deferAttach: true,
 *   serverOptions: { cors: { origin: process.env.APP_ORIGIN, credentials: true } },
 * })
 * setProvider(realtime)
 * realtime.attachHttpServer?.(server)
 *
 * // Authorize `molecule:join` { room }. auth = the client's `io(url, { auth: { token } })`.
 * const sessionUserByToken = new Map([['token-ada', 'user-ada']]) // your session store
 * const channelMembers = new Map([['channel:general', new Set(['user-ada'])]])
 * onJoinRequest(({ room, auth }) => {
 *   const userId = sessionUserByToken.get(String(auth.token))
 *   return userId !== undefined && (channelMembers.get(room)?.has(userId) ?? false)
 * })
 *
 * // A client's `molecule:room-send` { room, event, data } lands here; fan it out to the room.
 * onMessage((roomId, clientId, event, data) => {
 *   if (event !== 'chat') return
 *   broadcast(roomId, 'chat', { from: clientId, text: data }).catch((error: unknown) => {
 *     logger.error('realtime chat broadcast failed', { roomId, error })
 *   })
 * })
 *
 * server.listen(Number(process.env.PORT ?? 3000))
 * ```
 *
 * @module
 */

export * from './browser-guard.js'
export * from './provider.js'
export * from './types.js'
