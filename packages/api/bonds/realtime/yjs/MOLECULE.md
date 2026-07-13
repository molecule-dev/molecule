# @molecule/api-realtime-yjs

Yjs CRDT realtime provider for molecule.dev.

Implements the {@link RealtimeProvider} interface from `@molecule/api-realtime`
using Yjs as the conflict-resolution layer. Each room is backed by a
`Y.Doc` plus an `Awareness` instance; CRDT updates broadcast on the
`'yjs:update'` event are applied to the room's document and relayed to
every other client in the room, achieving conflict-free convergence
across collaborators.

Network transport is injected (no direct websocket dependency), so the
bond can run with `y-websocket`, `socket.io`, an in-memory bus, or any
other transport — pick one and implement the small `YjsTransport`
contract. Persistence is the consumer's responsibility (`y-leveldb`,
`y-indexeddb`, or any database bond can be wired externally).

Apps that benefit: whiteboard, mind-mapping, spreadsheet, note-taking,
document-collaboration.

## Quick Start

```typescript
import { createProvider, YJS_UPDATE_EVENT } from '@molecule/api-realtime-yjs'
import { setProvider, broadcast, joinRoom, createRoom } from '@molecule/api-realtime'

// Wire your transport of choice; here, a tiny in-memory pub/sub.
const provider = createProvider({
  transport: {
    send: ({ roomId, clientId, event, data }) => {
      // Forward to your websocket / SSE / queue here
    },
  },
})
setProvider(provider)

const room = await createRoom('whiteboard-1', { persistent: true })
await joinRoom(room.id, 'alice')

// Inbound CRDT update from a client (transport calls applyInbound)
provider.applyInbound({
  roomId: room.id,
  clientId: 'alice',
  event: YJS_UPDATE_EVENT,
  data: incomingUint8Array,
})

// Server-initiated CRDT mutation
const doc = provider.getDoc(room.id)!
doc.getMap('shapes').set('shape-1', { type: 'rect', x: 10, y: 20 })
```

## Type
`provider`

## Installation
```bash
npm install @molecule/api-realtime-yjs
```

## API

### Interfaces

#### `YjsInboundMessage`

Inbound message from a transport into the bond. The transport calls
`applyInbound()` (returned from `createProvider`) to feed messages
received over the wire into the bond.

- When `event === 'yjs:update'`, `data` MUST be a `Uint8Array` containing
  a Yjs binary update; the bond will apply it to the room's Y.Doc and
  re-broadcast to other clients in the room.
- When `event === 'yjs:awareness'`, `data` MUST be a `Uint8Array`
  awareness update; the bond will apply it to the room's Awareness state.
- Any other event is delivered to registered `onMessage` handlers
  verbatim.

```typescript
interface YjsInboundMessage {
  /** Source room. */
  roomId: string

  /** Source client. */
  clientId: string

  /** Event name. */
  event: string

  /** Event payload. */
  data: unknown
}
```

#### `YjsOutboundMessage`

Outbound event delivered by the bond to a transport. The transport is
responsible for fanning the payload out to clients connected to the room.

Two kinds of payload are emitted:
- `event = 'yjs:update'` with `data` being the binary CRDT update
  (`Uint8Array`) — this is the result of a successful update being applied
  to the room's Y.Doc and must be relayed to other clients to keep them in
  sync.
- Any other `event` — application-level broadcast (e.g. presence ping,
  chat message) being relayed verbatim.

```typescript
interface YjsOutboundMessage {
  /** Target room. */
  roomId: string

  /** Target client. When `undefined` the message is broadcast to the room. */
  clientId?: string

  /** Event name (`'yjs:update'` for CRDT updates). */
  event: string

  /** Event payload (binary `Uint8Array` for `'yjs:update'`). */
  data: unknown
}
```

#### `YjsProviderExtras`

Public extras returned alongside the {@link RealtimeProvider}, exposing
the inbound/outbound CRDT plumbing that transport adapters need.

```typescript
interface YjsProviderExtras {
  /**
   * Push an inbound message from the transport into the bond. CRDT updates
   * are applied to the corresponding Y.Doc; awareness updates are applied
   * to the Awareness instance; other events are dispatched to registered
   * `onMessage` handlers.
   */
  applyInbound: (message: YjsInboundMessage) => void

  /**
   * Returns the underlying `Y.Doc` for a room, or `undefined` if the room
   * does not exist. Useful for server-side consumers that want to bind
   * additional Yjs types (Y.Map, Y.Array, Y.Text) directly.
   */
  getDoc: (roomId: string) => Y.Doc | undefined

  /**
   * Returns the awareness instance for a room, or `undefined` if the room
   * does not exist.
   */
  getAwareness: (roomId: string) => Awareness | undefined

  /**
   * If no transport was configured, returns the queue of outbound messages
   * accumulated since the last call. Always returns `[]` when a transport
   * is configured.
   */
  pending: () => YjsOutboundMessage[]
}
```

#### `YjsRealtimeConfig`

Yjs bond configuration.

```typescript
interface YjsRealtimeConfig {
  /**
   * Optional transport hook. If omitted, the bond accumulates outbound
   * messages internally (useful for testing) and exposes them via the
   * `pending()` helper on the provider extras.
   */
  transport?: YjsTransport

  /**
   * Currently UNUSED — the bond never generates client ids itself: every
   * client id comes from the caller (`joinRoom(roomId, clientId)` /
   * `applyInbound({ clientId, … })`). Reserved for a future server-assigned
   * id path; passing it today has no effect.
   */
  generateClientId?: () => string

  /**
   * Optional room-id generator. Defaults to `room_<n>` counter.
   */
  generateRoomId?: () => string
}
```

#### `YjsTransport`

Transport hook contract. Implementers register a `send` callback; the
bond calls it whenever a CRDT update needs to be relayed or an
application-level event broadcast.

Implementations may also call the bond's `applyInbound()` method (returned
from `createProvider`) to push CRDT updates received from the wire INTO the
bond, where they will be merged into the appropriate Y.Doc and re-emitted
to other clients via `send`.

Keeping this surface small means the bond never imports a concrete
websocket library — `y-websocket`, `ws`, `socket.io`, or in-memory test
harnesses can all wire into this hook.

```typescript
interface YjsTransport {
  /**
   * Sends an outbound message to clients. Called by the bond.
   */
  send: YjsTransportSend
}
```

### Types

#### `YjsTransportSend`

Outbound transport hook. Called by the bond whenever it needs to deliver a
message to clients. The transport is free to send the payload over a real
websocket, an SSE stream, an in-memory bus, etc.

```typescript
type YjsTransportSend = (message: YjsOutboundMessage) => void
```

### Functions

#### `clientIdToAwarenessId(clientId)`

Legacy stable mapping from molecule clientId (arbitrary string) to a
numeric Yjs Awareness id, by hashing the string into a 32-bit unsigned
integer.

**Superseded as the primary correlation mechanism** by automatic
per-client id tracking (see `applyTrackedAwarenessUpdate` /
{@link RoomState.introducedAwarenessIds}): `getPresence()` and
`leaveRoom()` now correlate awareness state with a molecule client from
the ids that client's own `'yjs:awareness'` frames actually touched, with
NO requirement that the collaborating client's `doc.clientID` equal this
hash. This function remains as an ADDITIONAL fallback id checked after the
tracked ids — it still works for a client that aligns `doc.clientID` to
`clientIdToAwarenessId(moleculeClientId)` by convention.

```typescript
function clientIdToAwarenessId(clientId: string): number
```

- `clientId` — The molecule client identifier.

**Returns:** A 32-bit unsigned integer suitable for `Awareness`.

#### `createProvider(config)`

Creates a Yjs-backed {@link RealtimeProvider} together with extras
exposing the inbound transport hook.

```typescript
function createProvider(config?: YjsRealtimeConfig): RealtimeProvider & YjsProviderExtras
```

- `config` — Bond configuration.

**Returns:** A tuple-like object containing the provider plus extras.

### Constants

#### `YJS_AWARENESS_EVENT`

Event name reserved for binary awareness updates.

Clients send `Uint8Array` awareness updates (presence, cursor, selection,
user metadata) with this event; the bond applies them to the room's
Awareness instance and rebroadcasts to other clients in the room.

```typescript
const YJS_AWARENESS_EVENT: "yjs:awareness"
```

#### `YJS_UPDATE_EVENT`

Event name reserved for binary CRDT document updates.

Clients send `Uint8Array` updates with this event; the bond applies them
to the room's Y.Doc and rebroadcasts to other clients in the room.

```typescript
const YJS_UPDATE_EVENT: "yjs:update"
```

## Core Interface
Implements `@molecule/api-realtime` interface.

## Injection Notes

### Requirements

Peer dependencies:
- `@molecule/api-realtime` ^1.0.0

- `'yjs:update'` / `'yjs:awareness'` payloads MUST be `Uint8Array`s — any
  other type throws (`Event "yjs:update" requires Uint8Array data`); the
  doc is never partially mutated.
- **Awareness ↔ client correlation is automatic — no `doc.clientID`
  alignment required.** Every `'yjs:awareness'` frame you push through
  `applyInbound()` is decoded (via the Awareness instance's own `'update'`
  event) to learn which numeric Awareness ids that specific molecule
  `clientId` introduced. `getPresence()` merges awareness metadata for
  ANY of those ids, and `leaveRoom()` removes ALL of them instantly — the
  collaborating client's real `doc.clientID` (random by default in every
  Yjs client) never needs to match anything. `clientIdToAwarenessId()`
  (still exported) is now only an ADDITIONAL fallback id checked after the
  tracked ones, for callers that still align `doc.clientID` by convention.
  The one remaining gap: awareness state pushed WITHOUT ever going through
  `applyInbound` for that room/client (e.g. only via the low-level
  `broadcast()` API) has nothing to attribute it to a molecule client, so
  it still relies on the legacy hash id or the 30s staleness timeout.
- This bond has no client-initiated join path: `onJoinRequest` is left
  undefined, so join guards registered via `@molecule/api-realtime` are
  logged as unenforceable (joins happen through the server-driven
  `joinRoom()` API only).
