# @molecule/api-middleware-cors-express

Express CORS provider for molecule.dev.

## Quick Start

```typescript
import { setCors, setCorsFactory } from '@molecule/api-middleware-cors'
import { provider, corsFactory } from '@molecule/api-middleware-cors-express'

setCors(provider)
setCorsFactory(corsFactory)
```

## Type
`provider`

## Installation
```bash
npm install @molecule/api-middleware-cors-express @molecule/api-middleware-cors cors
npm install -D @types/cors
```

## API

### Functions

#### `corsFactory(options)`

Factory for creating CORS middleware with fully custom options, bypassing the default origin list.

```typescript
function corsFactory(options: CorsOptions): Middleware
```

- `options` — CORS configuration passed directly to the `cors` package.

**Returns:** A `Middleware` that applies the specified CORS policy.

#### `provider(req, res, next)`

CORS middleware provider that delegates to the lazily-initialized `cors` handler.
Allows requests from `APP_ORIGIN`, `SITE_ORIGIN`, localhost, and Capacitor/Electron schemes.

```typescript
function provider(req: unknown, res: unknown, next: (err?: unknown) => void): void
```

- `req` — The incoming request object.
- `res` — The response object.
- `next` — The next middleware function.

**Returns:** The result of the CORS handler invocation.

## Core Interface
Implements `@molecule/api-middleware-cors` interface.

## Bond Wiring

Setup function to register this provider with the core interface:

```typescript
import { setCorsFactory } from '@molecule/api-middleware-cors'
import { corsFactory } from '@molecule/api-middleware-cors-express'

export function setupMiddlewareCorsExpress(): void {
  setCorsFactory(corsFactory)
}
```

## Injection Notes

### Requirements

Peer dependencies:
- `@molecule/api-middleware-cors` ^1.0.0

### Runtime Dependencies

- `@molecule/api-middleware-cors`
- `cors`

- **Wire BOTH setters** (as in the example) — wiring only the factory leaves
  the core `cors` middleware throwing "not configured".
- Default allowlist (never `*`): `APP_ORIGIN`, `SITE_ORIGIN`,
  `capacitor://localhost`, `capacitor-electron://-`, `${APP_URL_SCHEME}://-`,
  plus `http(s)://localhost:<port>` in NON-production only. **In production
  you MUST set `APP_ORIGIN` (and/or `SITE_ORIGIN`)** or every browser
  cross-origin request fails with an opaque CORS error.
- The origin list is built ONCE, on the first request through the middleware
  — changing the env vars requires a restart.
- Responses are credentialed (`credentials: true`) and expose the
  `authorization` (+ legacy `set-authorization`) headers so a cross-origin
  app can read the bearer token set by the OAuth exchange.
- `corsFactory(options)` bypasses the default allowlist entirely — you own
  the whole policy when you use it.
