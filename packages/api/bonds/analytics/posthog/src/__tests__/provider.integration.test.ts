/**
 * REAL-DEPENDENCY integration tests — no mocks, the actual posthog-node SDK
 * (pointed at an in-process HTTP server; no external service).
 *
 * The unit suite (`index.test.ts`) mocks posthog-node, so it can only validate
 * OUR assumptions about the SDK — not the SDK. That gap let two silent-loss
 * bugs ship unfelt: (1) `shutdown()` flushed a DIFFERENT client than the one
 * behind the default `provider` export, so events queued via `provider.track()`
 * were dropped at process exit even when the consumer dutifully called
 * `shutdown()`; and (2) a missing POSTHOG_API_KEY disables the SDK in TOTAL
 * silence (its "client will be disabled" error is debug-gated), so every call
 * resolved while nothing was ever sent. Mocked tests cannot feel either.
 *
 * @module
 */

import { createServer, type IncomingMessage, type Server } from 'node:http'
import { gunzipSync } from 'node:zlib'

import { afterAll, beforeEach, describe, expect, it, vi } from 'vitest'

const ORIGINAL_KEY = process.env.POSTHOG_API_KEY
const ORIGINAL_HOST = process.env.POSTHOG_HOST

/** One event delivered to the local /batch/ endpoint. */
interface CapturedEvent {
  event: string
  distinct_id: string
  properties?: Record<string, unknown>
}

/**
 * Starts an in-process stand-in for PostHog's ingestion endpoint. posthog-node
 * POSTs `{ api_key, batch: [...] }` to `/batch/`, gzip-compressed when the
 * runtime supports it.
 */
const startIngestionServer = async (): Promise<{
  server: Server
  host: string
  events: CapturedEvent[]
  batches: number[]
}> => {
  const events: CapturedEvent[] = []
  const batches: number[] = []
  const readBody = (req: IncomingMessage): Promise<Buffer> =>
    new Promise((resolve, reject) => {
      const chunks: Buffer[] = []
      req.on('data', (chunk: Buffer) => chunks.push(chunk))
      req.on('end', () => resolve(Buffer.concat(chunks)))
      req.on('error', reject)
    })
  const server = createServer((req, res) => {
    void readBody(req).then((raw) => {
      const body = req.headers['content-encoding'] === 'gzip' ? gunzipSync(raw) : raw
      const payload = JSON.parse(body.toString('utf8')) as { batch?: CapturedEvent[] }
      const batch = payload.batch ?? []
      batches.push(batch.length)
      events.push(...batch)
      res.writeHead(200, { 'Content-Type': 'application/json' })
      res.end('{"status": 1}')
    })
  })
  await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve))
  const address = server.address()
  const port = typeof address === 'object' && address ? address.port : 0
  return { server, host: `http://127.0.0.1:${port}`, events, batches }
}

const restoreEnv = (key: string, value: string | undefined): void => {
  if (value === undefined) delete process.env[key]
  else process.env[key] = value
}

afterAll(() => {
  restoreEnv('POSTHOG_API_KEY', ORIGINAL_KEY)
  restoreEnv('POSTHOG_HOST', ORIGINAL_HOST)
})

beforeEach(() => {
  vi.resetModules()
  delete process.env.POSTHOG_API_KEY
  delete process.env.POSTHOG_HOST
})

describe('@molecule/api-analytics-posthog × REAL posthog-node', () => {
  it('CONSUMER PROPERTY: events are QUEUED, and shutdown() flushes the SAME client the default provider queued into', async () => {
    const { server, host, events } = await startIngestionServer()
    try {
      process.env.POSTHOG_API_KEY = 'phc_integration'
      process.env.POSTHOG_HOST = host
      const { provider, shutdown } = await import('../provider.js')

      await provider.track({
        name: 'purchase.completed',
        userId: 'u_123',
        properties: { amount: 49.99 },
      })
      // track() resolves immediately — the event is only QUEUED (flushAt=20 /
      // flushInterval=10s). A process that exits here silently loses it: this
      // is exactly why shutdown()/flush() before exit is mandatory.
      expect(events).toHaveLength(0)

      // shutdown() must drain the default provider's queue. It used to flush a
      // second, never-used client — this assertion failed with events = [].
      await shutdown()
      expect(events).toHaveLength(1)
      expect(events[0]).toMatchObject({
        event: 'purchase.completed',
        distinct_id: 'u_123',
        properties: expect.objectContaining({ amount: 49.99 }),
      })
    } finally {
      server.close()
    }
  })

  it('full lifecycle over the wire: track/page/identify/group produce correctly-mapped PostHog events', async () => {
    const { server, host, events } = await startIngestionServer()
    try {
      const { createProvider } = await import('../provider.js')
      const provider = createProvider({
        apiKey: 'phc_integration',
        host,
        flushAt: 1,
        flushInterval: 250,
      })

      await provider.track({ name: 'user.signup', userId: 'u_1', properties: { plan: 'free' } })
      // Page views carry the caller-supplied identity — server-side there is
      // no ambient session, so without this every user's page views collapse
      // into one shared "anonymous" person.
      await provider.page({ userId: 'u_1', path: '/pricing', name: 'Pricing' })
      await provider.page({ path: '/landing' }) // no identity → documented 'anonymous' fallback
      await provider.identify({ userId: 'u_1', email: 'u@example.com' })
      await provider.group!('org-9', { plan: 'enterprise' })
      await provider.flush!()

      const byEvent = (name: string): CapturedEvent[] => events.filter((e) => e.event === name)
      expect(byEvent('user.signup')[0]).toMatchObject({
        distinct_id: 'u_1',
        properties: expect.objectContaining({ plan: 'free' }),
      })
      expect(byEvent('$pageview')).toHaveLength(2)
      expect(byEvent('$pageview')[0]).toMatchObject({
        distinct_id: 'u_1',
        properties: expect.objectContaining({ $pathname: '/pricing', page_name: 'Pricing' }),
      })
      expect(byEvent('$pageview')[1]).toMatchObject({ distinct_id: 'anonymous' })
      expect(byEvent('$identify')[0]).toMatchObject({
        distinct_id: 'u_1',
        properties: expect.objectContaining({
          $set: expect.objectContaining({ email: 'u@example.com' }),
        }),
      })
      expect(byEvent('$groupidentify')[0]).toMatchObject({
        properties: expect.objectContaining({
          $group_type: 'company',
          $group_key: 'org-9',
          $group_set: expect.objectContaining({ plan: 'enterprise' }),
        }),
      })
    } finally {
      server.close()
    }
  })

  it('group() sends the configured group type over the wire (not the hardcoded default)', async () => {
    const { server, host, events } = await startIngestionServer()
    try {
      const { createProvider } = await import('../provider.js')
      const provider = createProvider({
        apiKey: 'phc_integration',
        host,
        flushAt: 1,
        flushInterval: 250,
        groupType: 'workspace',
      })

      await provider.group!('ws-1', { plan: 'team' })
      await provider.flush!()

      const groupEvent = events.find((e) => e.event === '$groupidentify')
      expect(groupEvent).toMatchObject({
        properties: expect.objectContaining({
          $group_type: 'workspace',
          $group_key: 'ws-1',
          $group_set: expect.objectContaining({ plan: 'team' }),
        }),
      })
    } finally {
      server.close()
    }
  })

  it('FAILURE DISAMBIGUATION: a missing key never throws or rejects, sends nothing, and leaves ONE actionable warning', async () => {
    const { server, host, events } = await startIngestionServer()
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})
    try {
      process.env.POSTHOG_HOST = host // key intentionally unset
      const { createProvider } = await import('../provider.js')

      // Boot-safe: no throw…
      const provider = createProvider()
      // …calls resolve (fire-and-forget `void track(...)` sites must never see
      // an unhandled rejection)…
      await expect(provider.track({ name: 'user.signup', userId: 'u_1' })).resolves.toBeUndefined()
      await expect(provider.flush!()).resolves.toBeUndefined()
      // …nothing is delivered (the real SDK disabled itself)…
      expect(events).toHaveLength(0)
      // …and the ONLY breadcrumb is the bond's warning naming the key (the
      // SDK's own "client will be disabled" error is debug-gated — silent).
      const warnings = warnSpy.mock.calls.map((call) => String(call[0]))
      expect(warnings.some((w) => w.includes('POSTHOG_API_KEY'))).toBe(true)
    } finally {
      warnSpy.mockRestore()
      server.close()
    }
  })
})
