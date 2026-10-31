import { spawn } from 'node:child_process'
import { existsSync } from 'node:fs'
import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { DatabaseSync } from 'node:sqlite'
import { fileURLToPath } from 'node:url'

import { afterEach, beforeEach, describe, expect, it } from 'vitest'

import { createProvider } from '../provider.js'

const SEND_CHILD = fileURLToPath(new URL('./fixtures/send-child.mjs', import.meta.url))
const CLAIM_CHILD = fileURLToPath(new URL('./fixtures/claim-child.mjs', import.meta.url))

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

const faultPreload = async (root: string, kind: 'delivery' | 'migration'): Promise<string> => {
  const path = join(root, `fault-${kind}.mjs`)
  await writeFile(
    path,
    `import { DatabaseSync } from 'node:sqlite'
let migrationDirty = false
const prepare = DatabaseSync.prototype.prepare
DatabaseSync.prototype.prepare = function (sql, ...args) {
  const statement = prepare.call(this, sql, ...args)
  const run = statement.run.bind(statement)
  statement.run = (...parameters) => {
    const result = run(...parameters)
    if (${JSON.stringify(kind)} === 'delivery' && sql.startsWith('INSERT INTO deliveries'))
      process.kill(process.pid, 'SIGKILL')
    if (sql.startsWith('INSERT INTO migration')) migrationDirty = true
    return result
  }
  return statement
}
const exec = DatabaseSync.prototype.exec
DatabaseSync.prototype.exec = function (sql, ...args) {
  const result = exec.call(this, sql, ...args)
  if (${JSON.stringify(kind)} === 'migration' && migrationDirty && sql.trim() === 'COMMIT')
    process.kill(process.pid, 'SIGKILL')
  return result
}
`,
  )
  return path
}

const claimInProcess = (root: string, output: string, preload?: string) =>
  runChild([CLAIM_CHILD, root, 'b', output], preload)

let root: string

beforeEach(async () => {
  root = await mkdtemp(join(tmpdir(), 'paracrine-sqlite-test-'))
})

afterEach(async () => {
  await rm(root, { recursive: true, force: true })
})

describe('transactional delivery regressions', () => {
  it('Sol 1: SIGKILL between message/delivery statements rolls back direct mail and broadcast fan-out', async () => {
    const initial = createProvider({ rootDir: root })
    for (const recipient of ['b', 'c', 'd']) await initial.pending(recipient)
    initial.close()
    const preload = await faultPreload(root, 'delivery')

    const direct = await runChild([SEND_CHILD, root, 'a', 'b', 'direct'], preload)
    expect(direct.signal).toBe('SIGKILL')
    let store = createProvider({ rootDir: root })
    expect(await store.pending('b')).toEqual([])
    expect(await store.receive({ for: 'b' })).toEqual([])
    store.close()

    const broadcast = await runChild([SEND_CHILD, root, 'a', '*', 'broadcast'], preload)
    expect(broadcast.signal).toBe('SIGKILL')
    store = createProvider({ rootDir: root })
    for (const recipient of ['b', 'c', 'd']) {
      expect(await store.pending(recipient)).toEqual([])
      expect(await store.receive({ for: recipient })).toEqual([])
    }
    store.close()
  })

  it('Sol 4: concurrent processes claim healthy mail once and never quarantine it', async () => {
    const store = createProvider({ rootDir: root })
    const sent = await store.send({ from: 'a', to: 'b', body: 'healthy' })
    store.close()
    const outputs = [join(root, 'claim-a.json'), join(root, 'claim-b.json')]
    const runs = await Promise.all(outputs.map((output) => claimInProcess(root, output)))
    for (const run of runs) expect(run.code).toBe(0)
    const claimed = await Promise.all(
      outputs.map(async (output) => JSON.parse(await readFile(output, 'utf8'))),
    )
    expect(claimed.flatMap((result) => result.claims)).toHaveLength(1)
    expect(claimed.flatMap((result) => result.claims)[0].message.id).toBe(sent.id)
    expect(existsSync(join(root, 'pending', 'b', '.rejected'))).toBe(false)
  })

  it('Sol 5: a 10,000-message backlog claims within one second and advances', async () => {
    const initial = createProvider({ rootDir: root })
    initial.close()
    const db = new DatabaseSync(join(root, 'paracrine.sqlite'))
    db.exec('BEGIN IMMEDIATE')
    const message = db.prepare(
      `INSERT INTO messages(id, sender, recipient, body, sent_at, sent_ms)
       VALUES(?, 'a', 'b', ?, ?, ?)`,
    )
    const delivery = db.prepare(
      "INSERT INTO deliveries(message_id, recipient, state) VALUES(?, 'b', 'pending')",
    )
    const sentAt = new Date().toISOString()
    const sentMs = Date.parse(sentAt)
    for (let index = 0; index < 10_000; index += 1) {
      const id = `backlog-${String(index).padStart(5, '0')}`
      message.run(id, `body-${index}`, sentAt, sentMs + index)
      delivery.run(id)
    }
    db.exec('COMMIT')
    db.close()

    const store = createProvider({ rootDir: root })
    const started = performance.now()
    const first = await store.claimPending('b', { limit: 5 })
    const elapsed = performance.now() - started
    expect(elapsed).toBeLessThan(1000)
    expect(first.claims).toHaveLength(5)
    expect(first.hidden).toBe(9995)
    await store.acknowledgeClaims(first.claims, 'b.delivered')
    const second = await store.claimPending('b', { limit: 5 })
    expect(second.claims.map((claim) => claim.message.id)).not.toEqual(
      first.claims.map((claim) => claim.message.id),
    )
    store.close()
  }, 15_000)

  it('Sol 5: a killed migration resumes from its committed checkpoint', async () => {
    const mailbox = join(root, 'messages', 'b')
    await mkdir(mailbox, { recursive: true })
    for (let index = 0; index < 130; index += 1) {
      const id = `legacy-${String(index).padStart(3, '0')}`
      await writeFile(
        join(mailbox, `${id}.json`),
        JSON.stringify({ id, from: 'a', to: 'b', body: id, sentAt: new Date().toISOString() }),
      )
    }
    const preload = await faultPreload(root, 'migration')
    const killed = await claimInProcess(root, join(root, 'interrupted.json'), preload)
    expect(killed.signal).toBe('SIGKILL')

    const db = new DatabaseSync(join(root, 'paracrine.sqlite'))
    const progress = db.prepare("SELECT value FROM migration WHERE key = 'legacy'").get() as {
      value: string
    }
    db.close()
    expect(JSON.parse(progress.value).fileAfter).toBe('legacy-063.json')

    const store = createProvider({ rootDir: root })
    const pending = await store.pending('b')
    expect(pending).toHaveLength(130)
    expect(pending[0]).toBe('legacy-000.json')
    expect(pending.at(-1)).toBe('legacy-129.json')
    store.close()
  })

  it('Sol 6: two recoverers cannot take a replacement claim and stale tokens cannot settle it', async () => {
    const store = createProvider({ rootDir: root })
    const sent = await store.send({ from: 'a', to: 'b', body: 'one owner' })
    const original = (await store.claimPending('b')).claims[0]!
    store.close()
    const db = new DatabaseSync(join(root, 'paracrine.sqlite'))
    db.prepare('UPDATE deliveries SET claimed_at = 1 WHERE message_id = ?').run(sent.id)
    db.close()

    const outputs = [join(root, 'recover-a.json'), join(root, 'recover-b.json')]
    const runs = await Promise.all(outputs.map((output) => claimInProcess(root, output)))
    for (const run of runs) expect(run.code).toBe(0)
    const recovered = (
      await Promise.all(outputs.map(async (output) => JSON.parse(await readFile(output, 'utf8'))))
    ).flatMap((result) => result.claims)
    expect(recovered).toHaveLength(1)
    expect(recovered[0].claimToken).not.toBe(original.claimToken)

    const reopened = createProvider({ rootDir: root })
    await reopened.releaseClaims([
      {
        messageId: sent.id,
        recipientId: 'b',
        claimToken: original.claimToken,
      },
    ])
    await reopened.acknowledgeClaims(
      [
        {
          messageId: sent.id,
          recipientId: 'b',
          claimToken: original.claimToken,
        },
      ],
      'b.delivered',
    )
    expect(await reopened.pending('b')).toEqual([])
    expect((await reopened.claimPending('b')).claims).toEqual([])
    await reopened.acknowledgeClaims(recovered, 'b.delivered')
    expect((await reopened.reads(sent.id)).map((read) => read.by)).toEqual(['b.delivered'])
    reopened.close()
  })

  it('Sol 7: first-send claim/receipt cannot be recreated by later initialization', async () => {
    const store = createProvider({ rootDir: root })
    const sent = await store.send({ from: 'a', to: 'b', body: 'exactly once' })
    const claimed = await store.claimPending('b')
    await store.acknowledgeClaims(claimed.claims, 'b.delivered')
    expect(await store.pending('b')).toEqual([])
    store.close()

    const resumed = createProvider({ rootDir: root })
    expect(await resumed.pending('b')).toEqual([])
    expect((await resumed.receive({ for: 'b' })).map((message) => message.id)).toEqual([sent.id])
    expect((await resumed.reads(sent.id)).map((read) => read.by)).toEqual(['b.delivered'])
    resumed.close()
  })
})
