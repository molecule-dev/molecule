# @molecule/app-status-dashboard

Status dashboard core interface for molecule.dev.

Framework-agnostic contract for status pages / uptime dashboards: fetching
system status, incidents, and per-service uptime windows, plus polling with
change callbacks. Bond a provider (e.g. `@molecule/app-status-dashboard-http`,
which reads a status REST API) at startup, then call {@link requireProvider}
anywhere.

## Quick Start

```typescript
import { requireProvider, setProvider } from '@molecule/app-status-dashboard'
import { provider } from '@molecule/app-status-dashboard-http'

setProvider(provider) // once, at startup (bonds.ts)

const dashboard = requireProvider()
const config = { apiBaseUrl: '', pollIntervalMs: 30_000 } // '' = same origin
const status = await dashboard.fetchStatus(config)
const stop = dashboard.startPolling(config, (s) => render(s))
// on unmount:
stop()
```

## Type
`core`

## Installation
```bash
npm install @molecule/app-status-dashboard @molecule/app-bond @molecule/app-i18n
```

## API

### Interfaces

#### `ServiceUptime`

Uptime data for a service.

```typescript
interface ServiceUptime {
  serviceId: string
  serviceName: string
  windows: UptimeWindow[]
}
```

#### `StatusDashboardConfig`

Configuration for the status dashboard.

```typescript
interface StatusDashboardConfig {
  /** Base URL for the status API. Defaults to '' (same origin). */
  apiBaseUrl?: string
  /** Polling interval in milliseconds. Defaults to 30000. */
  pollIntervalMs?: number
  /** Custom headers for API requests. */
  headers?: Record<string, string>
  /** Site name for branding. */
  siteName?: string
}
```

#### `StatusDashboardProvider`

Status dashboard provider interface.

```typescript
interface StatusDashboardProvider {
  readonly name: string

  /** Fetches the current system status. */
  fetchStatus(config: StatusDashboardConfig): Promise<SystemStatus>

  /** Fetches recent incidents. */
  fetchIncidents(
    config: StatusDashboardConfig,
    options?: { status?: IncidentStatus; limit?: number },
  ): Promise<StatusIncident[]>

  /** Fetches uptime data for all services. */
  fetchUptime(config: StatusDashboardConfig, serviceId?: string): Promise<ServiceUptime[]>

  /** Starts polling for status updates. Returns a stop function. */
  startPolling(config: StatusDashboardConfig, onUpdate: (status: SystemStatus) => void): () => void

  /** Stops all active polling. */
  stopPolling(): void
}
```

#### `StatusDashboardState`

Reactive state for the status dashboard.

```typescript
interface StatusDashboardState {
  systemStatus: SystemStatus | null
  incidents: StatusIncident[]
  uptimeData: ServiceUptime[]
  isLoading: boolean
  error: string | null
  lastFetched: string | null
}
```

#### `StatusIncident`

An incident associated with a service.

```typescript
interface StatusIncident {
  id: string
  serviceId: string
  serviceName?: string
  title: string
  description?: string
  severity: IncidentSeverity
  status: IncidentStatus
  startedAt: string
  resolvedAt?: string
  createdAt: string
  updatedAt: string
}
```

#### `StatusService`

A monitored service with current status.

```typescript
interface StatusService {
  id: string
  name: string
  url: string
  groupName?: string
  status: ServiceStatus
  latencyMs?: number
  lastCheckedAt?: string
}
```

#### `SystemStatus`

Overall system status summary.

```typescript
interface SystemStatus {
  status: ServiceStatus
  services: StatusService[]
  activeIncidents: StatusIncident[]
  lastUpdated: string
}
```

#### `UptimeWindow`

Uptime statistics for a time window.

```typescript
interface UptimeWindow {
  window: '1h' | '24h' | '7d' | '30d' | '90d'
  uptimePct: number
  totalChecks: number
  upChecks: number
  avgLatencyMs: number
}
```

### Types

#### `IncidentSeverity`

Incident severity level.

```typescript
type IncidentSeverity = 'minor' | 'major' | 'critical'
```

#### `IncidentStatus`

Incident resolution status.

```typescript
type IncidentStatus = 'investigating' | 'identified' | 'monitoring' | 'resolved'
```

#### `ServiceStatus`

Service operational status.

```typescript
type ServiceStatus = 'operational' | 'degraded' | 'down' | 'unknown'
```

### Functions

#### `getProvider()`

Retrieves the bonded status dashboard provider, or `null` if none is bonded.

```typescript
function getProvider(): StatusDashboardProvider | null
```

**Returns:** The bonded status dashboard provider, or `null`.

#### `hasProvider()`

Checks whether a status dashboard provider is currently bonded.

```typescript
function hasProvider(): boolean
```

**Returns:** `true` if a status dashboard provider is bonded.

#### `requireProvider()`

Retrieves the bonded status dashboard provider, throwing if none is configured.

```typescript
function requireProvider(): StatusDashboardProvider
```

**Returns:** The bonded status dashboard provider.

#### `setProvider(provider)`

Registers a status dashboard provider as the active singleton.

```typescript
function setProvider(provider: StatusDashboardProvider): void
```

- `provider` — The status dashboard provider implementation to bond.

## Available Providers

| Provider | Package |
|----------|---------|
| HTTP | `@molecule/app-status-dashboard-http` |

## Injection Notes

### Requirements

Peer dependencies:
- `@molecule/app-bond` ^1.0.0
- `@molecule/app-i18n` ^1.0.0

### Runtime Dependencies

- `@molecule/app-bond`
- `@molecule/app-i18n`

- **This is the read-side UI contract only.** Your API must serve the
  status/incident/uptime endpoints it reads (e.g.
  `@molecule/api-resource-status-page` provides them along with the
  monitoring checks). Without a server counterpart there is nothing to fetch.
- **Stop what you start**: {@link StatusDashboardProvider.startPolling}
  returns a stop function — call it on unmount/navigation or polls pile up.
  `stopPolling()` kills ALL active polls; use the returned function to stop
  just one.
- Leave `apiBaseUrl` relative (default `''` = same origin) so the app's HTTP
  proxy / environment config decides the host — don't hardcode an absolute
  URL into components.

## E2E Tests

Integration checklist — drive the real status page in the live preview (no
mocks), adapt each item to this app's actual screens, and check every box
off one by one. A box you can't check is an integration bug to fix — not a
skip:
- [ ] Every monitored service returned by `fetchStatus` renders as its own
  tile/row showing the service name and a status indicator, grouped by
  `groupName` when present — no service silently missing from the page.
- [ ] Each status indicator reflects that service's real `ServiceStatus`: an
  `operational` service shows the up/green treatment, `down` shows the
  down/red treatment, and `degraded`/`unknown` each show their own distinct
  state — never one uniform color regardless of status.
- [ ] The overall system-status banner is DERIVED from the tiles, not
  hardcoded: with all services operational it reads operational; flip one
  service to `down` in the data and the banner flips to down/degraded on the
  next fetch — it never stays green while a tile is red.
- [ ] Metric values render as real numbers with units — service latency as
  e.g. `142 ms` and each `UptimeWindow` as a percentage (e.g. `99.98%`) for
  the selected window (1h/24h/7d/30d/90d) — not `0`, `NaN`, or a placeholder.
- [ ] Active incidents render with title, severity, and status; when there
  are none the page shows an all-clear/empty state, not a blank or broken
  incidents area.
- [ ] Polling updates the tiles without a manual reload: with `startPolling`
  running, change the underlying status and confirm the affected tile AND the
  overall banner update on the next poll; navigating away calls the returned
  stop function so polls don't pile up.
- [ ] Loading and failure are observable: a loading indicator shows while
  `fetchStatus` is in flight, and a fetch error surfaces a visible message
  (from `state.error`) — never a blank page or a stale dashboard shown as
  fresh.

## Translations

Translation strings are provided by `@molecule/app-locales-status-dashboard`.
