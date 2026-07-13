# @molecule/api-realtime-ws

Raw WebSocket (`ws`) realtime provider for molecule.dev.

Provides a `ws`-backed implementation of the
`@molecule/api-realtime` {@link RealtimeProvider} interface.

## Quick Start

```typescript
import { createProvider } from '@molecule/api-realtime-ws'
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
npm install @molecule/api-realtime-ws
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
   * Currently UNUSED — the provider never reads this option. Clients send
   * JSON frames shaped `{ event, data, room? }` and the frame's own `event`
   * field (defaulting to `'message'` when absent) is what reaches `onMessage`
   * handlers; there is no configurable envelope event name.
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

## Core Interface
Implements `@molecule/api-realtime` interface.

## Injection Notes

### Requirements

Peer dependencies:
- `@molecule/api-bond` ^1.0.0
- `@molecule/api-realtime` ^1.0.0
