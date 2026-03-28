/**
 * Socket.io implementation of the molecule RealtimeProvider interface.
 *
 * Wraps Socket.io's `Server` to provide room-based, bidirectional
 * real-time communication conforming to `@molecule/api-realtime`.
 *
 * @module
 */

import { Server } from 'socket.io'

import type {
  ConnectionHandler,
  DisconnectionHandler,
  MessageHandler,
  PresenceInfo,
  RealtimeProvider,
  Room,
  RoomOptions,
} from '@molecule/api-realtime'

import type { SocketioRealtimeConfig } from './types.js'

/**
 * Internal room state tracked alongside Socket.io's native rooms.
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
 * Creates a Socket.io-backed {@link RealtimeProvider}.
 *
 * @param config - Socket.io provider configuration.
 * @returns A fully initialised `RealtimeProvider` backed by Socket.io.
 */
export function createProvider(config: SocketioRealtimeConfig = {}): RealtimeProvider {
  const { serverOptions = {}, httpServer, port = 3000, namespace = '/' } = config

  const io: Server = httpServer
    ? new Server(httpServer, serverOptions)
    : new Server(port, serverOptions)

  const nsp = io.of(namespace)

  /** Rooms managed through the provider API. */
  const rooms = new Map<string, RoomState>()

  /** Registered event handlers. */
  const messageHandlers: MessageHandler[] = []
  const connectionHandlers: ConnectionHandler[] = []
  const disconnectionHandlers: DisconnectionHandler[] = []

  /* ------------------------------------------------------------------ */
  /*  Wire Socket.io events to molecule handlers                        */
  /* ------------------------------------------------------------------ */

  nsp.on('connection', (socket) => {
    for (const handler of connectionHandlers) {
      handler(socket.id, { remoteAddress: socket.handshake.address })
    }

    socket.onAny((event: string, data: unknown) => {
      // Determine which managed rooms this socket belongs to
      for (const [roomId, state] of rooms) {
        if (state.room.clients.includes(socket.id)) {
          for (const handler of messageHandlers) {
            handler(roomId, socket.id, event, data)
          }
        }
      }
    })

    socket.on('disconnect', (reason: string) => {
      // Remove from all managed rooms
      for (const [, state] of rooms) {
        const idx = state.room.clients.indexOf(socket.id)
        if (idx !== -1) {
          state.room.clients.splice(idx, 1)
          state.presence.delete(socket.id)
        }
      }

      for (const handler of disconnectionHandlers) {
        handler(socket.id, reason)
      }
    })
  })

  /* ------------------------------------------------------------------ */
  /*  Provider implementation                                           */
  /* ------------------------------------------------------------------ */

  let roomCounter = 0

  const provider: RealtimeProvider = {
    async createRoom(name: string, options: RoomOptions = {}): Promise<Room> {
      roomCounter += 1
      const id = `room_${roomCounter}`
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

      // Have the Socket.io socket join the native room
      const socket = nsp.sockets.get(clientId)
      if (socket) {
        socket.join(roomId)
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

      const socket = nsp.sockets.get(clientId)
      if (socket) {
        socket.leave(roomId)
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

      nsp.to(roomId).emit(event, data)
    },

    async sendTo(clientId: string, event: string, data: unknown): Promise<void> {
      const socket = nsp.sockets.get(clientId)
      if (!socket) {
        throw new Error(`Client "${clientId}" is not connected`)
      }

      socket.emit(event, data)
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
      messageHandlers.length = 0
      connectionHandlers.length = 0
      disconnectionHandlers.length = 0
      await new Promise<void>((resolve) => {
        io.close(() => {
          resolve()
        })
      })
    },
  }

  return provider
}
