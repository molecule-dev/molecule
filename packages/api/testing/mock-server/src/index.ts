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
 * // Undo an endpoint override so ?_state / the default control it again —
 * // setState(key, { state: 'success' }) is NOT the same thing (see @remarks)
 * server.clearState('GET /accounts')
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
 * State precedence, per request, highest first: (1) an endpoint-level
 * `server.setState(key, state)` override, (2) a per-request `?_state` query
 * param / `X-Mock-State` header, (3) `server.setDefaultState(...)` / the
 * configured `defaultState`. A `setState()` override is PERSISTENT — a
 * forgotten override from an earlier test silently beats every later
 * `?_state` on that same endpoint. Calling `setState(key, { state: 'success'
 * })` again does NOT remove the override (it replaces it with one that looks
 * like the default, still outranking `?_state`); call `server.clearState(key)`
 * to actually remove it and hand control back to per-request/default state.
 * `setDefaultState()` only changes the fallback and never clears endpoint
 * overrides.
 *
 * Response delay (`defaultDelay`, `?_delay`/`X-Mock-Delay`, or a `delay` in
 * `setState`/`setDefaultState`) is capped at `MAX_MOCK_DELAY_MS` (60s) — an
 * oversized value (e.g. a units mistake applying `*1000` twice) is clamped
 * and logged with `console.warn` instead of hanging the request until the
 * client gives up, which in an E2E harness reads as an inexplicable page
 * timeout rather than a mock misconfiguration.
 *
 * @module
 */

export * from './fixtures/index.js'
export * from './scanner/index.js'
export * from './server/index.js'
export * from './states/index.js'
export * from './types.js'
