import { spawn } from 'node:child_process'
import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { DatabaseSync } from 'node:sqlite'
import { fileURLToPath } from 'node:url'

import { afterEach, beforeEach, describe, expect, it } from 'vitest'

import type { ParacrineMessage } from '@molecule/api-paracrine'

import { createProvider } from '../provider.js'

const BUDGET_CHILD = fileURLToPath(
  new URL('./fixtures/migration-budget-child.mjs', import.meta.url),
)
const PENDING_CHILD = fileURLToPath(new URL('./fixtures/pending-child.mjs', import.meta.url))
const RETRY_CHILD = fileURLToPath(new URL('./fixtures/retry-claim-child.mjs', import.meta.url))

interface ChildResult {
  code: number | null
  signal: NodeJS.Signals | null
  stdout: string
  stderr: string
}

const runChild = (args: string[], preload?: string): Promise<ChildResult> =>
  new Promise((resolve, reject) => {
    const child = spawn(process.execPath, [...(preload ? ['--import', preload] : []), ...args], {
      stdio: ['ignore', 'pipe', 'pipe'],
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

const legacyMessage = async (message: ParacrineMessage): Promise<void> => {
  const mailbox = join(root, 'messages', message.to)
  await mkdir(mailbox, { recursive: true })
  await writeFile(join(mailbox, `${message.id}.json`), JSON.stringify(message))
}

/** The exact object written by `@molecule/api-paracrine-file` 1.1.0 ack(). */
const legacyRead = async (messageId: string, by: string): Promise<void> => {
  const receipts = join(root, 'reads', messageId)
  await mkdir(receipts, { recursive: true })
  await writeFile(
    join(receipts, `${by}.json`),
    JSON.stringify({ messageId, by, at: '2026-01-01T00:00:01.000Z' }),
  )
}

const message = (id: string, to: string, body = id): ParacrineMessage => ({
  id,
  from: 'a',
  to,
  body,
  sentAt: '2026-01-01T00:00:00.000Z',
})

let root: string

beforeEach(async () => {
  root = await mkdtemp(join(tmpdir(), 'paracrine-round5-test-'))
})

afterEach(async () => {
  await rm(root, { recursive: true, force: true })
})

describe('published 1.1.0 JSON import', () => {
  it('preserves case-sensitive read identities and never guesses a delivery recipient', async () => {
    await legacyMessage(message('legacy-direct', 'b', 'pending until b is certain'))
    await legacyMessage(message('legacy-broadcast', '*', 'broadcast stays retryable for b'))
    for (const id of ['legacy-direct', 'legacy-broadcast']) {
      await legacyRead(id, 'b.delivered')
      await legacyRead(id, 'b.DELIVERED')
    }

    const store = createProvider({ rootDir: root })
    expect((await store.pending('b')).sort()).toEqual([
      'legacy-broadcast.json',
      'legacy-direct.json',
    ])
    expect(await store.pending('b.delivered')).toEqual([])
    expect(await store.pending('b.DELIVERED')).toEqual([])
    expect((await store.receive({ for: 'c' })).map((entry) => entry.id)).toEqual([
      'legacy-broadcast',
    ])
    expect((await store.reads('legacy-direct')).map((receipt) => receipt.by).sort()).toEqual([
      'b.DELIVERED',
      'b.delivered',
    ])
    store.close()

    const db = new DatabaseSync(join(root, 'paracrine.sqlite'))
    for (const id of ['legacy-direct', 'legacy-broadcast']) {
      expect(
        db
          .prepare('SELECT kind, recipient FROM receipts WHERE message_id = ? ORDER BY recipient')
          .all(id),
      ).toEqual([
        { kind: 'read', recipient: 'b.DELIVERED' },
        { kind: 'read', recipient: 'b.delivered' },
      ])
    }
    db.close()
  })

  it('keeps pending, read and delivered-shaped 1.1.0 fixtures distinct', async () => {
    await legacyMessage(message('legacy-pending', 'b'))
    await legacyMessage(message('legacy-read', 'b'))
    await legacyMessage(message('legacy-delivered-shaped', 'b'))
    await legacyRead('legacy-read', 'b')
    await legacyRead('legacy-delivered-shaped', 'b.delivered')

    const store = createProvider({ rootDir: root })
    expect((await store.pending('b')).sort()).toEqual([
      'legacy-delivered-shaped.json',
      'legacy-pending.json',
    ])
    expect((await store.receive({ for: 'b', unreadOnly: true })).map((entry) => entry.id)).toEqual([
      'legacy-delivered-shaped',
      'legacy-pending',
    ])
    store.close()
  })

  it('never resurrects a purged import after closing and reopening the store', async () => {
    await legacyMessage(message('legacy-purged', 'b'))
    const store = createProvider({ rootDir: root })
    expect(await store.pending('b')).toEqual(['legacy-purged.json'])
    expect(await store.purge({ before: '2026-01-02T00:00:00.000Z' })).toBe(1)
    store.close()
    const db = new DatabaseSync(join(root, 'paracrine.sqlite'))
    expect(db.prepare("SELECT value FROM migration WHERE key = 'legacy-complete'").get()).toEqual({
      value: 'done',
    })
    db.close()

    const reopened = createProvider({ rootDir: root })
    expect(await reopened.pending('b')).toEqual([])
    expect(await reopened.receive({ for: 'b' })).toEqual([])
    expect(await reopened.reads('legacy-purged')).toEqual([])
    reopened.close()
  })

  it('finishes the same legacy import safely from two processes at once', async () => {
    for (let index = 0; index < 12; index += 1) {
      await legacyMessage(message(`legacy-concurrent-${index}`, 'b'))
    }
    await legacyMessage(message('legacy-concurrent-broadcast', '*'))
    const outputs = [join(root, 'pending-a.json'), join(root, 'pending-b.json')]
    const runs = await Promise.all(
      outputs.map((output) => runChild([PENDING_CHILD, root, 'b', output])),
    )
    for (const run of runs) expect(run, run.stderr).toMatchObject({ code: 0, signal: null })
    for (const output of outputs) {
      expect(JSON.parse(await readFile(output, 'utf8')) as string[]).toHaveLength(13)
    }

    const store = createProvider({ rootDir: root })
    expect(await store.pending('b')).toHaveLength(13)
    store.close()
    const db = new DatabaseSync(join(root, 'paracrine.sqlite'))
    expect(db.prepare('SELECT COUNT(*) AS count FROM messages').get()).toEqual({ count: 13 })
    expect(db.prepare('PRAGMA journal_mode').get()).toEqual({ journal_mode: 'wal' })
    db.close()
  })

  it('counterexample: a fresh install without legacy files still delivers only addressed mail', async () => {
    const store = createProvider({ rootDir: root })
    const direct = await store.send({ from: 'a', to: 'b', body: 'fresh direct' })
    const broadcast = await store.send({ from: 'a', to: '*', body: 'fresh broadcast' })
    expect((await store.receive({ for: 'b' })).map((entry) => entry.id)).toEqual([
      direct.id,
      broadcast.id,
    ])
    expect((await store.receive({ for: 'c' })).map((entry) => entry.id)).toEqual([broadcast.id])
    store.close()

    const reopened = createProvider({ rootDir: root })
    expect((await reopened.claimPending('b')).claims).toHaveLength(2)
    reopened.close()
    const db = new DatabaseSync(join(root, 'paracrine.sqlite'))
    expect(db.prepare('PRAGMA user_version').get()).toEqual({ user_version: 1 })
    expect(
      db
        .prepare("SELECT COUNT(*) AS count FROM sqlite_master WHERE name = 'receipts_legacy'")
        .get(),
    ).toEqual({ count: 0 })
    db.close()
  })
})

describe('bounded and retryable import steps', () => {
  it('keeps every slow-directory hook call below one second, including after entry 60', async () => {
    for (let index = 0; index < 64; index += 1) {
      await legacyMessage(message(`legacy-${String(index).padStart(3, '0')}`, 'b'))
    }
    const preload = join(root, 'slow-directory.mjs')
    await writeFile(
      preload,
      `import fs from 'node:fs'
import { syncBuiltinESMExports } from 'node:module'
const original = fs.Dir.prototype.readSync
fs.Dir.prototype.readSync = function (...args) {
  Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, 20)
  return original.apply(this, args)
}
syncBuiltinESMExports()
`,
    )
    const output = join(root, 'budget.json')
    const run = await runChild([BUDGET_CHILD, root, 'b', output], preload)
    expect(run, run.stderr).toMatchObject({ code: 0, signal: null })
    const result = JSON.parse(await readFile(output, 'utf8')) as { durations: number[] }
    expect(Math.max(...result.durations)).toBeLessThan(1000)
    expect(result.durations.length).toBeGreaterThan(15)

    const store = createProvider({ rootDir: root })
    expect(await store.pending('b')).toHaveLength(64)
    store.close()
  }, 30_000)

  it('retries a transient read error with the same provider instead of skipping the file', async () => {
    await legacyMessage(message('legacy-flaky', 'b'))
    const preload = join(root, 'transient-read.mjs')
    await writeFile(
      preload,
      `import fs from 'node:fs'
import { syncBuiltinESMExports } from 'node:module'
const original = fs.readFileSync
let failed = false
fs.readFileSync = function (path, ...args) {
  if (!failed && String(path).endsWith('legacy-flaky.json')) {
    failed = true
    const error = new Error('transient EIO')
    error.code = 'EIO'
    throw error
  }
  return original.call(this, path, ...args)
}
syncBuiltinESMExports()
`,
    )
    const output = join(root, 'retried.json')
    const run = await runChild([RETRY_CHILD, root, 'b', output], preload)
    expect(run, run.stderr).toMatchObject({ code: 0, signal: null })
    const result = JSON.parse(await readFile(output, 'utf8')) as {
      firstError: string
      second: { claims: { message: { id: string } }[] }
    }
    expect(result.firstError).toContain('transient EIO')
    expect(result.second.claims.map((claim) => claim.message.id)).toContain('legacy-flaky')
  })
})
