import { beforeEach, describe, expect, it, vi } from 'vitest'

import type * as ProviderModule from '../provider.js'
import type * as RealtimeModule from '../realtime.js'
import type {
  ConnectionHandler,
  DisconnectionHandler,
  MessageHandler,
  PresenceInfo,
  RealtimeProvider,
  Room,
  RoomOptions,
} from '../types.js'

let setProvider: typeof ProviderModule.setProvider
let getProvider: typeof ProviderModule.getProvider
let hasProvider: typeof ProviderModule.hasProvider
let createRoom: typeof RealtimeModule.createRoom
let joinRoom: typeof RealtimeModule.joinRoom
let leaveRoom: typeof RealtimeModule.leaveRoom
let broadcast: typeof RealtimeModule.broadcast
let sendTo: typeof RealtimeModule.sendTo
let onMessage: typeof RealtimeModule.onMessage
let onConnection: typeof RealtimeModule.onConnection
let onDisconnection: typeof RealtimeModule.onDisconnection
let getPresence: typeof RealtimeModule.getPresence
let getRooms: typeof RealtimeModule.getRooms
let close: typeof RealtimeModule.close

describe('realtime provider', () => {
  beforeEach(async () => {
    vi.resetModules()
    const providerModule = await import('../provider.js')
    const realtimeModule = await import('../realtime.js')
    setProvider = providerModule.setProvider
    getProvider = providerModule.getProvider
    hasProvider = providerModule.hasProvider
    createRoom = realtimeModule.createRoom
    joinRoom = realtimeModule.joinRoom
    leaveRoom = realtimeModule.leaveRoom
    broadcast = realtimeModule.broadcast
    sendTo = realtimeModule.sendTo
    onMessage = realtimeModule.onMessage
    onConnection = realtimeModule.onConnection
    onDisconnection = realtimeModule.onDisconnection
    getPresence = realtimeModule.getPresence
    getRooms = realtimeModule.getRooms
    close = realtimeModule.close
  })

  describe('provider management', () => {
    it('should throw when no provider is set', () => {
      expect(() => getProvider()).toThrow(
        'Realtime provider not configured. Call setProvider() first.',
      )
    })

    it('should report no provider via hasProvider', () => {
      expect(hasProvider()).toBe(false)
    })

    it('should set and get provider', () => {
      const mockProvider = createMockProvider()
      setProvider(mockProvider)
      expect(getProvider()).toBe(mockProvider)
    })

    it('should report provider via hasProvider after setting', () => {
      setProvider(createMockProvider())
      expect(hasProvider()).toBe(true)
    })
  })

  describe('createRoom', () => {
    it('should throw when no provider is set', async () => {
      await expect(createRoom('test')).rejects.toThrow('Realtime provider not configured')
    })

    it('should delegate to provider', async () => {
      const room: Room = { id: 'room-1', name: 'test', clients: [] }
      const mockProvider = createMockProvider({ createRoom: vi.fn().mockResolvedValue(room) })
      setProvider(mockProvider)

      const result = await createRoom('test')
      expect(result).toBe(room)
      expect(mockProvider.createRoom).toHaveBeenCalledWith('test', undefined)
    })

    it('should pass room options', async () => {
      const options: RoomOptions = { maxClients: 10, persistent: true, metadata: { type: 'chat' } }
      const room: Room = { id: 'room-2', name: 'chat', clients: [], metadata: { type: 'chat' } }
      const mockProvider = createMockProvider({ createRoom: vi.fn().mockResolvedValue(room) })
      setProvider(mockProvider)

      const result = await createRoom('chat', options)
      expect(result).toEqual(room)
      expect(mockProvider.createRoom).toHaveBeenCalledWith('chat', options)
    })
  })

  describe('joinRoom', () => {
    it('should delegate to provider', async () => {
      const mockProvider = createMockProvider({ joinRoom: vi.fn().mockResolvedValue(undefined) })
      setProvider(mockProvider)

      await joinRoom('room-1', 'client-1')
      expect(mockProvider.joinRoom).toHaveBeenCalledWith('room-1', 'client-1')
    })
  })

  describe('leaveRoom', () => {
    it('should delegate to provider', async () => {
      const mockProvider = createMockProvider({ leaveRoom: vi.fn().mockResolvedValue(undefined) })
      setProvider(mockProvider)

      await leaveRoom('room-1', 'client-1')
      expect(mockProvider.leaveRoom).toHaveBeenCalledWith('room-1', 'client-1')
    })
  })

  describe('broadcast', () => {
    it('should delegate to provider', async () => {
      const mockProvider = createMockProvider({ broadcast: vi.fn().mockResolvedValue(undefined) })
      setProvider(mockProvider)

      await broadcast('room-1', 'message', { text: 'hello' })
      expect(mockProvider.broadcast).toHaveBeenCalledWith('room-1', 'message', { text: 'hello' })
    })
  })

  describe('sendTo', () => {
    it('should delegate to provider', async () => {
      const mockProvider = createMockProvider({ sendTo: vi.fn().mockResolvedValue(undefined) })
      setProvider(mockProvider)

      await sendTo('client-1', 'notification', { type: 'alert' })
      expect(mockProvider.sendTo).toHaveBeenCalledWith('client-1', 'notification', {
        type: 'alert',
      })
    })
  })

  describe('onMessage', () => {
    it('should delegate to provider', () => {
      const mockProvider = createMockProvider({ onMessage: vi.fn() })
      setProvider(mockProvider)

      const handler: MessageHandler = vi.fn()
      onMessage(handler)
      expect(mockProvider.onMessage).toHaveBeenCalledWith(handler)
    })
  })

  describe('onConnection', () => {
    it('should delegate to provider', () => {
      const mockProvider = createMockProvider({ onConnection: vi.fn() })
      setProvider(mockProvider)

      const handler: ConnectionHandler = vi.fn()
      onConnection(handler)
      expect(mockProvider.onConnection).toHaveBeenCalledWith(handler)
    })
  })

  describe('onDisconnection', () => {
    it('should delegate to provider', () => {
      const mockProvider = createMockProvider({ onDisconnection: vi.fn() })
      setProvider(mockProvider)

      const handler: DisconnectionHandler = vi.fn()
      onDisconnection(handler)
      expect(mockProvider.onDisconnection).toHaveBeenCalledWith(handler)
    })
  })

  describe('getPresence', () => {
    it('should delegate to provider', async () => {
      const presence: PresenceInfo[] = [
        { clientId: 'client-1', joinedAt: new Date('2026-01-01') },
        { clientId: 'client-2', joinedAt: new Date('2026-01-02'), metadata: { role: 'admin' } },
      ]
      const mockProvider = createMockProvider({
        getPresence: vi.fn().mockResolvedValue(presence),
      })
      setProvider(mockProvider)

      const result = await getPresence('room-1')
      expect(result).toEqual(presence)
      expect(mockProvider.getPresence).toHaveBeenCalledWith('room-1')
    })
  })

  describe('getRooms', () => {
    it('should delegate to provider', async () => {
      const rooms: Room[] = [
        { id: 'room-1', name: 'chat', clients: ['c1'] },
        { id: 'room-2', name: 'game', clients: ['c2', 'c3'] },
      ]
      const mockProvider = createMockProvider({ getRooms: vi.fn().mockResolvedValue(rooms) })
      setProvider(mockProvider)

      const result = await getRooms()
      expect(result).toEqual(rooms)
    })
  })

  describe('close', () => {
    it('should delegate to provider', async () => {
      const mockProvider = createMockProvider({ close: vi.fn().mockResolvedValue(undefined) })
      setProvider(mockProvider)

      await close()
      expect(mockProvider.close).toHaveBeenCalled()
    })
  })
})

describe('realtime types', () => {
  it('should export Room type', () => {
    const room: Room = {
      id: 'room-1',
      name: 'General',
      clients: ['client-1', 'client-2'],
      metadata: { topic: 'general-chat' },
    }
    expect(room.id).toBe('room-1')
    expect(room.clients).toHaveLength(2)
  })

  it('should export Room type without optional metadata', () => {
    const room: Room = { id: 'room-1', name: 'General', clients: [] }
    expect(room.metadata).toBeUndefined()
  })

  it('should export RoomOptions type', () => {
    const options: RoomOptions = {
      maxClients: 50,
      metadata: { type: 'private' },
      persistent: true,
    }
    expect(options.maxClients).toBe(50)
  })

  it('should export PresenceInfo type', () => {
    const presence: PresenceInfo = {
      clientId: 'client-1',
      joinedAt: new Date(),
      metadata: { username: 'alice' },
    }
    expect(presence.clientId).toBe('client-1')
    expect(presence.joinedAt).toBeInstanceOf(Date)
  })

  it('should export RealtimeProvider type', () => {
    const provider: RealtimeProvider = createMockProvider()
    expect(typeof provider.createRoom).toBe('function')
    expect(typeof provider.joinRoom).toBe('function')
    expect(typeof provider.leaveRoom).toBe('function')
    expect(typeof provider.broadcast).toBe('function')
    expect(typeof provider.sendTo).toBe('function')
    expect(typeof provider.onMessage).toBe('function')
    expect(typeof provider.onConnection).toBe('function')
    expect(typeof provider.onDisconnection).toBe('function')
    expect(typeof provider.getPresence).toBe('function')
    expect(typeof provider.getRooms).toBe('function')
    expect(typeof provider.close).toBe('function')
  })
})

function createMockProvider(overrides?: Partial<RealtimeProvider>): RealtimeProvider {
  return {
    createRoom: vi.fn().mockResolvedValue({ id: 'room-1', name: 'test', clients: [] }),
    joinRoom: vi.fn().mockResolvedValue(undefined),
    leaveRoom: vi.fn().mockResolvedValue(undefined),
    broadcast: vi.fn().mockResolvedValue(undefined),
    sendTo: vi.fn().mockResolvedValue(undefined),
    onMessage: vi.fn(),
    onConnection: vi.fn(),
    onDisconnection: vi.fn(),
    getPresence: vi.fn().mockResolvedValue([]),
    getRooms: vi.fn().mockResolvedValue([]),
    close: vi.fn().mockResolvedValue(undefined),
    ...overrides,
  }
}
