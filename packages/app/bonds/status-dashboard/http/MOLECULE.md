# @molecule/app-status-dashboard-http

HTTP status dashboard provider for molecule.dev.

Implements `StatusDashboardProvider` from `@molecule/app-status-dashboard` by
fetching status data from the backend over plain HTTP, with automatic polling.
Pairs with `@molecule/api-resource-status-page`, which serves the expected
endpoints: `GET /status`, `GET /status/incidents`, and `GET /status/uptime`.

## Quick Start

```typescript
import { setProvider } from '@molecule/app-status-dashboard'
import { createProvider } from '@molecule/app-status-dashboard-http'

setProvider(createProvider({ baseUrl: '/api' }))
// Now GET /api/status, /api/status/incidents?status=&limit=,
// /api/status/uptime?serviceId= back the dashboard.
```

## Type
`provider`

## Installation
```bash
npm install @molecule/app-status-dashboard-http @molecule/app-i18n @molecule/app-status-dashboard
```

## API

### Interfaces

#### `HttpStatusDashboardConfig`

Configuration for http status dashboard provider.

```typescript
interface HttpStatusDashboardConfig {
  /** Base URL for API requests. Defaults to '' (same origin). */
  baseUrl?: string
  /** Custom headers to include in requests. */
  headers?: Record<string, string>
}
```

### Classes

#### `HttpStatusDashboardProvider`

HTTP-based implementation of `StatusDashboardProvider`. Fetches system status,
incidents, and uptime data from backend API endpoints via standard HTTP requests.

### Functions

#### `createProvider(config)`

Creates an `HttpStatusDashboardProvider` instance with optional configuration.

```typescript
function createProvider(config?: HttpStatusDashboardConfig): HttpStatusDashboardProvider
```

- `config` — HTTP-specific status dashboard configuration (base URL, headers).

**Returns:** An `HttpStatusDashboardProvider` that communicates with the backend via HTTP.

### Constants

#### `provider`

Pre-instantiated provider singleton.

```typescript
const provider: HttpStatusDashboardProvider
```

## Core Interface
Implements `@molecule/app-status-dashboard` interface.

## Bond Wiring

Setup function to register this provider with the core interface:

```typescript
import { setProvider } from '@molecule/app-status-dashboard'
import { provider } from '@molecule/app-status-dashboard-http'

export function setupStatusDashboardHttp(): void {
  setProvider(provider)
}
```

## Injection Notes

### Requirements

Peer dependencies:
- `@molecule/app-status-dashboard` ^1.0.0
- `@molecule/app-i18n` ^1.0.0

### Runtime Dependencies

- `@molecule/app-i18n`
- `@molecule/app-status-dashboard`

- **The backend must serve the three endpoints** (`/status`,
  `/status/incidents`, `/status/uptime`) relative to `baseUrl` — responses are
  `SystemStatus`, `{ incidents: StatusIncident[] }`, and
  `{ uptime: ServiceUptime[] }` respectively. `@molecule/api-resource-status-page`
  provides them.
- **Error semantics differ per method**: `fetchStatus()` throws on non-2xx;
  `fetchIncidents()`/`fetchUptime()` return `[]` on ANY failure — an empty
  incidents list can mean "endpoint missing", not "all clear". Verify `/status`
  works first.
- Polling defaults to every 30 s (`pollIntervalMs`), fetches immediately, and
  swallows per-tick errors (next tick retries). Keep the stop function returned by
  `startPolling()` and call it on unmount; `stopPolling()` cancels everything.
- Per-call `config.apiBaseUrl`/`headers` override/merge over the constructor's
  `baseUrl`/`headers`.

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
