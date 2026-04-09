/**
 * Mock API server with deterministic fixture data for testing, screenshots, and E2E.
 *
 * Provides a lightweight Express server that serves realistic fixture responses
 * for any molecule app type. Supports per-request state control via query params
 * and headers for testing success, empty, error, and unauthorized states.
 *
 * @example
 * ```typescript
 * import { createMockServer } from '@molecule/api-mock-server'
 *
 * const server = await createMockServer({
 *   appType: 'personal-finance',
 *   port: 4000,
 * })
 *
 * // Control state programmatically
 * server.setState('GET /accounts', { state: 'error', statusCode: 500 })
 * server.setState('GET /transactions', { state: 'empty' })
 *
 * // Teardown
 * await server.close()
 * ```
 *
 * @remarks
 * The server uses deterministic seeded PRNG for stable fixture data, making
 * screenshot comparisons reliable. Each app type has curated, realistic data
 * pools (e.g., real bank names, merchant descriptions, product catalogs).
 *
 * @module
 */

export * from './types.js'
export * from './fixtures/index.js'
export * from './scanner/index.js'
export * from './server/index.js'
export * from './states/index.js'
