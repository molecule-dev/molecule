import { mkdtempSync, rmSync } from 'node:fs'
import http from 'node:http'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

import { afterEach, describe, expect, it } from 'vitest'

import {
  approvalServiceAvailable,
  isNpmApprovalPair,
  npmApprovalLink,
  requestOwnerOtp,
} from '../lib/npm-2fa-approval.mjs'

const PAIR = {
  authUrl: 'https://www.npmjs.com/auth/cli/8540bc4a-5648-4fe6-bbad-20a09fa5c56c',
  doneUrl: 'https://registry.npmjs.org/-/v1/done?authId=8540bc4a',
}
const FRESH = {
  authUrl: 'https://www.npmjs.com/auth/cli/11111111-2222-3333-4444-555555555555',
  doneUrl: 'https://registry.npmjs.org/-/v1/done?authId=11111111',
}

const json = (body: unknown, status = 200): Response =>
  new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } })

type Call = { method: string; path: string; body: unknown }

const cleanups: Array<() => Promise<void> | void> = []
afterEach(async () => {
  while (cleanups.length) await cleanups.pop()?.()
})

/**
 * A stand-in approval service on a real Unix socket. `views` is the sequence of
 * GET /requests/:id answers; the last one repeats.
 */
async function fakeService(views: Array<Record<string, unknown>>) {
  const dir = mkdtempSync(join(tmpdir(), 'approval-socket-'))
  const socketPath = join(dir, 's.sock')
  const calls: Call[] = []
  let view = 0
  const server = http.createServer((req, res) => {
    let data = ''
    req.on('data', (c) => (data += c))
    req.on('end', () => {
      calls.push({
        method: req.method ?? '',
        path: req.url ?? '',
        body: data ? JSON.parse(data) : null,
      })
      res.setHeader('content-type', 'application/json')
      if (req.url === '/health') return res.end(JSON.stringify({ ok: true, subscriptions: 1 }))
      if (req.method === 'POST' && req.url === '/requests') {
        res.statusCode = 201
        return res.end(JSON.stringify({ id: 'req-1', expiresAt: 0 }))
      }
      if (req.method === 'GET' && req.url === '/requests/req-1')
        return res.end(JSON.stringify(views[Math.min(view++, views.length - 1)]))
      res.end(JSON.stringify({ ok: true }))
    })
  })
  await new Promise<void>((resolve) => server.listen(socketPath, resolve))
  cleanups.push(
    () => new Promise<void>((resolve) => server.close(() => resolve())),
    () => rmSync(dir, { recursive: true, force: true }),
  )
  return { socketPath, calls }
}

const noSleep = async (): Promise<void> => {}

describe('isNpmApprovalPair', () => {
  it('accepts npm pages only', () => {
    expect(isNpmApprovalPair(PAIR)).toBe(true)
    expect(isNpmApprovalPair({ ...PAIR, authUrl: 'https://evil.example/auth/cli/x' })).toBe(false)
    expect(isNpmApprovalPair({ ...PAIR, authUrl: 'https://www.npmjs.com/login' })).toBe(false)
    expect(isNpmApprovalPair({ ...PAIR, doneUrl: 'https://evil.example/-/v1/done' })).toBe(false)
    expect(isNpmApprovalPair(null)).toBe(false)
  })
})

describe('npmApprovalLink', () => {
  it("asks npm's trust endpoint for a web approval and returns the pair it offers", async () => {
    const seen: Array<{ url: string; headers: Record<string, string> }> = []
    const fetchImpl = async (url: string, init: { headers: Record<string, string> }) => {
      seen.push({ url, headers: init.headers })
      return json(PAIR, 401)
    }
    expect(await npmApprovalLink('@molecule/app-x', { bearer: 'b', fetchImpl })).toEqual(PAIR)
    expect(seen[0].url).toBe('https://registry.npmjs.org/-/package/@molecule%2fapp-x/trust')
    expect(seen[0].headers['npm-auth-type']).toBe('web')
    expect(seen[0].headers['npm-otp']).toBeUndefined()
  })

  it('returns null for a foreign pair or a non-401 answer', async () => {
    const foreign = async () => json({ ...PAIR, authUrl: 'https://evil.example/auth/cli/x' }, 401)
    expect(await npmApprovalLink('a', { bearer: 'b', fetchImpl: foreign })).toBeNull()
    expect(
      await npmApprovalLink('a', { bearer: 'b', fetchImpl: async () => json({}, 200) }),
    ).toBeNull()
  })
})

describe('approvalServiceAvailable', () => {
  it('is false with nothing listening and true with a service', async () => {
    expect(await approvalServiceAvailable(join(tmpdir(), 'no-such-approval.sock'))).toBe(false)
    const { socketPath } = await fakeService([{ status: 'pending' }])
    expect(await approvalServiceAvailable(socketPath)).toBe(true)
  })
})

describe('requestOwnerOtp', () => {
  it('returns a code sent from the phone, and leaves the answered request alone', async () => {
    const { socketPath, calls } = await fakeService([
      { status: 'pending' },
      { status: 'code', code: '424242' },
    ])
    const fetchImpl = async () => json({}, 202)
    const answer = await requestOwnerOtp({
      purpose: 'trust 3 packages',
      link: async () => PAIR,
      bearer: 'b',
      socketPath,
      fetchImpl,
      sleep: noSleep,
    })
    expect(answer).toEqual({ otp: '424242', kind: 'code' })
    const created = calls.find((c) => c.method === 'POST' && c.path === '/requests')
    expect(created?.body).toMatchObject({ purpose: 'trust 3 packages', authUrl: PAIR.authUrl })
    expect(calls.some((c) => c.method === 'DELETE')).toBe(false)
  })

  it("returns npm's one-call token when the owner approves on npm, and marks it approved", async () => {
    const { socketPath, calls } = await fakeService([{ status: 'pending' }])
    const done = [json({}, 202), json({ token: 'tok-1' }, 200)]
    const fetchImpl = async () => done.shift() ?? json({}, 202)
    const answer = await requestOwnerOtp({
      purpose: 'p',
      link: async () => PAIR,
      bearer: 'b',
      socketPath,
      fetchImpl,
      sleep: noSleep,
    })
    expect(answer).toEqual({ otp: 'tok-1', kind: 'npm' })
    expect(calls).toContainEqual({
      method: 'POST',
      path: '/requests/req-1/resolve',
      body: { status: 'approved' },
    })
  })

  it("puts a fresh npm link in front of the owner when npm's pair expires", async () => {
    const { socketPath, calls } = await fakeService([
      { status: 'pending' },
      { status: 'pending' },
      { status: 'code', code: '135791' },
    ])
    const links = [PAIR, FRESH]
    const fetchImpl = async () => json({ message: 'not found' }, 404)
    const answer = await requestOwnerOtp({
      purpose: 'p',
      link: async () => links.shift() ?? FRESH,
      bearer: 'b',
      socketPath,
      fetchImpl,
      sleep: noSleep,
    })
    expect(answer.kind).toBe('code')
    expect(calls).toContainEqual({
      method: 'POST',
      path: '/requests/req-1/link',
      body: { authUrl: FRESH.authUrl },
    })
  })

  it('throws on a denial and withdraws the request', async () => {
    const { socketPath, calls } = await fakeService([{ status: 'denied' }])
    await expect(
      requestOwnerOtp({
        purpose: 'p',
        socketPath,
        sleep: noSleep,
        fetchImpl: async () => json({}, 202),
      }),
    ).rejects.toThrow(/denied/)
    expect(calls.some((c) => c.method === 'DELETE' && c.path === '/requests/req-1')).toBe(true)
  })

  it('gives up after the timeout and withdraws the request', async () => {
    const { socketPath, calls } = await fakeService([{ status: 'pending' }])
    await expect(
      requestOwnerOtp({
        purpose: 'p',
        socketPath,
        timeoutMs: 5,
        pollMs: 1,
        sleep: async () => new Promise((resolve) => setTimeout(resolve, 3)),
      }),
    ).rejects.toThrow(/no answer/)
    expect(calls.some((c) => c.method === 'DELETE')).toBe(true)
  })
})
