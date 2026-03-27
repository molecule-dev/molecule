import { describe, it, expect, vi, beforeEach } from 'vitest'

import type {
  RealtimeProvider,
  ConnectionHandler,
  DisconnectionHandler,
  MessageHandler,
} from '@molecule/api-realtime'

/* ------------------------------------------------------------------ */
/*  Mock Socket.io                                                     */
/* ------------------------------------------------------------------ */

const { MockServer, mockNamespace, mockSockets, mockSocketInstances } = vi.hoisted(() => {
  const mockSocketInstances = new Map<
    string,
    {
      id: string
      handshake: { address: string }
      join: ReturnType<typeof vi.fn>
      leave: ReturnType<typeof vi.fn>
      emit: ReturnType<typeof vi.fn>
      onAny: ReturnType<typeof vi.fn>
      on: ReturnType<typeof vi.fn>
    }
  >()

  const mockSockets = new Map<string, unknown>()

  const mockNamespace = {
    on: vi.fn(),
    to: vi.fn().mockReturnThis(),
    emit: vi.fn(),
    sockets: mockSockets,
  }

  // Make to().emit() chainable
  mockNamespace.to = vi.fn().mockReturnValue({ emit: vi.fn() })

  // Must use a regular function (not arrow) so it can be called with `new`
  const MockServer = vi.fn(function MockServerCtor() {
    return {
      of: vi.fn().mockReturnValue(mockNamespace),
      close: vi.fn((cb: () => void) => cb()),
    }
  })

  return { MockServer, mockNamespace, mockSockets, mockSocketInstances }
})

vi.mock('socket.io', () => ({
  Server: MockServer,
}))

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

function createMockSocket(id: string) {
  const socket = {
    id,
    handshake: { address: '127.0.0.1' },
    join: vi.fn(),
    leave: vi.fn(),
    emit: vi.fn(),
    onAny: vi.fn(),
    on: vi.fn(),
  }
  mockSocketInstances.set(id, socket)
  mockSockets.set(id, socket)
  return socket
}

function simulateConnection(socket: ReturnType<typeof createMockSocket>) {
  // Get the connection handler registered on the namespace
  const connectionCall = mockNamespace.on.mock.calls.find(
    (call: unknown[]) => call[0] === 'connection',
  )
  if (connectionCall) {
    ;(connectionCall[1] as (s: typeof socket) => void)(socket)
  }
}

/* ------------------------------------------------------------------ */
/*  Tests                                                              */
/* ------------------------------------------------------------------ */

describe('@molecule/api-realtime-socketio', () => {
  let provider: RealtimeProvider

  beforeEach(async () => {
    vi.clearAllMocks()
    mockSockets.clear()
    mockSocketInstances.clear()

    // Reset the to() mock to return a fresh emit
    mockNamespace.to = vi.fn().mockReturnValue({ emit: vi.fn() })

    const { createProvider } = await import('../provider.js')
    provider = createProvider({ port: 4000 })
  })

  describe('createProvider', () => {
    it('creates a Socket.io server with provided port', () => {
      expect(MockServer).toHaveBeenCalledWith(4000, {})
    })

    it('creates a server with an http server when provided', async () => {
      vi.clearAllMocks()
      const httpServer = {} as import('node:http').Server
      const { createProvider } = await import('../provider.js')
      createProvider({ httpServer })
      expect(MockServer).toHaveBeenCalledWith(httpServer, {})
    })

    it('uses default port 3000 when no config provided', async () => {
      vi.clearAllMocks()
      const { createProvider } = await import('../provider.js')
      createProvider()
      expect(MockServer).toHaveBeenCalledWith(3000, {})
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
      const socket = createMockSocket('client-1')
      simulateConnection(socket)

      await provider.joinRoom(room.id, 'client-1')

      const presence = await provider.getPresence(room.id)
      expect(presence).toHaveLength(1)
      expect(presence[0].clientId).toBe('client-1')
    })

    it('calls socket.join with the room id', async () => {
      const room = await provider.createRoom('join-native')
      const socket = createMockSocket('client-1')
      simulateConnection(socket)

      await provider.joinRoom(room.id, 'client-1')
      expect(socket.join).toHaveBeenCalledWith(room.id)
    })

    it('throws when room does not exist', async () => {
      await expect(provider.joinRoom('nonexistent', 'client-1')).rejects.toThrow(
        'Room "nonexistent" does not exist',
      )
    })

    it('throws when room is full', async () => {
      const room = await provider.createRoom('full-room', { maxClients: 1 })
      const s1 = createMockSocket('c1')
      const s2 = createMockSocket('c2')
      simulateConnection(s1)
      simulateConnection(s2)

      await provider.joinRoom(room.id, 'c1')
      await expect(provider.joinRoom(room.id, 'c2')).rejects.toThrow('is full')
    })

    it('is idempotent when client already in room', async () => {
      const room = await provider.createRoom('idempotent')
      const socket = createMockSocket('c1')
      simulateConnection(socket)

      await provider.joinRoom(room.id, 'c1')
      await provider.joinRoom(room.id, 'c1')

      const presence = await provider.getPresence(room.id)
      expect(presence).toHaveLength(1)
    })
  })

  describe('leaveRoom', () => {
    it('removes a client from the room', async () => {
      const room = await provider.createRoom('leave-test', { persistent: true })
      const socket = createMockSocket('c1')
      simulateConnection(socket)

      await provider.joinRoom(room.id, 'c1')
      await provider.leaveRoom(room.id, 'c1')

      const presence = await provider.getPresence(room.id)
      expect(presence).toHaveLength(0)
    })

    it('calls socket.leave with the room id', async () => {
      const room = await provider.createRoom('leave-native', { persistent: true })
      const socket = createMockSocket('c1')
      simulateConnection(socket)

      await provider.joinRoom(room.id, 'c1')
      await provider.leaveRoom(room.id, 'c1')
      expect(socket.leave).toHaveBeenCalledWith(room.id)
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
      const socket = createMockSocket('c1')
      simulateConnection(socket)

      await provider.joinRoom(room.id, 'c1')
      await provider.leaveRoom(room.id, 'c1')

      const allRooms = await provider.getRooms()
      expect(allRooms.find((r) => r.id === room.id)).toBeUndefined()
    })

    it('keeps persistent room when empty', async () => {
      const room = await provider.createRoom('persist-room', { persistent: true })
      const socket = createMockSocket('c1')
      simulateConnection(socket)

      await provider.joinRoom(room.id, 'c1')
      await provider.leaveRoom(room.id, 'c1')

      const allRooms = await provider.getRooms()
      expect(allRooms.find((r) => r.id === room.id)).toBeDefined()
    })
  })

  describe('broadcast', () => {
    it('emits to the room via Socket.io', async () => {
      const room = await provider.createRoom('broadcast-test')
      await provider.broadcast(room.id, 'chat:message', { text: 'hello' })

      expect(mockNamespace.to).toHaveBeenCalledWith(room.id)
      const emitMock = (mockNamespace.to as ReturnType<typeof vi.fn>).mock.results[0].value.emit
      expect(emitMock).toHaveBeenCalledWith('chat:message', { text: 'hello' })
    })

    it('throws when room does not exist', async () => {
      await expect(provider.broadcast('nonexistent', 'ev', {})).rejects.toThrow(
        'Room "nonexistent" does not exist',
      )
    })
  })

  describe('sendTo', () => {
    it('emits directly to the socket', async () => {
      const socket = createMockSocket('c1')
      simulateConnection(socket)

      await provider.sendTo('c1', 'private:msg', { data: 42 })
      expect(socket.emit).toHaveBeenCalledWith('private:msg', { data: 42 })
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

      const socket = createMockSocket('c1')
      simulateConnection(socket)

      expect(handler).toHaveBeenCalledWith('c1', { remoteAddress: '127.0.0.1' })
    })

    it('calls disconnection handlers when a socket disconnects', () => {
      const handler = vi.fn<DisconnectionHandler>()
      provider.onDisconnection(handler)

      const socket = createMockSocket('c1')
      simulateConnection(socket)

      // Find the disconnect handler registered on the socket
      const disconnectCall = socket.on.mock.calls.find(
        (call: unknown[]) => call[0] === 'disconnect',
      )
      expect(disconnectCall).toBeDefined()
      ;(disconnectCall![1] as (reason: string) => void)('transport close')

      expect(handler).toHaveBeenCalledWith('c1', 'transport close')
    })
  })

  describe('onMessage', () => {
    it('calls message handlers for events from clients in managed rooms', async () => {
      const handler = vi.fn<MessageHandler>()
      provider.onMessage(handler)

      const room = await provider.createRoom('msg-test')
      const socket = createMockSocket('c1')
      simulateConnection(socket)
      await provider.joinRoom(room.id, 'c1')

      // Trigger the onAny handler
      const onAnyCall = socket.onAny.mock.calls[0]
      expect(onAnyCall).toBeDefined()
      ;(onAnyCall[0] as (event: string, data: unknown) => void)('chat', { text: 'hi' })

      expect(handler).toHaveBeenCalledWith(room.id, 'c1', 'chat', { text: 'hi' })
    })
  })

  describe('getPresence', () => {
    it('returns presence info for all clients in a room', async () => {
      const room = await provider.createRoom('presence-test')
      const s1 = createMockSocket('c1')
      const s2 = createMockSocket('c2')
      simulateConnection(s1)
      simulateConnection(s2)

      await provider.joinRoom(room.id, 'c1')
      await provider.joinRoom(room.id, 'c2')

      const presence = await provider.getPresence(room.id)
      expect(presence).toHaveLength(2)
      expect(presence.map((p) => p.clientId).sort()).toEqual(['c1', 'c2'])
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
