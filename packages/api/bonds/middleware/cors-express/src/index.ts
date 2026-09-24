/**
 * Express CORS provider for molecule.dev.
 *
 * @example
 * ```typescript
 * import express from 'express'
 *
 * import { cors, setCors, setCorsFactory } from '@molecule/api-middleware-cors'
 * import { corsFactory, provider } from '@molecule/api-middleware-cors-express'
 *
 * // Startup: wire BOTH setters. Env: APP_ORIGIN (e.g. https://app.example.com), SITE_ORIGIN.
 * setCors(provider)
 * setCorsFactory(corsFactory)
 *
 * const app = express()
 * app.use(cors) // BEFORE the routes — it also answers OPTIONS preflights (204)
 *
 * app.get('/api/items', (req, res) => {
 *   res.json([{ id: 1, name: 'Desk' }])
 * })
 *
 * app.listen(Number(process.env.PORT ?? 4000))
 * // Origin: https://app.example.com → Access-Control-Allow-Origin: https://app.example.com
 * //                                   Access-Control-Allow-Credentials: true
 * // Origin: https://evil.example    → no Access-Control-Allow-Origin (the browser blocks it)
 * ```
 *
 * @remarks
 * - **Wire BOTH setters** (as in the example) — wiring only the factory leaves
 *   the core `cors` middleware throwing "not configured".
 * - Default allowlist (never `*`): `APP_ORIGIN`, `SITE_ORIGIN`,
 *   `capacitor://localhost`, `capacitor-electron://-`, `${APP_URL_SCHEME}://-`,
 *   plus `http(s)://localhost:<port>` in NON-production only. **In production
 *   you MUST set `APP_ORIGIN` (and/or `SITE_ORIGIN`)** or every browser
 *   cross-origin request fails with an opaque CORS error.
 * - A disallowed origin is NOT rejected server-side — the route still runs and
 *   answers; only the CORS headers are withheld so the BROWSER blocks the read.
 *   CORS is not access control; authenticate requests separately.
 * - The origin list is built ONCE, on the first request through the middleware
 *   — changing the env vars requires a restart.
 * - Responses are credentialed (`credentials: true`) and expose the
 *   `authorization` (+ legacy `set-authorization`) headers so a cross-origin
 *   app can read the bearer token set by the OAuth exchange.
 * - `corsFactory(options)` bypasses the default allowlist entirely — you own
 *   the whole policy when you use it.
 *
 * @module
 */

export * from './browser-guard.js'
export * from './provider.js'
