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
 * import { createProvider } from '@molecule/api-realtime-sse'
 * import { setProvider } from '@molecule/api-realtime'
 *
 * // Create an SSE-backed realtime provider
 * const sseProvider = createProvider({ port: 3000, path: '/sse' })
 *
 * // Bond it as the active realtime provider
 * setProvider(sseProvider)
 * ```
 */

export * from './provider.js'
export * from './types.js'
