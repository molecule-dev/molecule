import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

import type {
  RealtimeProvider,
  ConnectionHandler,
  DisconnectionHandler,
  MessageHandler,
} from '@molecule/api-realtime'

/* ------------------------------------------------------------------ */
/*  Mock ws                                                            */
/* ------------------------------------------------------------------ */

const { MockWebSocketServer, mockServerInstances } = vi.hoisted(() => {
  const mockServerInstances: Array<{
    on: ReturnType<typeof vi.fn>
    close: ReturnType<typeof vi.fn>
    clients: Set<unknown>
  }> = []

  const MockWebSocketServer = vi.fn(function MockWSServerCtor() {
    const instance = {
      on: vi.fn(),
      close: vi.fn((cb?: (err?: Error) => void) => {
        if (cb) cb()
      }),
      clients: new Set(),
    }
    mockServerInstances.push(instance)
    return instance
  })

  return { MockWebSocketServer, mockServerInstances }
})

vi.mock('ws', () => ({
  WebSocketServer: MockWebSocketServer,
}))

vi.mock('node:crypto', () => ({
  randomUUID: (() => {
    let counter = 0
    return () => {
      counter += 1
      return `client-${String(counter)}`
    }
  })(),
}))

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

const OPEN = 1

function createMockSocket(remoteAddress = '127.0.0.1') {
  const handlers = new Map<string, Array<(...args: unknown[]) => void>>()
  const socket = {
    readyState: OPEN,
    OPEN,
    send: vi.fn(),
    on: vi.fn((event: string, handler: (...args: unknown[]) => void) => {
      const list = handlers.get(event) ?? []
      list.push(handler)
      handlers.set(event, list)
    }),
    _handlers: handlers,
  }
  const request = {
    socket: { remoteAddress },
  }
  return { socket, request }
}

function simulateConnection(
  serverInstance: (typeof mockServerInstances)[0],
  mockSocket: ReturnType<typeof createMockSocket>['socket'],
  request: ReturnType<typeof createMockSocket>['request'],
) {
  const connectionCall = serverInstance.on.mock.calls.find(
    (call: unknown[]) => call[0] === 'connection',
  )
  if (connectionCall) {
    ;(connectionCall[1] as (socket: unknown, req: unknown) => void)(mockSocket, request)
  }
}

function simulateMessage(mockSocket: ReturnType<typeof createMockSocket>['socket'], data: unknown) {
  const messageHandlers = mockSocket._handlers.get('message') ?? []
  const payload = Buffer.from(JSON.stringify(data))
  for (const handler of messageHandlers) {
    handler(payload)
  }
}

function simulateClose(mockSocket: ReturnType<typeof createMockSocket>['socket'], code = 1000) {
  const closeHandlers = mockSocket._handlers.get('close') ?? []
  for (const handler of closeHandlers) {
    handler(code)
  }
}

/* ------------------------------------------------------------------ */
/*  Tests                                                              */
/* ------------------------------------------------------------------ */

describe('@molecule/api-realtime-ws', () => {
  let provider: RealtimeProvider
  let serverInstance: (typeof mockServerInstances)[0]

  beforeEach(async () => {
    vi.clearAllMocks()
    mockServerInstances.length = 0

    const { createProvider } = await import('../provider.js')
    provider = createProvider({ port: 4000 })
    serverInstance = mockServerInstances[0]
  })

  afterEach(async () => {
    try {
      await provider.close()
    } catch {
      // already closed
    }
  })

  describe('createProvider', () => {
    it('creates a WebSocket server with provided port', () => {
      expect(MockWebSocketServer).toHaveBeenCalledWith(expect.objectContaining({ port: 4000 }))
    })

    it('creates a server with an http server when provided', async () => {
      vi.clearAllMocks()
      mockServerInstances.length = 0
      const httpServer = {} as import('node:http').Server
      const { createProvider } = await import('../provider.js')
      createProvider({ httpServer })
      expect(MockWebSocketServer).toHaveBeenCalledWith(
        expect.objectContaining({ server: httpServer }),
      )
    })

    it('uses default port 3000 when no config provided', async () => {
      vi.clearAllMocks()
      mockServerInstances.length = 0
      const { createProvider } = await import('../provider.js')
      createProvider()
      expect(MockWebSocketServer).toHaveBeenCalledWith(expect.objectContaining({ port: 3000 }))
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
      const { socket, request } = createMockSocket()
      simulateConnection(serverInstance, socket, request)

      // The client gets assigned an ID via randomUUID mock
      const presence = await provider.getPresence(room.id)
      expect(presence).toHaveLength(0)

      // We need to know the clientId. We can get it from the connection handler.
      let connectedClientId = ''
      const connHandler = vi.fn<ConnectionHandler>((cid) => {
        connectedClientId = cid
      })
      provider.onConnection(connHandler)

      const { socket: s2, request: r2 } = createMockSocket()
      simulateConnection(serverInstance, s2, r2)
      expect(connectedClientId).toBeTruthy()

      await provider.joinRoom(room.id, connectedClientId)
      const updatedPresence = await provider.getPresence(room.id)
      expect(updatedPresence).toHaveLength(1)
      expect(updatedPresence[0].clientId).toBe(connectedClientId)
    })

    it('throws when room does not exist', async () => {
      await expect(provider.joinRoom('nonexistent', 'client-1')).rejects.toThrow(
        'Room "nonexistent" does not exist',
      )
    })

    it('throws when room is full', async () => {
      const room = await provider.createRoom('full-room', { maxClients: 1 })

      const connHandler = vi.fn<ConnectionHandler>()
      provider.onConnection(connHandler)

      const { socket: s1, request: r1 } = createMockSocket()
      simulateConnection(serverInstance, s1, r1)
      const cid1 = connHandler.mock.calls[0][0]

      const { socket: s2, request: r2 } = createMockSocket()
      simulateConnection(serverInstance, s2, r2)
      const cid2 = connHandler.mock.calls[1][0]

      await provider.joinRoom(room.id, cid1)
      await expect(provider.joinRoom(room.id, cid2)).rejects.toThrow('is full')
    })

    it('is idempotent when client already in room', async () => {
      const room = await provider.createRoom('idempotent')
      const connHandler = vi.fn<ConnectionHandler>()
      provider.onConnection(connHandler)

      const { socket, request } = createMockSocket()
      simulateConnection(serverInstance, socket, request)
      const cid = connHandler.mock.calls[0][0]

      await provider.joinRoom(room.id, cid)
      await provider.joinRoom(room.id, cid)

      const presence = await provider.getPresence(room.id)
      expect(presence).toHaveLength(1)
    })
  })

  describe('leaveRoom', () => {
    it('removes a client from the room', async () => {
      const room = await provider.createRoom('leave-test', { persistent: true })
      const connHandler = vi.fn<ConnectionHandler>()
      provider.onConnection(connHandler)

      const { socket, request } = createMockSocket()
      simulateConnection(serverInstance, socket, request)
      const cid = connHandler.mock.calls[0][0]

      await provider.joinRoom(room.id, cid)
      await provider.leaveRoom(room.id, cid)

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
      const connHandler = vi.fn<ConnectionHandler>()
      provider.onConnection(connHandler)

      const { socket, request } = createMockSocket()
      simulateConnection(serverInstance, socket, request)
      const cid = connHandler.mock.calls[0][0]

      await provider.joinRoom(room.id, cid)
      await provider.leaveRoom(room.id, cid)

      const allRooms = await provider.getRooms()
      expect(allRooms.find((r) => r.id === room.id)).toBeUndefined()
    })

    it('keeps persistent room when empty', async () => {
      const room = await provider.createRoom('persist-room', { persistent: true })
      const connHandler = vi.fn<ConnectionHandler>()
      provider.onConnection(connHandler)

      const { socket, request } = createMockSocket()
      simulateConnection(serverInstance, socket, request)
      const cid = connHandler.mock.calls[0][0]

      await provider.joinRoom(room.id, cid)
      await provider.leaveRoom(room.id, cid)

      const allRooms = await provider.getRooms()
      expect(allRooms.find((r) => r.id === room.id)).toBeDefined()
    })
  })

  describe('broadcast', () => {
    it('sends to all clients in the room via WebSocket', async () => {
      const room = await provider.createRoom('broadcast-test')
      const connHandler = vi.fn<ConnectionHandler>()
      provider.onConnection(connHandler)

      const { socket: s1, request: r1 } = createMockSocket()
      simulateConnection(serverInstance, s1, r1)
      const cid1 = connHandler.mock.calls[0][0]

      const { socket: s2, request: r2 } = createMockSocket()
      simulateConnection(serverInstance, s2, r2)
      const cid2 = connHandler.mock.calls[1][0]

      await provider.joinRoom(room.id, cid1)
      await provider.joinRoom(room.id, cid2)

      await provider.broadcast(room.id, 'chat:message', { text: 'hello' })

      const expected = JSON.stringify({ event: 'chat:message', data: { text: 'hello' } })
      expect(s1.send).toHaveBeenCalledWith(expected)
      expect(s2.send).toHaveBeenCalledWith(expected)
    })

    it('throws when room does not exist', async () => {
      await expect(provider.broadcast('nonexistent', 'ev', {})).rejects.toThrow(
        'Room "nonexistent" does not exist',
      )
    })

    it('skips clients with closed connections', async () => {
      const room = await provider.createRoom('broadcast-closed')
      const connHandler = vi.fn<ConnectionHandler>()
      provider.onConnection(connHandler)

      const { socket: s1, request: r1 } = createMockSocket()
      simulateConnection(serverInstance, s1, r1)
      const cid1 = connHandler.mock.calls[0][0]

      await provider.joinRoom(room.id, cid1)

      // Simulate closed connection
      s1.readyState = 3 // CLOSED

      await provider.broadcast(room.id, 'ev', {})
      expect(s1.send).not.toHaveBeenCalled()
    })
  })

  describe('sendTo', () => {
    it('sends directly to the client socket', async () => {
      const connHandler = vi.fn<ConnectionHandler>()
      provider.onConnection(connHandler)

      const { socket, request } = createMockSocket()
      simulateConnection(serverInstance, socket, request)
      const cid = connHandler.mock.calls[0][0]

      await provider.sendTo(cid, 'private:msg', { data: 42 })

      const expected = JSON.stringify({ event: 'private:msg', data: { data: 42 } })
      expect(socket.send).toHaveBeenCalledWith(expected)
    })

    it('throws when client is not connected', async () => {
      await expect(provider.sendTo('nonexistent', 'ev', {})).rejects.toThrow(
        'Client "nonexistent" is not connected',
      )
    })
  })

  describe('onConnection / onDisconnection', () => {
    it('calls connection handlers when a socket connects', () => {
      const handler = vi.fn<ConnectionHandler>()
      provider.onConnection(handler)

      const { socket, request } = createMockSocket()
      simulateConnection(serverInstance, socket, request)

      expect(handler).toHaveBeenCalledWith(expect.any(String), { remoteAddress: '127.0.0.1' })
    })

    it('calls disconnection handlers when a socket disconnects', () => {
      const discHandler = vi.fn<DisconnectionHandler>()
      provider.onDisconnection(discHandler)

      const connHandler = vi.fn<ConnectionHandler>()
      provider.onConnection(connHandler)

      const { socket, request } = createMockSocket()
      simulateConnection(serverInstance, socket, request)
      const cid = connHandler.mock.calls[0][0]

      simulateClose(socket, 1000)

      expect(discHandler).toHaveBeenCalledWith(cid, 'close:1000')
    })

    it('removes client from rooms on disconnect', async () => {
      const room = await provider.createRoom('disconnect-test', { persistent: true })
      const connHandler = vi.fn<ConnectionHandler>()
      provider.onConnection(connHandler)

      const { socket, request } = createMockSocket()
      simulateConnection(serverInstance, socket, request)
      const cid = connHandler.mock.calls[0][0]

      await provider.joinRoom(room.id, cid)
      simulateClose(socket, 1000)

      const presence = await provider.getPresence(room.id)
      expect(presence).toHaveLength(0)
    })
  })

  describe('onMessage', () => {
    it('calls message handlers for events from clients in managed rooms', async () => {
      const handler = vi.fn<MessageHandler>()
      provider.onMessage(handler)

      const room = await provider.createRoom('msg-test')
      const connHandler = vi.fn<ConnectionHandler>()
      provider.onConnection(connHandler)

      const { socket, request } = createMockSocket()
      simulateConnection(serverInstance, socket, request)
      const cid = connHandler.mock.calls[0][0]

      await provider.joinRoom(room.id, cid)

      simulateMessage(socket, { event: 'chat', data: { text: 'hi' } })

      expect(handler).toHaveBeenCalledWith(room.id, cid, 'chat', { text: 'hi' })
    })

    it('uses "message" as default event when not specified', async () => {
      const handler = vi.fn<MessageHandler>()
      provider.onMessage(handler)

      const room = await provider.createRoom('default-event')
      const connHandler = vi.fn<ConnectionHandler>()
      provider.onConnection(connHandler)

      const { socket, request } = createMockSocket()
      simulateConnection(serverInstance, socket, request)
      const cid = connHandler.mock.calls[0][0]

      await provider.joinRoom(room.id, cid)

      simulateMessage(socket, { data: { text: 'hi' } })

      expect(handler).toHaveBeenCalledWith(room.id, cid, 'message', { text: 'hi' })
    })

    it('ignores malformed JSON messages', async () => {
      const handler = vi.fn<MessageHandler>()
      provider.onMessage(handler)

      const room = await provider.createRoom('bad-json')
      const connHandler = vi.fn<ConnectionHandler>()
      provider.onConnection(connHandler)

      const { socket, request } = createMockSocket()
      simulateConnection(serverInstance, socket, request)
      const cid = connHandler.mock.calls[0][0]

      await provider.joinRoom(room.id, cid)

      // Send raw non-JSON
      const messageHandlers = socket._handlers.get('message') ?? []
      for (const h of messageHandlers) {
        h(Buffer.from('not json'))
      }

      expect(handler).not.toHaveBeenCalled()
    })

    it('routes messages to specific room when room is specified', async () => {
      const handler = vi.fn<MessageHandler>()
      provider.onMessage(handler)

      const room1 = await provider.createRoom('room-1')
      const room2 = await provider.createRoom('room-2')
      const connHandler = vi.fn<ConnectionHandler>()
      provider.onConnection(connHandler)

      const { socket, request } = createMockSocket()
      simulateConnection(serverInstance, socket, request)
      const cid = connHandler.mock.calls[0][0]

      await provider.joinRoom(room1.id, cid)
      await provider.joinRoom(room2.id, cid)

      simulateMessage(socket, { event: 'chat', data: 'hello', room: room1.id })

      expect(handler).toHaveBeenCalledTimes(1)
      expect(handler).toHaveBeenCalledWith(room1.id, cid, 'chat', 'hello')
    })
  })

  describe('getPresence', () => {
    it('returns presence info for all clients in a room', async () => {
      const room = await provider.createRoom('presence-test')
      const connHandler = vi.fn<ConnectionHandler>()
      provider.onConnection(connHandler)

      const { socket: s1, request: r1 } = createMockSocket()
      const { socket: s2, request: r2 } = createMockSocket()
      simulateConnection(serverInstance, s1, r1)
      simulateConnection(serverInstance, s2, r2)

      const cid1 = connHandler.mock.calls[0][0]
      const cid2 = connHandler.mock.calls[1][0]

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
    it('clears all rooms and closes the server', async () => {
      await provider.createRoom('close-test')
      await provider.close()

      const allRooms = await provider.getRooms()
      expect(allRooms).toEqual([])
    })
  })
})
