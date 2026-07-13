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
 * ```
 */

export * from './provider.js'
export * from './types.js'
