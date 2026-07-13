import { beforeEach, describe, expect, it, vi } from 'vitest'

import type {
  ConnectionOptions,
  PresenceInfo,
  RealtimeClientProvider,
} from '@molecule/app-realtime'

// ---------------------------------------------------------------------------
// socket.io-client mock — a controllable fake socket
// ---------------------------------------------------------------------------

/** Generic listener signature used by the fake socket. */
type Listener = (...args: unknown[]) => void

/** A recorded outgoing emit. */
interface EmittedEvent {
  event: string
  args: unknown[]
}

/**
 * Controllable fake for socket.io-client's Socket: records outgoing emits
 * and lets tests fire lifecycle + incoming server events.
 */
interface FakeSocket {
  connected: boolean
  disconnectCalls: number
  /** Every outgoing socket.emit(), in order. */
  emitted: EmittedEvent[]
  io: {
    on: (event: string, listener: Listener) => void
    off: (event: string, listener?: Listener) => void
  }
  on: (event: string, listener: Listener) => void
  off: (event?: string, listener?: Listener) => void
  onAny: (listener: Listener) => void
  offAny: (listener?: Listener) => void
  emit: (event: string, ...args: unknown[]) => void
  disconnect: () => void
  // -- test controls --
  /** Simulates the socket establishing a connection. */
  fireConnect: () => void
  /** Simulates a connection drop with the given socket.io reason. */
  fireDisconnect: (reason?: string) => void
  /** Simulates an incoming server event (dispatched through onAny). */
  fireServerEvent: (event: string, ...args: unknown[]) => void
  /** Simulates the manager exhausting all reconnection attempts. */
  fireReconnectFailed: () => void
}

const mock = vi.hoisted(() => {
  const state = {
    sockets: [] as FakeSocket[],
    ioCalls: [] as unknown[][],
  }

  const createFakeSocket = (): FakeSocket => {
    const listeners = new Map<string, Set<Listener>>()
    const anyListeners = new Set<Listener>()
    const managerListeners = new Map<string, Set<Listener>>()

    const fire = (event: string, ...args: unknown[]): void => {
      for (const listener of [...(listeners.get(event) ?? [])]) {
        listener(...args)
      }
    }

    const socket: FakeSocket = {
      connected: false,
      disconnectCalls: 0,
      emitted: [],
      io: {
        on(event, listener) {
          let set = managerListeners.get(event)
          if (!set) {
            set = new Set()
            managerListeners.set(event, set)
          }
          set.add(listener)
        },
        off(event, listener) {
          if (!listener) {
            managerListeners.delete(event)
            return
          }
          managerListeners.get(event)?.delete(listener)
        },
      },
      on(event, listener) {
        let set = listeners.get(event)
        if (!set) {
          set = new Set()
          listeners.set(event, set)
        }
        set.add(listener)
      },
      off(event, listener) {
        if (event === undefined) {
          listeners.clear()
          return
        }
        if (!listener) {
          listeners.delete(event)
          return
        }
        listeners.get(event)?.delete(listener)
      },
      onAny(listener) {
        anyListeners.add(listener)
      },
      offAny(listener) {
        if (!listener) {
          anyListeners.clear()
          return
        }
        anyListeners.delete(listener)
      },
      emit(event, ...args) {
        socket.emitted.push({ event, args })
      },
      disconnect() {
        socket.disconnectCalls += 1
        const wasConnected = socket.connected
        socket.connected = false
        // Real socket.io fires 'disconnect' with this reason on manual close.
        if (wasConnected) {
          fire('disconnect', 'io client disconnect')
        }
      },
      fireConnect() {
        socket.connected = true
        fire('connect')
      },
      fireDisconnect(reason = 'transport close') {
        socket.connected = false
        fire('disconnect', reason)
      },
      fireServerEvent(event, ...args) {
        for (const listener of [...anyListeners]) {
          listener(event, ...args)
        }
      },
      fireReconnectFailed() {
        for (const listener of [...(managerListeners.get('reconnect_failed') ?? [])]) {
          listener()
        }
      },
    }
    return socket
  }

  return { state, createFakeSocket }
})

vi.mock('socket.io-client', () => ({
  io: (...args: unknown[]) => {
    mock.state.ioCalls.push(args)
    const socket = mock.createFakeSocket()
    mock.state.sockets.push(socket)
    return socket
  },
}))

import { createSocketioProvider, provider } from '../provider.js'
import type { SocketioConfig, SocketioConnection } from '../types.js'

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

async function createConnection(
  url = 'https://api.example.com',
  options: ConnectionOptions = {},
  config: SocketioConfig = {},
): Promise<{ conn: SocketioConnection; socket: FakeSocket }> {
  const p = createSocketioProvider(config)
  const conn = (await p.connect(url, options)) as SocketioConnection
  const socket = mock.state.sockets[mock.state.sockets.length - 1]
  if (!socket) throw new Error('mocked io() was not called')
  return { conn, socket }
}

/** Returns the outgoing emits recorded for a given event name. */
function emitsOf(socket: FakeSocket, event: string): EmittedEvent[] {
  return socket.emitted.filter((entry) => entry.event === event)
}

beforeEach(() => {
  mock.state.sockets.length = 0
  mock.state.ioCalls.length = 0
})

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('@molecule/app-realtime-socketio', () => {
  describe('provider conformance', () => {
    it('exports a typed provider with connect method', () => {
      expect(provider).toBeDefined()
      expect(typeof provider.connect).toBe('function')
    })

    it('createSocketioProvider returns a RealtimeClientProvider', () => {
      const p: RealtimeClientProvider = createSocketioProvider()
      expect(typeof p.connect).toBe('function')
    })

    it('connect returns a promise resolving to a RealtimeConnection', async () => {
      const { conn } = await createConnection()
      expect(typeof conn.joinRoom).toBe('function')
      expect(typeof conn.leaveRoom).toBe('function')
      expect(typeof conn.send).toBe('function')
      expect(typeof conn.sendTo).toBe('function')
      expect(typeof conn.on).toBe('function')
      expect(typeof conn.off).toBe('function')
      expect(typeof conn.getPresence).toBe('function')
      expect(typeof conn.onPresenceChange).toBe('function')
      expect(typeof conn.disconnect).toBe('function')
      expect(typeof conn.isConnected).toBe('function')
      expect(typeof conn.getState).toBe('function')
      expect(typeof conn.onReconnect).toBe('function')
      expect(typeof conn.onStateChange).toBe('function')
    })
  })

  describe('option mapping', () => {
    it('maps defaults onto socket.io options', async () => {
      await createConnection('https://api.example.com')
      expect(mock.state.ioCalls).toHaveLength(1)
      const [url, opts] = mock.state.ioCalls[0] as [string, Record<string, unknown>]
      expect(url).toBe('https://api.example.com')
      expect(opts).toMatchObject({
        reconnection: true,
        reconnectionDelay: 1000,
        reconnectionAttempts: 10,
        transports: ['websocket', 'polling'],
        path: '/socket.io',
      })
      expect('auth' in opts).toBe(false)
    })

    it('maps explicit ConnectionOptions + SocketioConfig onto socket.io options', async () => {
      await createConnection(
        'https://api.example.com',
        { autoReconnect: false, reconnectDelay: 2000, maxRetries: 5, auth: { token: 'abc' } },
        { transports: ['websocket'], path: '/ws' },
      )
      const [, opts] = mock.state.ioCalls[0] as [string, Record<string, unknown>]
      expect(opts).toMatchObject({
        reconnection: false,
        reconnectionDelay: 2000,
        reconnectionAttempts: 5,
        auth: { token: 'abc' },
        transports: ['websocket'],
        path: '/ws',
      })
    })
  })

  describe('URL convention', () => {
    it("connect('') is same-origin: io() called without a URL argument", async () => {
      await createConnection('')
      const call = mock.state.ioCalls[0] as unknown[]
      expect(call).toHaveLength(1)
      expect(typeof call[0]).toBe('object')
    })

    it("connect('/') is same-origin: io() called without a URL argument", async () => {
      await createConnection('/')
      const call = mock.state.ioCalls[0] as unknown[]
      expect(call).toHaveLength(1)
      expect(typeof call[0]).toBe('object')
    })

    it('an absolute URL is passed straight to io()', async () => {
      await createConnection('wss://realtime.example.com')
      const call = mock.state.ioCalls[0] as unknown[]
      expect(call[0]).toBe('wss://realtime.example.com')
    })
  })

  describe('connection state', () => {
    it("starts in 'connecting' state without blocking on the server", async () => {
      const { conn } = await createConnection()
      expect(conn.getState()).toBe('connecting')
      expect(conn.isConnected()).toBe(false)
    })

    it("transitions to 'connected' on socket connect and notifies handlers", async () => {
      const { conn, socket } = await createConnection()
      const handler = vi.fn()
      conn.onStateChange(handler)
      socket.fireConnect()
      expect(conn.getState()).toBe('connected')
      expect(conn.isConnected()).toBe(true)
      expect(handler).toHaveBeenCalledWith('connected')
    })

    it("transitions to 'reconnecting' on a drop when autoReconnect is on (default)", async () => {
      const { conn, socket } = await createConnection()
      socket.fireConnect()
      socket.fireDisconnect('transport close')
      expect(conn.getState()).toBe('reconnecting')
    })

    it("transitions to 'disconnected' on a drop when autoReconnect is off", async () => {
      const { conn, socket } = await createConnection('https://api.example.com', {
        autoReconnect: false,
      })
      socket.fireConnect()
      socket.fireDisconnect('transport close')
      expect(conn.getState()).toBe('disconnected')
    })

    it("treats 'io server disconnect' as terminal even with autoReconnect on", async () => {
      const { conn, socket } = await createConnection()
      socket.fireConnect()
      socket.fireDisconnect('io server disconnect')
      expect(conn.getState()).toBe('disconnected')
    })

    it("transitions to 'disconnected' when all reconnection attempts fail", async () => {
      const { conn, socket } = await createConnection()
      socket.fireConnect()
      socket.fireDisconnect('transport close')
      expect(conn.getState()).toBe('reconnecting')
      socket.fireReconnectFailed()
      expect(conn.getState()).toBe('disconnected')
    })

    it('completes the connecting→connected→reconnecting→connected cycle', async () => {
      const { conn, socket } = await createConnection()
      const seen: string[] = []
      conn.onStateChange((s) => seen.push(s))
      expect(conn.getState()).toBe('connecting')
      socket.fireConnect()
      socket.fireDisconnect('transport close')
      socket.fireConnect()
      expect(seen).toEqual(['connected', 'reconnecting', 'connected'])
    })

    it('onStateChange does not fire when state is unchanged', async () => {
      const { conn } = await createConnection()
      const handler = vi.fn()
      conn.onStateChange(handler)
      conn._setState('connecting')
      expect(handler).not.toHaveBeenCalled()
    })
  })

  describe('rooms — join', () => {
    it("emits 'molecule:join' and resolves on 'molecule:joined'", async () => {
      const { conn, socket } = await createConnection()
      socket.fireConnect()
      const join = conn.joinRoom('room-1')
      expect(emitsOf(socket, 'molecule:join')).toEqual([
        { event: 'molecule:join', args: [{ room: 'room-1' }] },
      ])
      socket.fireServerEvent('molecule:joined', { room: 'room-1' })
      await expect(join).resolves.toBeUndefined()
      expect(conn._getJoinedRooms().has('room-1')).toBe(true)
    })

    it("rejects with the server's reason on 'molecule:join-denied'", async () => {
      const { conn, socket } = await createConnection()
      socket.fireConnect()
      const join = conn.joinRoom('room-1')
      socket.fireServerEvent('molecule:join-denied', { room: 'room-1', reason: 'not a member' })
      await expect(join).rejects.toThrow('not a member')
      expect(conn._getJoinedRooms().has('room-1')).toBe(false)
    })

    it('rejects with a default message when the denial has no reason', async () => {
      const { conn, socket } = await createConnection()
      socket.fireConnect()
      const join = conn.joinRoom('room-1')
      socket.fireServerEvent('molecule:join-denied', { room: 'room-1' })
      await expect(join).rejects.toThrow('Join denied for room "room-1"')
    })

    it('defers the join while disconnected and emits it on connect', async () => {
      const { conn, socket } = await createConnection()
      const join = conn.joinRoom('room-1')
      expect(emitsOf(socket, 'molecule:join')).toHaveLength(0)
      let settled = false
      // The promise must stay pending while disconnected.
      void join.then(() => {
        settled = true
      })
      await Promise.resolve()
      expect(settled).toBe(false)
      socket.fireConnect()
      expect(emitsOf(socket, 'molecule:join')).toEqual([
        { event: 'molecule:join', args: [{ room: 'room-1' }] },
      ])
      socket.fireServerEvent('molecule:joined', { room: 'room-1' })
      await expect(join).resolves.toBeUndefined()
    })

    it('returns the same pending promise for a duplicate join and does not re-emit', async () => {
      const { conn, socket } = await createConnection()
      socket.fireConnect()
      const first = conn.joinRoom('room-1')
      const second = conn.joinRoom('room-1')
      expect(second).toBe(first)
      expect(emitsOf(socket, 'molecule:join')).toHaveLength(1)
      socket.fireServerEvent('molecule:joined', { room: 'room-1' })
      await expect(first).resolves.toBeUndefined()
    })

    it('resolves immediately for an already-confirmed room without re-emitting', async () => {
      const { conn, socket } = await createConnection()
      socket.fireConnect()
      const join = conn.joinRoom('room-1')
      socket.fireServerEvent('molecule:joined', { room: 'room-1' })
      await join
      await expect(conn.joinRoom('room-1')).resolves.toBeUndefined()
      expect(emitsOf(socket, 'molecule:join')).toHaveLength(1)
    })
  })

  describe('rooms — leave', () => {
    it("emits 'molecule:leave' when connected and resolves immediately", async () => {
      const { conn, socket } = await createConnection()
      socket.fireConnect()
      const join = conn.joinRoom('room-1')
      socket.fireServerEvent('molecule:joined', { room: 'room-1' })
      await join
      await expect(conn.leaveRoom('room-1')).resolves.toBeUndefined()
      expect(emitsOf(socket, 'molecule:leave')).toEqual([
        { event: 'molecule:leave', args: [{ room: 'room-1' }] },
      ])
      expect(conn._getJoinedRooms().has('room-1')).toBe(false)
    })

    it('clears local presence for the left room', async () => {
      const { conn, socket } = await createConnection()
      socket.fireConnect()
      const join = conn.joinRoom('room-1')
      socket.fireServerEvent('molecule:joined', { room: 'room-1' })
      await join
      socket.fireServerEvent('molecule:presence', {
        room: 'room-1',
        presence: [{ clientId: 'user-1' }],
      })
      expect(conn.getPresence('room-1')).toHaveLength(1)
      await conn.leaveRoom('room-1')
      expect(conn.getPresence('room-1')).toHaveLength(0)
    })

    it('untracks without emitting while disconnected', async () => {
      const { conn, socket } = await createConnection()
      const join = conn.joinRoom('room-1')
      const leave = conn.leaveRoom('room-1')
      await expect(leave).resolves.toBeUndefined()
      await expect(join).rejects.toThrow('cancelled by leaveRoom()')
      expect(emitsOf(socket, 'molecule:leave')).toHaveLength(0)
      expect(conn._getJoinedRooms().has('room-1')).toBe(false)
    })

    it('rejects a still-pending join as cancelled', async () => {
      const { conn, socket } = await createConnection()
      socket.fireConnect()
      const join = conn.joinRoom('room-1')
      await conn.leaveRoom('room-1')
      await expect(join).rejects.toThrow('cancelled by leaveRoom()')
    })

    it("a server-initiated 'molecule:left' untracks the room", async () => {
      const { conn, socket } = await createConnection()
      socket.fireConnect()
      const join = conn.joinRoom('room-1')
      socket.fireServerEvent('molecule:joined', { room: 'room-1' })
      await join
      socket.fireServerEvent('molecule:left', { room: 'room-1' })
      expect(conn._getJoinedRooms().has('room-1')).toBe(false)
      expect(conn.getPresence('room-1')).toEqual([])
    })
  })

  describe('messaging', () => {
    it('send emits directly when connected', async () => {
      const { conn, socket } = await createConnection()
      socket.fireConnect()
      conn.send('message', { text: 'hello' })
      expect(emitsOf(socket, 'message')).toEqual([{ event: 'message', args: [{ text: 'hello' }] }])
      expect(conn._getBufferedEvents()).toHaveLength(0)
    })

    it("sendTo wraps as 'molecule:room-send' when connected", async () => {
      const { conn, socket } = await createConnection()
      socket.fireConnect()
      conn.sendTo('room-1', 'message', { text: 'hello' })
      expect(emitsOf(socket, 'molecule:room-send')).toEqual([
        {
          event: 'molecule:room-send',
          args: [{ room: 'room-1', event: 'message', data: { text: 'hello' } }],
        },
      ])
    })

    it('buffers send/sendTo while disconnected and flushes in order on connect', async () => {
      const { conn, socket } = await createConnection()
      conn.send('first', 1)
      conn.sendTo('room-1', 'second', 2)
      conn.send('third', 3)
      expect(socket.emitted).toHaveLength(0)
      expect(conn._getBufferedEvents()).toEqual([
        { event: 'first', data: 1 },
        { event: 'second', data: 2, roomId: 'room-1' },
        { event: 'third', data: 3 },
      ])
      socket.fireConnect()
      expect(socket.emitted).toEqual([
        { event: 'first', args: [1] },
        {
          event: 'molecule:room-send',
          args: [{ room: 'room-1', event: 'second', data: 2 }],
        },
        { event: 'third', args: [3] },
      ])
      expect(conn._getBufferedEvents()).toHaveLength(0)
    })

    it('respects maxBufferSize (overflow is dropped)', async () => {
      const { conn } = await createConnection('https://api.example.com', {}, { maxBufferSize: 2 })
      conn.send('a', 1)
      conn.send('b', 2)
      conn.send('c', 3)
      expect(conn._getBufferedEvents()).toEqual([
        { event: 'a', data: 1 },
        { event: 'b', data: 2 },
      ])
    })

    it('drops events while disconnected when buffering is disabled', async () => {
      const { conn, socket } = await createConnection(
        'https://api.example.com',
        {},
        { bufferEvents: false },
      )
      conn.send('message', 1)
      conn.sendTo('room-1', 'message', 2)
      expect(conn._getBufferedEvents()).toHaveLength(0)
      socket.fireConnect()
      expect(socket.emitted).toHaveLength(0)
    })
  })

  describe('incoming events', () => {
    it('dispatches server events to registered handlers', async () => {
      const { conn, socket } = await createConnection()
      socket.fireConnect()
      const handler = vi.fn()
      conn.on('message', handler)
      socket.fireServerEvent('message', { text: 'hello' })
      expect(handler).toHaveBeenCalledWith({ text: 'hello' })
    })

    it('dispatches to multiple handlers', async () => {
      const { conn, socket } = await createConnection()
      const handler1 = vi.fn()
      const handler2 = vi.fn()
      conn.on('message', handler1)
      conn.on('message', handler2)
      socket.fireServerEvent('message', 'data')
      expect(handler1).toHaveBeenCalledWith('data')
      expect(handler2).toHaveBeenCalledWith('data')
    })

    it('off removes a specific handler', async () => {
      const { conn, socket } = await createConnection()
      const handler = vi.fn()
      conn.on('message', handler)
      conn.off('message', handler)
      socket.fireServerEvent('message', 'data')
      expect(handler).not.toHaveBeenCalled()
    })

    it('off without handler removes all handlers for the event', async () => {
      const { conn, socket } = await createConnection()
      const handler1 = vi.fn()
      const handler2 = vi.fn()
      conn.on('message', handler1)
      conn.on('message', handler2)
      conn.off('message')
      socket.fireServerEvent('message', 'data')
      expect(handler1).not.toHaveBeenCalled()
      expect(handler2).not.toHaveBeenCalled()
    })

    it('off cleans up empty handler sets', async () => {
      const { conn } = await createConnection()
      const handler = vi.fn()
      conn.on('message', handler)
      conn.off('message', handler)
      expect(conn._getEventHandlers().has('message')).toBe(false)
    })

    it("reserved 'molecule:*' events never reach app-level handlers", async () => {
      const { conn, socket } = await createConnection()
      socket.fireConnect()
      const handler = vi.fn()
      conn.on('molecule:joined', handler)
      conn.on('molecule:presence', handler)
      conn.on('molecule:join-denied', handler)
      conn.on('molecule:left', handler)
      conn.on('molecule:future-protocol-event', handler)
      socket.fireServerEvent('molecule:joined', { room: 'room-1' })
      socket.fireServerEvent('molecule:presence', { room: 'room-1', presence: [] })
      socket.fireServerEvent('molecule:join-denied', { room: 'room-2' })
      socket.fireServerEvent('molecule:left', { room: 'room-1' })
      socket.fireServerEvent('molecule:future-protocol-event', { anything: true })
      expect(handler).not.toHaveBeenCalled()
    })

    it('ignores unknown events without registered handlers', async () => {
      const { socket } = await createConnection()
      expect(() => socket.fireServerEvent('unknown', {})).not.toThrow()
    })
  })

  describe('presence', () => {
    it("updates presence from 'molecule:presence' and notifies handlers", async () => {
      const { conn, socket } = await createConnection()
      socket.fireConnect()
      const handler = vi.fn()
      conn.onPresenceChange(handler)
      const presence = [{ clientId: 'user-1' }, { clientId: 'user-2' }]
      socket.fireServerEvent('molecule:presence', { room: 'room-1', presence })
      expect(conn.getPresence('room-1')).toEqual(presence)
      // The handler receives the room id the update is FOR — a consumer
      // joined to multiple rooms needs this to know which room's member
      // list just changed (see PresenceChangeHandler).
      expect(handler).toHaveBeenCalledWith(presence, 'room-1')
    })

    it('CONSUMER PROPERTY: a single handler joined to TWO rooms can tell which room each presence update is for', async () => {
      // Regression: before roomId was passed, a consumer joined to multiple
      // rooms had no way to distinguish "this update is room A's member
      // list" from "this update is room B's" and would render one room's
      // presence into another room's UI.
      const { conn, socket } = await createConnection()
      socket.fireConnect()
      const received: Array<{ presence: PresenceInfo[]; roomId: string }> = []
      conn.onPresenceChange((presence, roomId) => {
        received.push({ presence, roomId })
      })

      const roomAPresence = [{ clientId: 'alice' }]
      const roomBPresence = [{ clientId: 'bob' }, { clientId: 'carol' }]
      socket.fireServerEvent('molecule:presence', { room: 'room-A', presence: roomAPresence })
      socket.fireServerEvent('molecule:presence', { room: 'room-B', presence: roomBPresence })

      expect(received).toEqual([
        { presence: roomAPresence, roomId: 'room-A' },
        { presence: roomBPresence, roomId: 'room-B' },
      ])
      // The two rooms' presence lists never merge into one another.
      expect(conn.getPresence('room-A')).toEqual(roomAPresence)
      expect(conn.getPresence('room-B')).toEqual(roomBPresence)
    })

    it('getPresence returns an empty array for unknown rooms', async () => {
      const { conn } = await createConnection()
      expect(conn.getPresence('unknown')).toEqual([])
    })

    it('getPresence returns a copy', async () => {
      const { conn, socket } = await createConnection()
      socket.fireServerEvent('molecule:presence', {
        room: 'room-1',
        presence: [{ clientId: 'user-1' }],
      })
      const p1 = conn.getPresence('room-1')
      const p2 = conn.getPresence('room-1')
      expect(p1).toEqual(p2)
      expect(p1).not.toBe(p2)
    })

    it('onPresenceChange supports multiple handlers', async () => {
      const { conn, socket } = await createConnection()
      const handler1 = vi.fn()
      const handler2 = vi.fn()
      conn.onPresenceChange(handler1)
      conn.onPresenceChange(handler2)
      socket.fireServerEvent('molecule:presence', {
        room: 'room-1',
        presence: [{ clientId: 'user-1' }],
      })
      expect(handler1).toHaveBeenCalledOnce()
      expect(handler2).toHaveBeenCalledOnce()
    })
  })

  describe('reconnection', () => {
    it('re-joins all tracked rooms and fires onReconnect on reconnect', async () => {
      const { conn, socket } = await createConnection()
      socket.fireConnect()
      const join1 = conn.joinRoom('room-1')
      const join2 = conn.joinRoom('room-2')
      socket.fireServerEvent('molecule:joined', { room: 'room-1' })
      socket.fireServerEvent('molecule:joined', { room: 'room-2' })
      await Promise.all([join1, join2])
      const reconnectHandler = vi.fn()
      conn.onReconnect(reconnectHandler)
      socket.fireDisconnect('transport close')
      expect(conn.getState()).toBe('reconnecting')
      const before = socket.emitted.length
      socket.fireConnect()
      const rejoins = socket.emitted.slice(before).filter((e) => e.event === 'molecule:join')
      expect(rejoins).toEqual([
        { event: 'molecule:join', args: [{ room: 'room-1' }] },
        { event: 'molecule:join', args: [{ room: 'room-2' }] },
      ])
      expect(reconnectHandler).toHaveBeenCalledOnce()
      expect(conn.getState()).toBe('connected')
    })

    it('does not fire onReconnect on the first connect', async () => {
      const { conn, socket } = await createConnection()
      const reconnectHandler = vi.fn()
      conn.onReconnect(reconnectHandler)
      socket.fireConnect()
      expect(reconnectHandler).not.toHaveBeenCalled()
    })

    it('re-joins before flushing events buffered during the outage', async () => {
      const { conn, socket } = await createConnection()
      socket.fireConnect()
      const join = conn.joinRoom('room-1')
      socket.fireServerEvent('molecule:joined', { room: 'room-1' })
      await join
      socket.fireDisconnect('transport close')
      conn.send('queued', 42)
      const before = socket.emitted.length
      socket.fireConnect()
      expect(socket.emitted.slice(before)).toEqual([
        { event: 'molecule:join', args: [{ room: 'room-1' }] },
        { event: 'queued', args: [42] },
      ])
    })
  })

  describe('disconnect', () => {
    it('disconnects the underlying socket and cleans up all local state', async () => {
      const { conn, socket } = await createConnection()
      socket.fireConnect()
      const join = conn.joinRoom('room-1')
      socket.fireServerEvent('molecule:joined', { room: 'room-1' })
      await join
      socket.fireServerEvent('molecule:presence', {
        room: 'room-1',
        presence: [{ clientId: 'user-1' }],
      })
      conn.on('message', vi.fn())
      const stateHandler = vi.fn()
      conn.onStateChange(stateHandler)
      conn.disconnect()
      expect(socket.disconnectCalls).toBe(1)
      expect(conn.getState()).toBe('disconnected')
      expect(conn.isConnected()).toBe(false)
      expect(stateHandler).toHaveBeenCalledWith('disconnected')
      expect(conn._getJoinedRooms().size).toBe(0)
      expect(conn.getPresence('room-1')).toEqual([])
      expect(conn._getEventHandlers().size).toBe(0)
      expect(conn._getBufferedEvents()).toHaveLength(0)
      expect(conn._getStateChangeHandlers()).toHaveLength(0)
      expect(conn._getPresenceChangeHandlers()).toHaveLength(0)
      expect(conn._getReconnectHandlers()).toHaveLength(0)
    })

    it("stays 'disconnected' after a manual disconnect even with autoReconnect on", async () => {
      const { conn, socket } = await createConnection()
      socket.fireConnect()
      conn.disconnect()
      expect(conn.getState()).toBe('disconnected')
    })

    it('rejects still-pending joins', async () => {
      const { conn, socket } = await createConnection()
      socket.fireConnect()
      const join = conn.joinRoom('room-1')
      conn.disconnect()
      await expect(join).rejects.toThrow(
        'Connection disconnected before join for room "room-1" was confirmed',
      )
    })
  })

  describe('internal methods', () => {
    it('_getUrl returns the connection URL', async () => {
      const { conn } = await createConnection('wss://api.example.com')
      expect(conn._getUrl()).toBe('wss://api.example.com')
    })

    it('_getOptions returns a connection options copy', async () => {
      const opts = { autoReconnect: true, reconnectDelay: 2000, auth: { token: 'abc' } }
      const { conn } = await createConnection('wss://example.com', opts)
      const result = conn._getOptions()
      expect(result).toEqual(opts)
      expect(result).not.toBe(opts)
    })

    it('_getConfig returns a socketio config copy', async () => {
      const config = { transports: ['websocket'] as Array<'websocket' | 'polling'>, path: '/ws' }
      const { conn } = await createConnection('wss://example.com', {}, config)
      const result = conn._getConfig()
      expect(result).toEqual(config)
      expect(result).not.toBe(config)
    })

    it('_getJoinedRooms returns a copy of the tracked rooms', async () => {
      const { conn, socket } = await createConnection()
      socket.fireConnect()
      void conn.joinRoom('room-1').catch((_error) => {
        /* pending join is irrelevant here — only tracking is asserted */
      })
      const rooms1 = conn._getJoinedRooms()
      const rooms2 = conn._getJoinedRooms()
      expect(rooms1.has('room-1')).toBe(true)
      expect(rooms1).toEqual(rooms2)
      expect(rooms1).not.toBe(rooms2)
    })

    it('_triggerEvent routes through the incoming pipeline (reserved events filtered)', async () => {
      const { conn } = await createConnection()
      const appHandler = vi.fn()
      const reservedHandler = vi.fn()
      conn.on('message', appHandler)
      conn.on('molecule:presence', reservedHandler)
      conn._triggerEvent('message', { text: 'hi' })
      conn._triggerEvent('molecule:presence', {
        room: 'room-1',
        presence: [{ clientId: 'user-1' }],
      })
      expect(appHandler).toHaveBeenCalledWith({ text: 'hi' })
      expect(reservedHandler).not.toHaveBeenCalled()
      // The reserved event was consumed by the protocol handler.
      expect(conn.getPresence('room-1')).toEqual([{ clientId: 'user-1' }])
    })

    it('_setPresence sets presence and notifies handlers', async () => {
      const { conn } = await createConnection()
      const handler = vi.fn()
      conn.onPresenceChange(handler)
      const presence = [{ clientId: 'user-1', metadata: { name: 'Alice' } }]
      conn._setPresence('room-1', presence)
      expect(conn.getPresence('room-1')).toEqual(presence)
      expect(handler).toHaveBeenCalledWith(presence, 'room-1')
    })

    it('_setState overrides the local state machine and notifies handlers', async () => {
      const { conn } = await createConnection()
      const handler = vi.fn()
      conn.onStateChange(handler)
      conn._setState('reconnecting')
      expect(conn.getState()).toBe('reconnecting')
      expect(handler).toHaveBeenCalledWith('reconnecting')
    })

    it('_triggerReconnect sets connected state and fires reconnect handlers', async () => {
      const { conn } = await createConnection()
      conn._setState('disconnected')
      const handler = vi.fn()
      conn.onReconnect(handler)
      conn._triggerReconnect()
      expect(conn.getState()).toBe('connected')
      expect(handler).toHaveBeenCalledOnce()
    })

    it('_flushBuffer drains the buffer without emitting', async () => {
      const { conn, socket } = await createConnection()
      conn.send('a', 1)
      conn.send('b', 2)
      const flushed = conn._flushBuffer()
      expect(flushed).toEqual([
        { event: 'a', data: 1 },
        { event: 'b', data: 2 },
      ])
      expect(conn._getBufferedEvents()).toHaveLength(0)
      expect(socket.emitted).toHaveLength(0)
    })

    it('_confirmJoin marks a room joined and resolves a pending join', async () => {
      const { conn, socket } = await createConnection()
      socket.fireConnect()
      const join = conn.joinRoom('room-1')
      conn._confirmJoin('room-1')
      await expect(join).resolves.toBeUndefined()
      expect(conn._getJoinedRooms().has('room-1')).toBe(true)
    })

    it('_confirmLeave untracks a room and clears its presence', async () => {
      const { conn } = await createConnection()
      conn._confirmJoin('room-2')
      conn._setPresence('room-2', [{ clientId: 'user-1' }])
      conn._confirmLeave('room-2')
      expect(conn._getJoinedRooms().has('room-2')).toBe(false)
      expect(conn.getPresence('room-2')).toHaveLength(0)
    })

    it('handler getters return copies', async () => {
      const { conn } = await createConnection()
      conn.on('message', vi.fn())
      conn.onPresenceChange(vi.fn())
      conn.onStateChange(vi.fn())
      conn.onReconnect(vi.fn())
      expect(conn._getEventHandlers().size).toBe(1)
      expect(conn._getEventHandlers()).not.toBe(conn._getEventHandlers())
      expect(conn._getPresenceChangeHandlers()).toHaveLength(1)
      expect(conn._getPresenceChangeHandlers()).not.toBe(conn._getPresenceChangeHandlers())
      expect(conn._getStateChangeHandlers()).toHaveLength(1)
      expect(conn._getStateChangeHandlers()).not.toBe(conn._getStateChangeHandlers())
      expect(conn._getReconnectHandlers()).toHaveLength(1)
      expect(conn._getReconnectHandlers()).not.toBe(conn._getReconnectHandlers())
    })
  })
})
