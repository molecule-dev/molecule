/**
 * REAL-DEPENDENCY integration tests — no mocks: a real Express server on an
 * ephemeral port, driven with real `fetch` calls, fed from a self-contained
 * temp fixtures directory (no dependency on the mlcl templates tree).
 *
 * These pin the consumer-experience properties and failure-disambiguation
 * behavior a test/E2E harness relies on:
 *
 * - `setDefaultState()` actually flips endpoints at runtime (it was once a
 *   silent no-op: the state middleware captured the startup default object,
 *   so the documented API did nothing and callers debugged their own code).
 * - An unmatched `/api/*` route is distinguishable from a legitimately-empty
 *   endpoint (`X-Mock-Unmatched: true`), so "typo'd the path" and "data is
 *   empty" don't look identical.
 * - Distinct failure states return distinct statuses AND bodies.
 * - The documented `setState('GET /accounts', …)` bare-key form works even
 *   though routes register under `/api/…`.
 * - A slow-flow `?_delay` only adds latency — it never corrupts the payload.
 * - A malformed repeated query param can't crash the middleware.
 * - A typo'd `?_state` value is labeled (`X-Mock-Invalid-State`) instead of
 *   silently serving the default (which read as "the mock ignores my state").
 * - Editing a fixture file and re-creating the server in the SAME process
 *   serves the fresh data (the path-keyed pool cache once served stale rows).
 * - PATCH endpoints work — both dir-generated CRUD and `router.patch`
 *   handlers discovered by the scanner (185 fleet templates use PATCH).
 * - A broken handlersPath degrades gracefully: fixture endpoints still serve
 *   and the scan failure is logged, not swallowed.
 *
 * @module
 */

import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest'

import { createMockServer } from '../server/server.js'
import type { MockServer } from '../types.js'

const ACCOUNTS = [
  { id: 'acc-1', name: 'Checking', balance: 1250.5 },
  { id: 'acc-2', name: 'Savings', balance: 9800 },
]

const REPORTS = {
  'spending-by-category': [{ category_name: 'Groceries', total_amount: 412.33 }],
}

describe('@molecule/api-mock-server × REAL express', () => {
  let fixturesDir: string
  let server: MockServer
  let base: string

  beforeAll(async () => {
    fixturesDir = mkdtempSync(join(tmpdir(), 'mock-server-int-'))
    writeFileSync(join(fixturesDir, 'accounts.json'), JSON.stringify(ACCOUNTS))
    writeFileSync(join(fixturesDir, 'reports.json'), JSON.stringify(REPORTS))

    server = await createMockServer({
      appType: 'integration-test',
      fixturesPath: fixturesDir,
      port: 0,
      logging: false,
    })
    base = `http://localhost:${server.port}`
  })

  afterAll(async () => {
    await server.close()
    rmSync(fixturesDir, { recursive: true, force: true })
  })

  it('full lifecycle: fixtures dir → CRUD + report endpoints served with real data', async () => {
    const list = await fetch(`${base}/api/accounts`)
    expect(list.status).toBe(200)
    expect(await list.json()).toEqual(ACCOUNTS)

    const single = await fetch(`${base}/api/accounts/acc-1`)
    expect(single.status).toBe(200)
    expect(await single.json()).toEqual(ACCOUNTS[0])

    const report = await fetch(`${base}/api/reports/spending-by-category`)
    expect(report.status).toBe(200)
    expect(await report.json()).toEqual(REPORTS['spending-by-category'])

    const created = await fetch(`${base}/api/accounts`, { method: 'POST' })
    expect(created.status).toBe(201)

    const deleted = await fetch(`${base}/api/accounts/acc-1`, { method: 'DELETE' })
    expect(deleted.status).toBe(204)
  })

  it('CONSUMER PROPERTY: setDefaultState() takes effect at runtime — and reverts', async () => {
    // This was once a silent no-op (middleware captured the startup default
    // object), which sent callers of the DOCUMENTED API into debugging their
    // own pages instead of the server.
    server.setDefaultState('empty')
    const empty = await fetch(`${base}/api/accounts`)
    expect(empty.status).toBe(200)
    expect(await empty.json()).toEqual([])

    server.setDefaultState('unauthorized')
    const unauthorized = await fetch(`${base}/api/accounts`)
    expect(unauthorized.status).toBe(401)

    server.setDefaultState('success')
    const restored = await fetch(`${base}/api/accounts`)
    expect(restored.status).toBe(200)
    expect(await restored.json()).toEqual(ACCOUNTS)
  })

  it('CONSUMER PROPERTY: a per-request ?_state override still beats the runtime default', async () => {
    server.setDefaultState('empty')
    const response = await fetch(`${base}/api/accounts?_state=success`)
    expect(response.status).toBe(200)
    expect(await response.json()).toEqual(ACCOUNTS)
    server.setDefaultState('success')
  })

  it('FAILURE DISAMBIGUATION: unmatched /api route is labeled, a real empty endpoint is not', async () => {
    // Typo'd endpoint: still 200 [] so pages render, but labeled.
    const typo = await fetch(`${base}/api/acounts`)
    expect(typo.status).toBe(200)
    expect(await typo.json()).toEqual([])
    expect(typo.headers.get('x-mock-unmatched')).toBe('true')

    // Real endpoint in empty state: same body shape, NOT labeled.
    const empty = await fetch(`${base}/api/accounts?_state=empty`)
    expect(empty.status).toBe(200)
    expect(await empty.json()).toEqual([])
    expect(empty.headers.get('x-mock-unmatched')).toBeNull()
  })

  it("FAILURE DISAMBIGUATION: a typo'd ?_state serves the default but is labeled X-Mock-Invalid-State", async () => {
    // `?_state=eror` (typo) once silently served the success default — from
    // the caller's side indistinguishable from the override never being sent.
    const typo = await fetch(`${base}/api/accounts?_state=eror`)
    expect(typo.status).toBe(200)
    expect(await typo.json()).toEqual(ACCOUNTS)
    expect(typo.headers.get('x-mock-invalid-state')).toBe('eror')

    // A valid state value is applied and NOT labeled.
    const valid = await fetch(`${base}/api/accounts?_state=empty`)
    expect(valid.status).toBe(200)
    expect(await valid.json()).toEqual([])
    expect(valid.headers.get('x-mock-invalid-state')).toBeNull()
  })

  it('PATCH on a fixture resource returns the record — not the unmatched catch-all', async () => {
    // Fleet template handlers use router.patch for profile/settings updates.
    // Before PATCH support this fell through to the catch-all: `{}` with
    // X-Mock-Unmatched — the page's update flow "succeeded" with no data.
    const patched = await fetch(`${base}/api/accounts/acc-1`, { method: 'PATCH' })
    expect(patched.status).toBe(200)
    expect(patched.headers.get('x-mock-unmatched')).toBeNull()
    expect(await patched.json()).toEqual(ACCOUNTS[0])
  })

  it('FAILURE DISAMBIGUATION: error and unauthorized states differ in status AND body', async () => {
    const error = await fetch(`${base}/api/accounts?_state=error`)
    expect(error.status).toBe(500)
    expect(await error.json()).toEqual({ error: 'Internal server error' })

    const unauthorized = await fetch(`${base}/api/accounts?_state=unauthorized`)
    expect(unauthorized.status).toBe(401)
    expect(await unauthorized.json()).toEqual({ error: 'Unauthorized' })
  })

  it('setState() honors the documented bare key form AND the /api-prefixed form', async () => {
    server.setState('GET /accounts', { state: 'error' })
    const viaBareKey = await fetch(`${base}/api/accounts`)
    expect(viaBareKey.status).toBe(500)

    server.setState('GET /accounts', { state: 'success' })
    server.setState('GET /api/accounts', { state: 'empty' })
    const viaApiKey = await fetch(`${base}/api/accounts`)
    expect(await viaApiKey.json()).toEqual([])

    server.setState('GET /api/accounts', { state: 'success' })
  })

  it('CONSUMER PROPERTY: ?_delay slows the response without corrupting it', async () => {
    const start = Date.now()
    const response = await fetch(`${base}/api/accounts?_delay=300`)
    const elapsed = Date.now() - start
    expect(elapsed).toBeGreaterThanOrEqual(290)
    expect(response.status).toBe(200)
    expect(await response.json()).toEqual(ACCOUNTS)
  })

  it('a repeated ?_state param (array) is ignored instead of crashing the middleware', async () => {
    const response = await fetch(`${base}/api/accounts?_state=error&_state=empty`)
    // Array value is not a valid single state — fall through to the default.
    expect(response.status).toBe(200)
    expect(await response.json()).toEqual(ACCOUNTS)
  })

  it('a missing fixtures directory fails with an actionable message, not a stack of internals', async () => {
    await expect(
      createMockServer({
        appType: 'integration-test',
        fixturesPath: join(fixturesDir, 'does-not-exist'),
        port: 0,
        logging: false,
      }),
    ).rejects.toThrow(/No fixture data available at path: .*does-not-exist.*\*\.json/)
  })

  it('FAILURE DISAMBIGUATION: a malformed fixture file fails naming THE file, not with a bare SyntaxError', async () => {
    const dir = mkdtempSync(join(tmpdir(), 'mock-server-badjson-'))
    try {
      writeFileSync(join(dir, 'good.json'), JSON.stringify([{ id: 'ok' }]))
      writeFileSync(join(dir, 'broken.json'), '[{ "id": "x", }]')
      await expect(
        createMockServer({ appType: 'bad-json', fixturesPath: dir, port: 0, logging: false }),
      ).rejects.toThrow(/Invalid JSON in fixture file .*broken\.json/)
    } finally {
      rmSync(dir, { recursive: true, force: true })
    }
  })
})

describe('fixture-file lifecycle × pool cache', () => {
  it('CONSUMER PROPERTY: editing a fixture file and re-creating the server serves the fresh data', async () => {
    // The module-level pool cache was keyed by path alone and never
    // invalidated — a harness that edited a fixture JSON and restarted the
    // server IN THE SAME PROCESS silently got the stale rows and debugged its
    // own pages instead of the cache.
    const dir = mkdtempSync(join(tmpdir(), 'mock-server-cache-'))
    try {
      writeFileSync(join(dir, 'items.json'), JSON.stringify([{ id: 'before' }]))
      const first = await createMockServer({
        appType: 'cache-test',
        fixturesPath: dir,
        port: 0,
        logging: false,
      })
      try {
        const r1 = await fetch(`http://localhost:${first.port}/api/items`)
        expect(await r1.json()).toEqual([{ id: 'before' }])
      } finally {
        await first.close()
      }

      writeFileSync(join(dir, 'items.json'), JSON.stringify([{ id: 'after', edited: true }]))
      const second = await createMockServer({
        appType: 'cache-test',
        fixturesPath: dir,
        port: 0,
        logging: false,
      })
      try {
        const r2 = await fetch(`http://localhost:${second.port}/api/items`)
        expect(await r2.json()).toEqual([{ id: 'after', edited: true }])
      } finally {
        await second.close()
      }
    } finally {
      rmSync(dir, { recursive: true, force: true })
    }
  })
})

describe('handler scanner × real handler files', () => {
  it('CONSUMER PROPERTY: a router.patch endpoint in a scanned handler is served', async () => {
    const dir = mkdtempSync(join(tmpdir(), 'mock-server-scan-'))
    try {
      const scanFixturesDir = join(dir, 'fixtures')
      const handlersDir = join(dir, 'handlers')
      mkdirSync(scanFixturesDir)
      mkdirSync(handlersDir)
      writeFileSync(
        join(scanFixturesDir, 'profile.json'),
        JSON.stringify([{ id: 'p-1', name: 'Pat' }]),
      )
      writeFileSync(join(handlersDir, 'index.ts'), `router.use('/profile', profile)\n`)
      writeFileSync(
        join(handlersDir, 'profile.ts'),
        [
          `import { Router } from 'express'`,
          `import { z } from 'zod'`,
          ``,
          `const router = Router()`,
          ``,
          `const updateProfileSchema = z.object({ displayName: z.string().min(1) })`,
          ``,
          `router.get('/me', async (_req, res) => {`,
          `  res.json({ displayName: 'Pat', totalPosts: 12 })`,
          `})`,
          ``,
          `router.patch('/me', validateBody(updateProfileSchema), async (req, res) => {`,
          `  res.json({ displayName: req.body.displayName, totalPosts: 12 })`,
          `})`,
          ``,
          `export default router`,
        ].join('\n'),
      )

      const server = await createMockServer({
        appType: 'scan-test',
        fixturesPath: scanFixturesDir,
        handlersPath: handlersDir,
        port: 0,
        logging: false,
      })
      try {
        // The scanner-discovered PATCH endpoint must be served — before PATCH
        // support the scanner regex skipped router.patch entirely and the
        // request hit the labeled catch-all.
        const patched = await fetch(`http://localhost:${server.port}/api/profile/me`, {
          method: 'PATCH',
        })
        expect(patched.status).toBe(200)
        expect(patched.headers.get('x-mock-unmatched')).toBeNull()
        expect(await patched.json()).toEqual({ id: 'p-1', name: 'Pat' })

        // The sibling GET single-object endpoint synthesizes its fields.
        const me = await fetch(`http://localhost:${server.port}/api/profile/me`)
        expect(me.status).toBe(200)
        const body = (await me.json()) as { displayName?: unknown; totalPosts?: unknown }
        expect(typeof body.displayName).toBe('string')
        expect(typeof body.totalPosts).toBe('number')
      } finally {
        await server.close()
      }
    } finally {
      rmSync(dir, { recursive: true, force: true })
    }
  })

  it('FAILURE DISAMBIGUATION: a broken handlersPath degrades gracefully AND is logged, not swallowed', async () => {
    const dir = mkdtempSync(join(tmpdir(), 'mock-server-badscan-'))
    // Silence the startup banner/request log; capture the warning.
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})
    const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {})
    try {
      writeFileSync(join(dir, 'things.json'), JSON.stringify([{ id: 't-1' }]))
      const server = await createMockServer({
        appType: 'broken-scan',
        fixturesPath: dir,
        // A FILE, not a directory — the scanner's readdirSync throws ENOTDIR.
        handlersPath: join(dir, 'things.json'),
        port: 0,
        logging: true,
      })
      try {
        // Fixture-file endpoints still serve (scanner is best-effort)…
        const res = await fetch(`http://localhost:${server.port}/api/things`)
        expect(res.status).toBe(200)
        expect(await res.json()).toEqual([{ id: 't-1' }])
        // …but the failure is surfaced — a silent swallow made an explicitly
        // passed handlersPath look ignored (endpoints "missing", no signal).
        expect(
          warnSpy.mock.calls.some((call) => String(call[0]).includes('handler scan failed')),
        ).toBe(true)
      } finally {
        await server.close()
      }
    } finally {
      warnSpy.mockRestore()
      logSpy.mockRestore()
      rmSync(dir, { recursive: true, force: true })
    }
  })
})
