/**
 * Realtime core interface for molecule.dev.
 *
 * Defines the standard interface for real-time communication providers
 * (WebSocket, SSE, Socket.io, etc.).
 *
 * @module
 * @example
 * ```typescript
 * import { setProvider, createRoom, broadcast, onMessage } from '@molecule/api-realtime'
 *
 * // Bond a provider at startup
 * setProvider(socketioProvider)
 *
 * // Create a room and broadcast messages
 * const room = await createRoom('chat')
 * await broadcast(room.id, 'message', { text: 'Hello!' })
 *
 * // Listen for incoming messages
 * onMessage((roomId, clientId, event, data) => {
 *   console.log(`${clientId} sent ${event} in ${roomId}:`, data)
 * })
 * ```
 */

export * from './provider.js'
export * from './realtime.js'
export * from './types.js'
