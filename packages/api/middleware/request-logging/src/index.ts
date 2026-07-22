/**
 * HTTP request-logging middleware for molecule.dev.
 *
 * Emits one structured log record per request — method, path, status code,
 * and duration — through the bonded `@molecule/api-logger` (pino, winston,
 * console, …), on the response `finish` event. Severity follows the status
 * code: 5xx logs at `error`, 4xx at `warn`, the rest at `info`.
 *
 * @example
 * ```ts
 * import express from 'express'
 * import { createRequestLoggingMiddleware } from '@molecule/api-middleware-request-logging'
 *
 * const app = express()
 * // Mount BEFORE the router so every routed request is timed end-to-end.
 * app.use(createRequestLoggingMiddleware({
 *   excludePaths: ['/health'],
 *   resolveFields: (req) => ({ requestId: (req as { headers?: Record<string, string> }).headers?.['x-request-id'] }),
 * }))
 * ```
 *
 * @remarks
 * - This is the LOGGING complement to `@molecule/api-middleware-analytics`
 *   (which tracks request METRICS into the analytics provider). They compose;
 *   mount both if you want logs AND metrics.
 * - `excludePaths` entries are EXACT matches against `req.path` (falling
 *   back to `req.url`) — no prefixes or globs (`'/health'` does not exclude
 *   `/health/live`). Default: `['/health']` so the load-balancer probe does
 *   not flood the log.
 * - Logging happens on `finish`, so a handler that never ends the response
 *   (a hung stream) logs nothing — that is the signal you want, not a bug.
 * - Records go through the shared `logger` from `@molecule/api-logger`; the
 *   core's level gate (`LOG_LEVEL`, default `info`) applies, and the bonded
 *   provider decides the wire format (JSON for pino/winston).
 * - Never put secrets in `resolveFields` output (no authorization headers,
 *   cookies, tokens) — request logs are shipped to log stores with broad
 *   reader access.
 *
 * @module
 */

export * from './browser-guard.js'
export * from './middleware.js'
export * from './types.js'
