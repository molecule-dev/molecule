/**
 * Raw WebSocket (`ws`) realtime provider for molecule.dev.
 *
 * Provides a `ws`-backed implementation of the
 * `@molecule/api-realtime` {@link RealtimeProvider} interface.
 *
 * @module
 * @example
 * ```typescript
 * import { createProvider } from '@molecule/api-realtime-ws'
 * import { setProvider } from '@molecule/api-realtime'
 * import http from 'node:http'
 *
 * const server = http.createServer()
 * const realtimeProvider = createProvider({ httpServer: server })
 * setProvider(realtimeProvider)
 *
 * server.listen(3000)
 * ```
 * @remarks
 * - **`createProvider()` with NO `port`, NO `httpServer`, and NO
 *   `deferAttach` does NOT bind anything** — creating a provider must never
 *   bind a port as a side effect. It behaves exactly like `{ deferAttach:
 *   true }` (waits for `attachHttpServer(server)`), logging an info line so
 *   the omission is visible instead of silent. An **explicit** `port` still
 *   binds a standalone server immediately (unchanged, back-compat for
 *   existing standalone callers) — it just no longer happens by accident. In
 *   a real deployment prefer deferring and attaching once the API's HTTP
 *   server exists:
 *   ```typescript
 *   const realtimeProvider = createProvider({ deferAttach: true })
 *   setProvider(realtimeProvider)
 *   // once the API's http.Server exists (e.g. a server-created hook):
 *   realtimeProvider.attachHttpServer(server)
 *   ```
 *   so `ws` shares the API's port instead of a separate one. A standalone
 *   bind failure (e.g. `EADDRINUSE`) is logged via the bonded logger naming
 *   this bond and the port, instead of crashing the process with an
 *   unattributed error.
 */

export * from './browser-guard.js'
export * from './provider.js'
export * from './types.js'
