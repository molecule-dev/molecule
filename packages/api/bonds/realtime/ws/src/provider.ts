/**
 * Raw WebSocket (`ws`) implementation of the molecule RealtimeProvider interface.
 *
 * Wraps the `ws` WebSocketServer to provide room-based, bidirectional
 * real-time communication conforming to `@molecule/api-realtime`.
 *
 * Clients communicate via JSON messages with `{ event, data, room? }` structure.
 *
 * Implements the client-initiated room-join protocol over the same JSON
 * framing: clients send `{ event: 'molecule:join', data: { room } }` (and
 * `molecule:leave` / `molecule:room-send`) to join/leave rooms **by name**
 * and send app messages into joined rooms. The server replies with
 * `{ event: 'molecule:joined' | 'molecule:join-denied' | 'molecule:left',
 * data: { room, … } }` frames and sends `molecule:presence` frames to the
 * room on membership changes. Joins are authorized by the guards registered
 * via `onJoinRequest` (no guards → allow; ALL must return true; a throwing
 * guard denies).
 *
 * @module
 * @remarks
 * - **Handshake auth = upgrade-request query params.** Raw WebSockets have no
 *   first-class auth payload, so the guard's `auth` is parsed from the
 *   connection URL's query string (`ws://host/?token=abc` → `{ token: 'abc' }`).
 *   Sending auth in a first message is not supported (a possible future
 *   extension); with no query params guards receive `{}`.
 * - Without a registered join guard ANY connected client may join ANY room —
 *   register `onJoinRequest` in apps with private rooms.
 * - `broadcast(roomId, …)` resolves managed rooms (by `room_N` id) first,
 *   then protocol rooms (by name); a room existing in neither throws — a
 *   protocol room ceases to exist when its last member leaves.
 * - `molecule:room-send` dispatches to `onMessage` handlers only; there is no
 *   automatic relay to the room.
 * - The managed `createRoom()`/`joinRoom()` API (`room_N` ids) is unchanged
 *   and coexists with protocol rooms; `getRooms()` returns both.
 */

import { randomUUID } from 'node:crypto'

import type { WebSocket } from 'ws'
import { WebSocketServer } from 'ws'

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

import type { WsRealtimeConfig } from './types.js'

const logger = getLogger()

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

  /** Handshake auth parsed from the upgrade request's query params. */
  auth: Record<string, unknown>

  /**
   * The upgrade request's HTTP headers. Cookie-session apps authenticate
   * joins from `headers.cookie` (the browser attaches the httpOnly session
   * cookie to the same-origin upgrade request).
   */
  headers: Record<string, string | string[] | undefined>

  /** Protocol rooms (joined by name via molecule:join). */
  protocolRooms: Set<string>
}

/**
 * Extracts a non-empty `room` string from an untrusted protocol payload.
 *
 * @param payload - The raw `data` payload received from the client.
 * @returns The room name, or `undefined` when the payload is malformed.
 */
function extractRoom(payload: unknown): string | undefined {
  if (typeof payload !== 'object' || payload === null) return undefined
  const { room } = payload as { room?: unknown }
  return typeof room === 'string' && room.length > 0 ? room : undefined
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

  /** Protocol rooms (client-joined, keyed by NAME): room → clientId → presence. */
  const protocolRooms = new Map<string, Map<string, PresenceInfo>>()

  /** Connected clients indexed by clientId. */
  const clients = new Map<string, ClientState>()

  /** Reverse lookup: WebSocket → clientId. */
  const socketToClient = new WeakMap<WebSocket, string>()

  /** Registered event handlers. */
  const messageHandlers: MessageHandler[] = []
  const connectionHandlers: ConnectionHandler[] = []
  const disconnectionHandlers: DisconnectionHandler[] = []

  /** Registered join guards for the client-initiated join protocol. */
  const joinGuards: JoinGuard[] = []

  /**
   * Sends a `{ event, data }` JSON frame to a socket if it is open.
   *
   * @param socket - The target WebSocket.
   * @param event - The frame's event name.
   * @param data - The frame's payload.
   */
  const sendFrame = (socket: WebSocket, event: string, data: unknown): void => {
    if (socket.readyState === socket.OPEN) {
      socket.send(JSON.stringify({ event, data }))
    }
  }

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
   * Sends a `molecule:presence` frame to every member of a protocol room.
   *
   * @param room - The protocol room name.
   */
  const sendProtocolPresence = (room: string): void => {
    const members = protocolRooms.get(room)
    if (!members) return
    const presence = [...members.values()].map((p) => ({ clientId: p.clientId }))
    for (const clientId of members.keys()) {
      const client = clients.get(clientId)
      if (client) sendFrame(client.socket, 'molecule:presence', { room, presence })
    }
  }

  /**
   * Removes a client from one protocol room's tracking structures.
   *
   * @param client - The client to untrack.
   * @param room - The protocol room name.
   * @returns `true` when membership actually changed.
   */
  const untrackProtocolMember = (client: ClientState, room: string): boolean => {
    const members = protocolRooms.get(room)
    const removed = members?.delete(client.clientId) ?? false
    if (members && members.size === 0) protocolRooms.delete(room)
    client.protocolRooms.delete(room)
    return removed
  }

  /**
   * Handles a reserved `molecule:*` protocol frame from a client.
   *
   * @param client - The sending client.
   * @param event - The reserved event name.
   * @param data - The frame's payload.
   */
  const handleProtocolEvent = async (
    client: ClientState,
    event: string,
    data: unknown,
  ): Promise<void> => {
    if (event === 'molecule:join') {
      const room = extractRoom(data)
      if (!room) {
        // Malformed payload — deny to the offending socket only, with an
        // empty room since no valid room name was supplied.
        sendFrame(client.socket, 'molecule:join-denied', { room: '', reason: 'invalid payload' })
        return
      }
      const verdict = await evaluateJoinGuards({
        clientId: client.clientId,
        room,
        auth: client.auth,
        headers: client.headers,
      })
      if (!verdict.allowed) {
        sendFrame(client.socket, 'molecule:join-denied', { room, reason: verdict.reason })
        return
      }
      let members = protocolRooms.get(room)
      if (!members) {
        members = new Map()
        protocolRooms.set(room, members)
      }
      const alreadyMember = members.has(client.clientId)
      if (!alreadyMember) {
        members.set(client.clientId, { clientId: client.clientId, joinedAt: new Date() })
        client.protocolRooms.add(room)
      }
      sendFrame(client.socket, 'molecule:joined', { room })
      // Re-joins are acked (idempotent) but don't re-announce unchanged presence.
      if (!alreadyMember) sendProtocolPresence(room)
      return
    }

    if (event === 'molecule:leave') {
      const room = extractRoom(data)
      if (!room) {
        // Malformed payload from a client — a protocol violation, not a
        // server error; dropped at debug level (no valid room to ack).
        logger.debug('Realtime molecule:leave with malformed payload ignored', {
          clientId: client.clientId,
        })
        return
      }
      const changed = untrackProtocolMember(client, room)
      // Ack is idempotent: leaving a room you're not in still acks.
      sendFrame(client.socket, 'molecule:left', { room })
      if (changed) sendProtocolPresence(room)
      return
    }

    if (event === 'molecule:room-send') {
      if (typeof data !== 'object' || data === null) return
      const {
        room,
        event: innerEvent,
        data: innerData,
      } = data as { room?: unknown; event?: unknown; data?: unknown }
      if (
        typeof room !== 'string' ||
        room.length === 0 ||
        typeof innerEvent !== 'string' ||
        innerEvent.length === 0
      ) {
        // Malformed payload — drop defensively (never throw out of a
        // message handler).
        return
      }
      if (!client.protocolRooms.has(room)) {
        // Sending into a room the client never protocol-joined is a client
        // protocol violation, not a server error path worth throwing. A
        // debug-level note (via the bonded logger or console fallback) is the
        // deliberate choice — visible when debugging, silent in production.
        logger.debug(
          `Realtime molecule:room-send to un-joined room "${room}" ignored (client "${client.clientId}")`,
        )
        return
      }
      for (const handler of messageHandlers) {
        handler(room, client.clientId, innerEvent, innerData)
      }
      return
    }

    // Unknown reserved event — the molecule:* namespace is reserved for the
    // protocol; drop at debug level rather than dispatching to onMessage.
    logger.debug(`Realtime unknown reserved event "${event}" ignored`, {
      clientId: client.clientId,
    })
  }

  /* ------------------------------------------------------------------ */
  /*  Wire WebSocket events to molecule handlers                         */
  /* ------------------------------------------------------------------ */

  wss.on('connection', (socket: WebSocket, request) => {
    const clientId = randomUUID()

    // Handshake auth: `ws` has no first-class auth payload, so parse the
    // upgrade request's query params (e.g. `ws://host/?token=abc` → { token }).
    const auth: Record<string, unknown> = {}
    try {
      const url = new URL(request.url ?? '/', 'ws://localhost')
      for (const [key, value] of url.searchParams) {
        auth[key] = value
      }
    } catch (error) {
      // Malformed upgrade URL — connect with empty auth; guards will see {}
      // and can deny. Debug: best-effort parse of untrusted client input.
      logger.debug('Realtime ws upgrade URL could not be parsed for auth', { error })
    }

    const client: ClientState = {
      socket,
      clientId,
      auth,
      headers: request.headers as Record<string, string | string[] | undefined>,
      protocolRooms: new Set(),
    }
    clients.set(clientId, client)
    socketToClient.set(socket, clientId)

    for (const handler of connectionHandlers) {
      handler(clientId, { remoteAddress: request.socket.remoteAddress })
    }

    socket.on('message', (raw: Buffer | ArrayBuffer | Buffer[]) => {
      const text = typeof raw === 'string' ? raw : raw.toString()

      let parsed: { event?: string; data?: unknown; room?: string }
      try {
        parsed = JSON.parse(text) as { event?: string; data?: unknown; room?: string }
      } catch (_error) {
        // Malformed JSON from a client is expected noise; drop the message silently.
        return
      }

      const event = parsed.event ?? 'message'
      const data = parsed.data

      // Reserved protocol events are handled by the protocol dispatcher —
      // never dispatched to onMessage.
      if (event.startsWith('molecule:')) {
        handleProtocolEvent(client, event, data).catch((error: unknown) => {
          // Defensive: a protocol handler must never reject unhandled. For a
          // failed join, deny so the client isn't left hanging.
          logger.error('Realtime ws protocol event handling failed', { error })
          if (event === 'molecule:join') {
            sendFrame(socket, 'molecule:join-denied', {
              room: extractRoom(data) ?? '',
              reason: 'internal error',
            })
          }
        })
        return
      }

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

      // …and dispatch for every protocol room the client has joined.
      for (const room of client.protocolRooms) {
        if (parsed.room && parsed.room !== room) {
          continue
        }
        for (const handler of messageHandlers) {
          handler(room, clientId, event, data)
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

      // Remove from all protocol rooms, announcing presence per room.
      for (const room of [...client.protocolRooms]) {
        untrackProtocolMember(client, room)
        sendProtocolPresence(room)
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
      if (state) {
        const payload = JSON.stringify({ event, data })
        for (const clientId of state.room.clients) {
          const client = clients.get(clientId)
          if (client && client.socket.readyState === client.socket.OPEN) {
            client.socket.send(payload)
          }
        }
        return
      }

      // Protocol rooms are keyed by NAME — broadcast(name, …) reaches
      // protocol-joined clients.
      const members = protocolRooms.get(roomId)
      if (members) {
        const payload = JSON.stringify({ event, data })
        for (const clientId of members.keys()) {
          const client = clients.get(clientId)
          if (client && client.socket.readyState === client.socket.OPEN) {
            client.socket.send(payload)
          }
        }
        return
      }

      throw new Error(`Room "${roomId}" does not exist`)
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

    async close(): Promise<void> {
      rooms.clear()
      protocolRooms.clear()
      clients.clear()
      messageHandlers.length = 0
      connectionHandlers.length = 0
      disconnectionHandlers.length = 0
      joinGuards.length = 0
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
