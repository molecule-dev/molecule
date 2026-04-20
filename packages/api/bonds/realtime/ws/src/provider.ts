/**
 * Raw WebSocket (`ws`) implementation of the molecule RealtimeProvider interface.
 *
 * Wraps the `ws` WebSocketServer to provide room-based, bidirectional
 * real-time communication conforming to `@molecule/api-realtime`.
 *
 * Clients communicate via JSON messages with `{ event, data, room? }` structure.
 *
 * @module
 */

import { randomUUID } from 'node:crypto'

import type { WebSocket } from 'ws'
import { WebSocketServer } from 'ws'

import type {
  ConnectionHandler,
  DisconnectionHandler,
  MessageHandler,
  PresenceInfo,
  RealtimeProvider,
  Room,
  RoomOptions,
} from '@molecule/api-realtime'

import type { WsRealtimeConfig } from './types.js'

/**
 * Internal room state managed alongside raw WebSocket connections.
 */
interface RoomState {
  /** The molecule Room representation. */
  room: Room

  /** Room creation options (for enforcing maxClients, persistence, etc.). */
  options: RoomOptions

  /** Per-client presence metadata. */
  presence: Map<string, PresenceInfo>
}

/**
 * Internal client state tracking a WebSocket connection.
 */
interface ClientState {
  /** The underlying WebSocket connection. */
  socket: WebSocket

  /** The assigned client identifier. */
  clientId: string
}

/**
 * Creates a raw WebSocket-backed {@link RealtimeProvider}.
 *
 * @param config - WebSocket provider configuration.
 * @returns A fully initialised `RealtimeProvider` backed by `ws`.
 */
export function createProvider(config: WsRealtimeConfig = {}): RealtimeProvider {
  const { serverOptions = {}, httpServer, port = 3000 } = config

  const wss: WebSocketServer = httpServer
    ? new WebSocketServer({ ...serverOptions, server: httpServer })
    : new WebSocketServer({ ...serverOptions, port })

  /** Rooms managed through the provider API. */
  const rooms = new Map<string, RoomState>()

  /** Connected clients indexed by clientId. */
  const clients = new Map<string, ClientState>()

  /** Reverse lookup: WebSocket → clientId. */
  const socketToClient = new WeakMap<WebSocket, string>()

  /** Registered event handlers. */
  const messageHandlers: MessageHandler[] = []
  const connectionHandlers: ConnectionHandler[] = []
  const disconnectionHandlers: DisconnectionHandler[] = []

  /* ------------------------------------------------------------------ */
  /*  Wire WebSocket events to molecule handlers                         */
  /* ------------------------------------------------------------------ */

  wss.on('connection', (socket: WebSocket, request) => {
    const clientId = randomUUID()
    clients.set(clientId, { socket, clientId })
    socketToClient.set(socket, clientId)

    for (const handler of connectionHandlers) {
      handler(clientId, { remoteAddress: request.socket.remoteAddress })
    }

    socket.on('message', (raw: Buffer | ArrayBuffer | Buffer[]) => {
      const text = typeof raw === 'string' ? raw : raw.toString()

      let parsed: { event?: string; data?: unknown; room?: string }
      try {
        parsed = JSON.parse(text) as { event?: string; data?: unknown; room?: string }
      } catch {
        return
      }

      const event = parsed.event ?? 'message'
      const data = parsed.data

      // Determine which managed rooms this client belongs to
      for (const [roomId, state] of rooms) {
        if (parsed.room && parsed.room !== roomId) {
          continue
        }
        if (state.room.clients.includes(clientId)) {
          for (const handler of messageHandlers) {
            handler(roomId, clientId, event, data)
          }
        }
      }
    })

    socket.on('close', (code: number) => {
      // Remove from all managed rooms
      for (const [, state] of rooms) {
        const idx = state.room.clients.indexOf(clientId)
        if (idx !== -1) {
          state.room.clients.splice(idx, 1)
          state.presence.delete(clientId)
        }
      }

      clients.delete(clientId)

      for (const handler of disconnectionHandlers) {
        handler(clientId, `close:${String(code)}`)
      }
    })
  })

  /* ------------------------------------------------------------------ */
  /*  Provider implementation                                            */
  /* ------------------------------------------------------------------ */

  let roomCounter = 0

  const provider: RealtimeProvider = {
    async createRoom(name: string, options: RoomOptions = {}): Promise<Room> {
      roomCounter += 1
      const id = `room_${String(roomCounter)}`
      const room: Room = { id, name, clients: [], metadata: options.metadata }
      rooms.set(id, { room, options, presence: new Map() })
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

      state.room.clients.push(clientId)
      state.presence.set(clientId, { clientId, joinedAt: new Date() })
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

      // Remove non-persistent empty rooms
      if (state.room.clients.length === 0 && !state.options.persistent) {
        rooms.delete(roomId)
      }
    },

    async broadcast(roomId: string, event: string, data: unknown): Promise<void> {
      const state = rooms.get(roomId)
      if (!state) {
        throw new Error(`Room "${roomId}" does not exist`)
      }

      const payload = JSON.stringify({ event, data })
      for (const clientId of state.room.clients) {
        const client = clients.get(clientId)
        if (client && client.socket.readyState === client.socket.OPEN) {
          client.socket.send(payload)
        }
      }
    },

    async sendTo(clientId: string, event: string, data: unknown): Promise<void> {
      const client = clients.get(clientId)
      if (!client) {
        throw new Error(`Client "${clientId}" is not connected`)
      }

      client.socket.send(JSON.stringify({ event, data }))
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

      return [...state.presence.values()]
    },

    async getRooms(): Promise<Room[]> {
      return [...rooms.values()].map((s) => ({ ...s.room }))
    },

    async close(): Promise<void> {
      rooms.clear()
      clients.clear()
      messageHandlers.length = 0
      connectionHandlers.length = 0
      disconnectionHandlers.length = 0
      await new Promise<void>((resolve, reject) => {
        wss.close((err) => {
          if (err) {
            reject(err)
          } else {
            resolve()
          }
        })
      })
    },
  }

  return provider
}
