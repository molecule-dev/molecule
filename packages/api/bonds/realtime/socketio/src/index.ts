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
 *
 * @module
 * @example
 * ```typescript
 * import { createProvider } from '@molecule/api-realtime-socketio'
 * import { setProvider } from '@molecule/api-realtime'
 * import http from 'node:http'
 *
 * const server = http.createServer()
 * const realtimeProvider = createProvider({ httpServer: server })
 * setProvider(realtimeProvider)
 *
 * server.listen(3000)
 * ```
 */

export * from './browser-guard.js'
export * from './provider.js'
export * from './types.js'
