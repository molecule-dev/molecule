/**
 * Socket.io realtime client provider for molecule.dev.
 *
 * Provides a headless Socket.io-style state manager for realtime connections,
 * with rooms, presence, event buffering, and reconnection support. Bond this
 * provider at startup, then use the core `@molecule/app-realtime` API anywhere.
 *
 * @example
 * ```typescript
 * import { setProvider } from '@molecule/app-realtime'
 * import { provider } from '@molecule/app-realtime-socketio'
 *
 * setProvider(provider)
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
 * @module
 */

export * from './provider.js'
export * from './types.js'
