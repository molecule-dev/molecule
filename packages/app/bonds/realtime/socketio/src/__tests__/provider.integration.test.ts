/**
 * REAL-DEPENDENCY integration tests — no mocks of socket.io-client, the very
 * library this bond wraps.
 *
 * The unit suite (`provider.test.ts`) replaces socket.io-client with a
 * controllable fake, so it can only validate OUR assumptions about the
 * socket's behavior — not socket.io-client itself (its manager, reconnection
 * engine, handshake auth, or event dispatch). This file connects a REAL
 * socket.io-client to a REAL Socket.io server on an ephemeral port and pins
 * the consumer-visible lifecycle: join-before-connected, buffered sends,
 * deny-vs-teardown disambiguation, and reconnect-rejoin after a dropped
 * transport.
 *
 * NOTE on the server import: `socket.io` is not a runtime dependency of this
 * app bond (the bond itself only needs socket.io-client) — it is a
 * devDependency pinned (4.8.3) here solely so this test-side server resolves,
 * matching the version pinned by the protocol's server counterpart
 * `@molecule/api-realtime-socketio`.
 *
 * @module
 */

import { createServer, type Server as HttpServer } from 'node:http'

import { Server, type Socket as ServerSocket } from 'socket.io'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'

import type { ConnectionState, RealtimeConnection } from '@molecule/app-realtime'

import { createSocketioProvider } from '../provider.js'

/**
 * Waits (bounded) until a condition becomes true.
 *
 * @param condition - Polled every 5ms.
 * @param label - Failure label.
 */
async function waitFor(condition: () => boolean, label: string): Promise<void> {
  for (let i = 0; i < 800; i += 1) {
    if (condition()) return
    await new Promise((resolve) => setTimeout(resolve, 5))
  }
  throw new Error(`Timed out waiting for: ${label}`)
}

describe('@molecule/app-realtime-socketio × REAL socket.io-client ↔ REAL Socket.io server', () => {
  let httpServer: HttpServer
  let io: Server
  let url: string
  const connections: RealtimeConnection[] = []
  /** Every non-reserved event each server socket received. */
  const serverReceived: Array<{ event: string; data: unknown }> = []
  /** room-send payloads the server received. */
  const roomSends: Array<{ room: string; event: string; data: unknown }> = []

  beforeEach(async () => {
    httpServer = createServer()
    io = new Server(httpServer)

    // A minimal server-side implementation of the molecule room protocol —
    // the same contract @molecule/api-realtime-socketio speaks.
    io.on('connection', (socket: ServerSocket) => {
      const emitPresence = async (room: string): Promise<void> => {
        const ids = await io.in(room).fetchSockets()
        io.to(room).emit('molecule:presence', {
          room,
          presence: ids.map((s) => ({ clientId: s.id })),
        })
      }
      socket.on('molecule:join', (payload: { room: string }) => {
        void (async () => {
          const { room } = payload
          const token = (socket.handshake.auth as { token?: string }).token
          if (room.startsWith('private') && token !== 'good') {
            socket.emit('molecule:join-denied', { room, reason: 'members only' })
            return
          }
          await socket.join(room)
          socket.emit('molecule:joined', { room })
          await emitPresence(room)
        })()
      })
      socket.on('molecule:leave', (payload: { room: string }) => {
        void (async () => {
          await socket.leave(payload.room)
          socket.emit('molecule:left', { room: payload.room })
          await emitPresence(payload.room)
        })()
      })
      socket.on('molecule:room-send', (payload: { room: string; event: string; data: unknown }) => {
        roomSends.push(payload)
        // Relay to the room, like an app-level chat handler would.
        io.to(payload.room).emit(payload.event, payload.data)
      })
      socket.onAny((event: string, data: unknown) => {
        if (!event.startsWith('molecule:')) serverReceived.push({ event, data })
      })
    })

    await new Promise<void>((resolve) => httpServer.listen(0, resolve))
    const address = httpServer.address()
    const port = typeof address === 'object' && address ? address.port : 0
    expect(port).toBeGreaterThan(0)
    url = `http://127.0.0.1:${String(port)}`
    serverReceived.length = 0
    roomSends.length = 0
  })

  afterEach(async () => {
    for (const connection of connections.splice(0)) connection.disconnect()
    await new Promise<void>((resolve) => {
      io.close(() => resolve())
    })
  })

  it('CONSUMER PROPERTY: joinRoom + send issued IMMEDIATELY (before the transport is up) are not lost — the realistic app-startup flow', async () => {
    const provider = createSocketioProvider()
    const states: ConnectionState[] = []

    // Real UI code does all of this synchronously right after connect() —
    // long before the websocket handshake completes.
    const connection = await provider.connect(url, { auth: { token: 'good' } })
    connections.push(connection)
    connection.onStateChange((s) => states.push(s))
    expect(connection.getState()).toBe('connecting')
    const joinPromise = connection.joinRoom('channel:general')
    connection.send('hello', { n: 1 }) // buffered while disconnected

    await joinPromise // resolves only on the server's real molecule:joined
    expect(connection.getState()).toBe('connected')
    expect(states).toContain('connected')

    // The buffered event was flushed to the real server.
    await waitFor(
      () => serverReceived.some((e) => e.event === 'hello'),
      'buffered send to arrive at the server',
    )
    expect(serverReceived.find((e) => e.event === 'hello')?.data).toEqual({ n: 1 })

    // Presence arrived from the server and is queryable.
    await waitFor(
      () => connection.getPresence('channel:general').length === 1,
      'presence for the joined room',
    )

    // Room send round-trips: wrapped as molecule:room-send, relayed back.
    const chats: unknown[] = []
    connection.on('chat', (data) => chats.push(data))
    connection.sendTo('channel:general', 'chat', { text: 'yo' })
    await waitFor(() => chats.length === 1, 'room-send relay to come back')
    expect(chats[0]).toEqual({ text: 'yo' })
    expect(roomSends).toEqual([{ room: 'channel:general', event: 'chat', data: { text: 'yo' } }])

    // Reserved protocol events never leak into app-level handlers.
    const leaked: unknown[] = []
    connection.on('molecule:joined', (data) => leaked.push(data))
    await connection.joinRoom('channel:general') // already confirmed — instant
    expect(leaked).toEqual([])
  })

  it('FAILURE DISAMBIGUATION: a server denial (with its reason) reads differently from a local teardown', async () => {
    const provider = createSocketioProvider()
    const connection = await provider.connect(url, { auth: { token: 'bad' } })
    connections.push(connection)

    // Server denied: the promise carries the SERVER's reason.
    await expect(connection.joinRoom('private:vip')).rejects.toThrow('members only')

    // Local teardown: a join pending at disconnect() names the teardown, so a
    // caller can tell "you lack permission" from "the connection went away".
    const pending = connection.joinRoom('private:other')
    connection.disconnect()
    await expect(pending).rejects.toThrow(
      'Connection disconnected before join for room "private:other" was confirmed',
    )
  })

  it('CONSUMER PROPERTY: after a dropped transport the client reconnects AND re-joins its rooms (presence survives network blips)', async () => {
    const provider = createSocketioProvider()
    const connection = await provider.connect(url, {
      auth: { token: 'good' },
      reconnectDelay: 50,
      maxRetries: 10,
    })
    connections.push(connection)
    await connection.joinRoom('channel:general')

    let reconnected = false
    connection.onReconnect(() => {
      reconnected = true
    })
    const states: ConnectionState[] = []
    connection.onStateChange((s) => states.push(s))

    // Drop the transport server-side (network blip, NOT an intentional
    // disconnect — those are terminal by socket.io semantics).
    for (const [, socket] of io.of('/').sockets) socket.conn.close()

    await waitFor(() => reconnected, 'client to reconnect')
    expect(states).toContain('reconnecting')
    expect(states).toContain('connected')

    // The room was re-joined without any app code involved: a fresh
    // room-send still round-trips.
    const chats: unknown[] = []
    connection.on('chat', (data) => chats.push(data))
    await waitFor(() => {
      connection.sendTo('channel:general', 'chat', { text: 'back' })
      return chats.length > 0
    }, 'room-send after reconnect to round-trip')
    expect(chats[0]).toEqual({ text: 'back' })
  })
})
