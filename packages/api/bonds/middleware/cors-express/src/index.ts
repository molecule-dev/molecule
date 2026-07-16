/**
 * Express CORS provider for molecule.dev.
 *
 * @example
 * ```typescript
 * import { setCors, setCorsFactory } from '@molecule/api-middleware-cors'
 * import { provider, corsFactory } from '@molecule/api-middleware-cors-express'
 *
 * setCors(provider)
 * setCorsFactory(corsFactory)
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
