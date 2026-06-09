/**
 * Socket.io implementation of the molecule RealtimeProvider interface.
 *
 * Wraps Socket.io's `Server` to provide room-based, bidirectional
 * real-time communication conforming to `@molecule/api-realtime`.
 *
 * @module
 */

import type { Server as HttpServer } from 'node:http'
import type { Server as HttpsServer } from 'node:https'

import { type Namespace, Server } from 'socket.io'

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
  const { serverOptions = {}, httpServer, namespace = '/', deferAttach = false } = config

  // Resolve port with sensible per-deployment defaults so multiple flagships
  // can run side-by-side on the same machine without colliding on port 3000:
  //   1. explicit `config.port`
  //   2. `process.env.SOCKETIO_PORT`
  //   3. `process.env.PORT + 1000` (matches `npm run dev`'s API port + 1000)
  //   4. fall back to 3000 for back-compat with examples
  const envPort = process.env.SOCKETIO_PORT && Number(process.env.SOCKETIO_PORT)
  const apiPort = process.env.PORT && Number(process.env.PORT)
  const port =
    config.port ??
    (envPort && Number.isFinite(envPort) ? envPort : undefined) ??
    (apiPort && Number.isFinite(apiPort) ? apiPort + 1000 : undefined) ??
    3000

  /** Rooms managed through the provider API. */
  const rooms = new Map<string, RoomState>()

  /** Registered event handlers. */
  const messageHandlers: MessageHandler[] = []
  const connectionHandlers: ConnectionHandler[] = []
  const disconnectionHandlers: DisconnectionHandler[] = []

  // The Socket.io server + namespace are created lazily so the provider can
  // either bind eagerly (a standalone `port`, for examples / standalone use) OR
  // defer until the API's HTTP server exists and attach to it via
  // `attachHttpServer` (the server factory's path — so realtime shares the API
  // port at `/socket.io/` instead of a separate port a sandbox/proxy may not
  // expose). The same connection wiring is applied once the namespace exists.
  let io: Server | undefined
  let nsp: Namespace | undefined

  /**
   * Create the Socket.io server (attached to `server` if given, else a standalone
   * `port` listener) and wire connection/message/disconnect handlers. Idempotent.
   */
  const initIo = (server?: HttpServer | HttpsServer): void => {
    if (io) return
    io = server ? new Server(server, serverOptions) : new Server(port, serverOptions)
    nsp = io.of(namespace)

    /* Wire Socket.io events to molecule handlers. */
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
  }

  // Bind eagerly unless deferred; deferred providers wait for attachHttpServer().
  if (!deferAttach) initIo(httpServer)

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
      const socket = nsp?.sockets.get(clientId)
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

      const socket = nsp?.sockets.get(clientId)
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
      // Broadcast is fan-out pub/sub: if no clients ever joined the room,
      // there are simply no subscribers to deliver to. Match Socket.IO
      // semantics (always-safe emit) instead of throwing — callers should
      // not need to coordinate with the receiver's join lifecycle.
      nsp?.to(roomId).emit(event, data)
    },

    async sendTo(clientId: string, event: string, data: unknown): Promise<void> {
      const socket = nsp?.sockets.get(clientId)
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

    attachHttpServer(server: HttpServer | HttpsServer): void {
      // Deferred path: bind Socket.io to the API's HTTP server now that it exists,
      // so realtime shares the API port at `/socket.io/`. No-op if already bound.
      initIo(server)
    },

    async close(): Promise<void> {
      rooms.clear()
      messageHandlers.length = 0
      connectionHandlers.length = 0
      disconnectionHandlers.length = 0
      await new Promise<void>((resolve) => {
        if (!io) {
          resolve()
          return
        }
        io.close(() => {
          resolve()
        })
      })
    },
  }

  return provider
}
