/**
 * Yjs realtime provider configuration.
 *
 * The Yjs bond is a CRDT-based realtime provider where each room is backed by
 * a {@link https://docs.yjs.dev/api/y.doc Y.Doc} instance and an
 * {@link https://docs.yjs.dev/getting-started/adding-awareness Awareness} state.
 * Conflict resolution is performed by Yjs itself; this bond is responsible for
 * the room/membership lifecycle, message routing, and CRDT update application.
 *
 * Network transport is injected (`transport`) so the bond does not couple to
 * any single websocket implementation. Tests can pass an in-memory transport;
 * production code can wire `y-websocket` (or any other transport) by
 * implementing a few thin hooks.
 *
 * Persistence is the consumer's responsibility — this bond does not persist
 * Y.Doc state. Wire `y-leveldb`, `y-indexeddb`, or a database bond externally.
 *
 * @module
 */

/**
 * Outbound event delivered by the bond to a transport. The transport is
 * responsible for fanning the payload out to clients connected to the room.
 *
 * Two kinds of payload are emitted:
 * - `event = 'yjs:update'` with `data` being the binary CRDT update
 *   (`Uint8Array`) — this is the result of a successful update being applied
 *   to the room's Y.Doc and must be relayed to other clients to keep them in
 *   sync.
 * - Any other `event` — application-level broadcast (e.g. presence ping,
 *   chat message) being relayed verbatim.
 */
export interface YjsOutboundMessage {
  /** Target room. */
  roomId: string

  /** Target client. When `undefined` the message is broadcast to the room. */
  clientId?: string

  /** Event name (`'yjs:update'` for CRDT updates). */
  event: string

  /** Event payload (binary `Uint8Array` for `'yjs:update'`). */
  data: unknown
}

/**
 * Outbound transport hook. Called by the bond whenever it needs to deliver a
 * message to clients. The transport is free to send the payload over a real
 * websocket, an SSE stream, an in-memory bus, etc.
 *
 * @param message - The outbound message to deliver.
 */
export type YjsTransportSend = (message: YjsOutboundMessage) => void

/**
 * Transport hook contract. Implementers register a `send` callback; the
 * bond calls it whenever a CRDT update needs to be relayed or an
 * application-level event broadcast.
 *
 * Implementations may also call the bond's `applyInbound()` method (returned
 * from `createProvider`) to push CRDT updates received from the wire INTO the
 * bond, where they will be merged into the appropriate Y.Doc and re-emitted
 * to other clients via `send`.
 *
 * Keeping this surface small means the bond never imports a concrete
 * websocket library — `y-websocket`, `ws`, `socket.io`, or in-memory test
 * harnesses can all wire into this hook.
 */
export interface YjsTransport {
  /**
   * Sends an outbound message to clients. Called by the bond.
   */
  send: YjsTransportSend
}

/**
 * Yjs bond configuration.
 */
export interface YjsRealtimeConfig {
  /**
   * Optional transport hook. If omitted, the bond accumulates outbound
   * messages internally (useful for testing) and exposes them via the
   * `pending()` helper on the provider extras.
   */
  transport?: YjsTransport

  /**
   * Optional client-id generator. Defaults to `crypto.randomUUID()`.
   */
  generateClientId?: () => string

  /**
   * Optional room-id generator. Defaults to `room_<n>` counter.
   */
  generateRoomId?: () => string
}

/**
 * Inbound message from a transport into the bond. The transport calls
 * `applyInbound()` (returned from `createProvider`) to feed messages
 * received over the wire into the bond.
 *
 * - When `event === 'yjs:update'`, `data` MUST be a `Uint8Array` containing
 *   a Yjs binary update; the bond will apply it to the room's Y.Doc and
 *   re-broadcast to other clients in the room.
 * - When `event === 'yjs:awareness'`, `data` MUST be a `Uint8Array`
 *   awareness update; the bond will apply it to the room's Awareness state.
 * - Any other event is delivered to registered `onMessage` handlers
 *   verbatim.
 */
export interface YjsInboundMessage {
  /** Source room. */
  roomId: string

  /** Source client. */
  clientId: string

  /** Event name. */
  event: string

  /** Event payload. */
  data: unknown
}
