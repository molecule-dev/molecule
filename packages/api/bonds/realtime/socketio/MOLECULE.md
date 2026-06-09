# @molecule/api-realtime-socketio

Socket.io realtime provider for molecule.dev.

Provides a Socket.io-backed implementation of the
`@molecule/api-realtime` {@link RealtimeProvider} interface.

## Quick Start

```typescript
import { createProvider } from '@molecule/api-realtime-socketio'
import { setProvider } from '@molecule/api-realtime'
import http from 'node:http'

const server = http.createServer()
const realtimeProvider = createProvider({ httpServer: server })
setProvider(realtimeProvider)

server.listen(3000)
```

## Type
`provider`

## Installation
```bash
npm install @molecule/api-realtime-socketio
```

## API

### Interfaces

#### `SocketioRealtimeConfig`

Configuration options for the Socket.io realtime provider.

```typescript
interface SocketioRealtimeConfig {
  /**
   * Socket.io server options passed to the `Server` constructor.
   *
   * @see https://socket.io/docs/v4/server-options/
   */
  serverOptions?: Partial<ServerOptions>

  /**
   * An existing Node.js HTTP server to attach Socket.io to.
   * If omitted, Socket.io creates its own standalone server.
   */
  httpServer?: Server

  /**
   * Port to listen on when no `httpServer` is provided.
   *
   * @defaultValue 3000
   */
  port?: number

  /**
   * Socket.io namespace path.
   *
   * @defaultValue '/'
   */
  namespace?: string

  /**
   * Defer creating the Socket.io server until {@link RealtimeProvider.attachHttpServer}
   * is called, instead of binding eagerly at creation. Used by the server factory so
   * Socket.io attaches to the API's HTTP server (shared port, `/socket.io/`) once it
   * exists — avoiding a separate standalone port a sandbox/proxy may not expose.
   *
   * @defaultValue false
   */
  deferAttach?: boolean
}
```

### Functions

#### `createProvider(config)`

Creates a Socket.io-backed {@link RealtimeProvider}.

```typescript
function createProvider(config?: SocketioRealtimeConfig): RealtimeProvider
```

- `config` — Socket.io provider configuration.

**Returns:** A fully initialised `RealtimeProvider` backed by Socket.io.

## Core Interface
Implements `@molecule/api-realtime` interface.

## Injection Notes

### Requirements

Peer dependencies:
- `@molecule/api-realtime` ^1.0.0
