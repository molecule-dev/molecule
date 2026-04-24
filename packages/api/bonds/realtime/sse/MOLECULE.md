# @molecule/api-realtime-sse

SSE (Server-Sent Events) realtime provider for molecule.dev.

Provides a {@link RealtimeProvider} implementation using native Node.js
Server-Sent Events for server-to-client push, with HTTP POST for
client-to-server messages.

## Quick Start

```typescript
import { createProvider } from '@molecule/api-realtime-sse'
import { setProvider } from '@molecule/api-realtime'

// Create an SSE-backed realtime provider
const sseProvider = createProvider({ port: 3000, path: '/sse' })

// Bond it as the active realtime provider
setProvider(sseProvider)
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

## Injection Notes

### Requirements

Peer dependencies:
- `@molecule/api-realtime` ^1.0.0
