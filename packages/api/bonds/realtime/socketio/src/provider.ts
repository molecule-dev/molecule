/**
 * Socket.io implementation of the molecule RealtimeProvider interface.
 *
 * Wraps Socket.io's `Server` to provide room-based, bidirectional
 * real-time communication conforming to `@molecule/api-realtime`.
 *
 * Implements the client-initiated room-join protocol: connected clients emit
 * the reserved events `molecule:join` / `molecule:leave` / `molecule:room-send`
 * to join/leave rooms **by name** and send app messages into joined rooms. The
 * server replies with `molecule:joined` / `molecule:join-denied` /
 * `molecule:left` and emits `molecule:presence` to the room on membership
 * changes. Joins are authorized by the guards registered via `onJoinRequest`
 * (no guards → allow; ALL must return true; a throwing guard denies). The
 * guard's `auth` payload is the client's `socket.handshake.auth`.
 *
 * @module
 * @remarks
 * - Protocol rooms are Socket.io native rooms keyed by NAME — the same
 *   namespace `broadcast(roomId, ...)` emits to, so `broadcast('channel:x', …)`
 *   reaches protocol-joined clients directly.
 * - Without a registered join guard ANY connected client may join ANY room —
 *   register `onJoinRequest` in apps with private rooms.
 * - `molecule:room-send` dispatches to `onMessage` handlers only; there is no
 *   automatic relay to the room.
 * - The managed `createRoom()`/`joinRoom()` API (`room_N` ids) is unchanged
 *   and coexists with protocol rooms; `getRooms()` returns both.
 */

import type { Server as HttpServer } from 'node:http'
import type { Server as HttpsServer } from 'node:https'

import { type Namespace, Server, type Socket } from 'socket.io'

import { getLogger } from '@molecule/api-bond'
import type {
  ConnectionHandler,
  DisconnectionHandler,
  JoinGuard,
  JoinRequest,
  MessageHandler,
  PresenceInfo,
  RealtimeProvider,
  Room,
  RoomOptions,
} from '@molecule/api-realtime'

import type { SocketioRealtimeConfig } from './types.js'

const logger = getLogger()

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
 * Extracts a non-empty `room` string from an untrusted protocol payload.
 *
 * @param payload - The raw payload received from the client.
 * @returns The room name, or `undefined` when the payload is malformed.
 */
function extractRoom(payload: unknown): string | undefined {
  if (typeof payload !== 'object' || payload === null) return undefined
  const { room } = payload as { room?: unknown }
  return typeof room === 'string' && room.length > 0 ? room : undefined
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

  /** Protocol rooms (client-joined, keyed by NAME): room → clientId → presence. */
  const protocolRooms = new Map<string, Map<string, PresenceInfo>>()

  /** Reverse index for disconnect cleanup: socketId → protocol rooms joined. */
  const socketProtocolRooms = new Map<string, Set<string>>()

  /** Registered event handlers. */
  const messageHandlers: MessageHandler[] = []
  const connectionHandlers: ConnectionHandler[] = []
  const disconnectionHandlers: DisconnectionHandler[] = []

  /** Registered join guards for the client-initiated join protocol. */
  const joinGuards: JoinGuard[] = []

  // The Socket.io server + namespace are created lazily so the provider can
  // either bind eagerly (a standalone `port`, for examples / standalone use) OR
  // defer until the API's HTTP server exists and attach to it via
  // `attachHttpServer` (the server factory's path — so realtime shares the API
  // port at `/socket.io/` instead of a separate port a sandbox/proxy may not
  // expose). The same connection wiring is applied once the namespace exists.
  let io: Server | undefined
  let nsp: Namespace | undefined

  /**
   * Evaluates every registered join guard for a join request. No guards →
   * allow. Multiple guards → ALL must return true (AND). A guard that throws
   * denies the join (the error is logged, never swallowed).
   *
   * @param request - The join request under evaluation.
   * @returns The verdict, with an optional client-facing deny reason.
   */
  const evaluateJoinGuards = async (
    request: JoinRequest,
  ): Promise<{ allowed: boolean; reason?: string }> => {
    for (const guard of joinGuards) {
      try {
        if (!(await guard(request))) {
          return { allowed: false, reason: 'denied' }
        }
      } catch (error) {
        logger.warn(
          `Realtime join guard threw for room "${request.room}" (client "${request.clientId}") — denying join`,
          { error },
        )
        return { allowed: false, reason: 'guard error' }
      }
    }
    return { allowed: true }
  }

  /**
   * Emits a `molecule:presence` update to every member of a protocol room.
   *
   * @param room - The protocol room name.
   */
  const emitProtocolPresence = (room: string): void => {
    const members = protocolRooms.get(room)
    const presence = members ? [...members.values()].map((p) => ({ clientId: p.clientId })) : []
    nsp?.to(room).emit('molecule:presence', { room, presence })
  }

  /**
   * Removes a socket from one protocol room's tracking structures.
   *
   * @param socketId - The socket to untrack.
   * @param room - The protocol room name.
   * @returns `true` when membership actually changed.
   */
  const untrackProtocolMember = (socketId: string, room: string): boolean => {
    const members = protocolRooms.get(room)
    const removed = members?.delete(socketId) ?? false
    if (members && members.size === 0) protocolRooms.delete(room)
    const joined = socketProtocolRooms.get(socketId)
    joined?.delete(room)
    if (joined && joined.size === 0) socketProtocolRooms.delete(socketId)
    return removed
  }

  /**
   * Handles a `molecule:join` request from a connected socket: validates the
   * payload, evaluates guards, joins the native room, tracks presence, and
   * acks with `molecule:joined` (+ a room-wide presence update) or
   * `molecule:join-denied` (to the requesting socket only).
   *
   * @param socket - The requesting socket.
   * @param payload - The raw `{ room }` payload from the client.
   */
  const handleProtocolJoin = async (socket: Socket, payload: unknown): Promise<void> => {
    const room = extractRoom(payload)
    if (!room) {
      // Malformed payload — the deny goes only to the offending socket, with
      // an empty room since no valid room name was supplied.
      socket.emit('molecule:join-denied', { room: '', reason: 'invalid payload' })
      return
    }
    const auth: Record<string, unknown> = socket.handshake.auth ?? {}
    // Handshake headers let cookie-session apps authenticate joins: the
    // browser attaches the httpOnly session cookie to the same-origin
    // handshake request even though client JS can never read it.
    const headers = socket.handshake.headers as Record<string, string | string[] | undefined>
    const verdict = await evaluateJoinGuards({ clientId: socket.id, room, auth, headers })
    if (!verdict.allowed) {
      socket.emit('molecule:join-denied', { room, reason: verdict.reason })
      return
    }
    await socket.join(room)
    let members = protocolRooms.get(room)
    if (!members) {
      members = new Map()
      protocolRooms.set(room, members)
    }
    const alreadyMember = members.has(socket.id)
    if (!alreadyMember) {
      members.set(socket.id, { clientId: socket.id, joinedAt: new Date() })
      let joined = socketProtocolRooms.get(socket.id)
      if (!joined) {
        joined = new Set()
        socketProtocolRooms.set(socket.id, joined)
      }
      joined.add(room)
    }
    socket.emit('molecule:joined', { room })
    // Re-joins are acked (idempotent) but don't re-announce unchanged presence.
    if (!alreadyMember) emitProtocolPresence(room)
  }

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

      /* ----- Client-initiated room-join protocol (reserved events) ----- */

      socket.on('molecule:join', (payload: unknown) => {
        handleProtocolJoin(socket, payload).catch((error: unknown) => {
          // Defensive: a protocol handler must never throw/reject out of a
          // socket event. Deny the join so the client isn't left hanging.
          logger.error('Realtime molecule:join handling failed — denying join', { error })
          socket.emit('molecule:join-denied', {
            room: extractRoom(payload) ?? '',
            reason: 'internal error',
          })
        })
      })

      socket.on('molecule:leave', (payload: unknown) => {
        const room = extractRoom(payload)
        if (!room) {
          // Malformed payload from a client — a protocol violation, not a
          // server error; dropped at debug level (no valid room to ack).
          logger.debug('Realtime molecule:leave with malformed payload ignored', {
            clientId: socket.id,
          })
          return
        }
        socket.leave(room)
        const changed = untrackProtocolMember(socket.id, room)
        // Ack is idempotent: leaving a room you're not in still acks.
        socket.emit('molecule:left', { room })
        if (changed) emitProtocolPresence(room)
      })

      socket.on('molecule:room-send', (payload: unknown) => {
        if (typeof payload !== 'object' || payload === null) return
        const { room, event, data } = payload as {
          room?: unknown
          event?: unknown
          data?: unknown
        }
        if (
          typeof room !== 'string' ||
          room.length === 0 ||
          typeof event !== 'string' ||
          event.length === 0
        ) {
          // Malformed payload — drop defensively (never throw out of a
          // socket handler).
          return
        }
        if (!socketProtocolRooms.get(socket.id)?.has(room)) {
          // Sending into a room the client never protocol-joined is a client
          // protocol violation, not a server error path worth throwing. The
          // bond has no hard logger dependency, so a debug-level note (via
          // the bonded logger or console fallback) is the deliberate choice —
          // visible when debugging, silent in production logs.
          logger.debug(
            `Realtime molecule:room-send to un-joined room "${room}" ignored (client "${socket.id}")`,
          )
          return
        }
        for (const handler of messageHandlers) {
          handler(room, socket.id, event, data)
        }
      })

      socket.onAny((event: string, data: unknown) => {
        // Reserved protocol events are handled by their explicit socket.on
        // handlers above — never dispatched to onMessage.
        if (event.startsWith('molecule:')) return
        // Determine which managed rooms this socket belongs to
        for (const [roomId, state] of rooms) {
          if (state.room.clients.includes(socket.id)) {
            for (const handler of messageHandlers) {
              handler(roomId, socket.id, event, data)
            }
          }
        }
        // …and dispatch for every protocol room the socket has joined.
        const joined = socketProtocolRooms.get(socket.id)
        if (joined) {
          for (const room of joined) {
            for (const handler of messageHandlers) {
              handler(room, socket.id, event, data)
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

        // Remove from all protocol rooms, announcing presence per room.
        const joined = socketProtocolRooms.get(socket.id)
        if (joined) {
          for (const room of [...joined]) {
            untrackProtocolMember(socket.id, room)
            emitProtocolPresence(room)
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
      // Protocol rooms need no special casing: they ARE native rooms keyed
      // by name, so `nsp.to(name)` reaches protocol-joined clients too.
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

    onJoinRequest(guard: JoinGuard): void {
      joinGuards.push(guard)
    },

    async getPresence(roomId: string): Promise<PresenceInfo[]> {
      const state = rooms.get(roomId)
      if (state) {
        return [...state.presence.values()]
      }
      const members = protocolRooms.get(roomId)
      if (members) {
        return [...members.values()]
      }
      throw new Error(`Room "${roomId}" does not exist`)
    },

    async getRooms(): Promise<Room[]> {
      const managed = [...rooms.values()].map((s) => ({ ...s.room }))
      // Protocol rooms are keyed by name; surface them with id === name.
      const protocol = [...protocolRooms.entries()].map(([name, members]) => ({
        id: name,
        name,
        clients: [...members.keys()],
      }))
      return [...managed, ...protocol]
    },

    attachHttpServer(server: HttpServer | HttpsServer): void {
      // Deferred path: bind Socket.io to the API's HTTP server now that it exists,
      // so realtime shares the API port at `/socket.io/`. No-op if already bound.
      initIo(server)
    },

    async close(): Promise<void> {
      rooms.clear()
      protocolRooms.clear()
      socketProtocolRooms.clear()
      messageHandlers.length = 0
      connectionHandlers.length = 0
      disconnectionHandlers.length = 0
      joinGuards.length = 0
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
