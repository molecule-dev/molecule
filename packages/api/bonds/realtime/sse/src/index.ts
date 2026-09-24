/**
 * SSE (Server-Sent Events) realtime provider for molecule.dev.
 *
 * Provides a {@link RealtimeProvider} implementation using native Node.js
 * Server-Sent Events for server-to-client push, with HTTP POST for
 * client-to-server messages.
 *
 * - **Client wire protocol** (for hand-rolled clients): subscribe with
 *   `GET {path}` — the first stream event is `connected` `{ clientId }`; keep that
 *   `clientId`, every `POST {path}` body must include it (400 without it). Handshake
 *   auth for join guards = every subscribe query param except `room`/`rooms`, plus
 *   the `Authorization` header (as `auth.authorization`); auth is captured once at
 *   subscribe and reused for later POSTed joins. Join rooms at subscribe time with
 *   `?room=a&room=b` or later via `POST {clientId, event: 'molecule:join',
 *   data: {room}}` — the verdict (`molecule:joined`/`molecule:join-denied`) arrives
 *   on the STREAM; the POST itself acks `202`. `molecule:room-send` into a room the
 *   client hasn't joined is rejected `403`.
 * - **`broadcast()` throws** `Room "<id>" does not exist` when the room matches no
 *   managed room and no protocol room — and a protocol room ceases to exist when its
 *   last member leaves/disconnects. Guard server-side pushes accordingly (the
 *   `-socketio` bond silently no-ops instead).
 *
 * @example
 * ```typescript
 * import http from 'node:http'
 *
 * import { getLogger } from '@molecule/api-bond'
 * import { broadcast, onJoinRequest, onMessage, setProvider } from '@molecule/api-realtime'
 * import { createProvider } from '@molecule/api-realtime-sse'
 *
 * const logger = getLogger()
 *
 * // Startup: mount GET/POST /sse on the API's own HTTP server (shared port).
 * const server = http.createServer()
 * const realtime = createProvider({ httpServer: server, path: '/sse', corsOrigin: process.env.APP_ORIGIN })
 * setProvider(realtime)
 *
 * // Authorize joins. auth = the subscribe query params except room/rooms (+ Authorization header).
 * // Browser: new EventSource('/sse?token=token-ada&room=channel:general')
 * const sessionUserByToken = new Map([['token-ada', 'user-ada']]) // your session store
 * const channelMembers = new Map([['channel:general', new Set(['user-ada'])]])
 * onJoinRequest(({ room, auth }) => {
 *   const userId = sessionUserByToken.get(String(auth.token))
 *   return userId !== undefined && (channelMembers.get(room)?.has(userId) ?? false)
 * })
 *
 * // POST /sse { clientId, event: 'molecule:room-send', data: { room, event: 'chat', data } }
 * onMessage((roomId, clientId, event, data) => {
 *   if (event !== 'chat') return
 *   broadcast(roomId, 'chat', { from: clientId, text: data }).catch((error: unknown) => {
 *     logger.error('realtime chat broadcast failed', { roomId, error }) // throws for an empty room
 *   })
 * })
 *
 * server.listen(Number(process.env.PORT ?? 3000))
 * ```
 *
 * @remarks
 * - **`createProvider()` with NO `port`, NO `httpServer`, and NO
 *   `deferAttach` does NOT bind anything** — creating a provider must never
 *   bind a port as a side effect. It behaves exactly like `{ deferAttach:
 *   true }` (waits for `attachHttpServer(server)`), logging an info line so
 *   the omission is visible instead of silent. An **explicit** `port` still
 *   binds a standalone server immediately (unchanged, back-compat for
 *   existing standalone callers) — it just no longer happens by accident. A
 *   standalone bind failure (e.g. `EADDRINUSE`) is logged via the bonded
 *   logger naming this bond and the port, instead of crashing the process
 *   with an unattributed error.
 * - **`corsOrigin` defaults to `'*'` outside production.** In production
 *   (`NODE_ENV === 'production'`) it instead defaults to
 *   `process.env.APP_ORIGIN ?? process.env.SITE_ORIGIN` when either is set,
 *   so the realtime stream/message endpoints aren't exposed cross-origin by
 *   default; only when neither is configured does it fall back to `'*'`,
 *   logging a warning naming the risk. Set `corsOrigin` explicitly to
 *   override either way.
 * - **SSE is the only realtime bond that fits a serverless / no-persistent-server host**
 *   (e.g. Next.js App Router) — but `broadcast()` reaches only clients connected to THIS
 *   process; multi-instance deployments need sticky sessions or a pub/sub fan-out.
 * - Without a registered `onJoinRequest` guard, ANY subscriber may join ANY room by name.
 *
 * @module
 */

export * from './browser-guard.js'
export * from './provider.js'
export * from './types.js'
