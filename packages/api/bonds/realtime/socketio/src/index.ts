/**
 * Socket.io realtime provider for molecule.dev.
 *
 * Provides a Socket.io-backed implementation of the
 * `@molecule/api-realtime` {@link RealtimeProvider} interface.
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

export * from './provider.js'
export * from './types.js'
