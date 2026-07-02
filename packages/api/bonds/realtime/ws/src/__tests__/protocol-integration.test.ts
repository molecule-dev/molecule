import http from 'node:http'

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { WebSocket } from 'ws'

import type { JoinRequest, RealtimeProvider } from '@molecule/api-realtime'

import { createProvider } from '../provider.js'

/**
 * A parsed `{ event, data }` wire frame.
 */
interface Frame {
  event: string
  data: unknown
}

/**
 * Real (un-mocked) integration tests for the client-initiated room-join
 * protocol over raw WebSockets: a real `ws` server on an ephemeral port +
 * real `ws` clients speaking the `{ event, data }` JSON framing, covering
 * join/deny/guards/query-param auth/leave/presence/room-send/reserved-event
 * isolation.
 */
describe('ws provider — client-initiated join protocol (real server + client)', () => {
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
    for (const socket of sockets.splice(0)) socket.close()
    await provider.close()
    await new Promise<void>((resolve) => {
      server.close(() => resolve())
    })
  })

  /** Connect a real ws client; `query` is the raw query string (e.g. `?token=x`). */
  function connect(query = ''): Promise<{ socket: WebSocket; frames: Frame[] }> {
    const socket = new WebSocket(`ws://127.0.0.1:${port}/${query}`)
    sockets.push(socket)
    const frames: Frame[] = []
    socket.on('message', (raw) => {
      try {
        frames.push(JSON.parse(String(raw)) as Frame)
      } catch (_error) {
        // Non-JSON frames are not part of this protocol's assertions.
      }
    })
    return new Promise((resolve, reject) => {
      socket.once('open', () => resolve({ socket, frames }))
      socket.once('error', reject)
    })
  }

  /** Send a `{ event, data }` frame. */
  function send(socket: WebSocket, event: string, data: unknown): void {
    socket.send(JSON.stringify({ event, data }))
  }

  /** Poll the frame log until a frame matches, or time out. */
  async function waitForFrame(
    frames: Frame[],
    predicate: (frame: Frame) => boolean,
    label = 'frame',
    timeoutMs = 5000,
  ): Promise<Frame> {
    const deadline = Date.now() + timeoutMs
    while (Date.now() < deadline) {
      const found = frames.find(predicate)
      if (found) return found
      await new Promise((resolve) => setTimeout(resolve, 10))
    }
    throw new Error(`Timed out waiting for ${label}`)
  }

  /** Poll until `check()` is true or time out. */
  async function until(check: () => boolean, label = 'condition', timeoutMs = 5000): Promise<void> {
    const deadline = Date.now() + timeoutMs
    while (Date.now() < deadline) {
      if (check()) return
      await new Promise((resolve) => setTimeout(resolve, 10))
    }
    throw new Error(`Timed out waiting for ${label}`)
  }

  /** Join a room and resolve with the joined/denied verdict frame. */
  async function requestJoin(socket: WebSocket, frames: Frame[], room: string): Promise<Frame> {
    send(socket, 'molecule:join', { room })
    return waitForFrame(
      frames,
      (f) =>
        (f.event === 'molecule:joined' || f.event === 'molecule:join-denied') &&
        typeof f.data === 'object' &&
        f.data !== null &&
        (f.data as { room?: unknown }).room === room,
      `join verdict for "${room}"`,
    )
  }

  it('protocol-join by name → molecule:joined and receives broadcast(name, …)', async () => {
    const { socket, frames } = await connect()
    const verdict = await requestJoin(socket, frames, 'channel:general')
    expect(verdict.event).toBe('molecule:joined')
    expect(verdict.data).toEqual({ room: 'channel:general' })

    await provider.broadcast('channel:general', 'news', { n: 7 })
    const received = await waitForFrame(frames, (f) => f.event === 'news', 'broadcast')
    expect(received.data).toEqual({ n: 7 })
  })

  it('guard deny → molecule:join-denied and no broadcast delivery', async () => {
    provider.onJoinRequest?.(({ room, auth }) => {
      if (!room.startsWith('private:')) return true
      return auth.token === 'sesame'
    })

    const privileged = await connect('?token=sesame')
    const denied = await connect()

    expect((await requestJoin(privileged.socket, privileged.frames, 'private:vault')).event).toBe(
      'molecule:joined',
    )
    const verdict = await requestJoin(denied.socket, denied.frames, 'private:vault')
    expect(verdict.event).toBe('molecule:join-denied')
    expect(verdict.data).toEqual({ room: 'private:vault', reason: 'denied' })

    await provider.broadcast('private:vault', 'secret', { code: 1 })
    // The privileged member's receipt is the sentinel: the server delivered
    // the broadcast, and the denied client got nothing.
    await waitForFrame(privileged.frames, (f) => f.event === 'secret', 'privileged delivery')
    expect(denied.frames.filter((f) => f.event === 'secret')).toEqual([])
  })

  it('multiple guards AND — every guard must allow', async () => {
    const calls: string[] = []
    provider.onJoinRequest?.(async () => {
      calls.push('g1')
      return true
    })
    provider.onJoinRequest?.(({ room }) => {
      calls.push('g2')
      return room !== 'blocked'
    })

    const { socket, frames } = await connect()
    expect((await requestJoin(socket, frames, 'open')).event).toBe('molecule:joined')
    expect((await requestJoin(socket, frames, 'blocked')).event).toBe('molecule:join-denied')
    expect(calls).toEqual(['g1', 'g2', 'g1', 'g2'])
  })

  it('a guard that throws denies the join (logged, never silent)', async () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => undefined)
    try {
      provider.onJoinRequest?.(() => {
        throw new Error('boom')
      })
      const { socket, frames } = await connect()
      const verdict = await requestJoin(socket, frames, 'anything')
      expect(verdict.event).toBe('molecule:join-denied')
      expect(verdict.data).toEqual({ room: 'anything', reason: 'guard error' })
      expect(warnSpy).toHaveBeenCalled()
    } finally {
      warnSpy.mockRestore()
    }
  })

  it('guards receive auth parsed from the upgrade query params ({} when none)', async () => {
    const requests: JoinRequest[] = []
    provider.onJoinRequest?.((request) => {
      requests.push(request)
      return true
    })
    const serverIds: string[] = []
    provider.onConnection((clientId) => serverIds.push(clientId))

    const authed = await connect('?token=sesame&role=admin')
    await requestJoin(authed.socket, authed.frames, 'channel:auth')
    expect(requests).toHaveLength(1)
    expect(requests[0].room).toBe('channel:auth')
    expect(requests[0].clientId).toBe(serverIds[0])
    expect(requests[0].auth).toEqual({ token: 'sesame', role: 'admin' })

    const anonymous = await connect()
    await requestJoin(anonymous.socket, anonymous.frames, 'channel:anon')
    expect(requests[1].auth).toEqual({})
  })

  it('molecule:leave acks with molecule:left and stops broadcast delivery', async () => {
    const a = await connect()
    const b = await connect()
    await requestJoin(a.socket, a.frames, 'room:x')
    await requestJoin(b.socket, b.frames, 'room:x')

    send(b.socket, 'molecule:leave', { room: 'room:x' })
    const left = await waitForFrame(b.frames, (f) => f.event === 'molecule:left', 'left ack')
    expect(left.data).toEqual({ room: 'room:x' })

    await provider.broadcast('room:x', 'tick', 2)
    // a's receipt is the sentinel proving the broadcast went out.
    await waitForFrame(a.frames, (f) => f.event === 'tick', 'remaining member delivery')
    expect(b.frames.filter((f) => f.event === 'tick')).toEqual([])
  })

  it('sends molecule:presence frames to the room on join, leave, and disconnect', async () => {
    const room = 'presence:room'
    const serverIds: string[] = []
    provider.onConnection((clientId) => serverIds.push(clientId))

    const a = await connect()
    await requestJoin(a.socket, a.frames, room)
    const presenceOf = (frames: Frame[]): Array<Array<{ clientId: string }>> =>
      frames
        .filter((f) => f.event === 'molecule:presence')
        .map((f) => (f.data as { presence: Array<{ clientId: string }> }).presence)

    await until(() => presenceOf(a.frames).length >= 1, 'join presence')
    expect(presenceOf(a.frames)[0]).toEqual([{ clientId: serverIds[0] }])

    const b = await connect()
    await requestJoin(b.socket, b.frames, room)
    await until(() => presenceOf(a.frames).length >= 2, 'two-member presence')
    expect(
      presenceOf(a.frames)[1]
        .map((p) => p.clientId)
        .sort(),
    ).toEqual([...serverIds].sort())

    send(b.socket, 'molecule:leave', { room })
    await until(() => presenceOf(a.frames).length >= 3, 'post-leave presence')
    expect(presenceOf(a.frames)[2]).toEqual([{ clientId: serverIds[0] }])

    await requestJoin(b.socket, b.frames, room)
    await until(() => presenceOf(a.frames).length >= 4, 'rejoin presence')
    b.socket.close()
    await until(() => presenceOf(a.frames).length >= 5, 'post-disconnect presence')
    expect(presenceOf(a.frames)[4]).toEqual([{ clientId: serverIds[0] }])
  })

  it('molecule:room-send dispatches to onMessage only for protocol-joined senders (no relay)', async () => {
    const room = 'chat:room'
    const serverIds: string[] = []
    provider.onConnection((clientId) => serverIds.push(clientId))
    const messages: Array<[string, string, string, unknown]> = []
    provider.onMessage((roomId, clientId, event, data) =>
      messages.push([roomId, clientId, event, data]),
    )

    const member = await connect()
    const lurker = await connect()
    await requestJoin(member.socket, member.frames, room)

    send(lurker.socket, 'molecule:room-send', { room, event: 'chat', data: { text: 'intruder' } })
    send(member.socket, 'molecule:room-send', { room, event: 'chat', data: { text: 'hello' } })

    await until(() => messages.length >= 1, 'room-send dispatch')
    // Cross-socket ordering isn't guaranteed — settle before asserting the
    // lurker's message never dispatched.
    await new Promise((resolve) => setTimeout(resolve, 100))
    expect(messages).toEqual([[room, serverIds[0], 'chat', { text: 'hello' }]])
    // room-send never auto-relays to the room; server code decides.
    expect(member.frames.filter((f) => f.event === 'chat')).toEqual([])
  })

  it('reserved molecule:* events are never dispatched to onMessage', async () => {
    const serverIds: string[] = []
    provider.onConnection((clientId) => serverIds.push(clientId))
    const messages: Array<[string, string, string]> = []
    provider.onMessage((roomId, clientId, event) => messages.push([roomId, clientId, event]))

    const { socket, frames } = await connect()
    await requestJoin(socket, frames, 'room:any')
    send(socket, 'molecule:bogus', { room: 'room:any' })
    // Per-socket ordering: by the time the plain event dispatches, the
    // reserved one (if it were wrongly dispatched) would already be present.
    send(socket, 'plain-event', { x: 1 })

    await until(() => messages.length >= 1, 'plain-event dispatch')
    expect(messages).toEqual([['room:any', serverIds[0], 'plain-event']])
  })

  it('malformed molecule:join payloads are denied defensively', async () => {
    const { socket, frames } = await connect()
    send(socket, 'molecule:join', 'not-an-object')
    const denied = await waitForFrame(
      frames,
      (f) => f.event === 'molecule:join-denied',
      'malformed join denial',
    )
    expect(denied.data).toEqual({ room: '', reason: 'invalid payload' })
  })

  it('getPresence and getRooms cover protocol rooms; unknown rooms still throw', async () => {
    const serverIds: string[] = []
    provider.onConnection((clientId) => serverIds.push(clientId))
    const { socket, frames } = await connect()
    await requestJoin(socket, frames, 'proto:room')

    const presence = await provider.getPresence('proto:room')
    expect(presence.map((p) => p.clientId)).toEqual([serverIds[0]])
    expect(presence[0].joinedAt).toBeInstanceOf(Date)

    const allRooms = await provider.getRooms()
    const protoRoom = allRooms.find((r) => r.id === 'proto:room')
    expect(protoRoom).toBeDefined()
    expect(protoRoom?.name).toBe('proto:room')
    expect(protoRoom?.clients).toEqual([serverIds[0]])

    await expect(provider.getPresence('never-existed')).rejects.toThrow('does not exist')
    await expect(provider.broadcast('never-existed', 'ev', {})).rejects.toThrow('does not exist')
  })
})
