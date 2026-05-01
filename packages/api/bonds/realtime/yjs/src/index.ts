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
 * @module
 * @example
 * ```typescript
 * import { createProvider, YJS_UPDATE_EVENT } from '@molecule/api-realtime-yjs'
 * import { setProvider, broadcast, joinRoom, createRoom } from '@molecule/api-realtime'
 *
 * // Wire your transport of choice; here, a tiny in-memory pub/sub.
 * const provider = createProvider({
 *   transport: {
 *     send: ({ roomId, clientId, event, data }) => {
 *       // Forward to your websocket / SSE / queue here
 *     },
 *   },
 * })
 * setProvider(provider)
 *
 * const room = await createRoom('whiteboard-1', { persistent: true })
 * await joinRoom(room.id, 'alice')
 *
 * // Inbound CRDT update from a client (transport calls applyInbound)
 * provider.applyInbound({
 *   roomId: room.id,
 *   clientId: 'alice',
 *   event: YJS_UPDATE_EVENT,
 *   data: incomingUint8Array,
 * })
 *
 * // Server-initiated CRDT mutation
 * const doc = provider.getDoc(room.id)!
 * doc.getMap('shapes').set('shape-1', { type: 'rect', x: 10, y: 20 })
 * ```
 */

export * from './provider.js'
export * from './types.js'
