/**
 * API request-metrics middleware for molecule.dev.
 *
 * Tracks every request as an `api.request` analytics event — method, path,
 * status code, and duration — via the bonded analytics provider
 * (`getAnalytics()` from `@molecule/api-bond`), emitting on the response
 * `finish` event.
 *
 * @example
 * ```ts
 * import express from 'express'
 * import { createAnalyticsMiddleware } from '@molecule/api-middleware-analytics'
 *
 * const app = express()
 * app.use(createAnalyticsMiddleware({ excludePaths: ['/health', '/metrics'] }))
 * ```
 *
 * @remarks
 * - An analytics provider must be bonded (`bond('analytics', provider)` —
 *   e.g. `@molecule/api-analytics-posthog` or `-mixpanel`) for events to go
 *   anywhere. Without one the middleware still runs but every track call is
 *   a silent no-op — requests flow, metrics never appear. Wiring later is
 *   fine: the provider is resolved lazily on each event.
 * - `excludePaths` entries are EXACT matches against `req.path` (falling
 *   back to `req.url`) — no prefixes or globs (`'/health'` does not exclude
 *   `/health/live`).
 * - Tracking is fire-and-forget; a failing analytics backend never blocks or
 *   fails the request.
 *
 * @module
 */

export * from './browser-guard.js'
export * from './middleware.js'
export * from './types.js'
