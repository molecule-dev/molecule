# @molecule/api-activity-http

HTTP activity sink for molecule.dev.

POSTs captured activity events to the molecule.dev activity endpoint for
sandboxed/managed apps. Best-effort — never throws on failure.

## Quick Start

```typescript
import { setSink } from '@molecule/api-activity'
import { provider } from '@molecule/api-activity-http'

setSink(provider)
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
   * The activity endpoint URL.
   * Defaults to `MOLECULE_ACTIVITY_URL` env var, then the molecule.dev endpoint.
   */
  url?: string

  /**
   * The app's runtime vault token, sent as a bearer token.
   * Defaults to the `MOLECULE_VAULT_TOKEN` env var.
   */
  token?: string

  /**
   * The molecule.dev app id, sent as the `X-Molecule-App-Id` header.
   * Defaults to the `MOLECULE_APP_ID` env var.
   */
  appId?: string
}
```

### Functions

#### `createHttpSink(options)`

Creates an HTTP activity sink that POSTs each event to molecule.dev.

Best-effort: a failed POST (or a thrown `fetch`) is caught and logged, never
rethrown, so capture providers can record unconditionally.

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
