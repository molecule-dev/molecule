/**
 * trust:new end to end, in a scratch copy of the repo: npm is a stub `fetch`
 * (preloaded into the child), the phone approval service is a real Unix socket
 * served from this test. Nothing reaches npm or the real trust ledger.
 */
import { spawn } from 'node:child_process'
import {
  cpSync,
  existsSync,
  mkdirSync,
  mkdtempSync,
  readdirSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from 'node:fs'
import http from 'node:http'
import { tmpdir } from 'node:os'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

import { afterEach, describe, expect, it } from 'vitest'

const SCRIPTS = join(dirname(fileURLToPath(import.meta.url)), '..')
const A = '@molecule/api-demo-a'
const B = '@molecule/api-demo-b'

// The stub npm: 2FA'd trust calls spend one use of a code's budget; an exhausted or
// unknown code answers 401 the way npm does, so the script must ask for a new one. A
// session token not in scenario.sessions (default: the scratch ~/.npmrc's) is a dead
// login, and the web sign-in (POST /-/v1/login, then its done-check) hands out
// scenario.loginToken. scenario.dies names a session that dies once STUB_DEAD exists.
// scenario.delayMs holds each trust answer that long (after the code is checked), and
// each logged trust call carries how many were in flight when it arrived.
const STUB_FETCH = `
import { appendFileSync, existsSync, readFileSync } from 'node:fs'
const scenario = JSON.parse(readFileSync(process.env.STUB_SCENARIO, 'utf8'))
const budget = { ...(scenario.codes ?? {}) }
const log = (entry) => appendFileSync(process.env.STUB_LOG, JSON.stringify(entry) + '\\n')
const sessions = scenario.sessions ?? ['stub-token']
const LOGIN_ID = '0f6c1d2e-3b4a-4c5d-8e9f-a0b1c2d3e4f5'
let inflight = 0
const json = (body, status = 200) => new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } })
globalThis.fetch = async (url, init = {}) => {
  const u = new URL(url)
  const method = init.method ?? 'GET'
  const headers = init.headers ?? {}
  const otp = headers['npm-otp']
  const auth = (headers.authorization ?? '').replace(/^Bearer /, '')
  // scenario.dies: a session that stops working once the test drops STUB_DEAD.
  const live = sessions.includes(auth) && !(auth === scenario.dies && existsSync(process.env.STUB_DEAD))
  if (u.pathname === '/-/v1/login' && method === 'POST') {
    log({ method, name: '(sign-in)', auth: auth || null })
    if (headers['npm-auth-type'] !== 'web') return json({ error: 'Unauthorized' }, 401)
    return json({ loginUrl: 'https://www.npmjs.com/login?next=/login/cli/' + LOGIN_ID, doneUrl: 'https://registry.npmjs.org/-/v1/done?sessionId=' + LOGIN_ID })
  }
  if (u.pathname === '/-/v1/done' && u.searchParams.has('sessionId')) return json({ token: scenario.loginToken })
  if (u.pathname === '/-/whoami') return live ? json({ username: 'owner' }) : json({}, 401)
  if (u.pathname.startsWith('/-/v1/done')) return json({}, 202)
  const trust = /^\\/-\\/package\\/(.+?)\\/trust(\\/.*)?$/.exec(u.pathname)
  if (trust) {
    const name = decodeURIComponent(trust[1])
    inflight++
    try {
    log({ method, name, otp: otp ?? null, auth, inflight })
    if (!scenario.ci && !live) return json({ error: '{"success":false,"error":"You must be logged in to publish packages."}' }, 401)
    if (!otp && !scenario.ci)
      return headers['npm-auth-type'] === 'web'
        ? json({ authUrl: 'https://www.npmjs.com/auth/cli/8540bc4a-5648-4fe6', doneUrl: 'https://registry.npmjs.org/-/v1/done?authId=8540bc4a' }, 401)
        : json({ error: 'This operation requires a one-time password' }, 401)
    if (!scenario.ci) {
      if (!budget[otp]) return json({ error: 'otp invalid' }, 401)
      budget[otp]--
    }
    if (scenario.delayMs) await new Promise((resolve) => setTimeout(resolve, scenario.delayMs))
    if (method === 'POST' && name === scenario.crashOn) throw new Error('network down')
    if (method === 'GET') return json([])
    return json({}, method === 'POST' ? 201 : 200)
    } finally {
      inflight--
    }
  }
  const name = decodeURIComponent(u.pathname.slice(1))
  if (method === 'HEAD') return new Response(null, { status: (scenario.absent ?? []).includes(name) ? 404 : 200 })
  return json({ versions: { '1.0.0': { _npmUser: { name: 'owner' } } } })
}
`

type Phone = {
  answers: Array<Record<string, unknown>>
  created: Array<{ purpose: string; kind?: string; authUrl?: string }>
}

const cleanups: Array<() => Promise<void> | void> = []
afterEach(async () => {
  while (cleanups.length) await cleanups.pop()?.()
})

/**
 * A scratch repo with two packages (both in the ledger, both on npm, neither ever
 * published over OIDC, so both need re-linking) unless `ledger` says otherwise.
 */
function scratchRepo({
  ledger = [A, B],
  inWorkspace = false,
  names = [A, B],
}: { ledger?: string[]; inWorkspace?: boolean; names?: string[] } = {}) {
  const base = mkdtempSync(join(tmpdir(), 'trust-new-'))
  cleanups.push(() => rmSync(base, { recursive: true, force: true }))
  // Inside the workspace the repo sits next to the workspace's own scripts/release.mjs.
  const root = inWorkspace ? join(base, 'molecule') : base
  if (inWorkspace) {
    mkdirSync(join(base, 'scripts'), { recursive: true })
    writeFileSync(join(base, 'scripts', 'release.mjs'), '')
  }
  mkdirSync(join(root, 'scripts'), { recursive: true })
  // A `gh` that only records how it was called.
  mkdirSync(join(root, 'bin'))
  writeFileSync(join(root, 'bin', 'gh'), '#!/bin/sh\necho "$@" >> "$GH_LOG"\n', { mode: 0o755 })
  cpSync(join(SCRIPTS, 'lib'), join(root, 'scripts', 'lib'), { recursive: true })
  cpSync(join(SCRIPTS, 'trust-new-packages.mjs'), join(root, 'scripts', 'trust-new-packages.mjs'))
  for (const name of names) {
    const dir = join(root, 'packages', 'api', 'bonds', name.split('/')[1])
    mkdirSync(dir, { recursive: true })
    writeFileSync(join(dir, 'package.json'), JSON.stringify({ name, version: '1.0.0' }))
  }
  writeFileSync(join(root, '.trust-state.json'), JSON.stringify(ledger))
  mkdirSync(join(root, 'home'))
  mkdirSync(join(root, 'run'))
  writeFileSync(join(root, 'home', '.npmrc'), '//registry.npmjs.org/:_authToken=stub-token\n')
  writeFileSync(join(root, 'stub-fetch.mjs'), STUB_FETCH)
  return root
}

/**
 * The phone side: hands out `answers` in order, one per request. A request past the
 * scripted answers is denied, so a run that asks more often than expected ends instead
 * of asking forever. `onCreate` runs as each request opens (given its 1-based number).
 */
async function phoneService(
  root: string,
  answers: Array<Record<string, unknown>>,
  onCreate: (n: number) => void = () => {},
) {
  const socketPath = join(root, 'approvals.sock')
  const phone: Phone = { answers, created: [] }
  const views = new Map<string, Record<string, unknown>>()
  const server = http.createServer((req, res) => {
    let data = ''
    req.on('data', (c) => (data += c))
    req.on('end', () => {
      res.setHeader('content-type', 'application/json')
      if (req.url === '/health') return res.end(JSON.stringify({ ok: true, subscriptions: 1 }))
      if (req.method === 'POST' && req.url === '/requests') {
        const id = `req-${phone.created.length + 1}`
        phone.created.push(JSON.parse(data))
        views.set(id, phone.answers.shift() ?? { status: 'denied' })
        onCreate(phone.created.length)
        res.statusCode = 201
        return res.end(JSON.stringify({ id, expiresAt: 0 }))
      }
      const id = req.url?.split('/')[2] ?? ''
      if (req.method === 'GET') return res.end(JSON.stringify(views.get(id) ?? {}))
      res.end(JSON.stringify({ ok: true }))
    })
  })
  await new Promise<void>((resolve) => server.listen(socketPath, resolve))
  cleanups.push(() => new Promise<void>((resolve) => server.close(() => resolve())))
  return { socketPath, phone }
}

/** Runs trust:new detached (no controlling terminal), like an agent's shell. */
function runTrustNew(root: string, args: string[], scenario: object, socketPath?: string) {
  writeFileSync(join(root, 'scenario.json'), JSON.stringify(scenario))
  return new Promise<{ code: number | null; out: string; calls: Array<Record<string, unknown>> }>(
    (resolve) => {
      const child = spawn(
        process.execPath,
        ['--import', join(root, 'stub-fetch.mjs'), 'scripts/trust-new-packages.mjs', ...args],
        {
          cwd: root,
          detached: true,
          stdio: ['ignore', 'pipe', 'pipe'],
          env: {
            PATH: `${join(root, 'bin')}:${process.env.PATH}`,
            GH_LOG: join(root, 'gh.log'),
            HOME: join(root, 'home'),
            STUB_SCENARIO: join(root, 'scenario.json'),
            STUB_LOG: join(root, 'calls.log'),
            STUB_DEAD: join(root, 'login-died'),
            MOL_APPROVAL_SOCKET: socketPath ?? join(root, 'no-service.sock'),
            XDG_RUNTIME_DIR: join(root, 'run'),
          },
        },
      )
      let out = ''
      child.stdout.on('data', (c) => (out += c))
      child.stderr.on('data', (c) => (out += c))
      child.on('close', (code) => {
        let calls: Array<Record<string, unknown>>
        try {
          calls = readFileSync(join(root, 'calls.log'), 'utf8')
            .trim()
            .split('\n')
            .filter(Boolean)
            .map((line) => JSON.parse(line))
        } catch (_error) {
          // No trust call was made: the log was never written.
          calls = []
        }
        resolve({ code, out, calls })
      })
    },
  )
}

const ledgerOf = (root: string): string[] =>
  JSON.parse(readFileSync(join(root, '.trust-state.json'), 'utf8'))

describe('trust:new keeps what it finished', () => {
  it('saves a package the moment it is trusted, so a crash later in the run loses nothing (OLD MUSTFAIL)', async () => {
    const root = scratchRepo({ ledger: [] })
    const run = await runTrustNew(root, ['--ci'], { ci: true, absent: [A, B], crashOn: B })
    expect(run.code).not.toBe(0)
    expect(run.out).toMatch(/network down/)
    expect(ledgerOf(root)).toEqual([A])
  })
})

describe("trust:new with the owner's phone", () => {
  it('asks the phone once when one code covers every call', async () => {
    const root = scratchRepo()
    const { socketPath, phone } = await phoneService(root, [{ status: 'code', code: '424242' }])
    const run = await runTrustNew(root, [], { codes: { '424242': 4 } }, socketPath)
    expect(run.out).toMatch(/asked the owner's phone/)
    expect(run.code).toBe(0)
    expect(phone.created).toHaveLength(1)
    expect(phone.created[0].purpose).toBe(
      `trust:new needs an npm code to trust 2 package(s): ${A}, ${B}`,
    )
    expect(ledgerOf(root).sort()).toEqual([A, B])
  })

  it('asks again mid-run when npm stops accepting the code, as many times as needed', async () => {
    const root = scratchRepo()
    const { socketPath, phone } = await phoneService(root, [
      { status: 'code', code: '424242' },
      { status: 'code', code: '135791' },
    ])
    // Each re-link makes two 2FA'd calls; the first code dies after A's two (one package at
    // a time, so the order is fixed).
    const run = await runTrustNew(
      root,
      ['--concurrency=1'],
      { codes: { '424242': 2, '135791': 2 } },
      socketPath,
    )
    expect(run.code).toBe(0)
    expect(phone.created).toHaveLength(2)
    expect(phone.created[1].purpose).toMatch(
      /needs a new npm code; the last one stopped working \(1 of 2/,
    )
    expect(ledgerOf(root).sort()).toEqual([A, B])
    expect(run.calls.filter((c) => c.otp === '135791').map((c) => c.name)).toEqual([B, B])
  })

  it('handles several packages at once, so their calls share one code (OLD MUSTFAIL: one at a time)', async () => {
    const names = ['c', 'd', 'e', 'f', 'g', 'h'].map((x) => `@molecule/api-demo-${x}`)
    const root = scratchRepo({ ledger: [], names })
    const { socketPath, phone } = await phoneService(root, [{ status: 'code', code: '424242' }])
    const run = await runTrustNew(root, [], { codes: { '424242': 6 }, delayMs: 300 }, socketPath)
    expect(run.code, run.out).toBe(0)
    expect(phone.created).toHaveLength(1)
    expect(Math.max(...run.calls.map((c) => Number(c.inflight)))).toBeGreaterThan(1)
    expect(ledgerOf(root).sort()).toEqual([...names].sort())
  })

  it('calls refused by the same expiry share one new request (MUTANT MUSTFAIL: no shared request)', async () => {
    const names = ['c', 'd', 'e', 'f'].map((x) => `@molecule/api-demo-${x}`)
    const root = scratchRepo({ ledger: [], names })
    const { socketPath, phone } = await phoneService(root, [
      { status: 'code', code: '424242' },
      { status: 'code', code: '135791' },
    ])
    // All four calls arrive together; the first code covers two of them.
    const run = await runTrustNew(
      root,
      ['--concurrency=4'],
      { codes: { '424242': 2, '135791': 10 }, delayMs: 300 },
      socketPath,
    )
    expect(run.code, run.out).toBe(0)
    expect(phone.created).toHaveLength(2)
    expect(run.calls.filter((c) => c.otp === '135791')).toHaveLength(2)
    expect(ledgerOf(root).sort()).toEqual([...names].sort())
  })

  it('refuses a --concurrency that is not a positive whole number', async () => {
    const root = scratchRepo()
    const run = await runTrustNew(root, ['--concurrency=0'], {})
    expect(run.code).toBe(2)
    expect(run.out).toMatch(/--concurrency must be a positive whole number, not 0/)
    expect(run.calls).toHaveLength(0)
  })

  it('stops cleanly when the owner denies a request, keeping the packages already done', async () => {
    // On npm but never trusted: one 2FA'd call each. The first code covers A only.
    const root = scratchRepo({ ledger: [] })
    const { socketPath, phone } = await phoneService(root, [
      { status: 'code', code: '424242' },
      { status: 'denied' },
    ])
    const run = await runTrustNew(root, [], { codes: { '424242': 1 } }, socketPath)
    expect(run.code).toBe(1)
    expect(phone.created).toHaveLength(2)
    expect(run.out).toMatch(
      /Stopped: no npm code from the phone: the owner denied the request\. 1 package\(s\) not done/,
    )
    expect(ledgerOf(root)).toEqual([A])
  })

  it('never makes a git push wait on the phone: the hook only says what to run', async () => {
    const root = scratchRepo()
    const { socketPath, phone } = await phoneService(root, [{ status: 'code', code: '424242' }])
    const run = await runTrustNew(root, ['--from-hook'], { codes: { '424242': 4 } }, socketPath)
    expect(run.code).toBe(0)
    expect(phone.created).toHaveLength(0)
    expect(run.calls).toHaveLength(0)
    expect(run.out).toMatch(/No terminal available/)
    expect(run.out).toMatch(/asks the owner's phone for the codes/)
  })

  it('inside the workspace, --release points at the release runner instead of dispatching Release by hand (OLD MUSTFAIL)', async () => {
    const root = scratchRepo({ ledger: [], inWorkspace: true })
    const run = await runTrustNew(root, ['--ci', '--release'], { ci: true, absent: [A, B] })
    expect(run.code).toBe(0)
    expect(existsSync(join(root, 'gh.log'))).toBe(false)
    expect(run.out).toMatch(/--release does not dispatch Release inside the workspace/)
  })

  it('a standalone clone keeps dispatching Release with --release', async () => {
    const root = scratchRepo({ ledger: [] })
    const run = await runTrustNew(root, ['--ci', '--release'], { ci: true, absent: [A, B] })
    expect(run.code).toBe(0)
    expect(readFileSync(join(root, 'gh.log'), 'utf8')).toBe('workflow run release.yml --ref main\n')
  })

  it('signs in from the phone when the saved npm login has expired, and uses that login for every call (OLD MUSTFAIL)', async () => {
    const root = scratchRepo()
    const { socketPath, phone } = await phoneService(root, [
      { status: 'pending' },
      { status: 'code', code: '424242' },
    ])
    const run = await runTrustNew(
      root,
      [],
      { sessions: ['phone-session'], loginToken: 'phone-session', codes: { '424242': 4 } },
      socketPath,
    )
    expect(run.out).toMatch(
      /npm login in ~\/\.npmrc is not valid \(whoami -> 401\); asked the owner's phone to sign in/,
    )
    expect(run.code, run.out).toBe(0)
    expect(phone.created.map((r) => r.kind)).toEqual(['login', 'code'])
    expect(phone.created[0].purpose).toBe(
      `trust:new needs you to sign in to npm (the saved login has expired) to trust 2 package(s): ${A}, ${B}`,
    )
    expect(phone.created[0].authUrl).toMatch(
      /^https:\/\/www\.npmjs\.com\/login\?next=\/login\/cli\//,
    )
    const trustCalls = run.calls.filter((c) => c.name !== '(sign-in)')
    expect(trustCalls.length).toBeGreaterThan(0)
    expect(trustCalls.every((c) => c.auth === 'phone-session')).toBe(true)
    expect(ledgerOf(root).sort()).toEqual([A, B])
    // The login stays in the run: ~/.npmrc is untouched and no temporary config is left behind.
    expect(readFileSync(join(root, 'home', '.npmrc'), 'utf8')).toBe(
      '//registry.npmjs.org/:_authToken=stub-token\n',
    )
    expect(readdirSync(join(root, 'run'))).toEqual([])
  })

  it('signs in again when the npm login dies while a request waits, and asks for a fresh code (OLD MUSTFAIL)', async () => {
    const root = scratchRepo()
    // The saved login works at the start, then dies while the first code request is open.
    const { socketPath, phone } = await phoneService(
      root,
      [
        { status: 'code', code: '424242' },
        { status: 'pending' },
        { status: 'code', code: '135791' },
      ],
      (n) => {
        if (n === 1) writeFileSync(join(root, 'login-died'), '')
      },
    )
    const run = await runTrustNew(
      root,
      [],
      {
        sessions: ['stub-token', 'phone-session'],
        dies: 'stub-token',
        loginToken: 'phone-session',
        codes: { '424242': 4, '135791': 4 },
      },
      socketPath,
    )
    expect(run.code, run.out).toBe(0)
    expect(run.out).toMatch(/the npm login expired while waiting; that answer is dropped/)
    expect(phone.created.map((r) => r.kind)).toEqual(['code', 'login', 'code'])
    expect(phone.created[1].purpose).toMatch(/sign in to npm again \(the login expired\)/)
    // Every 2FA'd call (the code-less ones only fetch an approval link) used the new login
    // and the fresh code; the code that arrived for the dead login was never sent.
    const gated = run.calls.filter((c) => c.name !== '(sign-in)' && c.otp)
    expect(gated).toHaveLength(4)
    expect(gated.every((c) => c.auth === 'phone-session' && c.otp === '135791')).toBe(true)
    expect(ledgerOf(root).sort()).toEqual([A, B])
    expect(readdirSync(join(root, 'run'))).toEqual([])
  })

  it('stops before any npm change when the owner denies the sign-in', async () => {
    const root = scratchRepo()
    const { socketPath, phone } = await phoneService(root, [{ status: 'denied' }])
    const run = await runTrustNew(
      root,
      [],
      { sessions: ['phone-session'], loginToken: 'phone-session', codes: { '424242': 4 } },
      socketPath,
    )
    expect(run.code).toBe(1)
    expect(phone.created).toHaveLength(1)
    expect(run.out).toMatch(
      /Stopped: no npm sign-in from the phone: the owner denied the request\. Nothing was changed\./,
    )
    expect(run.calls.filter((c) => c.name !== '(sign-in)')).toHaveLength(0)
    expect(ledgerOf(root).sort()).toEqual([A, B])
  })

  it('without a phone service and without a terminal it changes nothing and exits 0', async () => {
    const root = scratchRepo()
    const run = await runTrustNew(root, [], { codes: { '424242': 4 } })
    expect(run.code).toBe(0)
    expect(run.calls).toHaveLength(0)
    expect(ledgerOf(root).sort()).toEqual([A, B])
  })
})
