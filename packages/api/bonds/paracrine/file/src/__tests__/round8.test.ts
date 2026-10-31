import { spawn } from 'node:child_process'
import { existsSync } from 'node:fs'
import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { basename, join } from 'node:path'
import { DatabaseSync } from 'node:sqlite'

import { afterEach, beforeEach, describe, expect, it } from 'vitest'

import type { ParacrineMessage } from '@molecule/api-paracrine'

import { createProvider } from '../provider.js'

const MODULE_URL = new URL('../../dist/index.js', import.meta.url).href
const BEFORE = '2026-01-02T00:00:00.000Z'

interface ChildResult {
  code: number | null
  signal: NodeJS.Signals | null
  stdout: string
  stderr: string
}

interface OpenResult {
  result?: unknown
  duration?: number
  error?: string
}

let root: string

beforeEach(async () => {
  root = await mkdtemp(join(tmpdir(), 'paracrine-round8-test-'))
})

afterEach(async () => {
  await rm(root, { recursive: true, force: true })
})

const runScript = (script: string, preload?: string): Promise<ChildResult> =>
  new Promise((resolve, reject) => {
    const env = { ...process.env }
    if (preload !== undefined) env.NODE_OPTIONS = `${env.NODE_OPTIONS ?? ''} --import=${preload}`
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

const providerScript = (action: 'pending' | 'claim' | 'purge', settle = false): string => `
  import { performance } from 'node:perf_hooks'
  import { DatabaseSync } from 'node:sqlite'
  import { createProvider } from ${JSON.stringify(MODULE_URL)}
  const rootDir = process.argv[1]
  const started = performance.now()
  try {
    const store = createProvider({ rootDir })
    if (${settle}) {
      await store.reads('round8-bootstrap')
      const deadline = Date.now() + 10000
      for (;;) {
        const db = new DatabaseSync(rootDir + '/paracrine.sqlite')
        const complete = db.prepare("SELECT value FROM migration WHERE key = 'legacy-complete'").get()
        db.close()
        if (complete !== undefined) break
        if (Date.now() > deadline) throw new Error('legacy import did not complete')
        await new Promise((resolve) => setTimeout(resolve, 20))
      }
    }
    const result = ${action === 'purge' ? `await store.purge({ before: ${JSON.stringify(BEFORE)}, includeReceipts: true })` : action === 'claim' ? `(await store.claimPending('b', { limit: 100 })).claims.map((claim) => claim.message.id)` : `await store.pending('b')`}
    store.close()
    console.log(JSON.stringify({ result, duration: performance.now() - started }))
  } catch (error) {
    console.log(JSON.stringify({ error: error instanceof Error ? error.message : String(error) }))
    process.exitCode = 1
  }
`

const output = (run: ChildResult): OpenResult => JSON.parse(run.stdout) as OpenResult

const legacyMessage = async (message: ParacrineMessage): Promise<void> => {
  const mailbox = join(root, 'messages', message.to)
  await mkdir(mailbox, { recursive: true })
  await writeFile(join(mailbox, `${message.id}.json`), JSON.stringify(message))
}

const legacyRead = async (messageId: string, by: string): Promise<void> => {
  const receipts = join(root, 'reads', messageId)
  await mkdir(receipts, { recursive: true })
  await writeFile(
    join(receipts, `${by}.json`),
    JSON.stringify({ messageId, by, at: '2026-01-01T00:00:01.000Z' }),
  )
}

const message = (id: string, to = 'b'): ParacrineMessage => ({
  id,
  from: 'a',
  to,
  body: id,
  sentAt: '2026-01-01T00:00:00.000Z',
})

const waitFor = async (condition: () => boolean, timeout = 10_000): Promise<void> => {
  const deadline = Date.now() + timeout
  while (!condition()) {
    if (Date.now() > deadline) throw new Error('condition did not become true')
    await new Promise((resolve) => setTimeout(resolve, 20))
  }
}

const importComplete = (): boolean => {
  const db = new DatabaseSync(join(root, 'paracrine.sqlite'))
  db.exec('PRAGMA busy_timeout = 1000')
  const complete = db.prepare("SELECT value FROM migration WHERE key = 'legacy-complete'").get()
  db.close()
  return complete !== undefined
}

const counts = (): { messages: number; deliveries: number; receipts: number } => {
  const db = new DatabaseSync(join(root, 'paracrine.sqlite'))
  const result = {
    messages: (db.prepare('SELECT COUNT(*) AS count FROM messages').get() as { count: number })
      .count,
    deliveries: (db.prepare('SELECT COUNT(*) AS count FROM deliveries').get() as { count: number })
      .count,
    receipts: (db.prepare('SELECT COUNT(*) AS count FROM receipts').get() as { count: number })
      .count,
  }
  db.close()
  return result
}

const delayPreload = async (id: string, milliseconds: number): Promise<string> => {
  const path = join(root, `delay-${id}.mjs`)
  await writeFile(
    path,
    `import fs from 'node:fs'
import { syncBuiltinESMExports } from 'node:module'
const original = fs.readFileSync
fs.readFileSync = function (path, ...args) {
  if (String(path).endsWith(${JSON.stringify(`${id}.json`)})) {
    Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, ${milliseconds})
  }
  return original.call(this, path, ...args)
}
syncBuiltinESMExports()
`,
  )
  return path
}

describe('atomic published-JSON import', () => {
  it('does not turn a transient metadata failure into durable absence', async () => {
    await legacyMessage(message('legacy-stat'))
    const marker = join(root, 'stat-failed')
    const preload = join(root, 'stat-eio.mjs')
    await writeFile(
      preload,
      `import fs from 'node:fs'
import { syncBuiltinESMExports } from 'node:module'
const originalExists = fs.existsSync
const originalReaddir = fs.readdirSync
let fail = true
const failOnce = (path) => {
  if (!fail || String(path) !== ${JSON.stringify(join(root, 'messages'))}) return false
  fail = false
  fs.writeFileSync(${JSON.stringify(marker)}, 'EIO')
  return true
}
fs.existsSync = function (path) {
  return failOnce(path) ? false : originalExists.call(this, path)
}
fs.readdirSync = function (path, ...args) {
  if (failOnce(path)) {
    const error = new Error('transient metadata EIO')
    error.code = 'EIO'
    throw error
  }
  return originalReaddir.call(this, path, ...args)
}
syncBuiltinESMExports()
`,
    )
    const script = `
      import { createProvider } from ${JSON.stringify(MODULE_URL)}
      let firstError = ''
      try {
        const first = createProvider({ rootDir: process.argv[1] })
        first.close()
      } catch (error) {
        firstError = error && typeof error === 'object' && 'code' in error ? error.code : String(error)
      }
      const second = createProvider({ rootDir: process.argv[1] })
      const reopened = await second.pending('b')
      second.close()
      console.log(JSON.stringify({ firstError, reopened }))
    `
    const run = await runScript(script, preload)
    expect(run, run.stderr).toMatchObject({ code: 0, signal: null })
    expect(existsSync(marker)).toBe(true)
    expect(JSON.parse(run.stdout)).toEqual({
      firstError: 'EIO',
      reopened: ['legacy-stat.json'],
    })
  })

  it('fails an open on EIO and retries on the next open without a marker', async () => {
    await legacyMessage(message('legacy-eio'))
    const preload = join(root, 'read-eio.mjs')
    await writeFile(
      preload,
      `import fs from 'node:fs'
import { syncBuiltinESMExports } from 'node:module'
const original = fs.readFileSync
let fail = true
fs.readFileSync = function (path, ...args) {
  if (fail && String(path).endsWith('legacy-eio.json')) {
    fail = false
    const error = new Error('transient EIO')
    error.code = 'EIO'
    throw error
  }
  return original.call(this, path, ...args)
}
syncBuiltinESMExports()
`,
    )
    const script = `
      import { DatabaseSync } from 'node:sqlite'
      import { createProvider } from ${JSON.stringify(MODULE_URL)}
      let firstError = ''
      try {
        const failed = createProvider({ rootDir: process.argv[1] })
        failed.close()
      } catch (error) {
        firstError = error && typeof error === 'object' && 'code' in error ? error.code : String(error)
      }
      const db = new DatabaseSync(process.argv[1] + '/paracrine.sqlite')
      const markerAfterFailure = db.prepare("SELECT value FROM migration WHERE key = 'legacy-complete'").get() !== undefined
      const messagesAfterFailure = db.prepare('SELECT COUNT(*) AS count FROM messages').get().count
      db.close()
      const store = createProvider({ rootDir: process.argv[1] })
      const pending = await store.pending('b')
      store.close()
      console.log(JSON.stringify({ firstError, markerAfterFailure, messagesAfterFailure, pending }))
    `
    const run = await runScript(script, preload)
    expect(run, run.stderr).toMatchObject({ code: 0, signal: null })
    expect(JSON.parse(run.stdout)).toEqual({
      firstError: 'EIO',
      markerAfterFailure: false,
      messagesAfterFailure: 0,
      pending: ['legacy-eio.json'],
    })
  })

  it('rolls back a partial JSON import and retries after the file is completed', async () => {
    const mailbox = join(root, 'messages', 'b')
    await mkdir(mailbox, { recursive: true })
    const partial = join(mailbox, 'legacy-partial.json')
    await writeFile(partial, '{"id":')
    await legacyMessage(message('legacy-healthy'))
    const script = `
      import { writeFileSync } from 'node:fs'
      import { DatabaseSync } from 'node:sqlite'
      import { createProvider } from ${JSON.stringify(MODULE_URL)}
      let firstError = ''
      try {
        const failed = createProvider({ rootDir: process.argv[1] })
        failed.close()
      } catch (error) {
        firstError = error instanceof SyntaxError ? 'SyntaxError' : String(error)
      }
      const db = new DatabaseSync(process.argv[1] + '/paracrine.sqlite')
      const markerAfterFailure = db.prepare("SELECT value FROM migration WHERE key = 'legacy-complete'").get() !== undefined
      const messagesAfterFailure = db.prepare('SELECT COUNT(*) AS count FROM messages').get().count
      db.close()
      writeFileSync(process.argv[1] + '/messages/b/legacy-partial.json', JSON.stringify({
        id: 'legacy-partial', from: 'a', to: 'b', body: 'complete', sentAt: '2026-01-01T00:00:00.000Z'
      }))
      const store = createProvider({ rootDir: process.argv[1] })
      const pending = await store.pending('b')
      store.close()
      console.log(JSON.stringify({ firstError, markerAfterFailure, messagesAfterFailure, pending }))
    `
    const run = await runScript(script)
    expect(run, run.stderr).toMatchObject({ code: 0, signal: null })
    expect(JSON.parse(run.stdout)).toEqual({
      firstError: 'SyntaxError',
      markerAfterFailure: false,
      messagesAfterFailure: 0,
      pending: ['legacy-healthy.json', 'legacy-partial.json'],
    })
  })

  it('imports queued legacy mail and receipts before an immediate purge', async () => {
    await legacyMessage(message('legacy-queued'))
    await legacyRead('legacy-queued', 'b')
    const preload = await delayPreload('legacy-queued', 700)
    const run = await runScript(providerScript('purge'), preload)
    expect(run, run.stderr).toMatchObject({ code: 0, signal: null })
    await waitFor(importComplete)
    expect(output(run).result).toBe(1)
    expect(counts()).toEqual({ messages: 0, deliveries: 0, receipts: 0 })
  })

  it('cannot commit a stalled import after takeover and purge', async () => {
    for (let index = 0; index < 70; index += 1) {
      await legacyMessage(message(`legacy-${String(index).padStart(3, '0')}`))
    }
    const stalled = join(root, 'stalled')
    const workerDone = join(root, 'worker-done')
    const preload = join(root, 'stall-owner.mjs')
    await writeFile(
      preload,
      `import fs from 'node:fs'
import { syncBuiltinESMExports } from 'node:module'
const original = fs.readFileSync
if (String(process.argv[1]).endsWith('legacy-import-main.js')) {
  process.on('exit', () => fs.writeFileSync(${JSON.stringify(workerDone)}, 'done'))
}
fs.readFileSync = function (path, ...args) {
  if (String(path).endsWith('legacy-000.json')) {
    fs.writeFileSync(${JSON.stringify(stalled)}, 'stalled')
    Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, 3000)
  }
  return original.call(this, path, ...args)
}
syncBuiltinESMExports()
`,
    )
    const first = runScript(providerScript('pending'), preload)
    await waitFor(() => existsSync(stalled))
    const db = new DatabaseSync(join(root, 'paracrine.sqlite'))
    const row = db.prepare("SELECT value FROM migration WHERE key = 'legacy-import-lock'").get() as
      { value: string } | undefined
    let hadWorker = false
    if (row !== undefined) {
      hadWorker = true
      const owner = JSON.parse(row.value) as { expiresAt: number }
      owner.expiresAt = 0
      db.prepare("UPDATE migration SET value = ? WHERE key = 'legacy-import-lock'").run(
        JSON.stringify(owner),
      )
    }
    db.close()

    const takeover = await runScript(providerScript('purge', true))
    expect(takeover, takeover.stderr).toMatchObject({ code: 0, signal: null })
    expect(output(takeover).result).toBe(70)
    await first
    if (hadWorker) await waitFor(() => existsSync(workerDone))
    expect(counts()).toEqual({ messages: 0, deliveries: 0, receipts: 0 })
  }, 15_000)

  it('rolls back a SIGKILL during import and imports every note on reopen', async () => {
    for (let index = 0; index < 70; index += 1) {
      await legacyMessage(message(`legacy-${String(index).padStart(3, '0')}`))
    }
    const killedMarker = join(root, 'killed')
    const preload = join(root, 'kill-import.mjs')
    await writeFile(
      preload,
      `import fs from 'node:fs'
import { syncBuiltinESMExports } from 'node:module'
const original = fs.readFileSync
fs.readFileSync = function (path, ...args) {
  const result = original.call(this, path, ...args)
  if (String(path).endsWith('legacy-040.json')) {
    fs.writeFileSync(${JSON.stringify(killedMarker)}, 'killed')
    process.kill(process.pid, 'SIGKILL')
  }
  return result
}
syncBuiltinESMExports()
`,
    )
    const killed = await runScript(providerScript('pending'), preload)
    await waitFor(() => existsSync(killedMarker))
    const before = counts()
    const completeAfterKill = importComplete()
    expect(killed.signal).toBe('SIGKILL')
    expect(before).toEqual({ messages: 0, deliveries: 0, receipts: 0 })
    expect(completeAfterKill).toBe(false)
    const resumed = await runScript(providerScript('pending', true))
    expect(resumed, resumed.stderr).toMatchObject({ code: 0, signal: null })
    expect(output(resumed).result).toHaveLength(70)
    expect(new Set(output(resumed).result as string[]).size).toBe(70)
    expect(counts()).toEqual({ messages: 70, deliveries: 70, receipts: 0 })
  }, 15_000)

  it('imports every note exactly once when two processes open at once', async () => {
    for (let index = 0; index < 40; index += 1) {
      await legacyMessage(message(`legacy-concurrent-${String(index).padStart(2, '0')}`))
    }
    const readLog = join(root, 'reads.log')
    const preload = join(root, 'observe-reads.mjs')
    await writeFile(
      preload,
      `import fs from 'node:fs'
import { syncBuiltinESMExports } from 'node:module'
const original = fs.readFileSync
fs.readFileSync = function (path, ...args) {
  if (String(path).includes(${JSON.stringify(join(root, 'messages'))}) && String(path).endsWith('.json')) {
    fs.appendFileSync(${JSON.stringify(readLog)}, String(path) + String.fromCharCode(10))
    Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, 10)
  }
  return original.call(this, path, ...args)
}
syncBuiltinESMExports()
`,
    )
    const runs = await Promise.all([
      runScript(providerScript('pending', true), preload),
      runScript(providerScript('pending', true), preload),
    ])
    for (const run of runs) {
      expect(run, run.stderr).toMatchObject({ code: 0, signal: null })
      expect(output(run).result).toHaveLength(40)
      expect(new Set(output(run).result as string[]).size).toBe(40)
    }
    const imported = (await readFile(readLog, 'utf8'))
      .trim()
      .split('\n')
      .map((name) => basename(name))
    expect(imported).toHaveLength(40)
    expect(new Set(imported).size).toBe(40)
    expect(counts()).toEqual({ messages: 40, deliveries: 40, receipts: 0 })
    const db = new DatabaseSync(join(root, 'paracrine.sqlite'))
    expect(db.prepare('SELECT key FROM migration ORDER BY key').all()).toEqual([
      { key: 'legacy-complete' },
    ])
    db.close()
    const other = createProvider({ rootDir: root })
    expect(await other.pending('c')).toEqual([])
    other.close()
  }, 20_000)

  it('keeps all five notes across repeated open, claim, acknowledge and close cycles', async () => {
    for (let index = 0; index < 5; index += 1) {
      await legacyMessage(message(`legacy-five-${index}`))
    }
    const first = createProvider({ rootDir: root })
    const initial = await first.pending('b')
    first.close()
    await waitFor(importComplete)
    expect(initial).toHaveLength(5)

    const seen = new Set<string>()
    for (let index = 0; index < 12; index += 1) {
      const store = createProvider({ rootDir: root })
      const claimed = await store.claimPending('b', { limit: 1 })
      for (const claim of claimed.claims) seen.add(claim.message.id)
      await store.acknowledgeClaims(claimed.claims, 'b')
      store.close()
    }
    expect([...seen].sort()).toEqual([
      'legacy-five-0',
      'legacy-five-1',
      'legacy-five-2',
      'legacy-five-3',
      'legacy-five-4',
    ])
  })

  it('waits for a 1,150 ms content read before the first claim', async () => {
    await legacyMessage(message('legacy-slow'))
    const preload = await delayPreload('legacy-slow', 1150)
    const run = await runScript(providerScript('claim'), preload)
    expect(run, run.stderr).toMatchObject({ code: 0, signal: null })
    await waitFor(importComplete)
    const result = output(run)
    expect(result.result).toEqual(['legacy-slow'])
    expect(result.duration).toBeGreaterThanOrEqual(1000)
  }, 15_000)
})
