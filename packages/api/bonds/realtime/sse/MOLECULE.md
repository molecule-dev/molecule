# @molecule/api-realtime-sse

SSE (Server-Sent Events) realtime provider for molecule.dev.

Provides a {@link RealtimeProvider} implementation using native Node.js
Server-Sent Events for server-to-client push, with HTTP POST for
client-to-server messages.

## Quick Start

```typescript
import http from 'node:http'
import { createProvider } from '@molecule/api-realtime-sse'
import { setProvider } from '@molecule/api-realtime'

// Attach the SSE endpoints to the API's own HTTP server so realtime
// shares the API port (a standalone `port` binds a SECOND port that a
// containerized/proxied deployment usually does not expose — and the
// default port 3000 collides with the typical API port).
const server = http.createServer()
const sseProvider = createProvider({ httpServer: server, path: '/sse' })

// Bond it as the active realtime provider
setProvider(sseProvider)

server.listen(3000)

// When the HTTP server doesn't exist yet at wiring time (e.g. a server
// factory that creates it later), defer instead of passing httpServer:
// const sseProvider = createProvider({ deferAttach: true, path: '/sse' })
// setProvider(sseProvider)
// // once the server exists (e.g. a server-created hook):
// sseProvider.attachHttpServer(server)
```

## Type
`provider`

## Installation
```bash
npm install @molecule/api-realtime-sse
```

## API

### Interfaces

#### `SseRealtimeConfig`

Configuration options for the SSE realtime provider.

SSE (Server-Sent Events) provides server-to-client push. Client-to-server
messages are accepted via HTTP POST on the same path (configurable via
{@link SseRealtimeConfig.path | path}).

```typescript
interface SseRealtimeConfig {
  /**
   * An existing Node.js HTTP server to attach the SSE routes to. This is
   * itself an explicit attach step — when given, the routes are attached
   * immediately (or a standalone server is created on {@link port}
   * immediately if omitted, per the rules below), regardless of
   * `deferAttach`.
   */
  httpServer?: HttpServer

  /**
   * Port to listen on for a standalone server. Passing this **explicitly**
   * is an explicit instruction to bind a standalone server immediately (no
   * `httpServer` needed) — env-aware for the actual value: `SSE_PORT` if
   * set, else `PORT + 1000` (one above the API convention), else `3000`, so
   * multiple apps can run side-by-side.
   *
   * **Omitting `port` (along with `httpServer` and `deferAttach`) does NOT
   * bind a default port** — creating a provider must never bind a port as a
   * side effect. A zero-config `createProvider()` behaves exactly like
   * `{ deferAttach: true }` instead: it waits for
   * {@link RealtimeProvider.attachHttpServer} and logs an info line naming
   * the bond so the omission is visible.
   */
  port?: number

  /**
   * Defer attaching the SSE routes until {@link RealtimeProvider.attachHttpServer}
   * is called, instead of binding a standalone HTTP server eagerly at
   * creation. Used by the server factory so SSE attaches to the API's HTTP
   * server (shared port) once it exists — avoiding a standalone port a
   * sandbox/proxy may not expose and that collides with the API's own port
   * by default. Ignored when `httpServer` is already provided (that is
   * itself an explicit attach — see the module `@remarks`). Zero-config
   * (no `port`, no `httpServer`, no `deferAttach`) already behaves as if
   * this were `true` — set it explicitly for readability/intent at the call
   * site, not because it changes behavior over omitting it.
   *
   * @defaultValue false
   */
  deferAttach?: boolean

  /**
   * Base path for SSE endpoints.
   *
   * - `GET  {path}` — SSE event stream
   * - `POST {path}` — client-to-server messages (`{ event, data, room? }`)
   *
   * @defaultValue '/sse'
   */
  path?: string

  /**
   * Interval (ms) between keep-alive comment lines sent to prevent
   * intermediary proxies from closing idle connections.
   *
   * @defaultValue 30000
   */
  keepAliveInterval?: number

  /**
   * Custom headers to include in the SSE response.
   */
  headers?: Record<string, string>

  /**
   * CORS origin for the SSE endpoint (`Access-Control-Allow-Origin`). Set to
   * `'*'` to allow all origins, or a single origin string for a locked-down
   * deployment.
   *
   * When omitted: outside production, defaults to `'*'` (dev convenience —
   * no cross-origin risk to a real user). **In production** (`NODE_ENV ===
   * 'production'`), defaults instead to `process.env.APP_ORIGIN ??
   * process.env.SITE_ORIGIN` (the same env vars `@molecule/api-middleware-cors-express`
   * reads for its allowlist) when either is set, so the realtime endpoints
   * are NOT exposed cross-origin by default in production. If production AND
   * neither is set, falls back to `'*'` but logs an actionable warning (auth
   * via query params/`Authorization` header still applies, and
   * credentialed-CORS rules still protect httpOnly-cookie flows, so exposure
   * is limited — but should still be closed by setting this explicitly).
   *
   * @defaultValue '*' outside production; `APP_ORIGIN`/`SITE_ORIGIN` in production when set
   */
  corsOrigin?: string
}
```

### Functions

#### `createProvider(config)`

Creates an SSE-backed {@link RealtimeProvider}.

```typescript
function createProvider(config?: SseRealtimeConfig): RealtimeProvider
```

- `config` — SSE provider configuration.

**Returns:** A fully initialised `RealtimeProvider` backed by Server-Sent Events.

## Core Interface
Implements `@molecule/api-realtime` interface.

## Injection Notes

### Requirements

Peer dependencies:
- `@molecule/api-bond` ^1.0.0
- `@molecule/api-realtime` ^1.0.0

- **`createProvider()` with NO `port`, NO `httpServer`, and NO
  `deferAttach` does NOT bind anything** — creating a provider must never
  bind a port as a side effect. It behaves exactly like `{ deferAttach:
  true }` (waits for `attachHttpServer(server)`), logging an info line so
  the omission is visible instead of silent. An **explicit** `port` still
  binds a standalone server immediately (unchanged, back-compat for
  existing standalone callers) — it just no longer happens by accident. A
  standalone bind failure (e.g. `EADDRINUSE`) is logged via the bonded
  logger naming this bond and the port, instead of crashing the process
  with an unattributed error.
- **`corsOrigin` defaults to `'*'` outside production.** In production
  (`NODE_ENV === 'production'`) it instead defaults to
  `process.env.APP_ORIGIN ?? process.env.SITE_ORIGIN` when either is set,
  so the realtime stream/message endpoints aren't exposed cross-origin by
  default; only when neither is configured does it fall back to `'*'`,
  logging a warning naming the risk. Set `corsOrigin` explicitly to
  override either way.
