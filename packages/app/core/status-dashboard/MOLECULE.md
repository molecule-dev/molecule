# @molecule/app-status-dashboard

Status dashboard core interface for molecule.dev.

## Type
`core`

## Installation
```bash
npm install @molecule/app-status-dashboard
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

## Translations

Translation strings are provided by `@molecule/app-locales-status-dashboard`.
