import { mkdtempSync, rmSync } from 'node:fs'
import http from 'node:http'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

import { afterEach, describe, expect, it } from 'vitest'

import {
  approvalServiceAvailable,
  isNpmApprovalPair,
  isNpmLoginPair,
  npmApprovalLink,
  npmLoginPair,
  requestOwnerNpmLogin,
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

// The shape npm answered POST /-/v1/login with on 2026-11-15.
const LOGIN = {
  loginUrl: 'https://www.npmjs.com/login?next=/login/cli/0f6c1d2e-3b4a-4c5d-8e9f-a0b1c2d3e4f5',
  doneUrl: 'https://registry.npmjs.org/-/v1/done?sessionId=0f6c1d2e-3b4a-4c5d-8e9f-a0b1c2d3e4f5',
}
const LOGIN_FRESH = {
  loginUrl: 'https://www.npmjs.com/login?next=/login/cli/99999999-8888-7777-6666-555555555555',
  doneUrl: 'https://registry.npmjs.org/-/v1/done?sessionId=99999999-8888-7777-6666-555555555555',
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
 * GET /requests/:id answers; the last one repeats. A view `{ httpStatus }` answers
 * with that status (404: a restarted service that forgot the request), and
 * `{ drop: true }` hangs up without answering (a service going down).
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
      if (req.method === 'GET' && req.url === '/requests/req-1') {
        const next = views[Math.min(view++, views.length - 1)]
        if (next.drop) return req.socket.destroy()
        if (typeof next.httpStatus === 'number') {
          res.statusCode = next.httpStatus
          return res.end(JSON.stringify({ error: 'no such request' }))
        }
        return res.end(JSON.stringify(next))
      }
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

  const posts = (calls: Call[]) =>
    calls.filter((c) => c.method === 'POST' && c.path === '/requests')

  it('asks again, until the owner answers, when a request expires unanswered (OLD MUSTFAIL: stopped)', async () => {
    const { socketPath, calls } = await fakeService([
      { status: 'pending' },
      { status: 'expired' },
      { status: 'expired' },
      { status: 'code', code: '246810' },
    ])
    const answer = await requestOwnerOtp({ purpose: 'p', socketPath, sleep: noSleep })
    expect(answer).toEqual({ otp: '246810', kind: 'code' })
    expect(posts(calls)).toHaveLength(3)
  })

  it('asks again when the service took this program for stopped and withdrew the request', async () => {
    const { socketPath, calls } = await fakeService([
      { status: 'abandoned' },
      { status: 'code', code: '135790' },
    ])
    const answer = await requestOwnerOtp({ purpose: 'p', socketPath, sleep: noSleep })
    expect(answer.otp).toBe('135790')
    expect(posts(calls)).toHaveLength(2)
  })

  it('asks again when a restarted service no longer knows the request (OLD MUSTFAIL: threw)', async () => {
    const { socketPath, calls } = await fakeService([
      { httpStatus: 404 },
      { status: 'code', code: '112233' },
    ])
    const answer = await requestOwnerOtp({ purpose: 'p', socketPath, sleep: noSleep })
    expect(answer.otp).toBe('112233')
    expect(posts(calls)).toHaveLength(2)
  })

  it('keeps waiting while the service stops answering, and while npm fails', async () => {
    const { socketPath, calls } = await fakeService([
      { drop: true },
      { drop: true },
      { status: 'pending' },
      { status: 'pending' },
      { status: 'code', code: '998877' },
    ])
    let checks = 0
    const fetchImpl = async () => {
      checks++
      if (checks === 1) throw new Error('getaddrinfo EAI_AGAIN registry.npmjs.org')
      return json({}, 202)
    }
    const answer = await requestOwnerOtp({
      purpose: 'p',
      link: async () => PAIR,
      bearer: 'b',
      socketPath,
      fetchImpl,
      sleep: noSleep,
    })
    expect(answer.otp).toBe('998877')
    expect(checks).toBe(2)
    expect(posts(calls)).toHaveLength(1)
  })

  it('asks for a code alone when npm does not answer for the approval link (OLD MUSTFAIL: threw)', async () => {
    const { socketPath, calls } = await fakeService([{ status: 'code', code: '135790' }])
    const answer = await requestOwnerOtp({
      purpose: 'p',
      link: async () => {
        throw new TypeError('fetch failed')
      },
      bearer: 'b',
      socketPath,
      fetchImpl: async () => json({}, 202),
      sleep: noSleep,
    })
    expect(answer).toEqual({ otp: '135790', kind: 'code' })
    const created = calls.find((c) => c.method === 'POST' && c.path === '/requests')
    expect(created?.body).toMatchObject({ kind: 'code' })
    expect(created?.body).not.toHaveProperty('authUrl')
  })

  it("asks again with npm's current link, not the first one", async () => {
    const { socketPath, calls } = await fakeService([
      { status: 'pending' },
      { status: 'expired' },
      { status: 'code', code: '101010' },
    ])
    const links = [PAIR, FRESH]
    const answer = await requestOwnerOtp({
      purpose: 'p',
      link: async () => links.shift() ?? FRESH,
      bearer: 'b',
      socketPath,
      fetchImpl: async () => json({ message: 'not found' }, 404),
      sleep: noSleep,
    })
    expect(answer.otp).toBe('101010')
    expect(posts(calls).map((c) => (c.body as { authUrl?: string }).authUrl)).toEqual([
      PAIR.authUrl,
      FRESH.authUrl,
    ])
  })

  it('still stops on a cancellation', async () => {
    const { socketPath } = await fakeService([{ status: 'cancelled' }])
    await expect(requestOwnerOtp({ purpose: 'p', socketPath, sleep: noSleep })).rejects.toThrow(
      /ended without an answer \(cancelled\)/,
    )
  })
})

describe('isNpmLoginPair', () => {
  it("accepts npm's own sign-in page and done-check only", () => {
    expect(isNpmLoginPair(LOGIN)).toBe(true)
    expect(
      isNpmLoginPair({ ...LOGIN, loginUrl: 'https://evil.example/login?next=/login/cli/0f6c1d2e' }),
    ).toBe(false)
    // A next= that leaves npm's CLI sign-in, or an extra parameter, is not npm's pair.
    expect(
      isNpmLoginPair({
        ...LOGIN,
        loginUrl: 'https://www.npmjs.com/login?next=https://evil.example/',
      }),
    ).toBe(false)
    expect(isNpmLoginPair({ ...LOGIN, loginUrl: `${LOGIN.loginUrl}&x=1` })).toBe(false)
    expect(
      isNpmLoginPair({ ...LOGIN, doneUrl: 'https://evil.example/-/v1/done?sessionId=1' }),
    ).toBe(false)
    expect(isNpmLoginPair(PAIR)).toBe(false)
    expect(isNpmLoginPair(undefined)).toBe(false)
  })
})

describe('npmLoginPair', () => {
  it("starts npm's web sign-in without sending any token", async () => {
    const seen: Array<{ url: string; init: { method?: string; headers: Record<string, string> } }> =
      []
    const fetchImpl = async (
      url: string,
      init: { method?: string; headers: Record<string, string> },
    ) => {
      seen.push({ url, init })
      return json(LOGIN)
    }
    expect(await npmLoginPair({ fetchImpl })).toEqual(LOGIN)
    expect(seen[0].url).toBe('https://registry.npmjs.org/-/v1/login')
    expect(seen[0].init.method).toBe('POST')
    expect(seen[0].init.headers.authorization).toBeUndefined()
    // npm answers 401 to a sign-in start without it (measured 2026-11-15).
    expect(seen[0].init.headers['npm-auth-type']).toBe('web')
  })

  it('refuses a pair that is not npm pages', async () => {
    const fetchImpl = async () => json({ ...LOGIN, loginUrl: 'https://evil.example/login' })
    await expect(npmLoginPair({ fetchImpl })).rejects.toThrow(/did not start a web sign-in/)
  })
})

describe('requestOwnerNpmLogin', () => {
  it("puts npm's sign-in page in front of the owner and returns the session npm hands over", async () => {
    const { socketPath, calls } = await fakeService([{ status: 'pending' }])
    const answers = [json(LOGIN), json({}, 202), json({}, 202), json({ token: 'session-1' })]
    const urls: string[] = []
    const fetchImpl = async (url: string) => {
      urls.push(url)
      return answers.shift() ?? json({}, 202)
    }
    const token = await requestOwnerNpmLogin({
      purpose: 'trust:new needs you to sign in to npm',
      socketPath,
      fetchImpl,
      sleep: noSleep,
    })
    expect(token).toBe('session-1')
    expect(urls.slice(1)).toEqual([LOGIN.doneUrl, LOGIN.doneUrl, LOGIN.doneUrl])
    const created = calls.find((c) => c.method === 'POST' && c.path === '/requests')
    expect(created?.body).toMatchObject({
      purpose: 'trust:new needs you to sign in to npm',
      kind: 'login',
      authUrl: LOGIN.loginUrl,
    })
    expect(calls).toContainEqual({
      method: 'POST',
      path: '/requests/req-1/resolve',
      body: { status: 'approved' },
    })
    expect(calls.some((c) => c.method === 'DELETE')).toBe(false)
  })

  it('starts a fresh sign-in when npm lets the first one expire', async () => {
    const { socketPath, calls } = await fakeService([{ status: 'pending' }])
    const answers = [
      json(LOGIN),
      json({ message: 'not found' }, 404),
      json(LOGIN_FRESH),
      json({ token: 'session-2' }),
    ]
    const token = await requestOwnerNpmLogin({
      purpose: 'p',
      socketPath,
      fetchImpl: async () => answers.shift() ?? json({}, 202),
      sleep: noSleep,
    })
    expect(token).toBe('session-2')
    expect(calls).toContainEqual({
      method: 'POST',
      path: '/requests/req-1/link',
      body: { authUrl: LOGIN_FRESH.loginUrl },
    })
  })

  // 2026-11-19: a trust:new run built 242 first publishes for 20 minutes, then ended on one failed
  // fetch of the sign-in start, before the owner was asked: "no npm sign-in from the phone: fetch failed".
  it('starts the sign-in once npm answers, after a network error and a server error (OLD MUSTFAIL: stopped)', async () => {
    const { socketPath, calls } = await fakeService([{ status: 'pending' }])
    const answers: Array<() => Response> = [
      () => {
        throw new TypeError('fetch failed')
      },
      () => json({ error: 'bad gateway' }, 502),
      () => json(LOGIN),
      () => json({ token: 'session-3' }),
    ]
    const token = await requestOwnerNpmLogin({
      purpose: 'p',
      socketPath,
      fetchImpl: async () => (answers.shift() ?? (() => json({}, 202)))(),
      sleep: noSleep,
    })
    expect(token).toBe('session-3')
    expect(answers).toHaveLength(0)
    const created = calls.filter((c) => c.method === 'POST' && c.path === '/requests')
    expect(created).toHaveLength(1)
    expect(created[0].body).toMatchObject({ authUrl: LOGIN.loginUrl })
  })

  it('counterexample: stops at once when npm refuses to start a sign-in', async () => {
    const { socketPath, calls } = await fakeService([{ status: 'pending' }])
    let starts = 0
    await expect(
      requestOwnerNpmLogin({
        purpose: 'p',
        socketPath,
        fetchImpl: async () => {
          starts++
          return json({ error: 'unauthorized' }, 401)
        },
        sleep: noSleep,
      }),
    ).rejects.toThrow(/did not start a web sign-in \(401\)/)
    expect(starts).toBe(1)
    expect(calls).toEqual([])
  })

  // 2026-11-22: the owner signed in where npm did not tie the sign-in to the request, and a
  // trust:new run waited 47 minutes on a done-check that could never answer.
  it('ends the wait with a sign-in made outside the request (OLD MUSTFAIL: waited out the timeout)', async () => {
    const { socketPath, calls } = await fakeService([{ status: 'pending' }])
    let now = 0
    const realNow = Date.now
    Date.now = () => realNow() + now
    const doneChecks: string[] = []
    let elsewhere = 0
    try {
      const token = await requestOwnerNpmLogin({
        purpose: 'p',
        socketPath,
        fetchImpl: async (url: string) => {
          if (url.endsWith('/-/v1/login')) return json(LOGIN)
          doneChecks.push(url)
          return json({}, 202)
        },
        // Nothing at the first check; the owner's `npm login` lands before the second.
        signedInElsewhere: async () => (elsewhere++ === 0 ? null : 'session-npmrc'),
        timeoutMs: 120_000,
        pollMs: 3_000,
        sleep: async (ms) => {
          now += ms
        },
      })
      expect(token).toBe('session-npmrc')
    } finally {
      Date.now = realNow
    }
    // About every 30 s, not at each 3 s done-check.
    expect(elsewhere).toBe(2)
    expect(doneChecks).toHaveLength(10)
    expect(calls).toContainEqual({
      method: 'POST',
      path: '/requests/req-1/resolve',
      body: { status: 'approved' },
    })
  })

  it("counterexample: with no sign-in elsewhere, the request's own sign-in is the one returned", async () => {
    const { socketPath } = await fakeService([{ status: 'pending' }])
    const answers = [json(LOGIN), json({}, 202), json({}, 202), json({ token: 'session-1' })]
    const token = await requestOwnerNpmLogin({
      purpose: 'p',
      socketPath,
      fetchImpl: async () => answers.shift() ?? json({}, 202),
      signedInElsewhere: async () => null,
      sleep: noSleep,
    })
    expect(token).toBe('session-1')
  })

  it('gives up on an unanswering npm at the timeout', async () => {
    const { socketPath, calls } = await fakeService([{ status: 'pending' }])
    let now = 0
    const realNow = Date.now
    Date.now = () => realNow() + now
    try {
      await expect(
        requestOwnerNpmLogin({
          purpose: 'p',
          socketPath,
          fetchImpl: async () => {
            throw new TypeError('fetch failed')
          },
          timeoutMs: 10_000,
          pollMs: 3_000,
          sleep: async (ms) => {
            now += ms
          },
        }),
      ).rejects.toThrow(/fetch failed/)
    } finally {
      Date.now = realNow
    }
    expect(calls).toEqual([])
  })

  it('throws on a denial and withdraws the request', async () => {
    const { socketPath, calls } = await fakeService([{ status: 'denied' }])
    await expect(
      requestOwnerNpmLogin({
        purpose: 'p',
        socketPath,
        fetchImpl: async () => json(LOGIN),
        sleep: noSleep,
      }),
    ).rejects.toThrow(/denied/)
    expect(calls.some((c) => c.method === 'DELETE' && c.path === '/requests/req-1')).toBe(true)
  })
})
