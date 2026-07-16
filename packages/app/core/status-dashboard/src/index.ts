/**
 * Status dashboard core interface for molecule.dev.
 *
 * Framework-agnostic contract for status pages / uptime dashboards: fetching
 * system status, incidents, and per-service uptime windows, plus polling with
 * change callbacks. Bond a provider (e.g. `@molecule/app-status-dashboard-http`,
 * which reads a status REST API) at startup, then call {@link requireProvider}
 * anywhere.
 *
 * @example
 * ```typescript
 * import { requireProvider, setProvider } from '@molecule/app-status-dashboard'
 * import { provider } from '@molecule/app-status-dashboard-http'
 *
 * setProvider(provider) // once, at startup (bonds.ts)
 *
 * const dashboard = requireProvider()
 * const config = { apiBaseUrl: '', pollIntervalMs: 30_000 } // '' = same origin
 * const status = await dashboard.fetchStatus(config)
 * const stop = dashboard.startPolling(config, (s) => render(s))
 * // on unmount:
 * stop()
 * ```
 *
 * @remarks
 * - **This is the read-side UI contract only.** Your API must serve the
 *   status/incident/uptime endpoints it reads (e.g.
 *   `@molecule/api-resource-status-page` provides them along with the
 *   monitoring checks). Without a server counterpart there is nothing to fetch.
 * - **Stop what you start**: {@link StatusDashboardProvider.startPolling}
 *   returns a stop function — call it on unmount/navigation or polls pile up.
 *   `stopPolling()` kills ALL active polls; use the returned function to stop
 *   just one.
 * - Leave `apiBaseUrl` relative (default `''` = same origin) so the app's HTTP
 *   proxy / environment config decides the host — don't hardcode an absolute
 *   URL into components.
 *
 * @module
 */

export * from './provider.js'
export * from './types.js'
