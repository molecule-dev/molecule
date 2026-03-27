/**
 * Realtime client core interface for molecule.dev.
 *
 * Provides a framework-agnostic contract for WebSocket / SSE client connections
 * with rooms, presence tracking, events, and automatic reconnection. Bond a
 * provider (e.g. `@molecule/app-realtime-socketio`) at startup, then use
 * {@link connect} anywhere.
 *
 * @example
 * ```typescript
 * import { setProvider, connect } from '@molecule/app-realtime'
 * import { provider } from '@molecule/app-realtime-socketio'
 *
 * setProvider(provider)
 *
 * const connection = await connect('wss://api.example.com', {
 *   autoReconnect: true,
 *   auth: { token: 'my-jwt' },
 * })
 *
 * await connection.joinRoom('chat-room-1')
 * connection.on('message', (data) => console.log('Received:', data))
 * connection.sendTo('chat-room-1', 'message', { text: 'Hello!' })
 * ```
 *
 * @module
 */

export * from './provider.js'
export * from './types.js'
