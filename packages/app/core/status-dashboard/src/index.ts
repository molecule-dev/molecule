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
 * @e2e
 * Integration checklist — drive the real status page in the live preview (no
 * mocks), adapt each item to this app's actual screens, and check every box
 * off one by one. A box you can't check is an integration bug to fix — not a
 * skip:
 * - [ ] Every monitored service returned by `fetchStatus` renders as its own
 *   tile/row showing the service name and a status indicator, grouped by
 *   `groupName` when present — no service silently missing from the page.
 * - [ ] Each status indicator reflects that service's real `ServiceStatus`: an
 *   `operational` service shows the up/green treatment, `down` shows the
 *   down/red treatment, and `degraded`/`unknown` each show their own distinct
 *   state — never one uniform color regardless of status.
 * - [ ] The overall system-status banner is DERIVED from the tiles, not
 *   hardcoded: with all services operational it reads operational; flip one
 *   service to `down` in the data and the banner flips to down/degraded on the
 *   next fetch — it never stays green while a tile is red.
 * - [ ] Metric values render as real numbers with units — service latency as
 *   e.g. `142 ms` and each `UptimeWindow` as a percentage (e.g. `99.98%`) for
 *   the selected window (1h/24h/7d/30d/90d) — not `0`, `NaN`, or a placeholder.
 * - [ ] Active incidents render with title, severity, and status; when there
 *   are none the page shows an all-clear/empty state, not a blank or broken
 *   incidents area.
 * - [ ] Polling updates the tiles without a manual reload: with `startPolling`
 *   running, change the underlying status and confirm the affected tile AND the
 *   overall banner update on the next poll; navigating away calls the returned
 *   stop function so polls don't pile up.
 * - [ ] Loading and failure are observable: a loading indicator shows while
 *   `fetchStatus` is in flight, and a fetch error surfaces a visible message
 *   (from `state.error`) — never a blank page or a stale dashboard shown as
 *   fresh.
 *
 * @module
 */

export * from './provider.js'
export * from './types.js'
