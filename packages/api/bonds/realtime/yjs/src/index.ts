/**
 * Yjs CRDT realtime provider for molecule.dev.
 *
 * Implements the {@link RealtimeProvider} interface from `@molecule/api-realtime`
 * using Yjs as the conflict-resolution layer. Each room is backed by a
 * `Y.Doc` plus an `Awareness` instance; CRDT updates broadcast on the
 * `'yjs:update'` event are applied to the room's document and relayed to
 * every other client in the room, achieving conflict-free convergence
 * across collaborators.
 *
 * Network transport is injected (no direct websocket dependency), so the
 * bond can run with `y-websocket`, `socket.io`, an in-memory bus, or any
 * other transport — pick one and implement the small `YjsTransport`
 * contract. Persistence is the consumer's responsibility (`y-leveldb`,
 * `y-indexeddb`, or any database bond can be wired externally).
 *
 * Apps that benefit: whiteboard, mind-mapping, spreadsheet, note-taking,
 * document-collaboration.
 *
 * @example
 * ```typescript
 * import * as Y from 'yjs'
 *
 * import { broadcast, createRoom, joinRoom, setProvider } from '@molecule/api-realtime'
 * import type { YjsOutboundMessage } from '@molecule/api-realtime-yjs'
 * import { createProvider, YJS_UPDATE_EVENT } from '@molecule/api-realtime-yjs'
 *
 * // Startup: inject your transport. `send` must deliver each message to `message.clientId`
 * // (over your websocket / SSE / socket.io); here it is collected in an outbox.
 * const outbox: YjsOutboundMessage[] = []
 * const yjs = createProvider({ transport: { send: (message) => void outbox.push(message) } })
 * setProvider(yjs)
 *
 * const room = await createRoom('whiteboard-1', { persistent: true })
 * await joinRoom(room.id, 'alice') // each join is sent the room's current doc snapshot
 * await joinRoom(room.id, 'bob')
 *
 * // Inbound: alice edited her Y.Doc; your transport feeds the BINARY update in.
 * const aliceDoc = new Y.Doc()
 * aliceDoc.getMap('shapes').set('shape-1', { type: 'rect', x: 10, y: 20 })
 * yjs.applyInbound({
 *   roomId: room.id,
 *   clientId: 'alice',
 *   event: YJS_UPDATE_EVENT,
 *   data: Y.encodeStateAsUpdate(aliceDoc), // must be a Uint8Array
 * })
 * // → merged into the room doc and relayed to bob only (never echoed to alice).
 * const shape = yjs.getDoc(room.id)?.getMap('shapes').get('shape-1') // { type: 'rect', x: 10, y: 20 }
 *
 * // Server-side edit: send it through broadcast() so every client receives it.
 * const serverEdit = new Y.Doc()
 * serverEdit.getMap('shapes').set('shape-2', { type: 'circle', x: 50, y: 50 })
 * await broadcast(room.id, YJS_UPDATE_EVENT, Y.encodeStateAsUpdate(serverEdit))
 * ```
 *
 * @remarks
 * - `'yjs:update'` / `'yjs:awareness'` payloads MUST be `Uint8Array`s — any
 *   other type throws (`Event "yjs:update" requires Uint8Array data`); the
 *   doc is never partially mutated.
 * - **Awareness ↔ client correlation is automatic — no `doc.clientID`
 *   alignment required.** Every `'yjs:awareness'` frame you push through
 *   `applyInbound()` is decoded (via the Awareness instance's own `'update'`
 *   event) to learn which numeric Awareness ids that specific molecule
 *   `clientId` introduced. `getPresence()` merges awareness metadata for
 *   ANY of those ids, and `leaveRoom()` removes ALL of them instantly — the
 *   collaborating client's real `doc.clientID` (random by default in every
 *   Yjs client) never needs to match anything. `clientIdToAwarenessId()`
 *   (still exported) is now only an ADDITIONAL fallback id checked after the
 *   tracked ones, for callers that still align `doc.clientID` by convention.
 *   The one remaining gap: awareness state pushed WITHOUT ever going through
 *   `applyInbound` for that room/client (e.g. only via the low-level
 *   `broadcast()` API) has nothing to attribute it to a molecule client, so
 *   it still relies on the legacy hash id or the 30s staleness timeout.
 * - This bond has no client-initiated join path: `onJoinRequest` is left
 *   undefined, so join guards registered via `@molecule/api-realtime` are
 *   logged as unenforceable (joins happen through the server-driven
 *   `joinRoom()` API only).
 * - **Mutating `getDoc(roomId)` directly is NOT sent to anyone** — the bond does not observe
 *   the room doc. Server-side edits must go through `broadcast(roomId, 'yjs:update', update)`
 *   (applied to the room doc, then delivered to every member).
 * - **Without a `transport`, nothing is delivered** — outbound messages pile up in
 *   `pending()` (meant for tests). With one, `send` is called once PER RECIPIENT
 *   (`message.clientId` set); fan-out is already done.
 * - `createRoom()` returns a generated id (`room_1`, …), not the name — `joinRoom`/`broadcast`/
 *   `applyInbound` take that id. `applyInbound` for an unknown room is silently ignored.
 * - **Nothing is persisted**: every room's Y.Doc lives in this process's memory. Persist
 *   `Y.encodeStateAsUpdate(getDoc(roomId))` yourself (e.g. on leave/interval).
 *
 * @module
 */

export * from './browser-guard.js'
export * from './provider.js'
export * from './types.js'
