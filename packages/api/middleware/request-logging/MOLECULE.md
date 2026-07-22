# @molecule/api-middleware-request-logging

HTTP request-logging middleware for molecule.dev.

Emits one structured log record per request — method, path, status code,
and duration — through the bonded `@molecule/api-logger` (pino, winston,
console, …), on the response `finish` event. Severity follows the status
code: 5xx logs at `error`, 4xx at `warn`, the rest at `info`.

## Quick Start

```ts
import express from 'express'
import { createRequestLoggingMiddleware } from '@molecule/api-middleware-request-logging'

const app = express()
// Mount BEFORE the router so every routed request is timed end-to-end.
app.use(createRequestLoggingMiddleware({
  excludePaths: ['/health'],
  resolveFields: (req) => ({ requestId: (req as { headers?: Record<string, string> }).headers?.['x-request-id'] }),
}))
```

## Type
`middleware`

## Installation
```bash
npm install @molecule/api-middleware-request-logging @molecule/api-logger
```

## API

### Interfaces

#### `RequestLoggingMiddlewareOptions`

Options for the request-logging middleware.

```typescript
interface RequestLoggingMiddlewareOptions {
  /**
   * Paths to exclude from logging (EXACT matches against `req.path`,
   * falling back to `req.url` — no prefixes or globs).
   * @default ['/health']
   */
  excludePaths?: string[]

  /**
   * Extra fields merged into every request log record (e.g.
   * `{ service: 'api', env: 'production' }`).
   */
  baseFields?: Record<string, unknown>

  /**
   * Derives extra log fields from the request (e.g. a request id or the
   * authenticated user's id). Runs at response `finish` time; a throwing
   * resolver is swallowed so it can never fail the request log.
   */
  resolveFields?: (req: unknown, res: unknown) => Record<string, unknown>
}
```

### Functions

#### `createRequestLoggingMiddleware(options)`

Creates a request-logging middleware that logs every API request.

```typescript
function createRequestLoggingMiddleware(options?: RequestLoggingMiddlewareOptions): (req: unknown, res: unknown, next: (err?: unknown) => void) => void
```

- `options` — Configuration options including paths to exclude from logging.

**Returns:** Express-compatible middleware that logs requests on the `finish` event.

## Injection Notes

### Requirements

Peer dependencies:
- `@molecule/api-logger` ^1.0.0

### Runtime Dependencies

- `@molecule/api-logger`

- This is the LOGGING complement to `@molecule/api-middleware-analytics`
  (which tracks request METRICS into the analytics provider). They compose;
  mount both if you want logs AND metrics.
- `excludePaths` entries are EXACT matches against `req.path` (falling
  back to `req.url`) — no prefixes or globs (`'/health'` does not exclude
  `/health/live`). Default: `['/health']` so the load-balancer probe does
  not flood the log.
- Logging happens on `finish`, so a handler that never ends the response
  (a hung stream) logs nothing — that is the signal you want, not a bug.
- Records go through the shared `logger` from `@molecule/api-logger`; the
  core's level gate (`LOG_LEVEL`, default `info`) applies, and the bonded
  provider decides the wire format (JSON for pino/winston).
- Never put secrets in `resolveFields` output (no authorization headers,
  cookies, tokens) — request logs are shipped to log stores with broad
  reader access.
