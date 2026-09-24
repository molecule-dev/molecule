/**
 * Proves the module-level `@example` in `src/index.ts` (rendered as the README
 * Quick Start) works exactly as written, through the REAL socket.io bond
 * against a REAL Socket.io server on an ephemeral port. Only the browser's
 * `location` is stubbed so that `connect('/')` resolves same-origin to it.
 *
 * @module
 */
import { createServer, type Server as HttpServer } from 'node:http'

import { Server, type Socket as ServerSocket } from 'socket.io'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { provider } from '@molecule/app-realtime-socketio'

import type { RealtimeEventHandler } from '../index.js'
import { connect, setProvider } from '../index.js'

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

describe('README @example', () => {
  let httpServer: HttpServer
  let io: Server
  const handshakeTokens: unknown[] = []
  const roomSends: Array<{ room: string; event: string; data: unknown }> = []
  const leftRooms: string[] = []

  beforeEach(async () => {
    httpServer = createServer()
    io = new Server(httpServer)
    // Minimal server side of the molecule room protocol (what @molecule/api-realtime-socketio speaks).
    io.on('connection', (socket: ServerSocket) => {
      handshakeTokens.push((socket.handshake.auth as { token?: string }).token)
      socket.on('molecule:join', (payload: { room: string }) => {
        void (async () => {
          await socket.join(payload.room)
          socket.emit('molecule:joined', { room: payload.room })
        })()
      })
      socket.on('molecule:leave', (payload: { room: string }) => {
        leftRooms.push(payload.room)
        void (async () => {
          await socket.leave(payload.room)
          socket.emit('molecule:left', { room: payload.room })
        })()
      })
      socket.on('molecule:room-send', (payload: { room: string; event: string; data: unknown }) => {
        roomSends.push(payload)
        io.to(payload.room).emit(payload.event, payload.data)
      })
    })
    await new Promise<void>((resolve) => httpServer.listen(0, '127.0.0.1', resolve))
    const address = httpServer.address()
    const port = typeof address === 'object' && address ? address.port : 0
    vi.stubGlobal('location', {
      protocol: 'http:',
      host: `127.0.0.1:${String(port)}`,
      hostname: '127.0.0.1',
      port: String(port),
    })
  })

  afterEach(async () => {
    vi.unstubAllGlobals()
    await new Promise<void>((resolve) => {
      io.close(() => resolve())
    })
  })

  it('connects same-origin, joins the room, receives the relayed event, and cleans up', async () => {
    setProvider(provider)

    const listingId = 'l_42'
    const room = `listing:${listingId}`

    const connection = await connect('/', { autoReconnect: true, auth: { token: 'session-jwt' } })
    await connection.joinRoom(room)
    expect(handshakeTokens).toEqual(['session-jwt'])

    const received: unknown[] = []
    const onBid: RealtimeEventHandler = (data) => received.push(data)
    connection.on('bid:placed', onBid)
    connection.sendTo(room, 'bid:placed', { amount: 120 })

    await waitFor(() => received.length === 1, 'relayed bid')
    expect(received).toEqual([{ amount: 120 }])
    expect(roomSends).toEqual([
      { room: 'listing:l_42', event: 'bid:placed', data: { amount: 120 } },
    ])

    connection.off('bid:placed', onBid)
    await connection.leaveRoom(room)
    await waitFor(() => leftRooms.length === 1, 'server saw the leave')
    expect(leftRooms).toEqual(['listing:l_42'])
    connection.disconnect()
    expect(connection.isConnected()).toBe(false)
  })
})
