import { beforeEach, describe, expect, it, vi } from 'vitest'

import { unbond } from '@molecule/app-bond'

import { connect, getProvider, hasProvider, setProvider } from '../provider.js'
import type {
  ConnectionOptions,
  ConnectionState,
  ConnectionStateHandler,
  PresenceChangeHandler,
  PresenceInfo,
  RealtimeClientProvider,
  RealtimeConnection,
  RealtimeEventHandler,
} from '../types.js'

// ---------------------------------------------------------------------------
// Mock helpers
// ---------------------------------------------------------------------------

function createMockConnection(): RealtimeConnection {
  const eventHandlers = new Map<string, Set<RealtimeEventHandler>>()
  const presenceHandlers = new Set<PresenceChangeHandler>()
  const reconnectHandlers = new Set<() => void>()
  const stateChangeHandlers = new Set<ConnectionStateHandler>()
  const joinedRooms = new Set<string>()
  const presenceByRoom = new Map<string, PresenceInfo[]>()
  let connected = true
  let state: ConnectionState = 'connected'

  return {
    joinRoom: vi.fn(async (roomId: string) => {
      joinedRooms.add(roomId)
    }),
    leaveRoom: vi.fn(async (roomId: string) => {
      joinedRooms.delete(roomId)
    }),
    send: vi.fn(),
    sendTo: vi.fn(),
    on: vi.fn((event: string, handler: RealtimeEventHandler) => {
      if (!eventHandlers.has(event)) {
        eventHandlers.set(event, new Set())
      }
      eventHandlers.get(event)!.add(handler)
    }),
    off: vi.fn((event: string, handler?: RealtimeEventHandler) => {
      if (handler) {
        eventHandlers.get(event)?.delete(handler)
      } else {
        eventHandlers.delete(event)
      }
    }),
    getPresence: vi.fn((roomId: string) => {
      return presenceByRoom.get(roomId) ?? []
    }),
    onPresenceChange: vi.fn((handler: PresenceChangeHandler) => {
      presenceHandlers.add(handler)
    }),
    disconnect: vi.fn(() => {
      connected = false
      state = 'disconnected'
    }),
    isConnected: () => connected,
    getState: () => state,
    onReconnect: vi.fn((handler: () => void) => {
      reconnectHandlers.add(handler)
    }),
    onStateChange: vi.fn((handler: ConnectionStateHandler) => {
      stateChangeHandlers.add(handler)
    }),
  }
}

function createMockProvider(): RealtimeClientProvider {
  return {
    connect: vi.fn(async () => createMockConnection()),
  }
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('Realtime client provider', () => {
  beforeEach(() => {
    unbond('realtime')
  })

  describe('setProvider / getProvider / hasProvider', () => {
    it('hasProvider returns false when no provider is bonded', () => {
      expect(hasProvider()).toBe(false)
    })

    it('setProvider bonds the provider and hasProvider returns true', () => {
      setProvider(createMockProvider())
      expect(hasProvider()).toBe(true)
    })

    it('getProvider returns the bonded provider', () => {
      const mock = createMockProvider()
      setProvider(mock)
      expect(getProvider()).toBe(mock)
    })

    it('getProvider throws when no provider is bonded', () => {
      expect(() => getProvider()).toThrow('@molecule/app-realtime')
    })
  })

  describe('connect', () => {
    it('delegates to the bonded provider', async () => {
      const mock = createMockProvider()
      setProvider(mock)

      const options: ConnectionOptions = {
        autoReconnect: true,
        reconnectDelay: 2000,
        maxRetries: 5,
        auth: { token: 'test-jwt' },
      }

      const connection = await connect('wss://example.com', options)
      expect(mock.connect).toHaveBeenCalledWith('wss://example.com', options)
      expect(connection.isConnected()).toBe(true)
    })

    it('throws when no provider is bonded', () => {
      expect(() => connect('wss://example.com')).toThrow('@molecule/app-realtime')
    })

    it('works without options', async () => {
      const mock = createMockProvider()
      setProvider(mock)

      const connection = await connect('wss://example.com')
      expect(mock.connect).toHaveBeenCalledWith('wss://example.com', undefined)
      expect(connection.isConnected()).toBe(true)
    })
  })
})

describe('RealtimeConnection (mock conformance)', () => {
  let connection: RealtimeConnection

  beforeEach(async () => {
    unbond('realtime')
    setProvider(createMockProvider())
    connection = await connect('wss://example.com')
  })

  // -- Rooms ---------------------------------------------------------------

  it('joinRoom resolves without error', async () => {
    await expect(connection.joinRoom('room-1')).resolves.toBeUndefined()
  })

  it('leaveRoom resolves without error', async () => {
    await connection.joinRoom('room-1')
    await expect(connection.leaveRoom('room-1')).resolves.toBeUndefined()
  })

  // -- Messaging -----------------------------------------------------------

  it('send does not throw', () => {
    expect(() => connection.send('message', { text: 'hello' })).not.toThrow()
  })

  it('sendTo does not throw', () => {
    expect(() => connection.sendTo('room-1', 'message', { text: 'hello' })).not.toThrow()
  })

  // -- Event listening -----------------------------------------------------

  it('on registers an event handler', () => {
    const handler = vi.fn()
    connection.on('message', handler)
    expect(connection.on).toHaveBeenCalledWith('message', handler)
  })

  it('off removes a specific handler', () => {
    const handler = vi.fn()
    connection.on('message', handler)
    connection.off('message', handler)
    expect(connection.off).toHaveBeenCalledWith('message', handler)
  })

  it('off removes all handlers for an event when no handler specified', () => {
    connection.on('message', vi.fn())
    connection.on('message', vi.fn())
    connection.off('message')
    expect(connection.off).toHaveBeenCalledWith('message')
  })

  // -- Presence ------------------------------------------------------------

  it('getPresence returns an array', () => {
    const presence = connection.getPresence('room-1')
    expect(Array.isArray(presence)).toBe(true)
  })

  it('getPresence returns empty array for unknown room', () => {
    expect(connection.getPresence('unknown-room')).toEqual([])
  })

  it('onPresenceChange registers a handler', () => {
    const handler = vi.fn()
    connection.onPresenceChange(handler)
    expect(connection.onPresenceChange).toHaveBeenCalledWith(handler)
  })

  // -- Connection lifecycle ------------------------------------------------

  it('isConnected returns true initially', () => {
    expect(connection.isConnected()).toBe(true)
  })

  it('getState returns connected initially', () => {
    expect(connection.getState()).toBe('connected')
  })

  it('disconnect sets isConnected to false', () => {
    connection.disconnect()
    expect(connection.isConnected()).toBe(false)
  })

  it('disconnect sets state to disconnected', () => {
    connection.disconnect()
    expect(connection.getState()).toBe('disconnected')
  })

  it('onReconnect registers a handler', () => {
    const handler = vi.fn()
    connection.onReconnect(handler)
    expect(connection.onReconnect).toHaveBeenCalledWith(handler)
  })

  it('onStateChange registers a handler', () => {
    const handler = vi.fn()
    connection.onStateChange(handler)
    expect(connection.onStateChange).toHaveBeenCalledWith(handler)
  })
})
