/**
 * REAL-DEPENDENCY integration tests — no mocks, the actual `web-push` library
 * doing real VAPID JWT signing and real aes128gcm payload encryption against a
 * live local TLS receiver (web-push hard-codes `https.request`, so the test
 * receiver serves a throwaway self-signed localhost cert).
 *
 * The unit suite (`provider.test.ts`) mocks web-push, so it can only validate
 * OUR assumptions about web-push — not web-push. That gap is exactly where the
 * real traps lived: (a) `getPublicKey()` read only the env var, so any app that
 * configured with an explicit `VapidConfig` served `undefined` to its subscribe
 * route while sends worked; (b) `configure()` blindly prepended `mailto:` while
 * the secrets registry teaches the `mailto:…` form, silently shipping a
 * `mailto:mailto:…` VAPID subject; (c) a dead subscription (410) REJECTS — it
 * lands in `SendManyResult.error`, never `result` — so the old core-doc advice
 * to prune on `r.result.statusCode` could never fire.
 *
 * @module
 */

import { execFileSync } from 'node:child_process'
import { createECDH, randomBytes } from 'node:crypto'
import { mkdtempSync, readFileSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import type { IncomingMessage, ServerResponse } from 'node:http'
import { createServer as createHttpsServer, type Server } from 'node:https'
import type { AddressInfo } from 'node:net'

import { afterAll, beforeAll, describe, expect, it } from 'vitest'

import type { PushSubscription } from '@molecule/api-push-notifications'

import { createProvider, provider as lazyProvider } from '../provider.js'

/**
 * Self-signed localhost TLS material for the fake push receiver, GENERATED AT RUNTIME.
 *
 * Never commit key material — even a throwaway fixture. A PEM in the tree trips the
 * repo's secret gate on every commit that touches this file, and a "harmless test key"
 * is exactly the thing that later gets copy-pasted somewhere real. `openssl` ships in
 * the dev/CI images and the sandbox base; if it is ever absent, the suite fails loudly
 * with an actionable message rather than silently skipping the encryption coverage.
 */
function generateSelfSignedCert(): { key: string; cert: string } {
  const dir = mkdtempSync(join(tmpdir(), 'mol-webpush-tls-'))
  const keyPath = join(dir, 'key.pem')
  const certPath = join(dir, 'cert.pem')
  try {
    execFileSync(
      'openssl',
      [
        'req',
        '-x509',
        '-newkey',
        'ec',
        '-pkeyopt',
        'ec_paramgen_curve:prime256v1',
        '-keyout',
        keyPath,
        '-out',
        certPath,
        '-days',
        '2',
        '-nodes',
        '-subj',
        '/CN=localhost',
        '-addext',
        'subjectAltName=DNS:localhost,IP:127.0.0.1',
      ],
      { stdio: 'pipe' },
    )
  } catch (error) {
    throw new Error(
      'web-push integration test needs `openssl` on PATH to generate a throwaway localhost ' +
        'TLS cert for the fake push receiver (no key material is committed to the repo).',
      { cause: error },
    )
  }
  const key = readFileSync(keyPath, 'utf8')
  const cert = readFileSync(certPath, 'utf8')
  rmSync(dir, { recursive: true, force: true })
  return { key, cert }
}

const { key: TLS_KEY, cert: TLS_CERT } = generateSelfSignedCert()

interface CapturedPush {
  url: string
  headers: IncomingMessage['headers']
  body: Buffer
}

const captured: CapturedPush[] = []
let server: Server
let origin: string
let savedTlsReject: string | undefined
const savedEnv: Record<string, string | undefined> = {}

/** Builds a browser-shaped subscription with REAL P-256 keys (so real encryption runs). */
function makeSubscription(path: string): PushSubscription {
  const ecdh = createECDH('prime256v1')
  ecdh.generateKeys()
  return {
    endpoint: `${origin}${path}`,
    keys: {
      p256dh: ecdh.getPublicKey().toString('base64url'),
      auth: randomBytes(16).toString('base64url'),
    },
  }
}

/** Decodes the JWT payload from a `vapid t=<jwt>, k=<key>` Authorization header. */
function decodeVapidClaims(authorization: string | undefined): Record<string, unknown> {
  expect(authorization).toMatch(/^vapid t=.+, k=.+/)
  const jwt = /t=([^,]+)/.exec(authorization!)![1]
  const payload = jwt.split('.')[1]
  return JSON.parse(Buffer.from(payload, 'base64url').toString('utf8')) as Record<string, unknown>
}

beforeAll(async () => {
  // The provider must see ONLY what each test passes explicitly.
  for (const key of ['VAPID_EMAIL', 'VAPID_PUBLIC_KEY', 'VAPID_PRIVATE_KEY']) {
    savedEnv[key] = process.env[key]
    delete process.env[key]
  }
  // web-push hard-codes https.request with no way to inject a CA through the
  // provider API — accept the self-signed TEST receiver for this process.
  savedTlsReject = process.env.NODE_TLS_REJECT_UNAUTHORIZED
  process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0'

  server = createHttpsServer({ key: TLS_KEY, cert: TLS_CERT }, (req, res: ServerResponse) => {
    const chunks: Buffer[] = []
    req.on('data', (c: Buffer) => chunks.push(c))
    req.on('end', () => {
      captured.push({ url: req.url ?? '', headers: req.headers, body: Buffer.concat(chunks) })
      if (req.url?.startsWith('/push/gone')) {
        res.writeHead(410).end('subscription expired')
        return
      }
      res.writeHead(201).end()
    })
  })
  await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve))
  origin = `https://127.0.0.1:${(server.address() as AddressInfo).port}`
})

afterAll(async () => {
  await new Promise<void>((resolve, reject) =>
    server.close((err) => (err ? reject(err) : resolve())),
  )
  if (savedTlsReject === undefined) delete process.env.NODE_TLS_REJECT_UNAUTHORIZED
  else process.env.NODE_TLS_REJECT_UNAUTHORIZED = savedTlsReject
  for (const [key, value] of Object.entries(savedEnv)) {
    if (value === undefined) delete process.env[key]
    else process.env[key] = value
  }
})

describe('@molecule/api-push-notifications-web-push × REAL web-push', () => {
  it('FAILURE DISAMBIGUATION: unconfigured send throws the actionable setup message, not a crypto error', async () => {
    // Runs first: no VAPID env vars, nothing configured. The executor-facing
    // failure must name the exact env vars to set — not surface as a broken
    // library deep in web-push.
    const fresh = createProvider()
    await expect(fresh.send(makeSubscription('/push/nope'), { title: 'Hi' })).rejects.toThrow(
      'Push notifications not configured. Set VAPID_EMAIL, VAPID_PUBLIC_KEY, and VAPID_PRIVATE_KEY.',
    )
  })

  it('full lifecycle (via the lazy proxy export): keys → configure → send → real encrypted delivery', async () => {
    const keys = lazyProvider.generateVapidKeys()
    expect(keys.publicKey.length).toBeGreaterThanOrEqual(60)
    expect(keys.privateKey.length).toBeGreaterThanOrEqual(40)

    // Through the proxy on purpose: configure() writes instance state via the
    // proxy's set trap — if that trap regresses, THIS send starts throwing
    // "not configured" (the documented api-push-notifications-web-push trap).
    lazyProvider.configure({
      email: 'ops@app.com',
      publicKey: keys.publicKey,
      privateKey: keys.privateKey,
    })

    const subscription = makeSubscription('/push/ok')
    const payload = { title: 'Build finished', options: { body: 'All 12 tests green' } }
    const result = await lazyProvider.send(subscription, payload)
    expect(result.statusCode).toBe(201)
    expect(result.headers).toBeDefined()

    const req = captured.find((r) => r.url === '/push/ok')
    expect(req).toBeDefined()
    // Real Web Push wire format: aes128gcm encryption + a TTL the push service requires.
    expect(req!.headers['content-encoding']).toBe('aes128gcm')
    expect(req!.headers.ttl).toBeDefined()
    expect(req!.body.length).toBeGreaterThan(0)
    // The payload is ENCRYPTED for the subscription keys — a receiver (or MITM)
    // without them must not see plaintext.
    expect(req!.body.toString('utf8')).not.toContain('Build finished')

    // Real VAPID JWT: audience is the push service origin, subject our contact.
    const claims = decodeVapidClaims(req!.headers.authorization)
    expect(claims.aud).toBe(origin)
    expect(claims.sub).toBe('mailto:ops@app.com')
  })

  it('CONSUMER PROPERTY: a mailto:-prefixed contact (the form the secrets registry teaches) is not double-prefixed', async () => {
    // VAPID_EMAIL's registered example is "mailto:you@example.com". Blindly
    // prepending produced a malformed "mailto:mailto:…" subject that push
    // services can reject — silently, per subscription, in production only.
    const provider = createProvider()
    const keys = provider.generateVapidKeys()
    provider.configure({
      email: 'mailto:you@example.com',
      publicKey: keys.publicKey,
      privateKey: keys.privateKey,
    })

    await provider.send(makeSubscription('/push/ok-mailto'), { title: 'Hi' })
    const req = captured.find((r) => r.url === '/push/ok-mailto')
    const claims = decodeVapidClaims(req!.headers.authorization)
    expect(claims.sub).toBe('mailto:you@example.com')
  })

  it('CONSUMER PROPERTY: getPublicKey() serves the key passed to configure(), no env var needed', async () => {
    // The subscribe route calls getPublicKey(); before the fix it returned
    // undefined for explicitly-configured apps and every subscription attempt
    // failed client-side while sends kept working — a maddening split-brain.
    const provider = createProvider()
    const keys = provider.generateVapidKeys()
    expect(provider.getPublicKey()).toBeUndefined()
    provider.configure({
      email: 'ops@app.com',
      publicKey: keys.publicKey,
      privateKey: keys.privateKey,
    })
    expect(provider.getPublicKey()).toBe(keys.publicKey)
  })

  it('FAILURE DISAMBIGUATION: a dead endpoint (410) lands in sendMany().error with its statusCode — never in result', async () => {
    const provider = createProvider()
    const keys = provider.generateVapidKeys()
    provider.configure({
      email: 'ops@app.com',
      publicKey: keys.publicKey,
      privateKey: keys.privateKey,
    })

    const alive = makeSubscription('/push/ok-many')
    const dead = makeSubscription('/push/gone')
    const results = await provider.sendMany([alive, dead], { title: 'Hi' })

    expect(results).toHaveLength(2)
    // Same order as the input — callers prune by index.
    expect(results[0].subscription).toBe(alive)
    expect(results[0].result?.statusCode).toBe(201)
    expect(results[0].error).toBeUndefined()

    // The dead subscription REJECTS: the WebPushError (with statusCode) is in
    // `error`, and `result` stays undefined. Pruning code that checks
    // `r.result.statusCode === 410` (the old doc example) would never fire.
    expect(results[1].subscription).toBe(dead)
    expect(results[1].result).toBeUndefined()
    expect(results[1].error).toBeInstanceOf(Error)
    expect((results[1].error as Error & { statusCode?: number }).statusCode).toBe(410)

    // And a single send() to the dead endpoint THROWS the same labeled error.
    await expect(provider.send(dead, { title: 'Hi' })).rejects.toMatchObject({ statusCode: 410 })
  })
})
