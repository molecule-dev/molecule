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
   * An existing Node.js HTTP server to attach the SSE routes to.
   * If omitted, a standalone HTTP server is created on {@link port}.
   */
  httpServer?: HttpServer

  /**
   * Port to listen on when no `httpServer` is provided.
   *
   * @defaultValue 3000
   */
  port?: number

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
   * CORS origin for the SSE endpoint. Set to `'*'` to allow all origins.
   *
   * @defaultValue '*'
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
