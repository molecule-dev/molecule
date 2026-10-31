import { spawn } from 'node:child_process'
import { existsSync } from 'node:fs'
import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { DatabaseSync } from 'node:sqlite'
import { fileURLToPath } from 'node:url'

import { afterEach, beforeEach, describe, expect, it } from 'vitest'

import { createProvider } from '../provider.js'
import { waitForLegacyImport } from './test-helpers.js'

const CLAIM_TWICE_CHILD = fileURLToPath(
  new URL('./fixtures/claim-twice-child.mjs', import.meta.url),
)
const RETRY_CHILD = fileURLToPath(new URL('./fixtures/retry-claim-child.mjs', import.meta.url))
const CLI = fileURLToPath(new URL('../../dist/cli-main.js', import.meta.url))

interface ChildResult {
  code: number | null
  signal: NodeJS.Signals | null
  stdout: string
  stderr: string
}

const runChild = (args: string[], preload?: string): Promise<ChildResult> =>
  new Promise((resolve, reject) => {
    const env = { ...process.env, PARACRINE_DIR: root }
    if (preload !== undefined) env.NODE_OPTIONS = `${env.NODE_OPTIONS ?? ''} --import=${preload}`
    const child = spawn(process.execPath, args, {
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

const legacy = async (id: string, body = id): Promise<void> => {
  const mailbox = join(root, 'messages', 'b')
  await mkdir(mailbox, { recursive: true })
  await writeFile(
    join(mailbox, `${id}.json`),
    JSON.stringify({ id, from: 'a', to: 'b', body, sentAt: new Date().toISOString() }),
  )
}

const readFault = async (): Promise<string> => {
  const path = join(root, 'read-eio.mjs')
  const marker = join(root, 'read-failed')
  await writeFile(
    path,
    `import fs from 'node:fs'
import { syncBuiltinESMExports } from 'node:module'
const original = fs.readFileSync
fs.readFileSync = function (path, ...args) {
  if (String(path).includes(${JSON.stringify(join(root, 'messages'))}) && String(path).endsWith('.json')) {
    if (!fs.existsSync(${JSON.stringify(marker)})) {
      fs.writeFileSync(${JSON.stringify(marker)}, 'failed')
      const error = new Error('transient EIO')
      error.code = 'EIO'
      throw error
    }
  }
  return original.call(this, path, ...args)
}
syncBuiltinESMExports()
`,
  )
  return path
}

let root: string

beforeEach(async () => {
  root = await mkdtemp(join(tmpdir(), 'paracrine-round4-test-'))
})

afterEach(async () => {
  await rm(root, { recursive: true, force: true })
})

describe('round-4 delivery regressions', () => {
  it('Sol 2: a delivery receipt for b cannot consume the real recipient b.delivered', async () => {
    const store = createProvider({ rootDir: root })
    await store.pending('b')
    await store.pending('b.delivered')
    const sent = await store.send({ from: 'a', to: '*', body: 'distinct identities' })

    const delivered = await store.claimPending('b')
    await store.acknowledgeClaims(delivered.claims, 'b.delivered')
    expect(await store.pending('b')).toEqual([])
    expect(await store.pending('b.delivered')).toEqual([`${sent.id}.json`])

    const other = await store.claimPending('b.delivered')
    await store.acknowledgeClaims(other.claims, 'b.delivered.delivered')
    expect((await store.reads(sent.id)).map((receipt) => receipt.by)).toEqual([
      'b.delivered',
      'b.delivered.delivered',
    ])
    store.close()

    const db = new DatabaseSync(join(root, 'paracrine.sqlite'))
    const receipts = db
      .prepare('SELECT kind, recipient FROM receipts WHERE message_id = ? ORDER BY recipient')
      .all(sent.id)
    expect(receipts).toEqual([
      { kind: 'delivery', recipient: 'b' },
      { kind: 'delivery', recipient: 'b.delivered' },
    ])
    db.close()
  })

  it('Sol 2 counterexample: an explicit read by b.delivered still acknowledges only that identity', async () => {
    const store = createProvider({ rootDir: root })
    await store.pending('b')
    await store.pending('b.delivered')
    const sent = await store.send({ from: 'a', to: '*', body: 'explicit read' })
    await store.ack(sent.id, 'b.delivered')
    expect(await store.pending('b')).toEqual([`${sent.id}.json`])
    expect(await store.pending('b.delivered')).toEqual([])
    store.close()
  })

  it('Sol 3: a real detached worker retries EIO without skipping the file', async () => {
    await legacy('flaky', 'survives transient EIO')
    const preload = await readFault()
    const output = join(root, 'claim.json')
    const retried = await runChild([RETRY_CHILD, root, 'b', output], preload)
    expect(retried.code).toBe(0)
    expect(existsSync(join(root, 'read-failed'))).toBe(true)
    const result = JSON.parse(await readFile(output, 'utf8')) as {
      firstError: string
      second: { claims: { message: { id: string; body: string } }[] }
    }
    expect(result.firstError).toBe('')
    expect(result.second.claims.map((claim) => claim.message.id)).toContain('flaky')

    const db = new DatabaseSync(join(root, 'paracrine.sqlite'))
    expect(db.prepare('PRAGMA journal_mode').get()).toEqual({ journal_mode: 'wal' })
    db.close()
  })

  it('Sol 3 counterexample: invalid JSON is corruption and does not block healthy legacy mail', async () => {
    const mailbox = join(root, 'messages', 'b')
    await mkdir(mailbox, { recursive: true })
    await writeFile(join(mailbox, 'broken.json'), '{not json')
    await legacy('healthy', 'healthy after corruption')
    const store = createProvider({ rootDir: root })
    await store.pending('b')
    await waitForLegacyImport(root)
    expect(await store.pending('b')).toEqual(['healthy.json'])
    store.close()
  })

  it('Sol 4: an orphaned legacy receipt migrates with its own durable checkpoint', async () => {
    const receiptDir = join(root, 'reads', 'purged-message')
    await mkdir(receiptDir, { recursive: true })
    await writeFile(join(receiptDir, 'b.json'), JSON.stringify({ at: '2026-01-01T00:00:00.000Z' }))
    const store = createProvider({ rootDir: root })
    await store.reads('purged-message')
    await waitForLegacyImport(root)
    expect(await store.reads('purged-message')).toEqual([
      { messageId: 'purged-message', by: 'b', at: '2026-01-01T00:00:00.000Z' },
    ])
    expect(await store.reads('purged-message')).toHaveLength(1)
    store.close()

    const db = new DatabaseSync(join(root, 'paracrine.sqlite'))
    const checkpoint = db
      .prepare("SELECT value FROM migration WHERE key = 'legacy-receipts'")
      .get() as { value: string }
    expect(JSON.parse(checkpoint.value).phase).toBe('done')
    db.close()
  })

  it('Sol 5: claim selection uses bounded lower-bound metadata and backfills a recipient once', async () => {
    const store = createProvider({ rootDir: root })
    const sent = await store.send({ from: 'a', to: '*', body: 'one broadcast' })
    store.close()
    const preload = join(root, 'count-backfill.mjs')
    await writeFile(
      preload,
      `import { DatabaseSync } from 'node:sqlite'
globalThis.backfills = 0
const prepare = DatabaseSync.prototype.prepare
DatabaseSync.prototype.prepare = function (sql, ...args) {
  if (sql.includes("FROM messages WHERE recipient = '*'")) globalThis.backfills += 1
  return prepare.call(this, sql, ...args)
}
`,
    )
    const output = join(root, 'twice.json')
    const run = await runChild([CLAIM_TWICE_CHILD, root, 'b', output], preload)
    expect(run.code).toBe(0)
    const result = JSON.parse(await readFile(output, 'utf8')) as {
      backfills: number
      first: { claims: unknown[]; hidden: number }
    }
    expect(result.first.claims).toHaveLength(1)
    expect(result.backfills).toBe(1)

    const reopened = createProvider({ rootDir: root })
    for (let index = 0; index < 100; index += 1) {
      await reopened.send({ from: 'a', to: 'b', body: `bounded ${index}` })
    }
    const page = await reopened.claimPending('b', { limit: 5 })
    expect(page.hidden).toBeGreaterThan(0)
    expect(page.hidden).toBeLessThanOrEqual(20)
    expect(page.claims.map((claim) => claim.message.id)).not.toContain(sent.id)
    reopened.close()

    const db = new DatabaseSync(join(root, 'paracrine.sqlite'))
    const indexes = db.prepare("PRAGMA index_list('deliveries')").all() as { name: string }[]
    expect(indexes.map((index) => index.name)).toEqual(
      expect.arrayContaining(['deliveries_pending_selection', 'deliveries_stale_selection']),
    )
    const plan = db
      .prepare(
        `EXPLAIN QUERY PLAN
         SELECT m.* FROM deliveries d JOIN messages m ON m.id = d.message_id
         WHERE d.recipient = 'b' AND d.selection_group = 0 AND d.sent_ms >= 0
           AND d.state = 'pending'
         ORDER BY d.selection_group, d.sent_ms, d.message_id LIMIT 6`,
      )
      .all() as { detail: string }[]
    expect(plan.some((step) => step.detail.includes('deliveries_pending_selection'))).toBe(true)
    expect(plan.some((step) => step.detail.includes('TEMP B-TREE'))).toBe(false)
    db.close()
  })

  it('R6 schema: attempt metadata is durable while claimed still covers unconfirmed emission', async () => {
    const store = createProvider({ rootDir: root })
    const sent = await store.send({ from: 'a', to: 'b', body: 'future at-least-once metadata' })
    const claimed = await store.claimPending('b')
    expect(claimed.claims[0]?.message.id).toBe(sent.id)
    store.close()

    const db = new DatabaseSync(join(root, 'paracrine.sqlite'))
    const row = db
      .prepare(
        'SELECT state, emission_count, last_emitted_at FROM deliveries WHERE message_id = ? AND recipient = ?',
      )
      .get(sent.id, 'b')
    expect(row).toEqual({ state: 'claimed', emission_count: 0, last_emitted_at: null })
    db.close()
  })

  it('Sol 6: engines and the launching runtime reject 23.0 but accept 23.4', async () => {
    const manifest = JSON.parse(
      await readFile(new URL('../../package.json', import.meta.url), 'utf8'),
    ) as {
      engines: { node: string }
    }
    expect(manifest.engines.node).toBe('^22.13.0 || >=23.4.0')
    const preload = join(root, 'runtime.mjs')
    await writeFile(
      preload,
      `Object.defineProperty(process.versions, 'node', { value: '23.0.0' })\n`,
    )
    const rejected = await runChild([CLI, 'recv', '--for', 'b'], preload)
    expect(rejected.code).toBe(1)
    expect(rejected.stderr).toContain('^22.13.0 || >=23.4.0')

    await writeFile(
      preload,
      `Object.defineProperty(process.versions, 'node', { value: '23.4.0' })\n`,
    )
    const accepted = await runChild([CLI, 'recv', '--for', 'b'], preload)
    expect(accepted.code).toBe(0)

    const { supportsSqliteRuntime } = await import('../runtime.js')
    expect([
      supportsSqliteRuntime('22.12.0'),
      supportsSqliteRuntime('22.13.0'),
      supportsSqliteRuntime('23.0.0'),
      supportsSqliteRuntime('23.3.0'),
      supportsSqliteRuntime('23.4.0'),
      supportsSqliteRuntime('24.0.0'),
    ]).toEqual([false, true, false, false, true, true])

    const library = fileURLToPath(new URL('../../dist/index.js', import.meta.url))
    await writeFile(
      preload,
      `Object.defineProperty(process.versions, 'node', { value: '23.0.0' })\n`,
    )
    const libraryRejected = await runChild(
      ['--input-type=module', '-e', `await import(${JSON.stringify(library)})`],
      preload,
    )
    expect(libraryRejected.code).toBe(1)
    expect(libraryRejected.stderr).toContain('^22.13.0 || >=23.4.0')
  })
})
