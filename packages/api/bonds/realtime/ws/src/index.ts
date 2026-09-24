/**
 * Raw WebSocket (`ws`) realtime provider for molecule.dev.
 *
 * Provides a `ws`-backed implementation of the
 * `@molecule/api-realtime` {@link RealtimeProvider} interface.
 *
 * @remarks
 * - **`broadcast()` throws** `Room "<id>" does not exist` when the room matches no
 *   managed room and no protocol room — a protocol room ceases to exist when its last
 *   member leaves/disconnects, so a push to a room nobody is viewing is an ERROR here
 *   (the `-socketio` bond silently no-ops instead) — `.catch()` it. Reserved protocol
 *   frames use the same JSON framing: `{ event: 'molecule:join' | 'molecule:leave' |
 *   'molecule:room-send', data: { room, … } }`.
 * - **`createProvider()` with NO `port`, NO `httpServer`, and NO
 *   `deferAttach` does NOT bind anything** — creating a provider must never
 *   bind a port as a side effect. It behaves exactly like `{ deferAttach:
 *   true }` (waits for `attachHttpServer(server)`), logging an info line so
 *   the omission is visible instead of silent — no error, just no connections.
 *   An **explicit** `port` still binds a standalone server immediately. In a real
 *   deployment defer and attach once the API's HTTP server exists (as below), so
 *   `ws` shares the API's port. A standalone bind failure (e.g. `EADDRINUSE`) is
 *   logged via the bonded logger naming this bond and the port.
 * - **Handshake `auth` is the upgrade URL's QUERY PARAMS** (`ws://host/?token=…`) —
 *   browsers cannot set headers on a WebSocket; cookies arrive in `headers.cookie`.
 * - Without a registered `onJoinRequest` guard, ANY connected client may join ANY room by name.
 *
 * @example
 * ```typescript
 * import http from 'node:http'
 *
 * import { getLogger } from '@molecule/api-bond'
 * import { broadcast, onJoinRequest, onMessage, setProvider } from '@molecule/api-realtime'
 * import { createProvider } from '@molecule/api-realtime-ws'
 *
 * const logger = getLogger()
 *
 * // Startup: bond the provider, then attach it to the API's HTTP server (shared port).
 * const server = http.createServer()
 * const realtime = createProvider({ deferAttach: true })
 * setProvider(realtime)
 * realtime.attachHttpServer?.(server)
 *
 * // Authorize `molecule:join` { room } — with NO guard, EVERY join is allowed.
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
