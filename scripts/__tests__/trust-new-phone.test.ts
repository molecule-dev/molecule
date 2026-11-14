/**
 * trust:new end to end, in a scratch copy of the repo: npm is a stub `fetch`
 * (preloaded into the child), the phone approval service is a real Unix socket
 * served from this test. Nothing reaches npm or the real trust ledger.
 */
import { spawn } from 'node:child_process'
import { cpSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import http from 'node:http'
import { tmpdir } from 'node:os'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

import { afterEach, describe, expect, it } from 'vitest'

const SCRIPTS = join(dirname(fileURLToPath(import.meta.url)), '..')
const A = '@molecule/api-demo-a'
const B = '@molecule/api-demo-b'

// The stub npm: 2FA'd trust calls spend one use of a code's budget; an exhausted or
// unknown code answers 401 the way npm does, so the script must ask for a new one.
const STUB_FETCH = `
import { appendFileSync, readFileSync } from 'node:fs'
const scenario = JSON.parse(readFileSync(process.env.STUB_SCENARIO, 'utf8'))
const budget = { ...(scenario.codes ?? {}) }
const log = (entry) => appendFileSync(process.env.STUB_LOG, JSON.stringify(entry) + '\\n')
const json = (body, status = 200) => new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } })
globalThis.fetch = async (url, init = {}) => {
  const u = new URL(url)
  const method = init.method ?? 'GET'
  const headers = init.headers ?? {}
  const otp = headers['npm-otp']
  if (u.pathname === '/-/whoami') return json({ username: 'owner' })
  if (u.pathname.startsWith('/-/v1/done')) return json({}, 202)
  const trust = /^\\/-\\/package\\/(.+?)\\/trust(\\/.*)?$/.exec(u.pathname)
  if (trust) {
    const name = decodeURIComponent(trust[1])
    log({ method, name, otp: otp ?? null })
    if (!otp && !scenario.ci)
      return headers['npm-auth-type'] === 'web'
        ? json({ authUrl: 'https://www.npmjs.com/auth/cli/8540bc4a-5648-4fe6', doneUrl: 'https://registry.npmjs.org/-/v1/done?authId=8540bc4a' }, 401)
        : json({ error: 'This operation requires a one-time password' }, 401)
    if (!scenario.ci) {
      if (!budget[otp]) return json({ error: 'otp invalid' }, 401)
      budget[otp]--
    }
    if (method === 'POST' && name === scenario.crashOn) throw new Error('network down')
    if (method === 'GET') return json([])
    return json({}, method === 'POST' ? 201 : 200)
  }
  const name = decodeURIComponent(u.pathname.slice(1))
  if (method === 'HEAD') return new Response(null, { status: (scenario.absent ?? []).includes(name) ? 404 : 200 })
  return json({ versions: { '1.0.0': { _npmUser: { name: 'owner' } } } })
}
`

type Phone = { answers: Array<Record<string, unknown>>; created: Array<{ purpose: string }> }

const cleanups: Array<() => Promise<void> | void> = []
afterEach(async () => {
  while (cleanups.length) await cleanups.pop()?.()
})

/**
 * A scratch repo with two packages (both in the ledger, both on npm, neither ever
 * published over OIDC, so both need re-linking) unless `ledger` says otherwise.
 */
function scratchRepo({ ledger = [A, B] }: { ledger?: string[] } = {}) {
  const root = mkdtempSync(join(tmpdir(), 'trust-new-'))
  cleanups.push(() => rmSync(root, { recursive: true, force: true }))
  mkdirSync(join(root, 'scripts'))
  cpSync(join(SCRIPTS, 'lib'), join(root, 'scripts', 'lib'), { recursive: true })
  cpSync(join(SCRIPTS, 'trust-new-packages.mjs'), join(root, 'scripts', 'trust-new-packages.mjs'))
  for (const name of [A, B]) {
    const dir = join(root, 'packages', 'api', 'bonds', name.split('/')[1])
    mkdirSync(dir, { recursive: true })
    writeFileSync(join(dir, 'package.json'), JSON.stringify({ name, version: '1.0.0' }))
  }
  writeFileSync(join(root, '.trust-state.json'), JSON.stringify(ledger))
  mkdirSync(join(root, 'home'))
  writeFileSync(join(root, 'home', '.npmrc'), '//registry.npmjs.org/:_authToken=stub-token\n')
  writeFileSync(join(root, 'stub-fetch.mjs'), STUB_FETCH)
  return root
}

/** The phone side: hands out `answers` in order, one per request. */
async function phoneService(root: string, answers: Array<Record<string, unknown>>) {
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
        views.set(id, phone.answers.shift() ?? { status: 'expired' })
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
            PATH: process.env.PATH,
            HOME: join(root, 'home'),
            STUB_SCENARIO: join(root, 'scenario.json'),
            STUB_LOG: join(root, 'calls.log'),
            MOL_APPROVAL_SOCKET: socketPath ?? join(root, 'no-service.sock'),
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
    // Each re-link makes two 2FA'd calls; the first code dies after A's two.
    const run = await runTrustNew(root, [], { codes: { '424242': 2, '135791': 2 } }, socketPath)
    expect(run.code).toBe(0)
    expect(phone.created).toHaveLength(2)
    expect(phone.created[1].purpose).toMatch(
      /needs a new npm code; the last one stopped working \(1 of 2/,
    )
    expect(ledgerOf(root).sort()).toEqual([A, B])
    expect(run.calls.filter((c) => c.otp === '135791').map((c) => c.name)).toEqual([B, B])
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

  it('without a phone service and without a terminal it changes nothing and exits 0', async () => {
    const root = scratchRepo()
    const run = await runTrustNew(root, [], { codes: { '424242': 4 } })
    expect(run.code).toBe(0)
    expect(run.calls).toHaveLength(0)
    expect(ledgerOf(root).sort()).toEqual([A, B])
  })
})
