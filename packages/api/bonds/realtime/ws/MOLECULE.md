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
npm install @molecule/api-realtime-ws @molecule/api-bond @molecule/api-realtime ws
npm install -D @types/ws
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
   * An existing Node.js HTTP server to attach the WebSocket server to. This
   * is itself an explicit attach step — when given, a standalone WebSocket
   * server is created and attached immediately, regardless of `deferAttach`.
   */
  httpServer?: Server

  /**
   * Port to listen on for a standalone server. Passing this **explicitly**
   * is an explicit instruction to bind a standalone server immediately (no
   * `httpServer` needed) — env-aware for the actual value: `WS_PORT` if set,
   * else `PORT + 1000` (one above the API convention), else `3000`, so
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
   * Defer creating the standalone WebSocket server until
   * {@link RealtimeProvider.attachHttpServer} is called, instead of binding
   * eagerly at creation. Used by the server factory so `ws` attaches to the
   * API's HTTP server (shared port) once it exists — avoiding a standalone
   * port a sandbox/proxy may not expose and that collides with the API's own
   * port by default. Ignored when `httpServer` is already provided (that is
   * itself an explicit attach — see the module `@remarks`). Zero-config
   * (no `port`, no `httpServer`, no `deferAttach`) already behaves as if
   * this were `true` — set it explicitly for readability/intent at the call
   * site, not because it changes behavior over omitting it.
   *
   * @defaultValue false
   */
  deferAttach?: boolean

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

### Runtime Dependencies

- `@molecule/api-bond`
- `@molecule/api-realtime`
- `ws`

- **`createProvider()` with NO `port`, NO `httpServer`, and NO
  `deferAttach` does NOT bind anything** — creating a provider must never
  bind a port as a side effect. It behaves exactly like `{ deferAttach:
  true }` (waits for `attachHttpServer(server)`), logging an info line so
  the omission is visible instead of silent. An **explicit** `port` still
  binds a standalone server immediately (unchanged, back-compat for
  existing standalone callers) — it just no longer happens by accident. In
  a real deployment prefer deferring and attaching once the API's HTTP
  server exists:
  ```typescript
  const realtimeProvider = createProvider({ deferAttach: true })
  setProvider(realtimeProvider)
  // once the API's http.Server exists (e.g. a server-created hook):
  realtimeProvider.attachHttpServer(server)
  ```
  so `ws` shares the API's port instead of a separate one. A standalone
  bind failure (e.g. `EADDRINUSE`) is logged via the bonded logger naming
  this bond and the port, instead of crashing the process with an
  unattributed error.

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
