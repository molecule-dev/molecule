# @molecule/app-status-dashboard-http

HTTP status dashboard provider for molecule.dev.

## Type
`provider`

## Installation
```bash
npm install @molecule/app-status-dashboard-http
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

## Injection Notes

### Requirements

Peer dependencies:
- `@molecule/app-status-dashboard` ^1.0.0
- `@molecule/app-i18n` ^1.0.0
