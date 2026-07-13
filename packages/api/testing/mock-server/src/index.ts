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
 *   fixturesPath: './api/fixtures', // directory of *.json fixture files
 *   port: 4000,
 * })
 *
 * // Control state programmatically ('GET /accounts' and 'GET /api/accounts'
 * // are equivalent keys)
 * server.setState('GET /accounts', { state: 'error', statusCode: 500 })
 * server.setState('GET /transactions', { state: 'empty' })
 * server.setDefaultState('empty') // flips every endpoint at once
 *
 * // Teardown
 * await server.close()
 * ```
 *
 * @remarks
 * The server uses deterministic seeded PRNG for stable fixture data, making
 * screenshot comparisons reliable. Fixture data comes from the JSON files in
 * `fixturesPath` (array files become CRUD resources; `reports`/`storefront`/
 * `admin` object files become sub-endpoint groups).
 *
 * Omitting `fixturesPath` makes the server resolve
 * `mlcl/templates/apps/<appType>/api/fixtures/` by walking up from `process.cwd()`
 * — that only works inside the molecule workspace. In a scaffolded project,
 * always pass `fixturesPath`.
 *
 * Requests to `/api/*` paths with no matching fixture endpoint return an empty
 * success (`200 []` for GET) so pages still render — the response carries an
 * `X-Mock-Unmatched: true` header so a typo'd endpoint can be told apart from
 * an endpoint that legitimately returned empty data. Similarly, an invalid
 * `?_state`/`X-Mock-State` value is ignored (the default state is served) but
 * labeled with an `X-Mock-Invalid-State` response header, so a typo'd state
 * control is detectable instead of silently looking like "state applied".
 *
 * @module
 */

export * from './fixtures/index.js'
export * from './scanner/index.js'
export * from './server/index.js'
export * from './states/index.js'
export * from './types.js'
