# @molecule/api-realtime-ws

Raw WebSocket (`ws`) realtime provider for molecule.dev.

Provides a `ws`-backed implementation of the
`@molecule/api-realtime` {@link RealtimeProvider} interface.

## Type
`provider`

## Installation
```bash
npm install @molecule/api-realtime-ws
```

## Usage

```typescript
import { createProvider } from '@molecule/api-realtime-ws'
import { setProvider } from '@molecule/api-realtime'
import http from 'node:http'

const server = http.createServer()
const realtimeProvider = createProvider({ httpServer: server })
setProvider(realtimeProvider)

server.listen(3000)
```

## API

### Interfaces

#### `WsRealtimeConfig`

Configuration options for the raw WebSocket realtime provider.

```typescript
interface WsRealtimeConfig {
  /**
   * `ws` server options passed to the `WebSocketServer` constructor.
   *
   * @see https://github.com/websockets/ws/blob/master/doc/ws.md#new-websocketserveroptions-callback
   */
  serverOptions?: ServerOptions

  /**
   * An existing Node.js HTTP server to attach the WebSocket server to.
   * If omitted, a standalone WebSocket server is created.
   */
  httpServer?: Server

  /**
   * Port to listen on when no `httpServer` is provided.
   *
   * @defaultValue 3000
   */
  port?: number

  /**
   * The event name used by clients to send messages.
   * Clients send JSON with `{ event, data }` structure.
   *
   * @defaultValue 'message'
   */
  messageEvent?: string
}
```

### Functions

#### `createProvider(config)`

Creates a raw WebSocket-backed {@link RealtimeProvider}.

```typescript
function createProvider(config?: WsRealtimeConfig): RealtimeProvider
```

- `config` — WebSocket provider configuration.

**Returns:** A fully initialised `RealtimeProvider` backed by `ws`.

## Injection Notes

### Requirements

Peer dependencies:
- `@molecule/api-realtime` ^1.0.0
