/**
 * REAL-DEPENDENCY integration tests — no mocks: a real Node HTTP server, real
 * TCP connections via `fetch`, and the real SSE wire format.
 *
 * `provider.test.ts` drives the handler with hand-built mock req/res objects,
 * so it can only validate OUR handler logic against OUR fakes — not that a
 * real client on a real socket receives well-formed `event:`/`data:` frames,
 * that verdicts arrive on the live stream, or that close()/teardown behaves.
 * This file exercises the full transport end-to-end: subscribe → connected →
 * join-at-subscribe (through a slow async guard) → broadcast → POST
 * room-send → distinct failure modes → shutdown.
 *
 * @module
 */

import http from 'node:http'

import { afterEach, beforeEach, describe, expect, it } from 'vitest'

import type { RealtimeProvider } from '@molecule/api-realtime'

import { createProvider } from '../provider.js'

/** A parsed SSE frame. */
interface SseEvent {
  event: string
  data: unknown
}

/** A live SSE subscription over a real fetch stream. */
interface Subscription {
  clientId: string
  events: SseEvent[]
  /** Waits (bounded) for the first event matching the predicate. */
  waitFor(predicate: (e: SseEvent) => boolean): Promise<SseEvent>
  /** Aborts the underlying request (client-side disconnect). */
  abort(): void
}

/**
 * Opens a REAL SSE subscription with fetch and incrementally parses frames.
 *
 * @param url - The full subscribe URL (may carry ?room=/auth params).
 * @returns The live subscription once the `connected` event has arrived.
 */
async function subscribe(url: string): Promise<Subscription> {
  const controller = new AbortController()
  const response = await fetch(url, {
    headers: { Accept: 'text/event-stream' },
    signal: controller.signal,
  })
  expect(response.status).toBe(200)
  expect(response.headers.get('content-type')).toBe('text/event-stream')

  const events: SseEvent[] = []
  const reader = response.body!.getReader()
  const decoder = new TextDecoder()
  let bufferText = ''

  void (async () => {
    try {
      for (;;) {
        const { done, value } = await reader.read()
        if (done) break
        bufferText += decoder.decode(value, { stream: true })
        let sep = bufferText.indexOf('\n\n')
        while (sep !== -1) {
          const block = bufferText.slice(0, sep)
          bufferText = bufferText.slice(sep + 2)
          sep = bufferText.indexOf('\n\n')
          let event = 'message'
          let data: unknown
          for (const line of block.split('\n')) {
            if (line.startsWith('event: ')) event = line.slice(7)
            else if (line.startsWith('data: ')) data = JSON.parse(line.slice(6))
            // ': keepalive' comment lines are ignored by real EventSource too.
          }
          if (data !== undefined) events.push({ event, data })
        }
      }
    } catch (_error) {
      // Reader errors after abort()/server close are expected teardown noise.
    }
  })()

  const waitFor = async (predicate: (e: SseEvent) => boolean): Promise<SseEvent> => {
    for (let i = 0; i < 800; i += 1) {
      const match = events.find(predicate)
      if (match) return match
      await new Promise((resolve) => setTimeout(resolve, 5))
    }
    throw new Error(`No SSE event matching predicate. Got: ${JSON.stringify(events)}`)
  }

  const connected = await waitFor((e) => e.event === 'connected')
  return {
    clientId: (connected.data as { clientId: string }).clientId,
    events,
    waitFor,
    abort: () => controller.abort(),
  }
}

describe('@molecule/api-realtime-sse × REAL HTTP server + fetch streams', () => {
  let server: http.Server
  let provider: RealtimeProvider
  let base: string
  const subscriptions: Subscription[] = []

  beforeEach(async () => {
    server = http.createServer()
    provider = createProvider({ httpServer: server, path: '/sse' })
    await new Promise<void>((resolve) => server.listen(0, resolve))
    const address = server.address()
    const port = typeof address === 'object' && address ? address.port : 0
    expect(port).toBeGreaterThan(0)
    base = `http://127.0.0.1:${String(port)}`
  })

  afterEach(async () => {
    await provider.close()
    // Idempotent close: a double teardown must not reject.
    await expect(provider.close()).resolves.toBeUndefined()
    for (const s of subscriptions.splice(0)) s.abort()
    await new Promise<void>((resolve) => {
      server.close(() => resolve())
    })
  })

  it('full lifecycle: subscribe → join-at-subscribe through a SLOW guard → broadcast → POST room-send → leave', async () => {
    const guardSeen: Array<Record<string, unknown>> = []
    provider.onJoinRequest?.(async ({ auth, room }) => {
      guardSeen.push({ ...auth, room })
      // Realistic guard: token verification / DB round-trip takes time. The
      // join verdict must still arrive on the stream, after `connected`.
      await new Promise((resolve) => setTimeout(resolve, 300))
      return auth.token === 'good'
    })

    const received: Array<{ room: string; event: string; data: unknown }> = []
    provider.onMessage?.((roomId, _clientId, event, data) => {
      received.push({ room: roomId, event, data })
    })

    const sub = await subscribe(`${base}/sse?room=channel:general&token=good`)
    subscriptions.push(sub)

    // Join verdict arrives on the live stream; the guard saw the handshake
    // auth (query params minus the room list).
    const joined = await sub.waitFor((e) => e.event === 'molecule:joined')
    expect(joined.data).toEqual({ room: 'channel:general' })
    expect(guardSeen).toEqual([{ token: 'good', room: 'channel:general' }])
    // Ordering: connected is always first.
    expect(sub.events[0]?.event).toBe('connected')

    // Server push reaches the real stream.
    await provider.broadcast('channel:general', 'notice', { text: 'hi' })
    const notice = await sub.waitFor((e) => e.event === 'notice')
    expect(notice.data).toEqual({ text: 'hi' })

    // Client-to-server room send dispatches to onMessage.
    const sendRes = await fetch(`${base}/sse`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        clientId: sub.clientId,
        event: 'molecule:room-send',
        data: { room: 'channel:general', event: 'chat', data: { text: 'yo' } },
      }),
    })
    expect(sendRes.status).toBe(200)
    expect(received).toEqual([{ room: 'channel:general', event: 'chat', data: { text: 'yo' } }])

    // Leave acks on the stream.
    const leaveRes = await fetch(`${base}/sse`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        clientId: sub.clientId,
        event: 'molecule:leave',
        data: { room: 'channel:general' },
      }),
    })
    expect(leaveRes.status).toBe(202)
    await sub.waitFor((e) => e.event === 'molecule:left')
  })

  it('FAILURE DISAMBIGUATION: each wiring mistake has its own status + message, and deny ≠ guard error', async () => {
    provider.onJoinRequest?.(({ room }) => {
      if (room === 'boom') throw new Error('guard exploded')
      return room === 'ok'
    })

    const sub = await subscribe(`${base}/sse`)
    subscriptions.push(sub)

    // Unknown clientId → 404, named.
    const unknown = await fetch(`${base}/sse`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ clientId: 'ghost', event: 'x', data: {} }),
    })
    expect(unknown.status).toBe(404)
    expect(await unknown.json()).toEqual({ error: 'Unknown clientId' })

    // Malformed JSON → 400 (client bug, not server error).
    const badJson = await fetch(`${base}/sse`, { method: 'POST', body: '{nope' })
    expect(badJson.status).toBe(400)
    expect(await badJson.json()).toEqual({ error: 'Invalid JSON' })

    // room-send into a room this client never joined → 403 naming the room.
    const notJoined = await fetch(`${base}/sse`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        clientId: sub.clientId,
        event: 'molecule:room-send',
        data: { room: 'ok', event: 'chat', data: {} },
      }),
    })
    expect(notJoined.status).toBe(403)
    expect(await notJoined.json()).toEqual({ error: 'Not joined to room "ok"' })

    // Guard returned false → deny with reason 'denied' on the stream.
    await fetch(`${base}/sse`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        clientId: sub.clientId,
        event: 'molecule:join',
        data: { room: 'private' },
      }),
    })
    const denied = await sub.waitFor(
      (e) => e.event === 'molecule:join-denied' && (e.data as { room: string }).room === 'private',
    )
    expect((denied.data as { reason?: string }).reason).toBe('denied')

    // Guard threw → reason 'guard error' (server bug ≠ permissions).
    await fetch(`${base}/sse`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        clientId: sub.clientId,
        event: 'molecule:join',
        data: { room: 'boom' },
      }),
    })
    const guardError = await sub.waitFor(
      (e) => e.event === 'molecule:join-denied' && (e.data as { room: string }).room === 'boom',
    )
    expect((guardError.data as { reason?: string }).reason).toBe('guard error')

    // Server-side API failures are named too.
    await expect(provider.broadcast('nowhere', 'x', {})).rejects.toThrow(
      'Room "nowhere" does not exist',
    )
  })

  it('close() detaches from the shared HTTP server — a closed provider stops intercepting its path', async () => {
    const sub = await subscribe(`${base}/sse`)
    subscriptions.push(sub)
    await provider.close()

    // After close, the path belongs to the app again: a fallback handler
    // responds instead of the (previously leaked) SSE listener hijacking the
    // request into a dead subscription.
    server.on('request', (_req, res) => {
      res.writeHead(418, { 'Content-Type': 'application/json' })
      res.end(JSON.stringify({ fallback: true }))
    })
    const after = await fetch(`${base}/sse`)
    expect(after.status).toBe(418)
    expect(await after.json()).toEqual({ fallback: true })
  })
})
