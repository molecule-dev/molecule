/**
 * SSE (Server-Sent Events) realtime provider for molecule.dev.
 *
 * Provides a {@link RealtimeProvider} implementation using native Node.js
 * Server-Sent Events for server-to-client push, with HTTP POST for
 * client-to-server messages.
 *
 * @module
 * @example
 * ```typescript
 * import http from 'node:http'
 * import { createProvider } from '@molecule/api-realtime-sse'
 * import { setProvider } from '@molecule/api-realtime'
 *
 * // Attach the SSE endpoints to the API's own HTTP server so realtime
 * // shares the API port (a standalone `port` binds a SECOND port that a
 * // containerized/proxied deployment usually does not expose — and the
 * // default port 3000 collides with the typical API port).
 * const server = http.createServer()
 * const sseProvider = createProvider({ httpServer: server, path: '/sse' })
 *
 * // Bond it as the active realtime provider
 * setProvider(sseProvider)
 *
 * server.listen(3000)
 *
 * // When the HTTP server doesn't exist yet at wiring time (e.g. a server
 * // factory that creates it later), defer instead of passing httpServer:
 * // const sseProvider = createProvider({ deferAttach: true, path: '/sse' })
 * // setProvider(sseProvider)
 * // // once the server exists (e.g. a server-created hook):
 * // sseProvider.attachHttpServer(server)
 * ```
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
 */

export * from './browser-guard.js'
export * from './provider.js'
export * from './types.js'
