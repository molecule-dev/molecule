import { describe, expect, it, vi } from 'vitest'

import type { RealtimeClientProvider } from '@molecule/app-realtime'

import type { SocketioConnection } from '../types.js'
import { createSocketioProvider, provider } from '../provider.js'

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

async function createConnection(
  url = 'wss://example.com',
  options = {},
  config = {},
): Promise<SocketioConnection> {
  const p = createSocketioProvider(config)
  return (await p.connect(url, options)) as SocketioConnection
}

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

    it('createSocketioProvider accepts config', () => {
      const p = createSocketioProvider({
        transports: ['websocket'],
        path: '/ws',
        bufferEvents: false,
        maxBufferSize: 50,
      })
      expect(typeof p.connect).toBe('function')
    })

    it('connect returns a promise resolving to a RealtimeConnection', async () => {
      const conn = await provider.connect('wss://example.com')
      expect(conn).toBeDefined()
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

  describe('connection state', () => {
    it('starts in connected state', async () => {
      const conn = await createConnection()
      expect(conn.isConnected()).toBe(true)
      expect(conn.getState()).toBe('connected')
    })

    it('disconnect sets state to disconnected', async () => {
      const conn = await createConnection()
      conn.disconnect()
      expect(conn.isConnected()).toBe(false)
      expect(conn.getState()).toBe('disconnected')
    })

    it('onStateChange fires when state changes', async () => {
      const conn = await createConnection()
      const handler = vi.fn()
      conn.onStateChange(handler)
      conn._setState('reconnecting')
      expect(handler).toHaveBeenCalledWith('reconnecting')
    })

    it('onStateChange does not fire when state is unchanged', async () => {
      const conn = await createConnection()
      const handler = vi.fn()
      conn.onStateChange(handler)
      conn._setState('connected')
      expect(handler).not.toHaveBeenCalled()
    })

    it('disconnect fires onStateChange', async () => {
      const conn = await createConnection()
      const handler = vi.fn()
      conn.onStateChange(handler)
      conn.disconnect()
      expect(handler).toHaveBeenCalledWith('disconnected')
    })
  })

  describe('rooms', () => {
    it('joinRoom adds room to joined rooms', async () => {
      const conn = await createConnection()
      await conn.joinRoom('room-1')
      expect(conn._getJoinedRooms().has('room-1')).toBe(true)
    })

    it('leaveRoom removes room from joined rooms', async () => {
      const conn = await createConnection()
      await conn.joinRoom('room-1')
      await conn.leaveRoom('room-1')
      expect(conn._getJoinedRooms().has('room-1')).toBe(false)
    })

    it('leaveRoom also clears presence for that room', async () => {
      const conn = await createConnection()
      await conn.joinRoom('room-1')
      conn._setPresence('room-1', [{ clientId: 'user-1' }])
      expect(conn.getPresence('room-1')).toHaveLength(1)
      await conn.leaveRoom('room-1')
      expect(conn.getPresence('room-1')).toHaveLength(0)
    })

    it('_confirmJoin adds room to internal state', async () => {
      const conn = await createConnection()
      conn._confirmJoin('room-2')
      expect(conn._getJoinedRooms().has('room-2')).toBe(true)
    })

    it('_confirmLeave removes room and presence', async () => {
      const conn = await createConnection()
      conn._confirmJoin('room-2')
      conn._setPresence('room-2', [{ clientId: 'user-1' }])
      conn._confirmLeave('room-2')
      expect(conn._getJoinedRooms().has('room-2')).toBe(false)
      expect(conn.getPresence('room-2')).toHaveLength(0)
    })

    it('disconnect clears all rooms', async () => {
      const conn = await createConnection()
      await conn.joinRoom('room-1')
      await conn.joinRoom('room-2')
      conn.disconnect()
      expect(conn._getJoinedRooms().size).toBe(0)
    })
  })

  describe('event handling', () => {
    it('on registers a handler', async () => {
      const conn = await createConnection()
      const handler = vi.fn()
      conn.on('message', handler)
      expect(conn._getEventHandlers().get('message')?.size).toBe(1)
    })

    it('_triggerEvent calls registered handlers', async () => {
      const conn = await createConnection()
      const handler = vi.fn()
      conn.on('message', handler)
      conn._triggerEvent('message', { text: 'hello' })
      expect(handler).toHaveBeenCalledWith({ text: 'hello' })
    })

    it('_triggerEvent calls multiple handlers', async () => {
      const conn = await createConnection()
      const handler1 = vi.fn()
      const handler2 = vi.fn()
      conn.on('message', handler1)
      conn.on('message', handler2)
      conn._triggerEvent('message', 'data')
      expect(handler1).toHaveBeenCalledWith('data')
      expect(handler2).toHaveBeenCalledWith('data')
    })

    it('_triggerEvent does nothing for unregistered events', async () => {
      const conn = await createConnection()
      expect(() => conn._triggerEvent('unknown', {})).not.toThrow()
    })

    it('off removes a specific handler', async () => {
      const conn = await createConnection()
      const handler = vi.fn()
      conn.on('message', handler)
      conn.off('message', handler)
      conn._triggerEvent('message', 'data')
      expect(handler).not.toHaveBeenCalled()
    })

    it('off without handler removes all handlers for event', async () => {
      const conn = await createConnection()
      const handler1 = vi.fn()
      const handler2 = vi.fn()
      conn.on('message', handler1)
      conn.on('message', handler2)
      conn.off('message')
      conn._triggerEvent('message', 'data')
      expect(handler1).not.toHaveBeenCalled()
      expect(handler2).not.toHaveBeenCalled()
    })

    it('off cleans up empty handler sets', async () => {
      const conn = await createConnection()
      const handler = vi.fn()
      conn.on('message', handler)
      conn.off('message', handler)
      expect(conn._getEventHandlers().has('message')).toBe(false)
    })

    it('disconnect clears all event handlers', async () => {
      const conn = await createConnection()
      conn.on('message', vi.fn())
      conn.on('update', vi.fn())
      conn.disconnect()
      expect(conn._getEventHandlers().size).toBe(0)
    })
  })

  describe('presence', () => {
    it('getPresence returns empty array for unknown room', async () => {
      const conn = await createConnection()
      expect(conn.getPresence('unknown')).toEqual([])
    })

    it('_setPresence sets presence for a room', async () => {
      const conn = await createConnection()
      const presence = [{ clientId: 'user-1', metadata: { name: 'Alice' } }]
      conn._setPresence('room-1', presence)
      expect(conn.getPresence('room-1')).toEqual(presence)
    })

    it('getPresence returns a copy', async () => {
      const conn = await createConnection()
      conn._setPresence('room-1', [{ clientId: 'user-1' }])
      const p1 = conn.getPresence('room-1')
      const p2 = conn.getPresence('room-1')
      expect(p1).toEqual(p2)
      expect(p1).not.toBe(p2)
    })

    it('_setPresence notifies presence change handlers', async () => {
      const conn = await createConnection()
      const handler = vi.fn()
      conn.onPresenceChange(handler)
      const presence = [{ clientId: 'user-1' }]
      conn._setPresence('room-1', presence)
      expect(handler).toHaveBeenCalledWith(presence)
    })

    it('onPresenceChange supports multiple handlers', async () => {
      const conn = await createConnection()
      const handler1 = vi.fn()
      const handler2 = vi.fn()
      conn.onPresenceChange(handler1)
      conn.onPresenceChange(handler2)
      conn._setPresence('room-1', [{ clientId: 'user-1' }])
      expect(handler1).toHaveBeenCalledOnce()
      expect(handler2).toHaveBeenCalledOnce()
    })

    it('disconnect clears presence', async () => {
      const conn = await createConnection()
      conn._setPresence('room-1', [{ clientId: 'user-1' }])
      conn.disconnect()
      expect(conn.getPresence('room-1')).toEqual([])
    })
  })

  describe('reconnection', () => {
    it('onReconnect registers a handler', async () => {
      const conn = await createConnection()
      const handler = vi.fn()
      conn.onReconnect(handler)
      expect(conn._getReconnectHandlers()).toHaveLength(1)
    })

    it('_triggerReconnect fires reconnect handlers', async () => {
      const conn = await createConnection()
      conn._setState('disconnected')
      const handler = vi.fn()
      conn.onReconnect(handler)
      conn._triggerReconnect()
      expect(handler).toHaveBeenCalledOnce()
    })

    it('_triggerReconnect sets state to connected', async () => {
      const conn = await createConnection()
      conn._setState('disconnected')
      conn._triggerReconnect()
      expect(conn.getState()).toBe('connected')
      expect(conn.isConnected()).toBe(true)
    })

    it('_triggerReconnect fires state change handler', async () => {
      const conn = await createConnection()
      conn._setState('disconnected')
      const handler = vi.fn()
      conn.onStateChange(handler)
      conn._triggerReconnect()
      expect(handler).toHaveBeenCalledWith('connected')
    })
  })

  describe('event buffering', () => {
    it('send buffers events when disconnected', async () => {
      const conn = await createConnection()
      conn._setState('disconnected')
      conn.send('message', { text: 'hello' })
      expect(conn._getBufferedEvents()).toHaveLength(1)
      expect(conn._getBufferedEvents()[0]).toEqual({
        event: 'message',
        data: { text: 'hello' },
        roomId: undefined,
      })
    })

    it('sendTo buffers room events when disconnected', async () => {
      const conn = await createConnection()
      conn._setState('disconnected')
      conn.sendTo('room-1', 'message', { text: 'hello' })
      expect(conn._getBufferedEvents()).toHaveLength(1)
      expect(conn._getBufferedEvents()[0]).toEqual({
        event: 'message',
        data: { text: 'hello' },
        roomId: 'room-1',
      })
    })

    it('send does not buffer when connected', async () => {
      const conn = await createConnection()
      conn.send('message', { text: 'hello' })
      expect(conn._getBufferedEvents()).toHaveLength(0)
    })

    it('respects maxBufferSize', async () => {
      const conn = await createConnection('wss://example.com', {}, { maxBufferSize: 3 })
      conn._setState('disconnected')
      conn.send('a', 1)
      conn.send('b', 2)
      conn.send('c', 3)
      conn.send('d', 4)
      expect(conn._getBufferedEvents()).toHaveLength(3)
    })

    it('_flushBuffer returns and clears buffered events', async () => {
      const conn = await createConnection()
      conn._setState('disconnected')
      conn.send('a', 1)
      conn.send('b', 2)
      const flushed = conn._flushBuffer()
      expect(flushed).toHaveLength(2)
      expect(conn._getBufferedEvents()).toHaveLength(0)
    })

    it('buffering is disabled when config says so', async () => {
      const conn = await createConnection('wss://example.com', {}, { bufferEvents: false })
      conn._setState('disconnected')
      conn.send('message', { text: 'hello' })
      expect(conn._getBufferedEvents()).toHaveLength(0)
    })

    it('disconnect clears the buffer', async () => {
      const conn = await createConnection()
      conn._setState('disconnected')
      conn.send('message', 'data')
      conn.disconnect()
      expect(conn._getBufferedEvents()).toHaveLength(0)
    })
  })

  describe('internal methods', () => {
    it('_getUrl returns the connection URL', async () => {
      const conn = await createConnection('wss://api.example.com')
      expect(conn._getUrl()).toBe('wss://api.example.com')
    })

    it('_getOptions returns connection options copy', async () => {
      const opts = { autoReconnect: true, reconnectDelay: 2000, auth: { token: 'abc' } }
      const conn = await createConnection('wss://example.com', opts)
      const result = conn._getOptions()
      expect(result).toEqual(opts)
      expect(result).not.toBe(opts)
    })

    it('_getConfig returns socketio config copy', async () => {
      const config = { transports: ['websocket'] as Array<'websocket' | 'polling'>, path: '/ws' }
      const conn = await createConnection('wss://example.com', {}, config)
      const result = conn._getConfig()
      expect(result).toEqual(config)
      expect(result).not.toBe(config)
    })

    it('_getJoinedRooms returns a copy', async () => {
      const conn = await createConnection()
      await conn.joinRoom('room-1')
      const rooms1 = conn._getJoinedRooms()
      const rooms2 = conn._getJoinedRooms()
      expect(rooms1).toEqual(rooms2)
      expect(rooms1).not.toBe(rooms2)
    })

    it('_getPresenceChangeHandlers returns a copy', async () => {
      const conn = await createConnection()
      conn.onPresenceChange(vi.fn())
      const h1 = conn._getPresenceChangeHandlers()
      const h2 = conn._getPresenceChangeHandlers()
      expect(h1).toHaveLength(1)
      expect(h1).not.toBe(h2)
    })

    it('_getStateChangeHandlers returns a copy', async () => {
      const conn = await createConnection()
      conn.onStateChange(vi.fn())
      const h1 = conn._getStateChangeHandlers()
      const h2 = conn._getStateChangeHandlers()
      expect(h1).toHaveLength(1)
      expect(h1).not.toBe(h2)
    })

    it('_getEventHandlers returns a copy', async () => {
      const conn = await createConnection()
      conn.on('message', vi.fn())
      const h1 = conn._getEventHandlers()
      const h2 = conn._getEventHandlers()
      expect(h1.size).toBe(1)
      expect(h1).not.toBe(h2)
    })
  })
})
