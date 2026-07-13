/**
 * REAL-DEPENDENCY integration tests — no mocks, the actual `fetch` against a
 * real local HTTP receiver.
 *
 * The unit suite (`provider.test.ts`) stubs global fetch, so it can only
 * validate OUR assumptions about the request we build — not that a real
 * receiver can consume it. This file drives the provider end-to-end against a
 * live `node:http` server (a webhook receiver is by definition user-supplied,
 * so a local server IS the real thing, not a stand-in): the JSON body a
 * receiver actually parses, an HMAC signature the receiver actually verifies
 * with `node:crypto`, and the three distinct failure shapes a caller needs to
 * tell apart (not configured / remote HTTP error / timeout).
 *
 * @module
 */

import { createHmac } from 'node:crypto'
import { createServer, type IncomingMessage, type Server, type ServerResponse } from 'node:http'
import type { AddressInfo } from 'node:net'

import { afterAll, beforeAll, describe, expect, it } from 'vitest'

import { createProvider } from '../provider.js'

interface CapturedRequest {
  url: string
  method: string
  headers: IncomingMessage['headers']
  rawBody: string
}

const captured: CapturedRequest[] = []
let server: Server
let baseUrl: string
/** Responses intentionally left hanging (timeout test) — destroyed on teardown. */
const hanging: ServerResponse[] = []

beforeAll(async () => {
  server = createServer((req, res) => {
    const chunks: Buffer[] = []
    req.on('data', (c: Buffer) => chunks.push(c))
    req.on('end', () => {
      captured.push({
        url: req.url ?? '',
        method: req.method ?? '',
        headers: req.headers,
        rawBody: Buffer.concat(chunks).toString('utf8'),
      })
      if (req.url === '/hooks/fail-500') {
        res.writeHead(500).end('boom')
        return
      }
      if (req.url === '/hooks/never-responds') {
        // Hold the response open — the provider's AbortController must fire.
        hanging.push(res)
        return
      }
      if (req.url === '/hooks/slow-250ms') {
        // Realistically slow receiver (cold start), still under the 10s default.
        setTimeout(() => {
          res.writeHead(200, { 'Content-Type': 'application/json' }).end('{"ok":true}')
        }, 250)
        return
      }
      res.writeHead(200, { 'Content-Type': 'application/json' }).end('{"ok":true}')
    })
  })
  await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve))
  baseUrl = `http://127.0.0.1:${(server.address() as AddressInfo).port}`
})

afterAll(async () => {
  for (const res of hanging) res.destroy()
  await new Promise<void>((resolve, reject) =>
    server.close((err) => (err ? reject(err) : resolve())),
  )
})

describe('@molecule/api-notifications-webhook × REAL fetch + HTTP receiver', () => {
  it('full lifecycle: send → receiver gets a parseable JSON POST it can HMAC-verify', async () => {
    const secret = 'shared-signing-secret'
    const provider = createProvider({ url: `${baseUrl}/hooks/notify`, secret })

    const result = await provider.send({
      subject: 'Service Down',
      body: 'API is not responding',
      metadata: { severity: 'high' },
    })
    expect(result).toEqual({ success: true })

    const req = captured.find((r) => r.url === '/hooks/notify')
    expect(req).toBeDefined()
    expect(req!.method).toBe('POST')
    expect(req!.headers['content-type']).toBe('application/json')

    // The receiver-side contract: the body parses as JSON and carries the
    // notification fields plus metadata NESTED under its own key (never
    // spread at the top level, so a metadata key can't collide with/
    // overwrite subject/body/timestamp).
    const parsed = JSON.parse(req!.rawBody) as Record<string, unknown>
    expect(parsed.subject).toBe('Service Down')
    expect(parsed.body).toBe('API is not responding')
    expect(parsed.metadata).toEqual({ severity: 'high' })
    expect(typeof parsed.timestamp).toBe('string')
    expect(Number.isNaN(Date.parse(parsed.timestamp as string))).toBe(false)

    // CONSUMER PROPERTY: the documented HMAC scheme is verifiable by the
    // receiver — sha256 over the EXACT raw body with the shared secret,
    // GitHub-style "sha256=<hex>" header. If the provider signed anything
    // other than the bytes it sent, every receiver validation would fail.
    const expected = `sha256=${createHmac('sha256', secret).update(req!.rawBody).digest('hex')}`
    expect(req!.headers['x-signature-256']).toBe(expected)
  })

  it('omits the signature header when no secret is configured', async () => {
    const provider = createProvider({ url: `${baseUrl}/hooks/unsigned` })
    const result = await provider.send({ subject: 'Hi', body: 'No secret' })
    expect(result).toEqual({ success: true })

    const req = captured.find((r) => r.url === '/hooks/unsigned')
    expect(req).toBeDefined()
    expect(req!.headers['x-signature-256']).toBeUndefined()
  })

  it('FAILURE DISAMBIGUATION: not-configured vs remote 500 vs timeout are distinct, never throws', async () => {
    // (a) Not configured — no URL anywhere. Must not perform ANY request.
    const savedUrl = process.env.NOTIFICATIONS_WEBHOOK_URL
    const savedSecret = process.env.NOTIFICATIONS_WEBHOOK_SECRET
    delete process.env.NOTIFICATIONS_WEBHOOK_URL
    delete process.env.NOTIFICATIONS_WEBHOOK_SECRET
    try {
      const requestsBefore = captured.length
      const unconfigured = createProvider()
      const missing = await unconfigured.send({ subject: 'x', body: 'y' })
      expect(missing.success).toBe(false)
      expect(missing.error).toBe('Webhook URL not configured.')
      expect(captured.length).toBe(requestsBefore)
    } finally {
      if (savedUrl !== undefined) process.env.NOTIFICATIONS_WEBHOOK_URL = savedUrl
      if (savedSecret !== undefined) process.env.NOTIFICATIONS_WEBHOOK_SECRET = savedSecret
    }

    // (b) The receiver answers with an HTTP error — the status is surfaced so
    // the caller knows the REMOTE rejected it (fix the receiver, not the app).
    const failing = createProvider({ url: `${baseUrl}/hooks/fail-500` })
    const httpError = await failing.send({ subject: 'x', body: 'y' })
    expect(httpError.success).toBe(false)
    expect(httpError.error).toBe('Webhook returned HTTP 500')

    // (c) The receiver hangs — the configured timeout aborts the request and
    // reports an abort/timeout-shaped error, distinguishable from (a) and (b).
    // 200ms keeps the test deterministic and far under any real-flow budget.
    const slow = createProvider({ url: `${baseUrl}/hooks/never-responds`, timeoutMs: 200 })
    const timedOut = await slow.send({ subject: 'x', body: 'y' })
    expect(timedOut.success).toBe(false)
    expect(timedOut.error).toBeDefined()
    expect(timedOut.error).not.toBe('Webhook URL not configured.')
    expect(timedOut.error).not.toMatch(/^Webhook returned HTTP/)
    expect(timedOut.error!.toLowerCase()).toMatch(/abort/)
  })

  it('CONSUMER PROPERTY: a webhook that is merely slow (under the 10s default) still succeeds', async () => {
    // The default timeout must absorb a realistically slow receiver — a
    // serverless cold start easily takes a second. 250ms of REAL latency
    // (served by the receiver above) stands in deterministically: well under
    // the 10s default budget, so this only fails if the default turns hostile.
    const provider = createProvider({ url: `${baseUrl}/hooks/slow-250ms` })
    const result = await provider.send({ subject: 'Slow', body: 'still fine' })
    expect(result).toEqual({ success: true })
  })
})
