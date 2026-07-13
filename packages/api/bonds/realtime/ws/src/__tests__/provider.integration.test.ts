/**
 * REAL-DEPENDENCY integration tests — no mocks, the actual `ws` server and
 * `ws` clients over real TCP sockets.
 *
 * `provider.test.ts` covers the room/handler bookkeeping and
 * `protocol-integration.test.ts` covers the join protocol, but neither
 * exercised the shutdown path with clients still connected — which is exactly
 * how real deployments (and real test harnesses) call `close()`. That gap hid
 * a hang: `ws`'s `WebSocketServer.close()` only stops accepting NEW
 * connections and waits for existing ones to end on their own, so
 * `provider.close()` with one connected browser tab blocked forever — an
 * executor debugging "my test never finishes" has no way to see that OUR bond
 * was the cause. This file pins the fixed behavior plus the
 * failure-disambiguation contract of the server-side API.
 *
 * @module
 */

import http from 'node:http'

import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { WebSocket } from 'ws'

import type { RealtimeProvider } from '@molecule/api-realtime'

import { createProvider } from '../provider.js'

/** A parsed `{ event, data }` wire frame. */
interface Frame {
  event: string
  data: unknown
}

/**
 * Opens a real WebSocket client and resolves once the connection is open,
 * collecting every received frame.
 *
 * @param port - The server port.
 * @param query - Optional query string (handshake auth), e.g. `'?token=abc'`.
 * @returns The open socket and its received-frames list.
 */
async function openClient(
  port: number,
  query = '',
): Promise<{ socket: WebSocket; frames: Frame[] }> {
  const socket = new WebSocket(`ws://127.0.0.1:${String(port)}/${query}`)
  const frames: Frame[] = []
  socket.on('message', (raw: Buffer) => {
    frames.push(JSON.parse(raw.toString()) as Frame)
  })
  await new Promise<void>((resolve, reject) => {
    socket.once('open', resolve)
    socket.once('error', reject)
  })
  return { socket, frames }
}

/**
 * Waits (bounded) until a frame matching the predicate arrives.
 *
 * @param frames - The client's received-frames list.
 * @param predicate - Match condition.
 * @returns The first matching frame.
 */
async function waitForFrame(frames: Frame[], predicate: (f: Frame) => boolean): Promise<Frame> {
  for (let i = 0; i < 400; i += 1) {
    const match = frames.find(predicate)
    if (match) return match
    await new Promise((resolve) => setTimeout(resolve, 5))
  }
  throw new Error(`No frame matching predicate arrived. Got: ${JSON.stringify(frames)}`)
}

describe('@molecule/api-realtime-ws × REAL ws server + clients', () => {
  let server: http.Server
  let provider: RealtimeProvider
  let port: number
  const sockets: WebSocket[] = []

  beforeEach(async () => {
    server = http.createServer()
    provider = createProvider({ httpServer: server })
    await new Promise<void>((resolve) => server.listen(0, resolve))
    const address = server.address()
    port = typeof address === 'object' && address ? address.port : 0
    expect(port).toBeGreaterThan(0)
  })

  afterEach(async () => {
    // NOTE: sockets are deliberately NOT disconnected first — close() must
    // cope (that ordering is what the first test pins).
    await provider.close()
    for (const socket of sockets.splice(0)) socket.terminate()
    await new Promise<void>((resolve) => {
      server.close(() => resolve())
    })
  })

  it('CONSUMER PROPERTY: close() resolves promptly with clients still connected (graceful shutdown must not wait for every tab to close)', async () => {
    const { socket } = await openClient(port)
    sockets.push(socket)
    const clientClosed = new Promise<void>((resolve) => socket.once('close', () => resolve()))

    // Before the fix this hung forever: ws's server.close() waits for existing
    // connections to end by themselves. 2s is far above a healthy teardown and
    // far below "hangs until the harness timeout kills the run".
    const outcome = await Promise.race([
      provider.close().then(() => 'closed' as const),
      new Promise<'hung'>((resolve) => setTimeout(() => resolve('hung'), 2000)),
    ])
    expect(outcome).toBe('closed')

    // The client actually gets disconnected (terminated), not silently orphaned.
    await clientClosed

    // And close() is idempotent — a second call (double teardown is a normal
    // shutdown pattern) resolves instead of rejecting with ws's bare
    // "The server is not running".
    await expect(provider.close()).resolves.toBeUndefined()
  })

  it('CONSUMER PROPERTY: a slow async join guard (~300ms auth lookup) still admits the client and messages flow', async () => {
    provider.onJoinRequest?.(async ({ auth }) => {
      // Realistic guard: token verification / DB round-trip takes time.
      await new Promise((resolve) => setTimeout(resolve, 300))
      return auth.token === 'good'
    })

    const { socket, frames } = await openClient(port, '?token=good')
    sockets.push(socket)
    socket.send(JSON.stringify({ event: 'molecule:join', data: { room: 'channel:slow' } }))
    const joined = await waitForFrame(frames, (f) => f.event === 'molecule:joined')
    expect(joined.data).toEqual({ room: 'channel:slow' })

    await provider.broadcast('channel:slow', 'notice', { text: 'hi' })
    const notice = await waitForFrame(frames, (f) => f.event === 'notice')
    expect(notice.data).toEqual({ text: 'hi' })
  })

  it('FAILURE DISAMBIGUATION: deny reasons and server-side errors are distinct, not one opaque failure', async () => {
    provider.onJoinRequest?.(({ room }) => {
      if (room === 'boom') throw new Error('guard exploded')
      return false
    })

    const { socket, frames } = await openClient(port)
    sockets.push(socket)

    // Guard returned false → reason 'denied'.
    socket.send(JSON.stringify({ event: 'molecule:join', data: { room: 'private' } }))
    const denied = await waitForFrame(
      frames,
      (f) => f.event === 'molecule:join-denied' && (f.data as { room: string }).room === 'private',
    )
    expect((denied.data as { reason?: string }).reason).toBe('denied')

    // Guard threw → reason 'guard error' (a server bug, not a permissions issue).
    socket.send(JSON.stringify({ event: 'molecule:join', data: { room: 'boom' } }))
    const guardError = await waitForFrame(
      frames,
      (f) => f.event === 'molecule:join-denied' && (f.data as { room: string }).room === 'boom',
    )
    expect((guardError.data as { reason?: string }).reason).toBe('guard error')

    // Malformed payload → reason 'invalid payload' (client-side wiring bug).
    socket.send(JSON.stringify({ event: 'molecule:join', data: { nope: true } }))
    const invalid = await waitForFrame(
      frames,
      (f) => f.event === 'molecule:join-denied' && (f.data as { room: string }).room === '',
    )
    expect((invalid.data as { reason?: string }).reason).toBe('invalid payload')

    // Server-side API failures name their distinct causes.
    await expect(provider.broadcast('nowhere', 'x', {})).rejects.toThrow(
      'Room "nowhere" does not exist',
    )
    await expect(provider.sendTo('ghost-client', 'x', {})).rejects.toThrow(
      'Client "ghost-client" is not connected',
    )
  })
})
