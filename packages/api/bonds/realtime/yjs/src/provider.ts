/**
 * Yjs CRDT implementation of the molecule {@link RealtimeProvider} interface.
 *
 * Each room is backed by a `Y.Doc` and an `Awareness` instance. CRDT updates
 * delivered on the `'yjs:update'` event are applied to the room's Y.Doc and
 * relayed to all other clients in the room, achieving conflict-free state
 * convergence across collaborators.
 *
 * Network transport is injected (`config.transport`) so the bond does not
 * couple to any specific websocket library. Tests can wire an in-memory
 * transport; production code wires `y-websocket` (or similar) by implementing
 * the small {@link YjsTransport} contract.
 *
 * Persistence is the consumer's responsibility — this bond is purely
 * transport + CRDT.
 *
 * @module
 */

import { randomUUID } from 'node:crypto'

import {
  applyAwarenessUpdate,
  Awareness,
  encodeAwarenessUpdate,
  removeAwarenessStates,
} from 'y-protocols/awareness'
import * as Y from 'yjs'

import type {
  ConnectionHandler,
  DisconnectionHandler,
  MessageHandler,
  PresenceInfo,
  RealtimeProvider,
  Room,
  RoomOptions,
} from '@molecule/api-realtime'

import type { YjsInboundMessage, YjsOutboundMessage, YjsRealtimeConfig } from './types.js'

/**
 * Event name reserved for binary CRDT document updates.
 *
 * Clients send `Uint8Array` updates with this event; the bond applies them
 * to the room's Y.Doc and rebroadcasts to other clients in the room.
 */
export const YJS_UPDATE_EVENT = 'yjs:update'

/**
 * Event name reserved for binary awareness updates.
 *
 * Clients send `Uint8Array` awareness updates (presence, cursor, selection,
 * user metadata) with this event; the bond applies them to the room's
 * Awareness instance and rebroadcasts to other clients in the room.
 */
export const YJS_AWARENESS_EVENT = 'yjs:awareness'

/**
 * Internal per-room state holding the Y.Doc, awareness, and membership.
 */
interface RoomState {
  /** The molecule Room representation surfaced to consumers. */
  room: Room

  /** Room creation options (capacity, persistence, metadata). */
  options: RoomOptions

  /** The CRDT document for this room. */
  doc: Y.Doc

  /** Awareness state for presence/cursor/etc. */
  awareness: Awareness

  /** Per-client presence metadata. */
  presence: Map<string, PresenceInfo>
}

/**
 * Public extras returned alongside the {@link RealtimeProvider}, exposing
 * the inbound/outbound CRDT plumbing that transport adapters need.
 */
export interface YjsProviderExtras {
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

/**
 * Creates a Yjs-backed {@link RealtimeProvider} together with extras
 * exposing the inbound transport hook.
 *
 * @param config - Bond configuration.
 * @returns A tuple-like object containing the provider plus extras.
 */
export function createProvider(
  config: YjsRealtimeConfig = {},
): RealtimeProvider & YjsProviderExtras {
  const _generateClientId = config.generateClientId ?? (() => randomUUID())
  const generateRoomId = (() => {
    if (config.generateRoomId) {
      return config.generateRoomId
    }
    let counter = 0
    return () => {
      counter += 1
      return `room_${String(counter)}`
    }
  })()

  /** Active rooms by id. */
  const rooms = new Map<string, RoomState>()

  /** Connection metadata by clientId. */
  const clients = new Map<string, { metadata?: Record<string, unknown> }>()

  /** Registered handlers. */
  const messageHandlers: MessageHandler[] = []
  const connectionHandlers: ConnectionHandler[] = []
  const disconnectionHandlers: DisconnectionHandler[] = []

  /** Outbound queue when no transport is configured. */
  const outboundQueue: YjsOutboundMessage[] = []

  /**
   * Internal: deliver a message via the configured transport, or queue
   * it for later inspection if no transport was provided.
   */
  const deliver = (message: YjsOutboundMessage): void => {
    if (config.transport) {
      config.transport.send(message)
    } else {
      outboundQueue.push(message)
    }
  }

  /**
   * Internal: enqueue a broadcast to every member of `roomId` except the
   * given excluded client (typically the originator).
   */
  const broadcastExcept = (
    roomId: string,
    excludeClientId: string | undefined,
    event: string,
    data: unknown,
  ): void => {
    const state = rooms.get(roomId)
    if (!state) {
      return
    }
    for (const cid of state.room.clients) {
      if (cid === excludeClientId) {
        continue
      }
      deliver({ roomId, clientId: cid, event, data })
    }
  }

  const provider: RealtimeProvider = {
    async createRoom(name: string, options: RoomOptions = {}): Promise<Room> {
      const id = generateRoomId()
      const room: Room = { id, name, clients: [], metadata: options.metadata }
      const doc = new Y.Doc()
      const awareness = new Awareness(doc)
      rooms.set(id, { room, options, doc, awareness, presence: new Map() })
      return { ...room }
    },

    async joinRoom(roomId: string, clientId: string): Promise<void> {
      const state = rooms.get(roomId)
      if (!state) {
        throw new Error(`Room "${roomId}" does not exist`)
      }
      if (state.options.maxClients && state.room.clients.length >= state.options.maxClients) {
        throw new Error(`Room "${roomId}" is full (max ${String(state.options.maxClients)})`)
      }
      if (state.room.clients.includes(clientId)) {
        return
      }
      if (!clients.has(clientId)) {
        clients.set(clientId, {})
        for (const handler of connectionHandlers) {
          handler(clientId)
        }
      }
      state.room.clients.push(clientId)
      state.presence.set(clientId, { clientId, joinedAt: new Date() })

      // Send a snapshot of current Y.Doc state to the joining client so they
      // sync up with the room's existing CRDT history.
      const snapshot = Y.encodeStateAsUpdate(state.doc)
      deliver({ roomId, clientId, event: YJS_UPDATE_EVENT, data: snapshot })

      // Snapshot awareness too so the joining client immediately sees who
      // else is in the room. Filter out the bond's own clientID (Yjs
      // Awareness always seeds itself with an empty local state) so we
      // only ship genuine peer presence — a fresh room with no other
      // clients yields no awareness snapshot.
      const peers = [...state.awareness.getStates().keys()].filter(
        (id) => id !== state.awareness.clientID,
      )
      if (peers.length > 0) {
        const awarenessSnapshot = encodeAwarenessUpdate(state.awareness, peers)
        deliver({
          roomId,
          clientId,
          event: YJS_AWARENESS_EVENT,
          data: awarenessSnapshot,
        })
      }
    },

    async leaveRoom(roomId: string, clientId: string): Promise<void> {
      const state = rooms.get(roomId)
      if (!state) {
        throw new Error(`Room "${roomId}" does not exist`)
      }
      const idx = state.room.clients.indexOf(clientId)
      if (idx === -1) {
        return
      }
      state.room.clients.splice(idx, 1)
      state.presence.delete(clientId)

      // Drop awareness for the departing client and tell everyone else.
      // `removeAwarenessStates` deletes THAT client's entry; encoding the
      // update AFTER removal produces a `state: null` frame that peers apply
      // as a removal. (The previous `setLocalState(null)` here was an API
      // misuse: it removed the SERVER's own local awareness entry instead of
      // the departing peer's, and the broadcast re-encoded the peer's
      // still-present state — a no-op on every receiver, leaving ghost
      // collaborators until the 30s awareness timeout.)
      const awarenessClientId = clientIdToAwarenessId(clientId)
      if (state.awareness.getStates().has(awarenessClientId)) {
        removeAwarenessStates(state.awareness, [awarenessClientId], clientId)
        const removalUpdate = encodeAwarenessUpdate(state.awareness, [awarenessClientId])
        broadcastExcept(roomId, clientId, YJS_AWARENESS_EVENT, removalUpdate)
      }

      if (state.room.clients.length === 0 && !state.options.persistent) {
        state.awareness.destroy()
        state.doc.destroy()
        rooms.delete(roomId)
      }
    },

    async broadcast(roomId: string, event: string, data: unknown): Promise<void> {
      const state = rooms.get(roomId)
      if (!state) {
        throw new Error(`Room "${roomId}" does not exist`)
      }

      if (event === YJS_UPDATE_EVENT) {
        const update = ensureUint8Array(data, YJS_UPDATE_EVENT)
        Y.applyUpdate(state.doc, update, 'broadcast')
      } else if (event === YJS_AWARENESS_EVENT) {
        const update = ensureUint8Array(data, YJS_AWARENESS_EVENT)
        applyAwarenessUpdate(state.awareness, update, 'broadcast')
      }

      for (const cid of state.room.clients) {
        deliver({ roomId, clientId: cid, event, data })
      }
    },

    async sendTo(clientId: string, event: string, data: unknown): Promise<void> {
      if (!clients.has(clientId)) {
        throw new Error(`Client "${clientId}" is not connected`)
      }
      // sendTo doesn't carry a room — find any room the client is in for
      // delivery context.  In practice point-to-point messages travel with
      // a room id elsewhere; here we deliver with whatever room the client
      // is first found in (or empty string if none, which the transport may
      // ignore).
      let roomId = ''
      for (const [id, state] of rooms) {
        if (state.room.clients.includes(clientId)) {
          roomId = id
          break
        }
      }
      deliver({ roomId, clientId, event, data })
    },

    onMessage(handler: MessageHandler): void {
      messageHandlers.push(handler)
    },

    onConnection(handler: ConnectionHandler): void {
      connectionHandlers.push(handler)
    },

    onDisconnection(handler: DisconnectionHandler): void {
      disconnectionHandlers.push(handler)
    },

    async getPresence(roomId: string): Promise<PresenceInfo[]> {
      const state = rooms.get(roomId)
      if (!state) {
        throw new Error(`Room "${roomId}" does not exist`)
      }
      // Merge awareness state into presence metadata so consumers can see
      // cursor/selection/user info alongside join time.
      const result: PresenceInfo[] = []
      for (const [cid, info] of state.presence) {
        const awarenessId = clientIdToAwarenessId(cid)
        const awarenessState = state.awareness.getStates().get(awarenessId)
        result.push({
          clientId: info.clientId,
          joinedAt: info.joinedAt,
          metadata: awarenessState
            ? { ...info.metadata, awareness: awarenessState }
            : info.metadata,
        })
      }
      return result
    },

    async getRooms(): Promise<Room[]> {
      return [...rooms.values()].map((s) => ({ ...s.room }))
    },

    async close(): Promise<void> {
      for (const [, state] of rooms) {
        state.awareness.destroy()
        state.doc.destroy()
      }
      rooms.clear()
      const remainingClientIds = [...clients.keys()]
      clients.clear()
      messageHandlers.length = 0
      for (const cid of remainingClientIds) {
        for (const handler of disconnectionHandlers) {
          handler(cid, 'close')
        }
      }
      connectionHandlers.length = 0
      disconnectionHandlers.length = 0
      outboundQueue.length = 0
    },
  }

  const extras: YjsProviderExtras = {
    applyInbound(message: YjsInboundMessage): void {
      const state = rooms.get(message.roomId)
      if (!state) {
        return
      }
      // Auto-track the inbound client as connected if it isn't yet.
      if (!clients.has(message.clientId)) {
        clients.set(message.clientId, {})
        for (const handler of connectionHandlers) {
          handler(message.clientId)
        }
      }

      if (message.event === YJS_UPDATE_EVENT) {
        const update = ensureUint8Array(message.data, YJS_UPDATE_EVENT)
        Y.applyUpdate(state.doc, update, message.clientId)
        // Re-broadcast the same update to other clients so they converge.
        broadcastExcept(message.roomId, message.clientId, YJS_UPDATE_EVENT, update)
        return
      }

      if (message.event === YJS_AWARENESS_EVENT) {
        const update = ensureUint8Array(message.data, YJS_AWARENESS_EVENT)
        applyAwarenessUpdate(state.awareness, update, message.clientId)
        broadcastExcept(message.roomId, message.clientId, YJS_AWARENESS_EVENT, update)
        return
      }

      // Application-level event — surface to handlers, do NOT mutate Y.Doc.
      for (const handler of messageHandlers) {
        handler(message.roomId, message.clientId, message.event, message.data)
      }
    },

    getDoc(roomId: string): Y.Doc | undefined {
      return rooms.get(roomId)?.doc
    },

    getAwareness(roomId: string): Awareness | undefined {
      return rooms.get(roomId)?.awareness
    },

    pending(): YjsOutboundMessage[] {
      const drained = outboundQueue.splice(0, outboundQueue.length)
      return drained
    },
  }

  return Object.assign(provider, extras)
}

/**
 * Stable mapping from molecule clientId (arbitrary string) to the numeric
 * id that Yjs Awareness uses internally. Hashes the string into a 32-bit
 * unsigned integer.
 *
 * The bond correlates awareness entries with molecule clients through this
 * mapping — `getPresence()` merges awareness state and `leaveRoom()` removes
 * it ONLY for awareness entries keyed by `clientIdToAwarenessId(clientId)`.
 * Transport adapters that want those features must align ids on the client
 * side (e.g. set the collaborating `Y.Doc`'s `clientID` to
 * `clientIdToAwarenessId(moleculeClientId)` before creating its Awareness).
 * Clients using their own random `doc.clientID` still converge fine; their
 * awareness is simply uncorrelated and is cleaned up by the Yjs Awareness
 * 30-second staleness timeout instead of instantly on leave.
 *
 * @param clientId - The molecule client identifier.
 * @returns A 32-bit unsigned integer suitable for `Awareness`.
 */
export function clientIdToAwarenessId(clientId: string): number {
  let hash = 2166136261
  for (let i = 0; i < clientId.length; i += 1) {
    hash ^= clientId.charCodeAt(i)
    hash = Math.imul(hash, 16777619)
  }
  return hash >>> 0
}

/**
 * Validates that `data` is a `Uint8Array`, throwing a descriptive error
 * otherwise. Yjs binary updates are always `Uint8Array`s.
 *
 * @param data - The candidate value.
 * @param event - The event name (used for the error message).
 * @returns The validated `Uint8Array`.
 */
function ensureUint8Array(data: unknown, event: string): Uint8Array {
  if (!(data instanceof Uint8Array)) {
    throw new Error(`Event "${event}" requires Uint8Array data`)
  }
  return data
}
