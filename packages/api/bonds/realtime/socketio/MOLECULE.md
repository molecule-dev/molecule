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
npm install @molecule/api-realtime-socketio @molecule/api-bond @molecule/api-realtime engine.io socket.io socket.io-adapter
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
   * Port to listen on when no `httpServer` is provided and `deferAttach` is
   * not set. When omitted the port is resolved env-aware so multiple apps can
   * run side-by-side: `SOCKETIO_PORT` if set, else `PORT + 1000` (one above
   * the API convention), else `3000`. Prefer `deferAttach` +
   * `attachHttpServer()` in real deployments — a standalone port is often not
   * exposed by containerized/proxied environments.
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
- `@molecule/api-bond` ^1.0.0
- `@molecule/api-realtime` ^1.0.0

### Runtime Dependencies

- `@molecule/api-bond`
- `@molecule/api-realtime`
- `engine.io`
- `socket.io`
- `socket.io-adapter`

- **Zero-config `createProvider()` BINDS a standalone Socket.io server immediately**
  on `SOCKETIO_PORT`, else `PORT + 1000`, else `3000` — unlike the `-sse`/`-ws`
  bonds, which never bind without an explicit `port`/`httpServer`. In a real
  deployment pass `{ httpServer }`, or `{ deferAttach: true }` +
  `provider.attachHttpServer(server)` once the API's HTTP server exists, so
  Socket.io shares the API port at `/socket.io/` instead of a standalone port a
  container/proxy may not expose.
- **`broadcast()` to a room with no members (or that never existed) is a safe
  no-op** — native Socket.io emit semantics. The `-sse`/`-ws` bonds THROW for a
  room that doesn't exist; don't rely on the silent behavior if the app might swap
  transports.
- Protocol rooms are native Socket.io rooms keyed by NAME — the same namespace
  `broadcast(roomId, …)` emits to, so `broadcast('channel:x', …)` reaches
  protocol-joined clients directly. The guard's `auth` payload is the client's
  `socket.handshake.auth`.

## E2E Tests

Integration checklist — drive the real UI (live preview, no mocks), adapt
each item to this app's actual screens/flows, and check every box off one
by one. A box you can't check is an integration bug to fix — not a skip:
- [ ] With the app open in TWO sessions (separate browser contexts/users), an
  action in one (send a message, update a shared record) appears in the
  other WITHOUT a manual reload.
- [ ] Updates reach only the sessions in the same room/scope — a session
  viewing a different room/record receives nothing.
- [ ] Private rooms enforce the join guard: an unauthorized session's join is
  denied and no data leaks to it. If ANY client can join any private room,
  `onJoinRequest` was never registered — an integration bug.
- [ ] Presence (if surfaced) updates when a participant joins and leaves.
- [ ] After a dropped connection (offline/online toggle or server restart),
  the client reconnects and live events flow again.
