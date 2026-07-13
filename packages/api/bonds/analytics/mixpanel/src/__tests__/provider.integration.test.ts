/**
 * REAL-DEPENDENCY integration tests — no mocks, the actual mixpanel library
 * (pointed at an in-process HTTP server; no external service).
 *
 * The unit suite (`index.test.ts`) mocks mixpanel, so it can only validate OUR
 * assumptions about mixpanel — not mixpanel. That gap let a boot-crash ship
 * unfelt: `Mixpanel.init('')` THROWS in the real library, and the deprecated
 * `mixpanel` export initialized eagerly at module load — importing this
 * package without MIXPANEL_TOKEN crashed the entire API at startup (the
 * mocked init happily accepted `''`, so every unit test stayed green). Every
 * bond wrapping a local-pointable dependency should carry a file like this
 * one; the unit mocks stay for shape/edge cases.
 *
 * @module
 */

import { createServer, type Server } from 'node:http'
import { afterAll, beforeEach, describe, expect, it, vi } from 'vitest'

const ORIGINAL_TOKEN = process.env.MIXPANEL_TOKEN

/** One request captured by the local ingestion server. */
interface CapturedRequest {
  path: string
  /** Decoded JSON payload from the base64 `data` query param. */
  data: unknown
}

/**
 * Starts an in-process stand-in for Mixpanel's ingestion endpoint. The real
 * library sends `GET /track?data=<base64 JSON>` and treats a `"1"` body as
 * success, anything else as an error — `respondWith` controls which we serve.
 */
const startIngestionServer = async (): Promise<{
  server: Server
  port: number
  requests: CapturedRequest[]
  respondWith: { body: string }
}> => {
  const requests: CapturedRequest[] = []
  const respondWith = { body: '1' }
  const server = createServer((req, res) => {
    const url = new URL(req.url ?? '/', 'http://localhost')
    const raw = url.searchParams.get('data')
    requests.push({
      path: url.pathname,
      data: raw ? JSON.parse(Buffer.from(raw, 'base64').toString('utf8')) : undefined,
    })
    res.writeHead(200, { 'Content-Type': 'text/plain' })
    res.end(respondWith.body)
  })
  await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve))
  const address = server.address()
  const port = typeof address === 'object' && address ? address.port : 0
  return { server, port, requests, respondWith }
}

afterAll(() => {
  if (ORIGINAL_TOKEN === undefined) delete process.env.MIXPANEL_TOKEN
  else process.env.MIXPANEL_TOKEN = ORIGINAL_TOKEN
})

beforeEach(() => {
  vi.resetModules()
  delete process.env.MIXPANEL_TOKEN
})

describe('@molecule/api-analytics-mixpanel × REAL mixpanel', () => {
  it('CONSUMER PROPERTY: importing the package without MIXPANEL_TOKEN must not crash the boot', async () => {
    // The barrel re-exports the deprecated raw `mixpanel` client. When that
    // export initialized eagerly, this exact import threw and took the whole
    // API server down at startup on any machine without the env var.
    const mod = await import('../index.js')
    expect(mod.provider).toBeDefined()
    expect(mod.createProvider).toBeDefined()
    expect(mod.mixpanel).toBeDefined()
  })

  it('CONSUMER PROPERTY + FAILURE DISAMBIGUATION: unconfigured use no-ops with ONE warning naming MIXPANEL_TOKEN', async () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})
    try {
      const { createProvider } = await import('../provider.js')
      // Bonding/creating at boot stays safe…
      const provider = createProvider()
      // …and analytics stays fire-and-forget: scaffolded handlers call
      // `void track(...)` with no catch, so an unset telemetry key must never
      // produce a rejection (= unhandled rejection = process crash).
      await expect(provider.track({ name: 'user.signup' })).resolves.toBeUndefined()
      await expect(provider.identify({ userId: 'u1' })).resolves.toBeUndefined()
      await expect(provider.page({ path: '/' })).resolves.toBeUndefined()
      await expect(provider.group!('org-1')).resolves.toBeUndefined()
      await expect(provider.flush!()).resolves.toBeUndefined()
      // The breadcrumb: exactly one warning, carrying the key name (and the
      // registered setup URL) — "events never appear" is diagnosable from the
      // boot log, and distinguishable from a Mixpanel outage (which REJECTS
      // with "Mixpanel Server Error", see below).
      expect(warnSpy).toHaveBeenCalledTimes(1)
      expect(warnSpy).toHaveBeenCalledWith(expect.stringContaining('MIXPANEL_TOKEN'))

      // The deprecated raw client cannot no-op — it throws the tagged,
      // actionable error on first touch instead of an opaque library error.
      const { mixpanel } = await import('../mixpanel.js')
      expect(() => mixpanel.track).toThrowError(/MIXPANEL_TOKEN/)
    } finally {
      warnSpy.mockRestore()
    }
  })

  it('full lifecycle over the wire: track/identify/page/group produce the exact Mixpanel payloads', async () => {
    const { server, port, requests } = await startIngestionServer()
    try {
      const { createProvider } = await import('../provider.js')
      const provider = createProvider({
        token: 'integration-token',
        host: `127.0.0.1:${port}`,
        protocol: 'http',
      })

      await provider.track({
        name: 'purchase.completed',
        userId: 'u_123',
        properties: { amount: 49.99 },
      })
      const trackReq = requests.at(-1)!
      expect(trackReq.path).toBe('/track')
      expect(trackReq.data).toMatchObject({
        event: 'purchase.completed',
        properties: {
          token: 'integration-token',
          distinct_id: 'u_123',
          amount: 49.99,
        },
      })

      // Server-side page views carry the caller-supplied identity — without
      // this every user's page views collapsed into one anonymous bucket.
      await provider.page({ userId: 'u_123', path: '/pricing', name: 'Pricing' })
      const pageReq = requests.at(-1)!
      expect(pageReq.data).toMatchObject({
        event: 'Page View',
        properties: { distinct_id: 'u_123', page_path: '/pricing', page_name: 'Pricing' },
      })

      await provider.identify({ userId: 'u_123', email: 'u@example.com', name: 'U' })
      const identifyReq = requests.at(-1)!
      expect(identifyReq.path).toBe('/engage')
      expect(identifyReq.data).toMatchObject({
        $distinct_id: 'u_123',
        $set: { $email: 'u@example.com', $name: 'U' },
      })

      await provider.group!('org-9', { plan: 'enterprise' })
      const groupReq = requests.at(-1)!
      expect(groupReq.path).toBe('/groups')
      expect(groupReq.data).toMatchObject({
        $group_key: 'company',
        $group_id: 'org-9',
        $set: { plan: 'enterprise' },
      })
    } finally {
      server.close()
    }
  })

  it('FAILURE DISAMBIGUATION: a server-side rejection is an UNTAGGED "Mixpanel Server Error" — distinct from missing config', async () => {
    const { server, port, respondWith } = await startIngestionServer()
    try {
      respondWith.body = '0' // Mixpanel's rejection body (bad token, dropped event, …)
      const { createProvider } = await import('../provider.js')
      const provider = createProvider({
        token: 'rejected-token',
        host: `127.0.0.1:${port}`,
        protocol: 'http',
      })
      const error = await provider.track({ name: 'x' }).then(
        () => null,
        (e: Error) => e,
      )
      expect(error).toBeInstanceOf(Error)
      expect(error!.message).toContain('Mixpanel Server Error')
      // NOT tagged as config-missing — a caller can tell these apart.
      expect((error as { statusCode?: number }).statusCode).toBeUndefined()
      expect((error as { errorKey?: string }).errorKey).toBeUndefined()
    } finally {
      server.close()
    }
  })
})
