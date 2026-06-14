# @molecule/api-activity-http

Generic HTTP activity sink.

POSTs captured activity events to a configured ingest endpoint (the `url`
option or the `MOLECULE_ACTIVITY_URL` env var). No endpoint is assumed — when
none is configured the sink no-ops, so an unconfigured consumer never
silently phones home. Best-effort — never throws on failure.

## Quick Start

```typescript
import { setSink } from '@molecule/api-activity'
import { createHttpSink } from '@molecule/api-activity-http'

setSink(createHttpSink({ url: 'https://my-app.example/v1/activity' }))
```

## Type
`provider`

## Installation
```bash
npm install @molecule/api-activity-http
```

## API

### Interfaces

#### `HttpActivitySinkOptions`

Options for the HTTP activity sink.

```typescript
interface HttpActivitySinkOptions {
  /**
   * The activity endpoint URL. Falls back to the `MOLECULE_ACTIVITY_URL` env
   * var. There is no built-in default — when neither is set the sink no-ops, so
   * an unconfigured generic consumer never POSTs to an assumed destination.
   */
  url?: string

  /**
   * The app's runtime vault token, sent as a bearer token.
   * Defaults to the `MOLECULE_VAULT_TOKEN` env var.
   */
  token?: string

  /**
   * The app id for the configured endpoint, sent as the `X-Molecule-App-Id`
   * header (omitted when unset). Defaults to the `MOLECULE_APP_ID` env var.
   */
  appId?: string
}
```

### Functions

#### `createHttpSink(options)`

Creates an HTTP activity sink that POSTs each event to the configured ingest
endpoint.

Best-effort: an unconfigured endpoint is skipped (debug-logged), and a failed
POST (or a thrown `fetch`) is caught and logged, never rethrown, so capture
providers can record unconditionally.

```typescript
function createHttpSink(options?: HttpActivitySinkOptions): ActivitySink
```

- `options` — Endpoint URL, runtime token, and app id. Each falls back to

**Returns:** An {@link ActivitySink} backed by an HTTP POST.

### Constants

#### `provider`

Default HTTP activity sink instance, configured from environment variables.

```typescript
const provider: ActivitySink
```

## Core Interface
Implements `@molecule/api-activity` interface.

## Bond Wiring

Setup function to register this provider with the core interface:

```typescript
import { setSink } from '@molecule/api-activity'
import { provider } from '@molecule/api-activity-http'

export function setupActivityHttp(): void {
  setSink(provider)
}
```

## Injection Notes

### Requirements

Peer dependencies:
- `@molecule/api-activity` ^1.0.0
- `@molecule/api-logger` ^1.0.0

### Environment Variables

- `MOLECULE_ACTIVITY_URL` *(optional)* — default: `https://api.molecule.dev/v1/activity`
