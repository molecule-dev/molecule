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
