/**
 * SSE (Server-Sent Events) implementation of the molecule RealtimeProvider interface.
 *
 * Uses native Node.js HTTP to provide a unidirectional event stream from server
 * to client, combined with HTTP POST for client-to-server messages.
 *
 * Clients connect via `GET {path}` and receive a `clientId` in the `connected`
 * event. They send messages via `POST {path}` with JSON body
 * `{ clientId, event, data, room? }`.
 *
 * Implements the client-initiated room-join protocol adapted to SSE's
 * transport shape:
 *
 * - **Join at subscribe:** `GET {path}?room=a&room=b` (repeatable; each value
 *   may also be comma-separated, and `rooms=` is accepted as an alias)
 *   requests protocol-room joins as part of establishing the stream. Each
 *   room is answered on the stream with a `molecule:joined` or
 *   `molecule:join-denied` event after the `connected` event.
 * - **Join/leave after subscribe:** `POST {path}` with
 *   `{ clientId, event: 'molecule:join' | 'molecule:leave', data: { room } }`.
 *   Verdicts/acks (`molecule:joined`, `molecule:join-denied`,
 *   `molecule:left`) are delivered on the client's SSE stream, matching the
 *   protocol's event-based contract; the POST response is `202 { ok: true }`
 *   (accepted for processing).
 * - **Room sends:** `POST {path}` with
 *   `{ clientId, event: 'molecule:room-send', data: { room, event, data } }`
 *   dispatches to `onMessage` handlers when the client has protocol-joined
 *   the room; otherwise the POST is rejected with `403` (SSE's
 *   request/response channel makes the protocol violation explicit rather
 *   than silently ignored).
 * - `molecule:presence` events are sent to every room member's stream on
 *   join/leave/disconnect.
 *
 * Joins are authorized by the guards registered via `onJoinRequest` (no
 * guards → allow; ALL must return true; a throwing guard denies).
 *
 * @module
 * @remarks
 * - **Handshake auth = subscribe query params (+ Authorization header).** The
 *   guard's `auth` payload contains every query param of the `GET {path}`
 *   subscribe request EXCEPT `room`/`rooms` (e.g. `?token=abc` →
 *   `{ token: 'abc' }`), plus the `Authorization` header (as
 *   `auth.authorization`) when present. Auth is captured once at subscribe
 *   time and reused for later POSTed joins — a POST cannot supply different
 *   credentials.
 * - Without a registered join guard ANY connected client may join ANY room —
 *   register `onJoinRequest` in apps with private rooms.
 * - `broadcast(roomId, …)` resolves managed rooms (by `room_N` id) first,
 *   then protocol rooms (by name); a room existing in neither throws — a
 *   protocol room ceases to exist when its last member disconnects/leaves.
 * - `molecule:room-send` dispatches to `onMessage` handlers only; there is no
 *   automatic relay to the room.
 * - The managed `createRoom()`/`joinRoom()` API (`room_N` ids) is unchanged
 *   and coexists with protocol rooms; `getRooms()` returns both.
 */

import { randomUUID } from 'node:crypto'
import type { IncomingMessage, Server as HttpServer, ServerResponse } from 'node:http'
import { createServer } from 'node:http'

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

import type { SseRealtimeConfig } from './types.js'

const logger = getLogger()

/**
 * Internal room state.
 */
interface RoomState {
  /** The molecule Room representation. */
  room: Room

  /** Room creation options. */
  options: RoomOptions

  /** Per-client presence metadata. */
  presence: Map<string, PresenceInfo>
}

/**
 * Internal client state tracking an SSE connection.
 */
interface ClientState {
  /** The client's unique identifier. */
  clientId: string

  /** The HTTP response used to push SSE events. */
  response: ServerResponse

  /** Handshake auth captured from the subscribe request (query params + Authorization header). */
  auth: Record<string, unknown>

  /**
   * The subscribe request's HTTP headers. Cookie-session apps authenticate
   * joins from `headers.cookie` (the browser attaches the httpOnly session
   * cookie to the same-origin subscribe request).
   */
  headers: Record<string, string | string[] | undefined>

  /** Protocol rooms (joined by name via the join protocol). */
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
 * Creates an SSE-backed {@link RealtimeProvider}.
 *
 * @param config - SSE provider configuration.
 * @returns A fully initialised `RealtimeProvider` backed by Server-Sent Events.
 */
export function createProvider(config: SseRealtimeConfig = {}): RealtimeProvider {
  const {
    port = 3000,
    path = '/sse',
    keepAliveInterval = 30_000,
    headers: customHeaders = {},
    corsOrigin = '*',
  } = config

  /** Rooms managed through the provider API. */
  const rooms = new Map<string, RoomState>()

  /** Protocol rooms (client-joined, keyed by NAME): room → clientId → presence. */
  const protocolRooms = new Map<string, Map<string, PresenceInfo>>()

  /** Connected clients indexed by clientId. */
  const clients = new Map<string, ClientState>()

  /** Registered event handlers. */
  const messageHandlers: MessageHandler[] = []
  const connectionHandlers: ConnectionHandler[] = []
  const disconnectionHandlers: DisconnectionHandler[] = []

  /** Registered join guards for the client-initiated join protocol. */
  const joinGuards: JoinGuard[] = []

  /** Keep-alive timers indexed by clientId. */
  const keepAliveTimers = new Map<string, ReturnType<typeof setInterval>>()

  /** Room ID counter. */
  let roomCounter = 0

  /* ------------------------------------------------------------------ */
  /*  SSE helpers                                                        */
  /* ------------------------------------------------------------------ */

  /**
   * Writes an SSE event to a response stream.
   *
   * @param res - Active HTTP response configured for streaming.
   * @param event - SSE event name written to the `event:` field.
   * @param data - Serializable payload written to the `data:` field.
   */
  function writeSSE(res: ServerResponse, event: string, data: unknown): void {
    if (res.writableEnded) {
      return
    }
    res.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`)
  }

  /**
   * Reads the full request body as a string.
   *
   * @param req - Incoming HTTP message whose body should be buffered.
   * @returns The concatenated UTF-8 body text.
   */
  function readBody(req: IncomingMessage): Promise<string> {
    return new Promise((resolve, reject) => {
      const chunks: Buffer[] = []
      req.on('data', (chunk: Buffer) => chunks.push(chunk))
      req.on('end', () => resolve(Buffer.concat(chunks).toString()))
      req.on('error', reject)
    })
  }

  /**
   * Builds common SSE response headers.
   *
   * @returns Header map suitable for `writeHead` on SSE responses.
   */
  function sseHeaders(): Record<string, string> {
    return {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      Connection: 'keep-alive',
      'Access-Control-Allow-Origin': corsOrigin,
      ...customHeaders,
    }
  }

  /**
   * Writes a JSON response with CORS headers.
   *
   * @param res - The HTTP response.
   * @param status - HTTP status code.
   * @param body - Serializable response body.
   */
  function respondJson(res: ServerResponse, status: number, body: unknown): void {
    res.writeHead(status, {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': corsOrigin,
    })
    res.end(JSON.stringify(body))
  }

  /* ------------------------------------------------------------------ */
  /*  Join protocol helpers                                              */
  /* ------------------------------------------------------------------ */

  /**
   * Evaluates every registered join guard for a join request. No guards →
   * allow. Multiple guards → ALL must return true (AND). A guard that throws
   * denies the join (the error is logged, never swallowed).
   *
   * @param request - The join request under evaluation.
   * @returns The verdict, with an optional client-facing deny reason.
   */
  async function evaluateJoinGuards(
    request: JoinRequest,
  ): Promise<{ allowed: boolean; reason?: string }> {
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
   * Sends a `molecule:presence` event to every member of a protocol room.
   *
   * @param room - The protocol room name.
   */
  function sendProtocolPresence(room: string): void {
    const members = protocolRooms.get(room)
    if (!members) return
    const presence = [...members.values()].map((p) => ({ clientId: p.clientId }))
    for (const clientId of members.keys()) {
      const client = clients.get(clientId)
      if (client && !client.response.writableEnded) {
        writeSSE(client.response, 'molecule:presence', { room, presence })
      }
    }
  }

  /**
   * Removes a client from one protocol room's tracking structures.
   *
   * @param client - The client to untrack.
   * @param room - The protocol room name.
   * @returns `true` when membership actually changed.
   */
  function untrackProtocolMember(client: ClientState, room: string): boolean {
    const members = protocolRooms.get(room)
    const removed = members?.delete(client.clientId) ?? false
    if (members && members.size === 0) protocolRooms.delete(room)
    client.protocolRooms.delete(room)
    return removed
  }

  /**
   * Evaluates guards for one room and joins (or denies) the client,
   * delivering the verdict on the client's SSE stream.
   *
   * @param client - The requesting client.
   * @param room - The room name to join.
   */
  async function handleProtocolJoin(client: ClientState, room: string): Promise<void> {
    const verdict = await evaluateJoinGuards({
      clientId: client.clientId,
      room,
      auth: client.auth,
      headers: client.headers,
    })
    if (client.response.writableEnded) {
      // The stream ended while guards were evaluating; nothing to join.
      return
    }
    if (!verdict.allowed) {
      writeSSE(client.response, 'molecule:join-denied', { room, reason: verdict.reason })
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
    writeSSE(client.response, 'molecule:joined', { room })
    // Re-joins are acked (idempotent) but don't re-announce unchanged presence.
    if (!alreadyMember) sendProtocolPresence(room)
  }

  /**
   * Parses requested protocol rooms from the subscribe URL: repeatable
   * `room`/`rooms` params, each value comma-splittable.
   *
   * @param url - The parsed subscribe URL.
   * @returns The (deduplicated, ordered) requested room names.
   */
  function parseRequestedRooms(url: URL): string[] {
    const requested: string[] = []
    for (const [key, value] of url.searchParams) {
      if (key !== 'room' && key !== 'rooms') continue
      for (const part of value.split(',')) {
        const room = part.trim()
        if (room && !requested.includes(room)) requested.push(room)
      }
    }
    return requested
  }

  /**
   * Handles a reserved `molecule:*` event POSTed by a client. Join/leave
   * verdicts are delivered on the SSE stream (the protocol's event-based
   * contract); the POST response only acknowledges receipt or rejects
   * malformed/unauthorized sends.
   *
   * @param client - The sending client.
   * @param event - The reserved event name.
   * @param data - The POSTed `data` payload.
   * @param res - The POST response.
   */
  function handleProtocolPost(
    client: ClientState,
    event: string,
    data: unknown,
    res: ServerResponse,
  ): void {
    if (event === 'molecule:join') {
      const room = extractRoom(data)
      if (!room) {
        respondJson(res, 400, { error: 'Invalid join payload' })
        return
      }
      respondJson(res, 202, { ok: true })
      handleProtocolJoin(client, room).catch((error: unknown) => {
        // Defensive: the verdict path writes to the stream; a failure here
        // must not go unnoticed nor leave the client hanging.
        logger.error('Realtime SSE molecule:join handling failed — denying join', { error })
        if (!client.response.writableEnded) {
          writeSSE(client.response, 'molecule:join-denied', { room, reason: 'internal error' })
        }
      })
      return
    }

    if (event === 'molecule:leave') {
      const room = extractRoom(data)
      if (!room) {
        respondJson(res, 400, { error: 'Invalid leave payload' })
        return
      }
      const changed = untrackProtocolMember(client, room)
      // Ack is idempotent: leaving a room you're not in still acks.
      writeSSE(client.response, 'molecule:left', { room })
      if (changed) sendProtocolPresence(room)
      respondJson(res, 202, { ok: true })
      return
    }

    if (event === 'molecule:room-send') {
      if (typeof data !== 'object' || data === null) {
        respondJson(res, 400, { error: 'Invalid room-send payload' })
        return
      }
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
        respondJson(res, 400, { error: 'Invalid room-send payload' })
        return
      }
      if (!client.protocolRooms.has(room)) {
        // Sending into a room the client never protocol-joined is a client
        // protocol violation. Unlike the socket transports (which have no
        // reply channel for arbitrary messages and drop it at debug level),
        // SSE's POST is request/response — reject explicitly.
        respondJson(res, 403, { error: `Not joined to room "${room}"` })
        return
      }
      for (const handler of messageHandlers) {
        handler(room, client.clientId, innerEvent, innerData)
      }
      respondJson(res, 200, { ok: true })
      return
    }

    // Unknown reserved event — the molecule:* namespace is reserved for the
    // protocol; reject rather than dispatching to onMessage.
    respondJson(res, 400, { error: `Unknown reserved event "${event}"` })
  }

  /**
   * Removes a client from all rooms and cleans up.
   *
   * @param clientId - Stable identifier for the SSE subscriber.
   * @param reason - Human-readable explanation for the disconnect.
   */
  function removeClient(clientId: string, reason: string): void {
    for (const [roomId, state] of rooms) {
      const idx = state.room.clients.indexOf(clientId)
      if (idx !== -1) {
        state.room.clients.splice(idx, 1)
        state.presence.delete(clientId)

        if (state.room.clients.length === 0 && !state.options.persistent) {
          rooms.delete(roomId)
        }
      }
    }

    // Remove from all protocol rooms, announcing presence per room.
    const client = clients.get(clientId)
    if (client) {
      for (const room of [...client.protocolRooms]) {
        untrackProtocolMember(client, room)
        sendProtocolPresence(room)
      }
    }

    const timer = keepAliveTimers.get(clientId)
    if (timer) {
      clearInterval(timer)
      keepAliveTimers.delete(clientId)
    }

    clients.delete(clientId)

    for (const handler of disconnectionHandlers) {
      handler(clientId, reason)
    }
  }

  /* ------------------------------------------------------------------ */
  /*  HTTP request handler                                               */
  /* ------------------------------------------------------------------ */

  /**
   * Primary HTTP handler that upgrades matching paths to SSE streams.
   *
   * @param req - Incoming HTTP request from Node's HTTP server.
   * @param res - HTTP response that may be converted into an event stream.
   */
  function handleRequest(req: IncomingMessage, res: ServerResponse): void {
    const url = new URL(req.url ?? '/', `http://${req.headers.host ?? 'localhost'}`)

    if (url.pathname !== path) {
      return
    }

    /* ----- CORS preflight ----- */
    if (req.method === 'OPTIONS') {
      res.writeHead(204, {
        'Access-Control-Allow-Origin': corsOrigin,
        'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type',
      })
      res.end()
      return
    }

    /* ----- SSE stream ----- */
    if (req.method === 'GET') {
      const clientId = randomUUID()

      res.writeHead(200, sseHeaders())

      // Handshake auth: every query param except the room list, plus the
      // Authorization header when present (EventSource can't set headers,
      // but fetch-based SSE clients can).
      const auth: Record<string, unknown> = {}
      for (const [key, value] of url.searchParams) {
        if (key !== 'room' && key !== 'rooms') auth[key] = value
      }
      if (typeof req.headers.authorization === 'string') {
        auth.authorization = req.headers.authorization
      }

      const client: ClientState = {
        clientId,
        response: res,
        auth,
        headers: req.headers as Record<string, string | string[] | undefined>,
        protocolRooms: new Set(),
      }
      clients.set(clientId, client)

      // Send the client their ID
      writeSSE(res, 'connected', { clientId })

      // Keep-alive heartbeat
      const timer = setInterval(() => {
        if (!res.writableEnded) {
          res.write(': keepalive\n\n')
        }
      }, keepAliveInterval)
      keepAliveTimers.set(clientId, timer)

      for (const handler of connectionHandlers) {
        handler(clientId, { remoteAddress: req.socket.remoteAddress })
      }

      // Join-at-subscribe: process ?room=/?rooms= requests sequentially so
      // per-room verdict events arrive in request order after `connected`.
      const requestedRooms = parseRequestedRooms(url)
      if (requestedRooms.length > 0) {
        void (async () => {
          for (const room of requestedRooms) {
            await handleProtocolJoin(client, room)
          }
        })().catch((error: unknown) => {
          // Defensive: subscribe-time joins must never crash the stream.
          logger.error('Realtime SSE join-at-subscribe failed', { error })
        })
      }

      req.on('close', () => {
        removeClient(clientId, 'connection closed')
      })

      return
    }

    /* ----- Client-to-server messages ----- */
    if (req.method === 'POST') {
      readBody(req)
        .then((body) => {
          let parsed: {
            clientId?: string
            event?: string
            data?: unknown
            room?: string
          }
          try {
            parsed = JSON.parse(body) as typeof parsed
          } catch (_error) {
            // Client sent malformed JSON; the 400 response fully conveys the
            // failure — the parse error itself carries no additional context
            // worth surfacing in server logs.
            respondJson(res, 400, { error: 'Invalid JSON' })
            return
          }

          if (!parsed.clientId) {
            respondJson(res, 400, { error: 'Missing clientId' })
            return
          }

          const client = clients.get(parsed.clientId)
          if (!client) {
            respondJson(res, 404, { error: 'Unknown clientId' })
            return
          }

          const event = parsed.event ?? 'message'
          const data = parsed.data

          // Reserved protocol events are handled by the protocol dispatcher —
          // never dispatched to onMessage.
          if (event.startsWith('molecule:')) {
            handleProtocolPost(client, event, data, res)
            return
          }

          for (const [roomId, state] of rooms) {
            if (parsed.room && parsed.room !== roomId) {
              continue
            }
            if (state.room.clients.includes(parsed.clientId)) {
              for (const handler of messageHandlers) {
                handler(roomId, parsed.clientId, event, data)
              }
            }
          }

          // …and dispatch for every protocol room the client has joined.
          for (const room of client.protocolRooms) {
            if (parsed.room && parsed.room !== room) {
              continue
            }
            for (const handler of messageHandlers) {
              handler(room, client.clientId, event, data)
            }
          }

          respondJson(res, 200, { ok: true })
        })
        .catch((error: unknown) => {
          // Reading the body failed (aborted/errored request) — the 500
          // response conveys it to the client; log for the server side.
          logger.debug('Realtime SSE POST body read failed', { error })
          respondJson(res, 500, { error: 'Internal error' })
        })

      return
    }

    /* ----- Unsupported method ----- */
    res.writeHead(405, { 'Access-Control-Allow-Origin': corsOrigin })
    res.end()
  }

  /* ------------------------------------------------------------------ */
  /*  Attach to HTTP server                                              */
  /* ------------------------------------------------------------------ */

  let ownServer: HttpServer | undefined

  if (config.httpServer) {
    config.httpServer.on('request', handleRequest)
  } else {
    ownServer = createServer(handleRequest)
    ownServer.listen(port)
  }

  /* ------------------------------------------------------------------ */
  /*  Provider implementation                                            */
  /* ------------------------------------------------------------------ */

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

      if (state.room.clients.length === 0 && !state.options.persistent) {
        rooms.delete(roomId)
      }
    },

    async broadcast(roomId: string, event: string, data: unknown): Promise<void> {
      const state = rooms.get(roomId)
      if (state) {
        for (const clientId of state.room.clients) {
          const client = clients.get(clientId)
          if (client && !client.response.writableEnded) {
            writeSSE(client.response, event, data)
          }
        }
        return
      }

      // Protocol rooms are keyed by NAME — broadcast(name, …) reaches
      // protocol-joined subscribers.
      const members = protocolRooms.get(roomId)
      if (members) {
        for (const clientId of members.keys()) {
          const client = clients.get(clientId)
          if (client && !client.response.writableEnded) {
            writeSSE(client.response, event, data)
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

      writeSSE(client.response, event, data)
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
      // Clear keep-alive timers
      for (const timer of keepAliveTimers.values()) {
        clearInterval(timer)
      }
      keepAliveTimers.clear()

      // End all client connections
      for (const client of clients.values()) {
        if (!client.response.writableEnded) {
          client.response.end()
        }
      }

      rooms.clear()
      protocolRooms.clear()
      clients.clear()
      messageHandlers.length = 0
      connectionHandlers.length = 0
      disconnectionHandlers.length = 0
      joinGuards.length = 0

      if (ownServer) {
        await new Promise<void>((resolve, reject) => {
          ownServer!.close((err) => {
            if (err) {
              reject(err)
            } else {
              resolve()
            }
          })
        })
      }
    },
  }

  return provider
}
