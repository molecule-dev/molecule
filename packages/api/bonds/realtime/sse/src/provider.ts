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
 * @module
 */

import { randomUUID } from 'node:crypto'
import type { IncomingMessage, Server as HttpServer, ServerResponse } from 'node:http'
import { createServer } from 'node:http'

import type {
  ConnectionHandler,
  DisconnectionHandler,
  MessageHandler,
  PresenceInfo,
  RealtimeProvider,
  Room,
  RoomOptions,
} from '@molecule/api-realtime'

import type { SseRealtimeConfig } from './types.js'

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

  /** Connected clients indexed by clientId. */
  const clients = new Map<string, ClientState>()

  /** Registered event handlers. */
  const messageHandlers: MessageHandler[] = []
  const connectionHandlers: ConnectionHandler[] = []
  const disconnectionHandlers: DisconnectionHandler[] = []

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

      clients.set(clientId, { clientId, response: res })

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
          } catch {
            res.writeHead(400, {
              'Content-Type': 'application/json',
              'Access-Control-Allow-Origin': corsOrigin,
            })
            res.end(JSON.stringify({ error: 'Invalid JSON' }))
            return
          }

          if (!parsed.clientId) {
            res.writeHead(400, {
              'Content-Type': 'application/json',
              'Access-Control-Allow-Origin': corsOrigin,
            })
            res.end(JSON.stringify({ error: 'Missing clientId' }))
            return
          }

          if (!clients.has(parsed.clientId)) {
            res.writeHead(404, {
              'Content-Type': 'application/json',
              'Access-Control-Allow-Origin': corsOrigin,
            })
            res.end(JSON.stringify({ error: 'Unknown clientId' }))
            return
          }

          const event = parsed.event ?? 'message'
          const data = parsed.data

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

          res.writeHead(200, {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': corsOrigin,
          })
          res.end(JSON.stringify({ ok: true }))
        })
        .catch(() => {
          res.writeHead(500, {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': corsOrigin,
          })
          res.end(JSON.stringify({ error: 'Internal error' }))
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
      if (!state) {
        throw new Error(`Room "${roomId}" does not exist`)
      }

      for (const clientId of state.room.clients) {
        const client = clients.get(clientId)
        if (client && !client.response.writableEnded) {
          writeSSE(client.response, event, data)
        }
      }
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
      clients.clear()
      messageHandlers.length = 0
      connectionHandlers.length = 0
      disconnectionHandlers.length = 0

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
