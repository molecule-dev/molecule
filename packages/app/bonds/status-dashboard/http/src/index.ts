/**
 * HTTP status dashboard provider for molecule.dev.
 *
 * Implements `StatusDashboardProvider` from `@molecule/app-status-dashboard` by
 * fetching status data from the backend over plain HTTP, with automatic polling.
 * Pairs with `@molecule/api-resource-status-page`, which serves the expected
 * endpoints: `GET /status`, `GET /status/incidents`, and `GET /status/uptime`.
 *
 * @example
 * ```typescript
 * import { setProvider } from '@molecule/app-status-dashboard'
 * import { createProvider } from '@molecule/app-status-dashboard-http'
 *
 * setProvider(createProvider({ baseUrl: '/api' }))
 * // Now GET /api/status, /api/status/incidents?status=&limit=,
 * // /api/status/uptime?serviceId= back the dashboard.
 * ```
 *
 * @remarks
 * - **The backend must serve the three endpoints** (`/status`,
 *   `/status/incidents`, `/status/uptime`) relative to `baseUrl` — responses are
 *   `SystemStatus`, `{ incidents: StatusIncident[] }`, and
 *   `{ uptime: ServiceUptime[] }` respectively. `@molecule/api-resource-status-page`
 *   provides them.
 * - **Error semantics differ per method**: `fetchStatus()` throws on non-2xx;
 *   `fetchIncidents()`/`fetchUptime()` return `[]` on ANY failure — an empty
 *   incidents list can mean "endpoint missing", not "all clear". Verify `/status`
 *   works first.
 * - Polling defaults to every 30 s (`pollIntervalMs`), fetches immediately, and
 *   swallows per-tick errors (next tick retries). Keep the stop function returned by
 *   `startPolling()` and call it on unmount; `stopPolling()` cancels everything.
 * - Per-call `config.apiBaseUrl`/`headers` override/merge over the constructor's
 *   `baseUrl`/`headers`.
 *
 * @module
 */

export * from './provider.js'
export * from './types.js'

import { createProvider } from './provider.js'

/** Pre-instantiated provider singleton. */
export const provider = createProvider()
