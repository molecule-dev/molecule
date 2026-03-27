/**
 * HTTP webhook provider for molecule.dev.
 *
 * Implements the `@molecule/api-webhook` interface using direct HTTP POST
 * delivery with HMAC signature verification and automatic retries.
 *
 * @module
 * @example
 * ```typescript
 * import { setProvider } from '@molecule/api-webhook'
 * import { createProvider } from '@molecule/api-webhook-http'
 *
 * // Bond at startup
 * setProvider(createProvider())
 *
 * // Or with custom configuration
 * setProvider(createProvider({
 *   timeout: 10_000,
 *   retryCount: 5,
 *   retryDelay: 2000,
 * }))
 * ```
 */

export * from './provider.js'
export * from './types.js'
