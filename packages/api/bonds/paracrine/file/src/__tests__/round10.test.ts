import { spawn } from 'node:child_process'
import { existsSync } from 'node:fs'
import { mkdir, mkdtemp, readFile, rm, utimes, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { performance } from 'node:perf_hooks'
import { DatabaseSync } from 'node:sqlite'

import { afterEach, beforeEach, describe, expect, it } from 'vitest'

import type { ParacrineMessage } from '@molecule/api-paracrine'

import { runCli } from '../cli.js'
import { createProvider } from '../provider.js'

const MODULE_URL = new URL('../../dist/index.js', import.meta.url).href

interface ChildResult {
  code: number | null
  signal: NodeJS.Signals | null
  stdout: string
  stderr: string
}

let root: string

beforeEach(async () => {
  root = await mkdtemp(join(tmpdir(), 'paracrine-round10-test-'))
})

afterEach(async () => {
  await rm(root, { recursive: true, force: true })
})

const runScript = (script: string, preload?: string | string[]): Promise<ChildResult> =>
  new Promise((resolve, reject) => {
    const env = { ...process.env }
    const preloads = preload === undefined ? [] : Array.isArray(preload) ? preload : [preload]
    if (preloads.length > 0) {
      env.NODE_OPTIONS = `${env.NODE_OPTIONS ?? ''} ${preloads.map((path) => `--import=${path}`).join(' ')}`
    }
    const child = spawn(process.execPath, ['--input-type=module', '--eval', script, root], {
      stdio: ['ignore', 'pipe', 'pipe'],
      env,
    })
    let stdout = ''
    let stderr = ''
    child.stdout.setEncoding('utf8')
    child.stderr.setEncoding('utf8')
    child.stdout.on('data', (chunk: string) => (stdout += chunk))
    child.stderr.on('data', (chunk: string) => (stderr += chunk))
    child.once('error', reject)
    child.once('close', (code, signal) => resolve({ code, signal, stdout, stderr }))
  })

const message = (id: string, to = 'b'): ParacrineMessage => ({
  id,
  from: 'a',
  to,
  body: id,
  sentAt: '2026-01-01T00:00:00.000Z',
})

const legacyMessage = async (value: ParacrineMessage): Promise<void> => {
  const mailbox = join(root, 'messages', value.to)
  await mkdir(mailbox, { recursive: true })
  await writeFile(join(mailbox, `${value.id}.json`), JSON.stringify(value))
}

const waitFor = async (condition: () => boolean, timeout = 10_000): Promise<void> => {
  const deadline = Date.now() + timeout
  while (!condition()) {
    if (Date.now() > deadline) throw new Error('condition did not become true')
    await new Promise((resolve) => setTimeout(resolve, 20))
  }
}

const importComplete = (): boolean => {
  const db = new DatabaseSync(join(root, 'paracrine.sqlite'))
  const complete = db.prepare("SELECT value FROM migration WHERE key = 'legacy-complete'").get()
  db.close()
  return complete !== undefined
}

const closeObserver = async (): Promise<{ preload: string; log: string }> => {
  const log = join(root, 'closes.log')
  const preload = join(root, 'observe-close.mjs')
  await writeFile(
    preload,
    `import fs from 'node:fs'
import { DatabaseSync } from 'node:sqlite'
const original = DatabaseSync.prototype.close
DatabaseSync.prototype.close = function (...args) {
  fs.appendFileSync(${JSON.stringify(log)}, 'close' + String.fromCharCode(10))
  return original.apply(this, args)
}
`,
  )
  return { preload, log }
}

describe('round 10 import recovery and diagnostics', () => {
  it('closes SQLite when schema initialization exceeds the busy timeout', async () => {
    await legacyMessage(message('legacy-contended'))
    const started = join(root, 'import-started')
    const delay = join(root, 'delay-import.mjs')
    await writeFile(
      delay,
      `import fs from 'node:fs'
import { syncBuiltinESMExports } from 'node:module'
const original = fs.readFileSync
fs.readFileSync = function (path, ...args) {
  if (String(path).endsWith('legacy-contended.json')) {
    fs.writeFileSync(${JSON.stringify(started)}, 'started')
    Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, 6500)
  }
  return original.call(this, path, ...args)
}
syncBuiltinESMExports()
`,
    )
    const ownerScript = `
      import { createProvider } from ${JSON.stringify(MODULE_URL)}
      const store = createProvider({ rootDir: process.argv[1] })
      const pending = await store.pending('b')
      store.close()
      console.log(JSON.stringify({ pending }))
    `
    const owner = runScript(ownerScript, delay)
    await waitFor(() => existsSync(started))

    const observer = await closeObserver()
    const contenderScript = `
      import fs from 'node:fs'
      import { createProvider } from ${JSON.stringify(MODULE_URL)}
      let error = ''
      try {
        const store = createProvider({ rootDir: process.argv[1] })
        store.close()
      } catch (caught) {
        error = caught instanceof Error ? caught.message : String(caught)
      }
      const closes = fs.existsSync(${JSON.stringify(observer.log)})
        ? fs.readFileSync(${JSON.stringify(observer.log)}, 'utf8').trim().split(String.fromCharCode(10)).length
        : 0
      console.log(JSON.stringify({ error, closes }))
    `
    const contender = runScript(contenderScript, observer.preload)
    const [ownerRun, contenderRun] = await Promise.all([owner, contender])
    expect(ownerRun, ownerRun.stderr).toMatchObject({ code: 0, signal: null })
    expect(JSON.parse(ownerRun.stdout)).toEqual({ pending: ['legacy-contended.json'] })
    expect(contenderRun, contenderRun.stderr).toMatchObject({ code: 0, signal: null })
    const result = JSON.parse(contenderRun.stdout) as { error: string; closes: number }
    expect(result.error).toMatch(/locked|busy/i)
    expect(result.closes).toBe(1)
  }, 20_000)

  it('fails and closes an EACCES open, then retries without losing or redirecting mail', async () => {
    await legacyMessage(message('legacy-eacces'))
    const observer = await closeObserver()
    const preload = join(root, 'read-eacces.mjs')
    await writeFile(
      preload,
      `import fs from 'node:fs'
import { syncBuiltinESMExports } from 'node:module'
const original = fs.readFileSync
let fail = true
fs.readFileSync = function (path, ...args) {
  if (fail && String(path).endsWith('legacy-eacces.json')) {
    fail = false
    const error = new Error('transient EACCES')
    error.code = 'EACCES'
    throw error
  }
  return original.call(this, path, ...args)
}
syncBuiltinESMExports()
`,
    )
    const script = `
      import fs from 'node:fs'
      import { createProvider } from ${JSON.stringify(MODULE_URL)}
      let firstError = ''
      try {
        const failed = createProvider({ rootDir: process.argv[1] })
        failed.close()
      } catch (error) {
        firstError = error && typeof error === 'object' && 'code' in error ? error.code : String(error)
      }
      const closesAfterFailure = fs.existsSync(${JSON.stringify(observer.log)})
        ? fs.readFileSync(${JSON.stringify(observer.log)}, 'utf8').trim().split(String.fromCharCode(10)).length
        : 0
      const store = createProvider({ rootDir: process.argv[1] })
      const pending = await store.pending('b')
      const other = await store.pending('c')
      store.close()
      console.log(JSON.stringify({ firstError, closesAfterFailure, pending, other }))
    `
    const run = await runScript(script, [observer.preload, preload])
    expect(run, run.stderr).toMatchObject({ code: 0, signal: null })
    expect(JSON.parse(run.stdout)).toEqual({
      firstError: 'EACCES',
      closesAfterFailure: 1,
      pending: ['legacy-eacces.json'],
      other: [],
    })
  })

  it('retries fresh partial JSON but quarantines and reports aged malformed files', async () => {
    await legacyMessage(message('legacy-healthy'))
    const mailbox = join(root, 'messages', 'b')
    const malformedMessage = join(mailbox, 'legacy-malformed.json')
    await writeFile(malformedMessage, '{"id":')
    const receiptDirectory = join(root, 'reads', 'legacy-healthy')
    await mkdir(receiptDirectory, { recursive: true })
    const malformedReceipt = join(receiptDirectory, 'b.json')
    await writeFile(malformedReceipt, '{"at":')

    expect(() => createProvider({ rootDir: root })).toThrow(SyntaxError)
    expect(existsSync(malformedMessage)).toBe(true)
    expect(importComplete()).toBe(false)

    const old = new Date(Date.now() - 61_000)
    await utimes(malformedMessage, old, old)
    await utimes(malformedReceipt, old, old)
    const store = createProvider({ rootDir: root })
    expect(await store.pending('b')).toEqual(['legacy-healthy.json'])
    expect(await store.pending('c')).toEqual([])

    const quarantinedMessage = join(
      root,
      'legacy-unreadable',
      'messages',
      'b',
      'legacy-malformed.json',
    )
    const quarantinedReceipt = join(root, 'legacy-unreadable', 'reads', 'legacy-healthy', 'b.json')
    const expected = [quarantinedMessage, quarantinedReceipt]
    expect((await store.status()).unreadableLegacyFiles).toEqual(expected)
    store.close()

    expect(existsSync(malformedMessage)).toBe(false)
    expect(existsSync(malformedReceipt)).toBe(false)
    expect(await readFile(quarantinedMessage, 'utf8')).toBe('{"id":')
    expect(await readFile(quarantinedReceipt, 'utf8')).toBe('{"at":')
    const [status] = await runCli(['status'], { rootDir: root })
    expect(JSON.parse(status)).toEqual({ unreadableLegacyFiles: expected })
  })

  it('recovers a quarantine record when killed between rename and commit', async () => {
    await legacyMessage(message('legacy-crash-healthy'))
    const malformed = join(root, 'messages', 'b', 'legacy-crash-malformed.json')
    await writeFile(malformed, '{')
    const old = new Date(Date.now() - 61_000)
    await utimes(malformed, old, old)
    const quarantined = join(
      root,
      'legacy-unreadable',
      'messages',
      'b',
      'legacy-crash-malformed.json',
    )
    const preload = join(root, 'kill-after-rename.mjs')
    await writeFile(
      preload,
      `import fs from 'node:fs'
import { syncBuiltinESMExports } from 'node:module'
const original = fs.renameSync
fs.renameSync = function (from, to) {
  original.call(this, from, to)
  if (String(to).endsWith('legacy-crash-malformed.json')) process.kill(process.pid, 'SIGKILL')
}
syncBuiltinESMExports()
`,
    )
    const script = `
      import { createProvider } from ${JSON.stringify(MODULE_URL)}
      createProvider({ rootDir: process.argv[1] })
    `
    const killed = await runScript(script, preload)
    expect(killed.signal).toBe('SIGKILL')
    expect(existsSync(malformed)).toBe(false)
    expect(await readFile(quarantined, 'utf8')).toBe('{')
    expect(importComplete()).toBe(false)

    const store = createProvider({ rootDir: root })
    expect(await store.pending('b')).toEqual(['legacy-crash-healthy.json'])
    expect((await store.status()).unreadableLegacyFiles).toEqual([quarantined])
    store.close()
  })

  it('imports 20,000 legacy notes and reports one aged malformed file', async () => {
    const mailbox = join(root, 'messages', 'b')
    await mkdir(mailbox, { recursive: true })
    const writes: Promise<void>[] = []
    for (let index = 0; index < 20_000; index += 1) {
      const id = `legacy-large-${String(index).padStart(5, '0')}`
      writes.push(writeFile(join(mailbox, `${id}.json`), JSON.stringify(message(id))))
      if (writes.length === 250) {
        await Promise.all(writes)
        writes.length = 0
      }
    }
    await Promise.all(writes)
    const malformed = join(mailbox, 'zz-malformed.json')
    await writeFile(malformed, '{')
    const old = new Date(Date.now() - 61_000)
    await utimes(malformed, old, old)

    const started = performance.now()
    const store = createProvider({ rootDir: root })
    const duration = performance.now() - started
    const pending = await store.pending('b')
    expect(pending).toHaveLength(20_000)
    expect(new Set(pending).size).toBe(20_000)
    expect((await store.status()).unreadableLegacyFiles).toEqual([
      join(root, 'legacy-unreadable', 'messages', 'b', 'zz-malformed.json'),
    ])
    store.close()
    console.log(`LARGE_LEGACY_IMPORT: 20000 notes, 1 quarantined, ${duration.toFixed(2)} ms`)
  }, 120_000)

  it('delivers every note once across two competing processes and never to another recipient', async () => {
    const expected: string[] = []
    for (let index = 0; index < 80; index += 1) {
      const id = `legacy-delivery-${String(index).padStart(3, '0')}`
      expected.push(id)
      await legacyMessage(message(id))
    }
    const script = `
      import { createProvider } from ${JSON.stringify(MODULE_URL)}
      const store = createProvider({ rootDir: process.argv[1] })
      const delivered = []
      for (;;) {
        const page = await store.claimPending('b', { limit: 20, leaseMs: 30000 })
        if (page.claims.length === 0) break
        delivered.push(...page.claims.map((claim) => claim.message.id))
        await store.acknowledgeClaims(page.claims, 'b')
      }
      store.close()
      console.log(JSON.stringify({ delivered }))
    `
    const runs = await Promise.all([runScript(script), runScript(script)])
    const deliveries: string[] = []
    for (const run of runs) {
      expect(run, run.stderr).toMatchObject({ code: 0, signal: null })
      const result = JSON.parse(run.stdout) as { delivered: string[] }
      expect(new Set(result.delivered).size).toBe(result.delivered.length)
      deliveries.push(...result.delivered)
    }
    expect(deliveries).toHaveLength(80)
    expect(new Set(deliveries).size).toBe(80)
    expect(deliveries.sort()).toEqual(expected.sort())

    const other = createProvider({ rootDir: root })
    expect(await other.pending('c')).toEqual([])
    other.close()
    const db = new DatabaseSync(join(root, 'paracrine.sqlite'))
    expect(
      db.prepare("SELECT COUNT(*) AS count FROM deliveries WHERE state != 'acknowledged'").get(),
    ).toEqual({ count: 0 })
    db.close()
  }, 30_000)
})
