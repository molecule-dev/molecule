/**
 * Default AI assistant provider for molecule.dev.
 *
 * Uses HTTP/SSE for streaming responses with built-in panel state
 * management, context awareness, and session persistence.
 *
 * @module
 */

export * from './provider.js'
export * from './types.js'

import { createProvider } from './provider.js'

/** Pre-instantiated provider singleton. */
export const provider = createProvider()
