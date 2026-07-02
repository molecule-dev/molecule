import { beforeEach, describe, expect, it, vi } from 'vitest'

import type * as ProviderModule from '../provider.js'
import type * as RealtimeModule from '../realtime.js'
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
} from '../types.js'

let setProvider: typeof ProviderModule.setProvider
let getProvider: typeof ProviderModule.getProvider
let hasProvider: typeof ProviderModule.hasProvider
let registerJoinGuard: typeof ProviderModule.registerJoinGuard
let createRoom: typeof RealtimeModule.createRoom
let joinRoom: typeof RealtimeModule.joinRoom
let leaveRoom: typeof RealtimeModule.leaveRoom
let broadcast: typeof RealtimeModule.broadcast
let sendTo: typeof RealtimeModule.sendTo
let onMessage: typeof RealtimeModule.onMessage
let onConnection: typeof RealtimeModule.onConnection
let onDisconnection: typeof RealtimeModule.onDisconnection
let onJoinRequest: typeof RealtimeModule.onJoinRequest
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
    registerJoinGuard = providerModule.registerJoinGuard
    createRoom = realtimeModule.createRoom
    joinRoom = realtimeModule.joinRoom
    leaveRoom = realtimeModule.leaveRoom
    broadcast = realtimeModule.broadcast
    sendTo = realtimeModule.sendTo
    onMessage = realtimeModule.onMessage
    onConnection = realtimeModule.onConnection
    onDisconnection = realtimeModule.onDisconnection
    onJoinRequest = realtimeModule.onJoinRequest
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

    it('buffers a handler registered BEFORE setProvider and flushes it on setProvider', () => {
      // The socketio bond binds its provider at SERVER-CREATION — after the
      // postBondsSetup hook where presence/connection handlers are naturally
      // registered. So onConnection() must buffer (not throw "Realtime provider
      // not configured") and flush when setProvider() runs. (Observed boot crash.)
      const handler: ConnectionHandler = vi.fn()
      expect(() => onConnection(handler)).not.toThrow() // no provider bonded yet
      const mockProvider = createMockProvider({ onConnection: vi.fn() })
      setProvider(mockProvider)
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

  describe('onJoinRequest', () => {
    it('should delegate to provider.onJoinRequest when bonded', () => {
      const mockProvider = createMockProvider({ onJoinRequest: vi.fn() })
      setProvider(mockProvider)

      const guard: JoinGuard = vi.fn().mockReturnValue(true)
      onJoinRequest(guard)
      expect(mockProvider.onJoinRequest).toHaveBeenCalledWith(guard)
    })

    it('buffers a guard registered BEFORE setProvider and flushes it on setProvider', () => {
      // Same order-independence contract as onMessage/onConnection: the bond
      // binds its provider at server-creation, AFTER postBondsSetup where apps
      // naturally register room authorization. Registration must not throw
      // pre-bond and must reach the provider once it is bonded.
      const guard: JoinGuard = vi.fn().mockReturnValue(true)
      expect(() => onJoinRequest(guard)).not.toThrow() // no provider bonded yet
      const mockProvider = createMockProvider({ onJoinRequest: vi.fn() })
      setProvider(mockProvider)
      expect(mockProvider.onJoinRequest).toHaveBeenCalledWith(guard)
    })

    it('flushes multiple buffered guards in registration order', () => {
      const guardA: JoinGuard = vi.fn().mockReturnValue(true)
      const guardB: JoinGuard = vi.fn().mockReturnValue(false)
      registerJoinGuard(guardA)
      registerJoinGuard(guardB)
      const mockProvider = createMockProvider({ onJoinRequest: vi.fn() })
      setProvider(mockProvider)
      expect(mockProvider.onJoinRequest).toHaveBeenNthCalledWith(1, guardA)
      expect(mockProvider.onJoinRequest).toHaveBeenNthCalledWith(2, guardB)
    })

    it('warns (does not throw or silently drop) when the provider lacks onJoinRequest', () => {
      // A registered guard the transport cannot enforce is a security-relevant
      // mismatch — it must be surfaced, not swallowed.
      const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => undefined)
      try {
        const guard: JoinGuard = vi.fn().mockReturnValue(true)
        onJoinRequest(guard)
        const { onJoinRequest: _omitted, ...withoutJoinSupport } = createMockProvider()
        expect(() => setProvider(withoutJoinSupport)).not.toThrow()
        expect(warnSpy).toHaveBeenCalledWith(
          expect.stringContaining('does not implement onJoinRequest'),
        )
      } finally {
        warnSpy.mockRestore()
      }
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
    expect(typeof provider.onJoinRequest).toBe('function')
  })

  it('should export JoinRequest and JoinGuard types', async () => {
    const request: JoinRequest = {
      clientId: 'client-1',
      room: 'channel:general',
      auth: { token: 'sesame' },
    }
    expect(request.room).toBe('channel:general')

    const syncGuard: JoinGuard = (r) => r.auth.token === 'sesame'
    const asyncGuard: JoinGuard = async (r) => r.room.startsWith('channel:')
    expect(syncGuard(request)).toBe(true)
    await expect(asyncGuard(request)).resolves.toBe(true)
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
    onJoinRequest: vi.fn(),
    getPresence: vi.fn().mockResolvedValue([]),
    getRooms: vi.fn().mockResolvedValue([]),
    close: vi.fn().mockResolvedValue(undefined),
    ...overrides,
  }
}
