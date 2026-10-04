import { afterEach, describe, expect, it, vi } from 'vitest'

import { axiomIngestUrl, createAxiomIngester, retryAfterMs, safeStringify } from '../ingester.js'
import { createProvider } from '../provider.js'

interface Call {
  url: string
  init: RequestInit
}

const okResponse = (): Response => new Response(JSON.stringify({ ingested: 1, failed: 0 }))

function mockFetch(responses: Array<Response | Error> = []): {
  fetch: typeof fetch
  calls: Call[]
} {
  const calls: Call[] = []
  const fn = vi.fn(async (url: string | URL | Request, init?: RequestInit) => {
    calls.push({ url: String(url), init: init ?? {} })
    const next = responses.shift()
    if (next instanceof Error) throw next
    return next ?? okResponse()
  })
  return { fetch: fn as unknown as typeof fetch, calls }
}

const lines = (call: Call): Array<Record<string, unknown>> =>
  String(call.init.body)
    .split('\n')
    .map((l) => JSON.parse(l) as Record<string, unknown>)

afterEach(() => {
  vi.useRealTimers()
  vi.unstubAllEnvs()
})

describe('createAxiomIngester', () => {
  it('is a silent no-op without a token or dataset', async () => {
    vi.stubEnv('AXIOM_TOKEN', '')
    vi.stubEnv('AXIOM_DATASET', '')
    const { fetch, calls } = mockFetch()
    const ingester = createAxiomIngester({ fetch })
    expect(ingester.enabled).toBe(false)
    expect(ingester.dataset).toBeNull()
    ingester.ingest({ a: 1 })
    await ingester.flush()
    expect(calls).toHaveLength(0)
    expect(ingester.stats()).toEqual({ queued: 0, sent: 0, dropped: 0, pending: 0 })
  })

  it('reads token, dataset and org id from env and posts NDJSON with a bearer token', async () => {
    vi.stubEnv('AXIOM_TOKEN', 'xaat-test')
    vi.stubEnv('AXIOM_DATASET', 'molecule-prod')
    vi.stubEnv('AXIOM_ORG_ID', 'org-1')
    const { fetch, calls } = mockFetch()
    const ingester = createAxiomIngester({ fetch, stamp: { service: 'api' } })
    ingester.ingest({ event: 'x' })
    ingester.ingest({ event: 'y', service: 'override' })
    await ingester.flush()
    expect(calls).toHaveLength(1)
    expect(calls[0].url).toBe('https://api.axiom.co/v1/datasets/molecule-prod/ingest')
    const headers = calls[0].init.headers as Record<string, string>
    expect(headers.authorization).toBe('Bearer xaat-test')
    expect(headers['content-type']).toBe('application/x-ndjson')
    expect(headers['x-axiom-org-id']).toBe('org-1')
    const [a, b] = lines(calls[0])
    expect(a).toMatchObject({ event: 'x', service: 'api' })
    expect(typeof a._time).toBe('string')
    expect(b.service).toBe('override')
    expect(ingester.stats()).toMatchObject({ queued: 2, sent: 2, pending: 0 })
  })

  it('uses the edge ingest path when an edge URL is set', () => {
    expect(axiomIngestUrl('ds', 'https://eu-central-1.aws.edge.axiom.co/')).toBe(
      'https://eu-central-1.aws.edge.axiom.co/v1/ingest/ds',
    )
  })

  it('flushes on the interval without the caller waiting', async () => {
    vi.useFakeTimers()
    const { fetch, calls } = mockFetch()
    const ingester = createAxiomIngester({
      token: 't',
      dataset: 'd',
      fetch,
      flushIntervalMs: 2_000,
    })
    ingester.ingest({ n: 1 })
    expect(calls).toHaveLength(0)
    await vi.advanceTimersByTimeAsync(2_000)
    expect(calls).toHaveLength(1)
    await ingester.shutdown()
  })

  it('flushes at once when a batch fills, and splits by the event cap', async () => {
    const { fetch, calls } = mockFetch()
    const ingester = createAxiomIngester({
      token: 't',
      dataset: 'd',
      fetch,
      maxBatchEvents: 3,
      flushIntervalMs: 60_000,
    })
    for (let i = 0; i < 7; i++) ingester.ingest({ i })
    await ingester.flush()
    expect(calls.map((c) => lines(c).length)).toEqual([3, 3, 1])
    await ingester.shutdown()
  })

  it('keeps each request under the byte cap and drops a single oversized event', async () => {
    const warn = vi.fn()
    const { fetch, calls } = mockFetch()
    const ingester = createAxiomIngester({
      token: 't',
      dataset: 'd',
      fetch,
      warn,
      maxBatchBytes: 2_000,
      flushIntervalMs: 60_000,
    })
    ingester.ingest({ big: 'x'.repeat(5_000) })
    for (let i = 0; i < 4; i++) ingester.ingest({ pad: 'y'.repeat(700) })
    await ingester.flush()
    for (const call of calls) expect(String(call.init.body).length).toBeLessThanOrEqual(2_000)
    expect(calls.reduce((n, c) => n + lines(c).length, 0)).toBe(4)
    expect(ingester.stats().dropped).toBe(1)
    expect(warn).toHaveBeenCalledWith(expect.stringContaining('larger than'), expect.anything())
    await ingester.shutdown()
  })

  it('retries network errors and 5xx with backoff, then succeeds', async () => {
    const { fetch, calls } = mockFetch([
      new Error('ECONNRESET'),
      new Response('busy', { status: 503 }),
      okResponse(),
    ])
    const ingester = createAxiomIngester({ token: 't', dataset: 'd', fetch, retryBaseMs: 1 })
    ingester.ingest({ n: 1 })
    await ingester.flush()
    expect(calls).toHaveLength(3)
    expect(ingester.stats()).toMatchObject({ sent: 1, dropped: 0 })
    await ingester.shutdown()
  })

  it('drops a batch Axiom rejects with a 4xx, without retrying', async () => {
    const warn = vi.fn()
    const { fetch, calls } = mockFetch([new Response('bad token', { status: 403 })])
    const ingester = createAxiomIngester({ token: 't', dataset: 'd', fetch, warn, retryBaseMs: 1 })
    ingester.ingest({ n: 1 })
    await ingester.flush()
    expect(calls).toHaveLength(1)
    expect(ingester.stats()).toMatchObject({ sent: 0, dropped: 1 })
    expect(warn).toHaveBeenCalledWith(expect.stringContaining('403'), expect.anything())
    await ingester.shutdown()
  })

  it('a 200 that reports failed events counts only the stored ones as sent', async () => {
    const warn = vi.fn()
    const { fetch } = mockFetch([
      new Response(
        JSON.stringify({
          ingested: 2,
          failed: 1,
          failures: [{ timestamp: 'x', error: 'bad _time' }],
        }),
      ),
    ])
    const ingester = createAxiomIngester({ token: 't', dataset: 'd', fetch, warn })
    for (let i = 0; i < 3; i++) ingester.ingest({ i })
    await ingester.flush()
    expect(ingester.stats()).toMatchObject({ queued: 3, sent: 2, dropped: 1, pending: 0 })
    expect(warn).toHaveBeenCalledWith(
      expect.stringContaining('stored 2 of 3'),
      expect.objectContaining({ failed: 1, errors: ['bad _time'] }),
    )
    await ingester.shutdown()
  })

  it('honours Retry-After on a 429 (capped at 60 s) instead of the backoff', async () => {
    vi.useFakeTimers()
    const { fetch, calls } = mockFetch([
      new Response('slow down', { status: 429, headers: { 'retry-after': '2' } }),
      okResponse(),
    ])
    const ingester = createAxiomIngester({
      token: 't',
      dataset: 'd',
      fetch,
      retryBaseMs: 1,
      flushIntervalMs: 60_000,
    })
    ingester.ingest({ n: 1 })
    const done = ingester.flush()
    await vi.advanceTimersByTimeAsync(1_000)
    expect(calls).toHaveLength(1)
    await vi.advanceTimersByTimeAsync(1_000)
    await done
    expect(calls).toHaveLength(2)
    expect(ingester.stats()).toMatchObject({ sent: 1, dropped: 0 })
    expect(retryAfterMs('120')).toBe(60_000)
    expect(retryAfterMs('0')).toBe(0)
    expect(retryAfterMs(new Date(Date.now() + 5_000).toUTCString())).toBeGreaterThan(3_000)
    expect(retryAfterMs('soon')).toBeNull()
    expect(retryAfterMs(null)).toBeNull()
    await ingester.shutdown()
  })

  it('shutdown after a failed batch warns with the pending count and tries every remaining batch once', async () => {
    const warn = vi.fn()
    const down = (): Response => new Response('down', { status: 503 })
    // 1: the full-batch flush while ingesting; 2: shutdown's own flush; 3: the retry pass
    const { fetch, calls } = mockFetch([down(), down(), okResponse()])
    const ingester = createAxiomIngester({
      token: 't',
      dataset: 'd',
      fetch,
      warn,
      maxRetries: 0,
      maxBatchEvents: 2,
      flushIntervalMs: 60_000,
    })
    for (let i = 0; i < 5; i++) ingester.ingest({ i })
    await ingester.shutdown()
    expect(warn).toHaveBeenCalledWith(
      expect.stringMatching(/shutdown: \d+ of \d+ pending event\(s\) could not be sent/),
      expect.objectContaining({ pending: expect.any(Number) }),
    )
    // every event was either sent or counted, nothing is left in memory
    const st = ingester.stats()
    expect(st.pending).toBe(0)
    expect(st).toMatchObject({ sent: 1, dropped: 4 })
    expect(calls.length).toBe(3)
  })

  it('shutdown says how many pending events could not be sent when Axiom stays down', async () => {
    const warn = vi.fn()
    const down = (): Response => new Response('down', { status: 503 })
    const { fetch } = mockFetch([down(), down(), down()])
    const ingester = createAxiomIngester({
      token: 't',
      dataset: 'd',
      fetch,
      warn,
      maxRetries: 0,
      maxBatchEvents: 1,
      flushIntervalMs: 60_000,
    })
    for (let i = 0; i < 3; i++) ingester.ingest({ i })
    await ingester.shutdown()
    expect(ingester.stats()).toMatchObject({ sent: 0, dropped: 3, pending: 0 })
    expect(warn).toHaveBeenCalledWith(
      expect.stringMatching(/shutdown: \d+ of \d+ pending event\(s\) could not be sent/),
      expect.anything(),
    )
  })

  it('shutdown stops at its budget: the rest is counted lost with one warning', async () => {
    vi.useFakeTimers()
    const warn = vi.fn()
    // every request hangs until its own abort signal fires
    const hang = vi.fn(
      (_url: string | URL | Request, init?: RequestInit) =>
        new Promise<Response>((_resolve, reject) => {
          init?.signal?.addEventListener('abort', () => reject(new Error('aborted')))
        }),
    )
    const ingester = createAxiomIngester({
      token: 't',
      dataset: 'd',
      fetch: hang as unknown as typeof fetch,
      warn,
      maxBatchEvents: 1,
      flushIntervalMs: 60_000,
    })
    // one batch is already in flight (hung) when shutdown starts; five are still queued
    for (let i = 0; i < 6; i++) ingester.ingest({ i })
    const done = ingester.shutdown({ deadlineMs: 1_000 })
    await vi.advanceTimersByTimeAsync(1_100)
    await done
    expect(ingester.stats()).toMatchObject({ sent: 0, dropped: 5, pending: 0 })
    const lostWarns = warn.mock.calls.filter(([m]) => String(m).includes('budget'))
    expect(lostWarns).toHaveLength(1)
    expect(lostWarns[0][1]).toMatchObject({ pending: 5 })
    expect(warn).toHaveBeenCalledTimes(1)
    // the abandoned requests were bounded by the budget, never the full 10 s timeout
    expect(hang.mock.calls.length).toBeLessThanOrEqual(2)
  })

  it('a Retry-After of 0 still waits the base backoff', async () => {
    vi.useFakeTimers()
    const { fetch, calls } = mockFetch([
      new Response('slow down', { status: 429, headers: { 'retry-after': '0' } }),
      okResponse(),
    ])
    const ingester = createAxiomIngester({
      token: 't',
      dataset: 'd',
      fetch,
      retryBaseMs: 500,
      flushIntervalMs: 60_000,
    })
    ingester.ingest({ n: 1 })
    const done = ingester.flush()
    await vi.advanceTimersByTimeAsync(400)
    expect(calls).toHaveLength(1)
    await vi.advanceTimersByTimeAsync(200)
    await done
    expect(calls).toHaveLength(2)
    await ingester.shutdown()
  })

  it('a 20 s budget drains three small batches', async () => {
    const { fetch, calls } = mockFetch()
    const ingester = createAxiomIngester({
      token: 't',
      dataset: 'd',
      fetch,
      maxBatchEvents: 2,
      flushIntervalMs: 60_000,
    })
    for (let i = 0; i < 6; i++) ingester.ingest({ i })
    await ingester.shutdown({ deadlineMs: 20_000 })
    expect(calls).toHaveLength(3)
    expect(ingester.stats()).toMatchObject({ sent: 6, dropped: 0, pending: 0 })
  })

  it('ingest after shutdown is a counted no-op, never a queue that nothing drains', async () => {
    const warn = vi.fn()
    const { fetch, calls } = mockFetch()
    const ingester = createAxiomIngester({ token: 't', dataset: 'd', fetch, warn })
    await ingester.shutdown()
    ingester.ingest({ late: true })
    ingester.ingest({ late: true })
    expect(ingester.stats()).toMatchObject({ queued: 0, dropped: 2, pending: 0 })
    expect(calls).toHaveLength(0)
    expect(warn.mock.calls.filter(([m]) => String(m).includes('after shutdown'))).toHaveLength(1)
  })

  it('drops events once the queue is full and warns once per minute', () => {
    const warn = vi.fn()
    const { fetch } = mockFetch()
    const ingester = createAxiomIngester({
      token: 't',
      dataset: 'd',
      fetch,
      warn,
      maxQueueEvents: 2,
      maxBatchEvents: 100,
      flushIntervalMs: 60_000,
    })
    for (let i = 0; i < 6; i++) ingester.ingest({ i })
    expect(ingester.stats()).toMatchObject({ pending: 2, dropped: 4 })
    expect(warn.mock.calls.filter(([m]) => String(m).includes('queue full'))).toHaveLength(1)
  })

  it('applies beforeSend and drops events it returns null for', async () => {
    const { fetch, calls } = mockFetch()
    const ingester = createAxiomIngester({
      token: 't',
      dataset: 'd',
      fetch,
      beforeSend: (e) => (e.skip ? null : { ...e, secret: '[redacted]' }),
    })
    ingester.ingest({ skip: true })
    ingester.ingest({ secret: 'sk_live_x' })
    await ingester.flush()
    expect(lines(calls[0])).toEqual([expect.objectContaining({ secret: '[redacted]' })])
  })

  it('never throws from ingest, even for unserializable input', () => {
    const { fetch } = mockFetch()
    const ingester = createAxiomIngester({ token: 't', dataset: 'd', fetch, warn: () => {} })
    const evil = {
      toJSON() {
        throw new Error('boom')
      },
    }
    expect(() => ingester.ingest({ evil })).not.toThrow()
    expect(ingester.stats().dropped).toBe(1)
  })
})

describe('safeStringify', () => {
  it('serializes errors, bigints and cycles', () => {
    const cyc: Record<string, unknown> = { a: 1 }
    cyc.self = cyc
    const out = JSON.parse(
      safeStringify({ err: new Error('nope'), n: BigInt(5), cyc }) ?? '{}',
    ) as Record<string, Record<string, unknown> | string>
    expect(out.err).toMatchObject({ name: 'Error', message: 'nope' })
    expect(out.n).toBe('5')
    expect((out.cyc as Record<string, unknown>).self).toBe('[Circular]')
  })
})

describe('createProvider', () => {
  it('maps track/identify/page/group onto events with stamped fields', async () => {
    const { fetch, calls } = mockFetch()
    const provider = createProvider({
      token: 't',
      dataset: 'd',
      fetch,
      service: 'molecule-api',
      env: 'production',
      region: 'iad',
      version: 'abc123',
    })
    expect(provider.enabled).toBe(true)
    const at = new Date('2026-10-04T12:00:00.000Z')
    await provider.track({
      name: 'sandbox.lost',
      userId: 'u1',
      properties: { projectId: 'p1' },
      timestamp: at,
    })
    await provider.identify({ userId: 'u1', email: 'a@b.c' })
    await provider.page({ path: '/x', userId: 'u1' })
    await provider.group('g1', { plan: 'team' })
    await provider.flush()
    const [track, identify, page, group] = lines(calls[0])
    expect(track).toEqual({
      _time: '2026-10-04T12:00:00.000Z',
      kind: 'track',
      event: 'sandbox.lost',
      userId: 'u1',
      properties: { projectId: 'p1' },
      service: 'molecule-api',
      env: 'production',
      region: 'iad',
      version: 'abc123',
    })
    expect(identify).toMatchObject({ kind: 'identify', properties: { email: 'a@b.c' } })
    expect(page).toMatchObject({ kind: 'page', event: 'page.view', properties: { path: '/x' } })
    expect(group).toMatchObject({ kind: 'group', groupId: 'g1', properties: { plan: 'team' } })
  })

  it('resolves immediately even while Axiom is unreachable', async () => {
    const fetch = vi.fn(() => new Promise<Response>(() => {})) as unknown as typeof globalThis.fetch
    const provider = createProvider({ token: 't', dataset: 'd', fetch, maxBatchEvents: 1 })
    await expect(provider.track({ name: 'x' })).resolves.toBeUndefined()
  })
})
