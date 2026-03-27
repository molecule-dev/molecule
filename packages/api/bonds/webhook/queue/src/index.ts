/**
 * Queue-backed webhook provider for molecule.dev.
 *
 * Implements the `@molecule/api-webhook` interface using an internal job queue
 * with exponential backoff retries and configurable concurrency.
 *
 * @module
 * @example
 * ```typescript
 * import { setProvider } from '@molecule/api-webhook'
 * import { createProvider } from '@molecule/api-webhook-queue'
 *
 * // Bond at startup
 * setProvider(createProvider())
 *
 * // Or with custom configuration
 * setProvider(createProvider({
 *   maxRetries: 10,
 *   baseDelay: 2000,
 *   concurrency: 5,
 * }))
 * ```
 */

export * from './provider.js'
export * from './types.js'
