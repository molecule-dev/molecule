import http from 'node:http'

import { io as connectClient, type Socket as ClientSocket } from 'socket.io-client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import type { JoinRequest, RealtimeProvider } from '@molecule/api-realtime'

import { createProvider } from '../provider.js'

/**
 * Real (un-mocked) integration tests for the client-initiated room-join
 * protocol: a real Socket.io server on an ephemeral port + real
 * socket.io-client connections, covering join/deny/guards/auth/leave/
 * presence/room-send/reserved-event isolation and managed-API coexistence.
 */
describe('socketio provider — client-initiated join protocol (real server + client)', () => {
  let server: http.Server
  let provider: RealtimeProvider
  let port: number
  const clients: ClientSocket[] = []

  beforeEach(async () => {
    server = http.createServer()
    provider = createProvider({ deferAttach: true })
    provider.attachHttpServer?.(server)
    await new Promise<void>((resolve) => server.listen(0, resolve))
    const address = server.address()
    port = typeof address === 'object' && address ? address.port : 0
    expect(port).toBeGreaterThan(0)
  })

  afterEach(async () => {
    for (const client of clients.splice(0)) client.disconnect()
    await provider.close()
    await new Promise<void>((resolve) => {
      // io.close() already closed the attached server; the callback still
      // fires (with ERR_SERVER_NOT_RUNNING) — either way teardown is done.
      server.close(() => resolve())
    })
  })

  /** Connect a real socket.io-client, optionally with a handshake auth payload. */
  function connect(auth?: Record<string, unknown>): Promise<ClientSocket> {
    const socket = connectClient(`http://127.0.0.1:${port}`, {
      transports: ['websocket'],
      ...(auth ? { auth } : {}),
    })
    clients.push(socket)
    return new Promise((resolve, reject) => {
      socket.once('connect', () => resolve(socket))
      socket.once('connect_error', reject)
    })
  }

  /** The connected client's id (matches the server-side socket id). */
  function idOf(socket: ClientSocket): string {
    if (!socket.id) throw new Error('client socket has no id (not connected)')
    return socket.id
  }

  /** Resolve a payload from the next occurrence of `event`. */
  function waitForEvent<T>(socket: ClientSocket, event: string, timeoutMs = 5000): Promise<T> {
    return new Promise((resolve, reject) => {
      const timer = setTimeout(
        () => reject(new Error(`Timed out waiting for "${event}"`)),
        timeoutMs,
      )
      socket.once(event, (payload: T) => {
        clearTimeout(timer)
        resolve(payload)
      })
    })
  }

  /** Emit molecule:join and resolve with the joined/denied verdict. */
  function requestJoin(
    socket: ClientSocket,
    room: string,
  ): Promise<{ ok: boolean; payload: { room: string; reason?: string } }> {
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        cleanup()
        reject(new Error(`Timed out waiting for join verdict for "${room}"`))
      }, 5000)
      const onJoined = (payload: { room: string }): void => {
        if (payload.room !== room) return
        cleanup()
        resolve({ ok: true, payload })
      }
      const onDenied = (payload: { room: string; reason?: string }): void => {
        if (payload.room !== room && payload.room !== '') return
        cleanup()
        resolve({ ok: false, payload })
      }
      const cleanup = (): void => {
        clearTimeout(timer)
        socket.off('molecule:joined', onJoined)
        socket.off('molecule:join-denied', onDenied)
      }
      socket.on('molecule:joined', onJoined)
      socket.on('molecule:join-denied', onDenied)
      socket.emit('molecule:join', { room })
    })
  }

  /** Poll until `check()` is true or time out. */
  async function until(check: () => boolean, timeoutMs = 5000): Promise<void> {
    const deadline = Date.now() + timeoutMs
    while (Date.now() < deadline) {
      if (check()) return
      await new Promise((resolve) => setTimeout(resolve, 10))
    }
    throw new Error('Timed out waiting for condition')
  }

  it('protocol-join by name → molecule:joined and receives broadcast(name, …)', async () => {
    const socket = await connect()
    const verdict = await requestJoin(socket, 'channel:general')
    expect(verdict.ok).toBe(true)
    expect(verdict.payload).toEqual({ room: 'channel:general' })

    const received = waitForEvent<{ n: number }>(socket, 'news')
    await provider.broadcast('channel:general', 'news', { n: 7 })
    expect(await received).toEqual({ n: 7 })
  })

  it('guard deny → molecule:join-denied (socket only) and no broadcast delivery', async () => {
    provider.onJoinRequest?.(({ room }) => !room.startsWith('private:'))
    const socket = await connect()
    const secrets: unknown[] = []
    socket.on('secret', (data: unknown) => secrets.push(data))

    const verdict = await requestJoin(socket, 'private:vault')
    expect(verdict.ok).toBe(false)
    expect(verdict.payload).toEqual({ room: 'private:vault', reason: 'denied' })

    await provider.broadcast('private:vault', 'secret', { code: 1 })
    // Per-socket ordering: the sendTo sentinel arrives after any (wrongly
    // delivered) room broadcast would have.
    const sentinel = waitForEvent(socket, 'sentinel')
    await provider.sendTo(idOf(socket), 'sentinel', {})
    await sentinel
    expect(secrets).toEqual([])
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
    const socket = await connect()
    expect((await requestJoin(socket, 'open')).ok).toBe(true)
    expect((await requestJoin(socket, 'blocked')).ok).toBe(false)
    expect(calls).toEqual(['g1', 'g2', 'g1', 'g2'])
  })

  it('a guard that throws denies the join (logged, never silent)', async () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => undefined)
    try {
      provider.onJoinRequest?.(() => {
        throw new Error('boom')
      })
      const socket = await connect()
      const verdict = await requestJoin(socket, 'anything')
      expect(verdict.ok).toBe(false)
      expect(verdict.payload.reason).toBe('guard error')
      expect(warnSpy).toHaveBeenCalled()
    } finally {
      warnSpy.mockRestore()
    }
  })

  it('guards receive the handshake auth payload (and {} when none is sent)', async () => {
    const requests: JoinRequest[] = []
    provider.onJoinRequest?.((request) => {
      requests.push(request)
      return true
    })

    const authed = await connect({ token: 'sesame', role: 'admin' })
    await requestJoin(authed, 'channel:auth')
    expect(requests).toHaveLength(1)
    expect(requests[0].clientId).toBe(idOf(authed))
    expect(requests[0].room).toBe('channel:auth')
    expect(requests[0].auth).toMatchObject({ token: 'sesame', role: 'admin' })

    const anonymous = await connect()
    await requestJoin(anonymous, 'channel:anon')
    expect(requests[1].auth).toEqual({})
  })

  it('molecule:leave acks with molecule:left and stops broadcast delivery', async () => {
    const socket = await connect()
    await requestJoin(socket, 'room:x')

    const first = waitForEvent(socket, 'tick')
    await provider.broadcast('room:x', 'tick', 1)
    await first

    const left = waitForEvent<{ room: string }>(socket, 'molecule:left')
    socket.emit('molecule:leave', { room: 'room:x' })
    expect((await left).room).toBe('room:x')

    const received: unknown[] = []
    socket.on('tick', (data: unknown) => received.push(data))
    await provider.broadcast('room:x', 'tick', 2)
    const sentinel = waitForEvent(socket, 'sentinel')
    await provider.sendTo(idOf(socket), 'sentinel', {})
    await sentinel
    expect(received).toEqual([])
  })

  it('emits molecule:presence to the room on join, leave, and disconnect', async () => {
    const room = 'presence:room'
    type PresencePayload = { room: string; presence: Array<{ clientId: string }> }
    const seen: PresencePayload[] = []

    const a = await connect()
    a.on('molecule:presence', (payload: PresencePayload) => seen.push(payload))
    await requestJoin(a, room)
    await until(() => seen.length >= 1)
    expect(seen[0]).toEqual({ room, presence: [{ clientId: idOf(a) }] })

    const b = await connect()
    await requestJoin(b, room)
    await until(() => seen.length >= 2)
    expect(seen[1].presence.map((p) => p.clientId).sort()).toEqual([idOf(a), idOf(b)].sort())

    b.emit('molecule:leave', { room })
    await until(() => seen.length >= 3)
    expect(seen[2].presence).toEqual([{ clientId: idOf(a) }])

    await requestJoin(b, room)
    await until(() => seen.length >= 4)
    b.disconnect()
    await until(() => seen.length >= 5)
    expect(seen[4].presence).toEqual([{ clientId: idOf(a) }])
  })

  it('molecule:room-send dispatches to onMessage only for protocol-joined senders (no relay)', async () => {
    const room = 'chat:room'
    const messages: Array<[string, string, string, unknown]> = []
    provider.onMessage((roomId, clientId, event, data) =>
      messages.push([roomId, clientId, event, data]),
    )

    const member = await connect()
    const lurker = await connect()
    await requestJoin(member, room)

    const relayed: unknown[] = []
    member.on('chat', (data: unknown) => relayed.push(data))

    lurker.emit('molecule:room-send', { room, event: 'chat', data: { text: 'intruder' } })
    member.emit('molecule:room-send', { room, event: 'chat', data: { text: 'hello' } })

    await until(() => messages.length >= 1)
    // Cross-socket ordering isn't guaranteed — settle before asserting the
    // lurker's message never dispatched.
    await new Promise((resolve) => setTimeout(resolve, 100))
    expect(messages).toEqual([[room, idOf(member), 'chat', { text: 'hello' }]])
    // room-send never auto-relays to the room; server code decides.
    expect(relayed).toEqual([])
  })

  it('reserved molecule:* events are never dispatched to onMessage', async () => {
    const messages: Array<[string, string, string]> = []
    provider.onMessage((roomId, clientId, event) => messages.push([roomId, clientId, event]))

    const socket = await connect()
    await requestJoin(socket, 'room:any')
    socket.emit('molecule:bogus', { room: 'room:any' })
    // Per-socket ordering: by the time the plain event dispatches, the
    // reserved one (if it were wrongly dispatched) would already be present.
    socket.emit('plain-event', { x: 1 })

    await until(() => messages.length >= 1)
    expect(messages).toEqual([['room:any', idOf(socket), 'plain-event']])
  })

  it('malformed molecule:join payloads are denied defensively', async () => {
    const socket = await connect()
    const denied = waitForEvent<{ room: string; reason?: string }>(socket, 'molecule:join-denied')
    socket.emit('molecule:join', 'not-an-object')
    expect(await denied).toEqual({ room: '', reason: 'invalid payload' })
  })

  it('getPresence and getRooms cover protocol rooms; unknown rooms still throw', async () => {
    const socket = await connect()
    await requestJoin(socket, 'proto:room')

    const presence = await provider.getPresence('proto:room')
    expect(presence.map((p) => p.clientId)).toEqual([idOf(socket)])
    expect(presence[0].joinedAt).toBeInstanceOf(Date)

    const allRooms = await provider.getRooms()
    const protoRoom = allRooms.find((r) => r.id === 'proto:room')
    expect(protoRoom).toBeDefined()
    expect(protoRoom?.name).toBe('proto:room')
    expect(protoRoom?.clients).toEqual([idOf(socket)])

    await expect(provider.getPresence('never-existed')).rejects.toThrow('does not exist')
  })

  it('managed createRoom/joinRoom API is unaffected by the protocol', async () => {
    const socket = await connect()
    const room = await provider.createRoom('managed')
    expect(room.id).toMatch(/^room_\d+$/)

    await provider.joinRoom(room.id, idOf(socket))
    const presence = await provider.getPresence(room.id)
    expect(presence.map((p) => p.clientId)).toEqual([idOf(socket)])

    const received = waitForEvent(socket, 'managed-event')
    await provider.broadcast(room.id, 'managed-event', { ok: true })
    expect(await received).toEqual({ ok: true })
  })
})
