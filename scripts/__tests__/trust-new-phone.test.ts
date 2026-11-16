/**
 * trust:new end to end, in a scratch copy of the repo: npm is a stub `fetch`
 * (preloaded into the child), the phone approval service is a real Unix socket
 * served from this test. Nothing reaches npm or the real trust ledger.
 */
import { execFileSync, spawn } from 'node:child_process'
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
// each logged trust call carries how many were in flight when it arrived (and how many of
// those carried the same code). scenario.rateLimit { after, lockMs } is npm's 2FA lock:
// after that many refused codes every 2FA'd call answers 429 "rate limited otp" for lockMs,
// and each call made during the lock extends it. scenario.codeMs is a code's life: a call
// that completes that long after the code first worked is refused (logged again with
// refused: true), the way a TOTP window runs out under requests already in flight.
const STUB_FETCH = `
import { appendFileSync, existsSync, readFileSync } from 'node:fs'
const scenario = JSON.parse(readFileSync(process.env.STUB_SCENARIO, 'utf8'))
const budget = { ...(scenario.codes ?? {}) }
const log = (entry) => appendFileSync(process.env.STUB_LOG, JSON.stringify(entry) + '\\n')
const sessions = scenario.sessions ?? ['stub-token']
const LOGIN_ID = '0f6c1d2e-3b4a-4c5d-8e9f-a0b1c2d3e4f5'
let inflight = 0
const sameCode = {}
let refused = 0
let lockedUntil = 0
const firstUse = {}
const json =(body, status = 200) => new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } })
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
    sameCode[otp] = (sameCode[otp] ?? 0) + 1
    try {
    const rateLimited = Boolean(otp) && lockedUntil > Date.now()
    const refusing = !scenario.ci && live && Boolean(otp) && !rateLimited && !budget[otp]
    log({ method, name, otp: otp ?? null, auth, inflight, sameCode: sameCode[otp], ...(rateLimited ? { rateLimited } : {}), ...(refusing ? { refused: true } : {}) })
    if (!scenario.ci && !live) return json({ error: '{"success":false,"error":"You must be logged in to publish packages."}' }, 401)
    if (!otp && !scenario.ci)
      return headers['npm-auth-type'] === 'web'
        ? json({ authUrl: 'https://www.npmjs.com/auth/cli/8540bc4a-5648-4fe6', doneUrl: 'https://registry.npmjs.org/-/v1/done?authId=8540bc4a' }, 401)
        : json({ error: 'This operation requires a one-time password' }, 401)
    if (!scenario.ci) {
      if (rateLimited) {
        lockedUntil = Date.now() + scenario.rateLimit.lockMs
        return json({ error: 'Could not authenticate owner: rate limited otp' }, 429)
      }
      if (refusing) {
        refused++
        if (scenario.rateLimit && refused >= scenario.rateLimit.after)
          lockedUntil = Date.now() + scenario.rateLimit.lockMs
        return json({ error: 'otp invalid' }, 401)
      }
      budget[otp]--
    }
    if (scenario.delayMs) await new Promise((resolve) => setTimeout(resolve, scenario.delayMs))
    // npm reads the code when the request completes, so every call in flight when it dies
    // is refused together.
    if (scenario.codeMs && !scenario.ci && (firstUse[otp] ??= Date.now()) < Date.now() - scenario.codeMs) {
      refused++
      if (scenario.rateLimit && refused >= scenario.rateLimit.after)
        lockedUntil = Date.now() + scenario.rateLimit.lockMs
      log({ method, name, otp, auth, inflight, sameCode: sameCode[otp], refused: true })
      return json({ error: 'otp invalid' }, 401)
    }
    if (method === 'POST' && name === scenario.crashOn) throw new Error('network down')
    if (method === 'GET') return json([])
    return json({}, method === 'POST' ? 201 : 200)
    } finally {
      inflight--
      sameCode[otp]--
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
 * Makes the scratch repo a git repo whose ledger was committed `at`, the time trust:new
 * reads as when its links were made, together with `paths` (the packages, for a run that
 * builds from the committed tree). Git variables from a calling hook are dropped so nothing
 * here can reach the real repo.
 */
function commitLedger(root: string, at: Date, paths: string[] = []) {
  const env = Object.fromEntries(
    Object.entries(process.env).filter(([key]) => !key.startsWith('GIT_')),
  )
  const when = at.toISOString()
  Object.assign(env, {
    GIT_AUTHOR_NAME: 'test',
    GIT_AUTHOR_EMAIL: 'test@example.com',
    GIT_COMMITTER_NAME: 'test',
    GIT_COMMITTER_EMAIL: 'test@example.com',
    GIT_AUTHOR_DATE: when,
    GIT_COMMITTER_DATE: when,
  })
  execFileSync('git', ['init', '-q'], { cwd: root, env })
  execFileSync('git', ['add', '.trust-state.json', ...paths], { cwd: root, env })
  execFileSync('git', ['commit', '-q', '--no-verify', '-m', 'ledger'], { cwd: root, env })
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

/**
 * Runs trust:new detached (no controlling terminal), like an agent's shell. The returned
 * promise also carries the run's `pid`.
 */
function runTrustNew(
  root: string,
  args: string[],
  scenario: object,
  socketPath?: string,
  env: Record<string, string> = {},
) {
  writeFileSync(join(root, 'scenario.json'), JSON.stringify(scenario))
  let pid: number | undefined
  const run = new Promise<{
    code: number | null
    out: string
    calls: Array<Record<string, unknown>>
  }>((resolve) => {
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
          ...env,
        },
      },
    )
    pid = child.pid
    // A case that times out leaves its run waiting (on the phone, on a lock pause); the run
    // is detached, so nothing else ends it. Kill its whole process group when the case ends.
    let exited = false
    child.on('exit', () => (exited = true))
    cleanups.push(() => {
      if (exited || child.pid === undefined) return
      try {
        process.kill(-child.pid, 'SIGKILL')
      } catch (error) {
        if ((error as NodeJS.ErrnoException).code !== 'ESRCH') throw error
      }
    })
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
  })
  return Object.assign(run, { pid })
}

/**
 * Each case spawns node with the stub npm, most with a phone service too: cases that take
 * 1-4 s alone ran 5.1-5.5 s at load average 60, past vitest's 5 s default.
 */
const RUN_MS = 60_000

const ledgerOf = (root: string): string[] =>
  JSON.parse(readFileSync(join(root, '.trust-state.json'), 'utf8'))

describe('trust:new keeps what it finished', { timeout: RUN_MS }, () => {
  it('saves a package the moment it is trusted, so a crash later in the run loses nothing (OLD MUSTFAIL)', async () => {
    const root = scratchRepo({ ledger: [] })
    const run = await runTrustNew(root, ['--ci'], { ci: true, absent: [A, B], crashOn: B })
    expect(run.code).not.toBe(0)
    expect(run.out).toMatch(/network down/)
    expect(ledgerOf(root)).toEqual([A])
  })
})

describe("trust:new with the owner's phone", { timeout: RUN_MS }, () => {
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

  it('names a dependency the install lacks, and asks the phone nothing when nothing can be published', async () => {
    const C = '@molecule/api-demo-c'
    const root = scratchRepo({ ledger: [], names: [C] })
    const manifest = join(root, 'packages', 'api', 'bonds', 'api-demo-c', 'package.json')
    writeFileSync(
      manifest,
      JSON.stringify({ name: C, version: '1.0.0', dependencies: { 'dep-not-installed': '1.0.0' } }),
    )
    commitLedger(root, new Date(), ['packages'])
    // The saved login is dead, so a run with work would ask the phone to sign in.
    const { socketPath, phone } = await phoneService(root, [{ status: 'pending' }])
    const run = await runTrustNew(
      root,
      [],
      { sessions: ['phone-session'], loginToken: 'phone-session', absent: [C] },
      socketPath,
    )
    expect(run.code, run.out).toBe(1)
    expect(run.out).toMatch(
      `✗ ${C}: its build needs dep-not-installed, which this repo's node_modules does not have — run \`npm install\` here`,
    )
    expect(run.out).toMatch(/Nothing to trust: none of the 1 package\(s\) can be published yet/)
    expect(phone.created).toEqual([])
    expect(run.calls.filter((c) => c.name !== '(sign-in)')).toEqual([])
  })

  it('a dependency that is installed passes the check and goes to the build', async () => {
    const C = '@molecule/api-demo-c'
    const root = scratchRepo({ ledger: [], names: [C] })
    writeFileSync(
      join(root, 'packages', 'api', 'bonds', 'api-demo-c', 'package.json'),
      JSON.stringify({ name: C, version: '1.0.0', dependencies: { 'dep-installed': '1.0.0' } }),
    )
    mkdirSync(join(root, 'node_modules', 'dep-installed'), { recursive: true })
    writeFileSync(join(root, 'node_modules', 'dep-installed', 'package.json'), '{}')
    commitLedger(root, new Date(), ['packages'])
    const { socketPath, phone } = await phoneService(root, [{ status: 'pending' }])
    const run = await runTrustNew(
      root,
      [],
      { sessions: ['phone-session'], loginToken: 'phone-session', absent: [C] },
      socketPath,
    )
    // The scratch repo has no scripts/build.js, so the build itself fails, and with nothing
    // left to publish the phone is still not asked.
    expect(run.out).not.toMatch(/node_modules does not have/)
    expect(run.out).toMatch(`✗ ${C}: not publishable`)
    expect(run.code, run.out).toBe(1)
    expect(phone.created).toEqual([])
  })

  it('leaves a link made in the last 36 h alone: it waits for CI, it is not dead', async () => {
    const root = scratchRepo()
    commitLedger(root, new Date(Date.now() - 10 * 3_600_000))
    const run = await runTrustNew(root, [], { codes: { '424242': 4 } })
    expect(run.code, run.out).toBe(0)
    expect(run.out).toMatch(
      /2 package\(s\) linked in the last 36 h are waiting for their first publish from CI/,
    )
    expect(run.calls.filter((c) => c.name === A || c.name === B)).toEqual([])
  })

  it('re-makes a link older than 36 h that nothing has published through', async () => {
    const root = scratchRepo()
    commitLedger(root, new Date(Date.now() - 3 * 24 * 3_600_000))
    const { socketPath, phone } = await phoneService(root, [{ status: 'code', code: '424242' }])
    const run = await runTrustNew(root, [], { codes: { '424242': 6 } }, socketPath)
    expect(run.code, run.out).toBe(0)
    expect(run.out).not.toMatch(/waiting for their first publish/)
    expect(phone.created).toHaveLength(1)
    expect(new Set(run.calls.map((c) => c.name))).toEqual(new Set([A, B]))
  })

  it("leaves another session's uncommitted packages for later without failing the run (OLD MUSTFAIL)", async () => {
    // A and B need re-linking; C and D are new and only in the working tree.
    const C = '@molecule/api-demo-c'
    const D = '@molecule/api-demo-d'
    const root = scratchRepo({ names: [A, B, C, D] })
    commitLedger(root, new Date(Date.now() - 3 * 24 * 3_600_000))
    const { socketPath } = await phoneService(root, [{ status: 'code', code: '424242' }])
    const run = await runTrustNew(root, [], { codes: { '424242': 6 }, absent: [C, D] }, socketPath)
    expect(run.code, run.out).toBe(0)
    expect(run.out).toMatch(
      `2 new package(s) are not committed yet, so they are left for a later run (only committed code is published): ${C}, ${D}`,
    )
    // Nothing went wrong at npm, so no code-expiry advice, and the count is what was trusted.
    expect(run.out).not.toMatch(/failed|expired/)
    expect(run.out).toMatch(/Trusted 2\./)
    expect(ledgerOf(root).sort()).toEqual([A, B])
    expect(new Set(run.calls.map((c) => c.name))).toEqual(new Set([A, B]))
  })

  it('a case that ends while its run still waits on the phone leaves no process behind', async () => {
    const root = scratchRepo()
    let asked = (): void => {}
    const waiting = new Promise<void>((resolve) => (asked = resolve))
    // The phone never answers, so the run waits for it until something ends it.
    const { socketPath } = await phoneService(root, [{ status: 'pending' }], () => asked())
    const run = runTrustNew(root, [], { codes: { '424242': 4 } }, socketPath)
    await waiting
    const alive = (): boolean => {
      try {
        process.kill(run.pid!, 0)
        return true
      } catch (_error) {
        // ESRCH: the process is gone, which is what this case waits for.
        return false
      }
    }
    expect(alive()).toBe(true)
    // What afterEach does when a case ends, including one that timed out.
    while (cleanups.length) await cleanups.pop()?.()
    for (let i = 0; i < 50 && alive(); i++) await new Promise((r) => setTimeout(r, 100))
    expect(alive(), 'the run outlived its case').toBe(false)
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

  it('tries a new code on one call before the others (OLD MUSTFAIL: all at once)', async () => {
    const names = ['c', 'd', 'e', 'f'].map((x) => `@molecule/api-demo-${x}`)
    const root = scratchRepo({ ledger: [], names })
    const { socketPath, phone } = await phoneService(root, [
      { status: 'code', code: '424242' },
      { status: 'code', code: '135791' },
    ])
    const run = await runTrustNew(
      root,
      ['--concurrency=4'],
      { codes: { '424242': 2, '135791': 10 }, delayMs: 300 },
      socketPath,
    )
    expect(run.code, run.out).toBe(0)
    expect(phone.created).toHaveLength(2)
    // Each code went out alone first: a code npm refuses costs one call, not four.
    for (const code of ['424242', '135791'])
      expect(run.calls.find((c) => c.otp === code)?.sameCode).toBe(1)
    const fresh = run.calls.filter((c) => c.otp === '135791')
    expect(fresh.map((c) => c.sameCode)).toEqual([1, 1])
    expect(ledgerOf(root).sort()).toEqual([...names].sort())
  })

  it("waits out npm's 2FA rate limit instead of asking the phone into it (OLD MUSTFAIL)", async () => {
    const names = ['c', 'd', 'e', 'f'].map((x) => `@molecule/api-demo-${x}`)
    const root = scratchRepo({ ledger: [], names })
    const { socketPath, phone } = await phoneService(root, [
      { status: 'code', code: '424242' },
      { status: 'code', code: '135791' },
      { status: 'code', code: '246802' },
    ])
    // The first code covers one call; the three after it are refused, which locks 2FA.
    const run = await runTrustNew(
      root,
      ['--concurrency=4'],
      {
        codes: { '424242': 1, '135791': 10, '246802': 10 },
        delayMs: 200,
        rateLimit: { after: 3, lockMs: 1500 },
      },
      socketPath,
      { TRUST_NEW_RATE_LIMIT_PAUSE_MS: '2000' },
    )
    expect(run.code, run.out).toBe(0)
    expect(run.out).toMatch(/npm is rate-limiting 2FA codes; pausing every call for 2s/)
    // One call met the lock (the fresh code's first), then nothing until the pause ended.
    expect(run.calls.filter((c) => c.rateLimited)).toHaveLength(1)
    expect(phone.created).toHaveLength(3)
    expect(phone.created[2].purpose).toMatch(
      /npm paused 2FA for a few minutes and the pause is over/,
    )
    expect(ledgerOf(root).sort()).toEqual([...names].sort())
  })

  it('shares a code only while it is fresh, so its expiry refuses one call and never locks 2FA (OLD MUSTFAIL)', async () => {
    // The sweep of 2026-11-15: eight packages at once, a code that died with four calls
    // in flight, and npm's 2FA lock on the next code. Here a code lives 5 s, a call takes
    // 2 s, and three refusals lock 2FA.
    const names = Array.from({ length: 20 }, (_, i) => `@molecule/api-demo-n${i}`)
    const root = scratchRepo({ ledger: [], names })
    const codes = ['424242', '135791', '246802', '975310']
    const { socketPath } = await phoneService(
      root,
      codes.map((code) => ({ status: 'code', code })),
    )
    const run = await runTrustNew(
      root,
      [],
      {
        codes: Object.fromEntries(codes.map((code) => [code, 100])),
        codeMs: 5000,
        delayMs: 2000,
        rateLimit: { after: 3, lockMs: 60_000 },
      },
      socketPath,
      { TRUST_NEW_CODE_FRESH_MS: '3000', TRUST_NEW_RATE_LIMIT_PAUSE_MS: '1000' },
    )
    expect(run.code, run.out).toBe(0)
    expect(run.calls.filter((c) => c.rateLimited)).toHaveLength(0)
    for (const code of codes)
      expect(run.calls.filter((c) => c.otp === code && c.refused).length).toBeLessThanOrEqual(1)
    // Fresh codes were still shared.
    expect(Math.max(...run.calls.map((c) => Number(c.inflight)))).toBeGreaterThan(1)
    expect(ledgerOf(root).sort()).toEqual([...names].sort())
  }, 120_000)

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
