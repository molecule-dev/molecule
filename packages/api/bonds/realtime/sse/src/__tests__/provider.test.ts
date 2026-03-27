import { createServer } from 'node:http'
import type { Server as HttpServer, IncomingMessage, ServerResponse } from 'node:http'
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

import type {
  RealtimeProvider,
  ConnectionHandler,
  DisconnectionHandler,
  MessageHandler,
} from '@molecule/api-realtime'

import { createProvider } from '../provider.js'

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

/**
 * Creates a mock SSE response that captures written data.
 */
/**
 * Minimal mock of a ServerResponse for testing SSE writes.
 */
interface MockResponse {
  _chunks: string[]
  _headers: Record<string, string | number>
  _statusCode: number
  _ended: boolean
  writableEnded: boolean
  writeHead(code: number, hdrs?: Record<string, string>): MockResponse
  write(chunk: string): boolean
  end(data?: string): void
}

function createMockResponse(): MockResponse {
  const chunks: string[] = []
  const headers: Record<string, string | number> = {}

  const res: MockResponse = {
    _chunks: chunks,
    _headers: headers,
    _statusCode: 200,
    _ended: false,
    writableEnded: false,
    writeHead(code: number, hdrs?: Record<string, string>) {
      res._statusCode = code
      if (hdrs) {
        Object.assign(headers, hdrs)
      }
      return res
    },
    write(chunk: string) {
      chunks.push(chunk)
      return true
    },
    end(data?: string) {
      if (data) chunks.push(data)
      res._ended = true
      res.writableEnded = true
    },
  }

  return res
}

/**
 * Creates a mock IncomingMessage for GET (SSE connection) requests.
 */
function createMockGetRequest(
  path: string,
  remoteAddress = '127.0.0.1',
): IncomingMessage & { _closeHandlers: Array<() => void> } {
  const closeHandlers: Array<() => void> = []
  const req = {
    method: 'GET',
    url: path,
    headers: { host: 'localhost:3000' },
    socket: { remoteAddress },
    on: vi.fn((event: string, handler: () => void) => {
      if (event === 'close') {
        closeHandlers.push(handler)
      }
    }),
    _closeHandlers: closeHandlers,
  } as unknown as IncomingMessage & { _closeHandlers: Array<() => void> }

  return req
}

/**
 * Creates a mock IncomingMessage for POST (message) requests.
 */
function createMockPostRequest(path: string, body: unknown): IncomingMessage {
  const bodyStr = JSON.stringify(body)
  const handlers: Record<string, Array<(...args: unknown[]) => void>> = {}

  const req = {
    method: 'POST',
    url: path,
    headers: { host: 'localhost:3000', 'content-type': 'application/json' },
    socket: { remoteAddress: '127.0.0.1' },
    on: vi.fn((event: string, handler: (...args: unknown[]) => void) => {
      if (!handlers[event]) handlers[event] = []
      handlers[event].push(handler)
    }),
  } as unknown as IncomingMessage

  // Simulate data + end events after a microtask
  queueMicrotask(() => {
    for (const handler of handlers['data'] ?? []) {
      handler(Buffer.from(bodyStr))
    }
    for (const handler of handlers['end'] ?? []) {
      handler()
    }
  })

  return req
}

/**
 * Creates a mock POST request with invalid JSON.
 */
function createMockBadPostRequest(path: string, rawBody: string): IncomingMessage {
  const handlers: Record<string, Array<(...args: unknown[]) => void>> = {}

  const req = {
    method: 'POST',
    url: path,
    headers: { host: 'localhost:3000', 'content-type': 'application/json' },
    socket: { remoteAddress: '127.0.0.1' },
    on: vi.fn((event: string, handler: (...args: unknown[]) => void) => {
      if (!handlers[event]) handlers[event] = []
      handlers[event].push(handler)
    }),
  } as unknown as IncomingMessage

  queueMicrotask(() => {
    for (const handler of handlers['data'] ?? []) {
      handler(Buffer.from(rawBody))
    }
    for (const handler of handlers['end'] ?? []) {
      handler()
    }
  })

  return req
}

/* ------------------------------------------------------------------ */
/*  Tests — standalone mode (no httpServer)                            */
/* ------------------------------------------------------------------ */

describe('@molecule/api-realtime-sse', () => {
  /**
   * For the provider tests we use httpServer mode so we can intercept
   * requests programmatically via the `request` event handler.
   */
  let httpServer: HttpServer
  let provider: RealtimeProvider
  let requestHandler: (req: IncomingMessage, res: ServerResponse) => void

  beforeEach(() => {
    httpServer = createServer()
    provider = createProvider({ httpServer, path: '/sse' })

    // Capture the request handler attached by createProvider
    const listeners = httpServer.listeners('request') as Array<
      (req: IncomingMessage, res: ServerResponse) => void
    >
    requestHandler = listeners[listeners.length - 1]
  })

  afterEach(async () => {
    await provider.close()
    httpServer.close()
  })

  /**
   * Simulates a GET /sse to establish an SSE connection.
   * Returns the mock objects and the assigned clientId.
   */
  function simulateSSEConnection(remoteAddress?: string) {
    const req = createMockGetRequest('/sse', remoteAddress)
    const res = createMockResponse()
    requestHandler(req, res as unknown as ServerResponse)

    // writeSSE produces a single chunk: "event: connected\ndata: {...}\n\n"
    let clientId = ''
    for (const chunk of res._chunks) {
      const dataMatch = /event: connected\ndata: (.+)\n/.exec(chunk)
      if (dataMatch) {
        const parsed = JSON.parse(dataMatch[1]) as { clientId: string }
        clientId = parsed.clientId
        break
      }
    }

    return { req, res, clientId }
  }

  /**
   * Simulates a POST /sse with a JSON body and returns the response.
   */
  async function simulatePost(body: unknown): Promise<MockResponse> {
    const req = createMockPostRequest('/sse', body)
    const res = createMockResponse()
    requestHandler(req, res as unknown as ServerResponse)
    // Wait for the async body read
    await new Promise((resolve) => setTimeout(resolve, 10))
    return res
  }

  describe('SSE connection', () => {
    it('responds with SSE headers on GET', () => {
      const { res } = simulateSSEConnection()
      expect(res._headers['Content-Type']).toBe('text/event-stream')
      expect(res._headers['Cache-Control']).toBe('no-cache')
      expect(res._headers['Connection']).toBe('keep-alive')
      expect(res._statusCode).toBe(200)
    })

    it('sends a connected event with clientId', () => {
      const { clientId } = simulateSSEConnection()
      expect(clientId).toBeTruthy()
    })

    it('calls connection handlers on GET', () => {
      const handler = vi.fn<ConnectionHandler>()
      provider.onConnection(handler)

      const { clientId } = simulateSSEConnection()
      expect(handler).toHaveBeenCalledWith(clientId, { remoteAddress: '127.0.0.1' })
    })

    it('calls disconnection handlers when connection closes', () => {
      const discHandler = vi.fn<DisconnectionHandler>()
      provider.onDisconnection(discHandler)

      const { req, clientId } = simulateSSEConnection()

      // Simulate connection close
      for (const handler of req._closeHandlers) {
        handler()
      }

      expect(discHandler).toHaveBeenCalledWith(clientId, 'connection closed')
    })
  })

  describe('createRoom', () => {
    it('creates a room with a unique id', async () => {
      const room = await provider.createRoom('test-room')
      expect(room).toEqual({
        id: expect.stringMatching(/^room_\d+$/),
        name: 'test-room',
        clients: [],
        metadata: undefined,
      })
    })

    it('creates rooms with incrementing ids', async () => {
      const room1 = await provider.createRoom('room-1')
      const room2 = await provider.createRoom('room-2')
      expect(room1.id).not.toBe(room2.id)
    })

    it('attaches metadata from options', async () => {
      const room = await provider.createRoom('meta-room', {
        metadata: { topic: 'testing' },
      })
      expect(room.metadata).toEqual({ topic: 'testing' })
    })
  })

  describe('joinRoom', () => {
    it('adds a client to the room', async () => {
      const room = await provider.createRoom('join-test')
      const { clientId } = simulateSSEConnection()

      await provider.joinRoom(room.id, clientId)
      const presence = await provider.getPresence(room.id)
      expect(presence).toHaveLength(1)
      expect(presence[0].clientId).toBe(clientId)
    })

    it('throws when room does not exist', async () => {
      await expect(provider.joinRoom('nonexistent', 'client-1')).rejects.toThrow(
        'Room "nonexistent" does not exist',
      )
    })

    it('throws when room is full', async () => {
      const room = await provider.createRoom('full-room', { maxClients: 1 })
      const { clientId: cid1 } = simulateSSEConnection()
      const { clientId: cid2 } = simulateSSEConnection()

      await provider.joinRoom(room.id, cid1)
      await expect(provider.joinRoom(room.id, cid2)).rejects.toThrow('is full')
    })

    it('is idempotent when client already in room', async () => {
      const room = await provider.createRoom('idempotent')
      const { clientId } = simulateSSEConnection()

      await provider.joinRoom(room.id, clientId)
      await provider.joinRoom(room.id, clientId)

      const presence = await provider.getPresence(room.id)
      expect(presence).toHaveLength(1)
    })
  })

  describe('leaveRoom', () => {
    it('removes a client from the room', async () => {
      const room = await provider.createRoom('leave-test', { persistent: true })
      const { clientId } = simulateSSEConnection()

      await provider.joinRoom(room.id, clientId)
      await provider.leaveRoom(room.id, clientId)

      const presence = await provider.getPresence(room.id)
      expect(presence).toHaveLength(0)
    })

    it('throws when room does not exist', async () => {
      await expect(provider.leaveRoom('nonexistent', 'c1')).rejects.toThrow(
        'Room "nonexistent" does not exist',
      )
    })

    it('is a no-op when client not in room', async () => {
      const room = await provider.createRoom('noop-leave', { persistent: true })
      await expect(provider.leaveRoom(room.id, 'c1')).resolves.toBeUndefined()
    })

    it('removes non-persistent room when empty', async () => {
      const room = await provider.createRoom('temp-room')
      const { clientId } = simulateSSEConnection()

      await provider.joinRoom(room.id, clientId)
      await provider.leaveRoom(room.id, clientId)

      const allRooms = await provider.getRooms()
      expect(allRooms.find((r) => r.id === room.id)).toBeUndefined()
    })

    it('keeps persistent room when empty', async () => {
      const room = await provider.createRoom('persist-room', { persistent: true })
      const { clientId } = simulateSSEConnection()

      await provider.joinRoom(room.id, clientId)
      await provider.leaveRoom(room.id, clientId)

      const allRooms = await provider.getRooms()
      expect(allRooms.find((r) => r.id === room.id)).toBeDefined()
    })
  })

  describe('broadcast', () => {
    it('sends SSE events to all clients in the room', async () => {
      const room = await provider.createRoom('broadcast-test')
      const { clientId: cid1, res: res1 } = simulateSSEConnection()
      const { clientId: cid2, res: res2 } = simulateSSEConnection()

      await provider.joinRoom(room.id, cid1)
      await provider.joinRoom(room.id, cid2)

      await provider.broadcast(room.id, 'chat:message', { text: 'hello' })

      // writeSSE produces a single chunk: "event: ...\ndata: ...\n\n"
      const expected = `event: chat:message\ndata: ${JSON.stringify({ text: 'hello' })}\n\n`

      expect(res1._chunks).toContain(expected)
      expect(res2._chunks).toContain(expected)
    })

    it('throws when room does not exist', async () => {
      await expect(provider.broadcast('nonexistent', 'ev', {})).rejects.toThrow(
        'Room "nonexistent" does not exist',
      )
    })

    it('skips clients with ended connections', async () => {
      const room = await provider.createRoom('broadcast-closed')
      const { clientId, res } = simulateSSEConnection()

      await provider.joinRoom(room.id, clientId)

      // Simulate ended connection
      res.writableEnded = true
      const chunksBefore = res._chunks.length

      await provider.broadcast(room.id, 'ev', {})

      // No new chunks should have been written
      expect(res._chunks.length).toBe(chunksBefore)
    })
  })

  describe('sendTo', () => {
    it('sends an SSE event directly to the client', async () => {
      const { clientId, res } = simulateSSEConnection()

      await provider.sendTo(clientId, 'private:msg', { data: 42 })

      const expected = `event: private:msg\ndata: ${JSON.stringify({ data: 42 })}\n\n`
      expect(res._chunks).toContain(expected)
    })

    it('throws when client is not connected', async () => {
      await expect(provider.sendTo('nonexistent', 'ev', {})).rejects.toThrow(
        'Client "nonexistent" is not connected',
      )
    })
  })

  describe('client-to-server messages (POST)', () => {
    it('routes POST messages to message handlers', async () => {
      const handler = vi.fn<MessageHandler>()
      provider.onMessage(handler)

      const room = await provider.createRoom('msg-test')
      const { clientId } = simulateSSEConnection()
      await provider.joinRoom(room.id, clientId)

      const res = await simulatePost({
        clientId,
        event: 'chat',
        data: { text: 'hi' },
      })

      expect(res._statusCode).toBe(200)
      expect(handler).toHaveBeenCalledWith(room.id, clientId, 'chat', { text: 'hi' })
    })

    it('uses "message" as default event', async () => {
      const handler = vi.fn<MessageHandler>()
      provider.onMessage(handler)

      const room = await provider.createRoom('default-event')
      const { clientId } = simulateSSEConnection()
      await provider.joinRoom(room.id, clientId)

      await simulatePost({ clientId, data: { text: 'hi' } })

      expect(handler).toHaveBeenCalledWith(room.id, clientId, 'message', { text: 'hi' })
    })

    it('returns 400 for invalid JSON', async () => {
      const req = createMockBadPostRequest('/sse', 'not json')
      const res = createMockResponse()
      requestHandler(req, res as unknown as ServerResponse)
      await new Promise((resolve) => setTimeout(resolve, 10))

      expect(res._statusCode).toBe(400)
    })

    it('returns 400 when clientId is missing', async () => {
      const res = await simulatePost({ event: 'chat', data: {} })
      expect(res._statusCode).toBe(400)
    })

    it('returns 404 when clientId is unknown', async () => {
      const res = await simulatePost({
        clientId: 'unknown-id',
        event: 'chat',
        data: {},
      })
      expect(res._statusCode).toBe(404)
    })

    it('routes messages to specific room when room is specified', async () => {
      const handler = vi.fn<MessageHandler>()
      provider.onMessage(handler)

      const room1 = await provider.createRoom('room-1')
      const room2 = await provider.createRoom('room-2')
      const { clientId } = simulateSSEConnection()

      await provider.joinRoom(room1.id, clientId)
      await provider.joinRoom(room2.id, clientId)

      await simulatePost({
        clientId,
        event: 'chat',
        data: 'hello',
        room: room1.id,
      })

      expect(handler).toHaveBeenCalledTimes(1)
      expect(handler).toHaveBeenCalledWith(room1.id, clientId, 'chat', 'hello')
    })
  })

  describe('CORS', () => {
    it('handles OPTIONS preflight requests', () => {
      const req = {
        method: 'OPTIONS',
        url: '/sse',
        headers: { host: 'localhost:3000' },
        socket: { remoteAddress: '127.0.0.1' },
        on: vi.fn(),
      } as unknown as IncomingMessage
      const res = createMockResponse()

      requestHandler(req, res as unknown as ServerResponse)

      expect(res._statusCode).toBe(204)
      expect(res._headers['Access-Control-Allow-Origin']).toBe('*')
    })

    it('returns 405 for unsupported methods', () => {
      const req = {
        method: 'PUT',
        url: '/sse',
        headers: { host: 'localhost:3000' },
        socket: { remoteAddress: '127.0.0.1' },
        on: vi.fn(),
      } as unknown as IncomingMessage
      const res = createMockResponse()

      requestHandler(req, res as unknown as ServerResponse)

      expect(res._statusCode).toBe(405)
    })

    it('ignores requests to non-matching paths', () => {
      const req = {
        method: 'GET',
        url: '/other',
        headers: { host: 'localhost:3000' },
        socket: { remoteAddress: '127.0.0.1' },
        on: vi.fn(),
      } as unknown as IncomingMessage
      const res = createMockResponse()

      requestHandler(req, res as unknown as ServerResponse)

      // Should not have written any SSE headers
      expect(res._statusCode).toBe(200) // Default, unchanged
      expect(res._chunks).toHaveLength(0)
    })
  })

  describe('disconnection cleanup', () => {
    it('removes client from rooms on disconnect', async () => {
      const room = await provider.createRoom('disconnect-test', { persistent: true })
      const { req, clientId } = simulateSSEConnection()

      await provider.joinRoom(room.id, clientId)

      // Simulate connection close
      for (const handler of req._closeHandlers) {
        handler()
      }

      const presence = await provider.getPresence(room.id)
      expect(presence).toHaveLength(0)
    })

    it('removes non-persistent rooms when last client disconnects', async () => {
      const room = await provider.createRoom('cleanup-room')
      const { req, clientId } = simulateSSEConnection()

      await provider.joinRoom(room.id, clientId)

      for (const handler of req._closeHandlers) {
        handler()
      }

      const allRooms = await provider.getRooms()
      expect(allRooms.find((r) => r.id === room.id)).toBeUndefined()
    })
  })

  describe('getPresence', () => {
    it('returns presence info for all clients in a room', async () => {
      const room = await provider.createRoom('presence-test')
      const { clientId: cid1 } = simulateSSEConnection()
      const { clientId: cid2 } = simulateSSEConnection()

      await provider.joinRoom(room.id, cid1)
      await provider.joinRoom(room.id, cid2)

      const presence = await provider.getPresence(room.id)
      expect(presence).toHaveLength(2)
      expect(presence.map((p) => p.clientId).sort()).toEqual([cid1, cid2].sort())
      expect(presence[0].joinedAt).toBeInstanceOf(Date)
    })

    it('throws when room does not exist', async () => {
      await expect(provider.getPresence('nonexistent')).rejects.toThrow(
        'Room "nonexistent" does not exist',
      )
    })
  })

  describe('getRooms', () => {
    it('returns all managed rooms', async () => {
      await provider.createRoom('room-a')
      await provider.createRoom('room-b')

      const allRooms = await provider.getRooms()
      expect(allRooms).toHaveLength(2)
      expect(allRooms.map((r) => r.name).sort()).toEqual(['room-a', 'room-b'])
    })

    it('returns an empty array when no rooms exist', async () => {
      const allRooms = await provider.getRooms()
      expect(allRooms).toEqual([])
    })
  })

  describe('close', () => {
    it('clears all rooms and clients', async () => {
      await provider.createRoom('close-test')
      simulateSSEConnection()

      await provider.close()

      const allRooms = await provider.getRooms()
      expect(allRooms).toEqual([])
    })
  })
})
