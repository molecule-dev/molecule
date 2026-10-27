/**
 * File-backed paracrine store tests.
 *
 * Every case runs against a real temporary directory — the whole point of the
 * store is that plain files ARE the truth, so the tests read and write the
 * same way any foreign process would.
 *
 * @module
 */

import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

import { afterEach, beforeEach, describe, expect, it } from 'vitest'

import { PARACRINE_BROADCAST } from '@molecule/api-paracrine'

import { createProvider } from '../provider.js'

let root: string

beforeEach(async () => {
  root = await mkdtemp(join(tmpdir(), 'paracrine-test-'))
})

afterEach(async () => {
  await rm(root, { recursive: true, force: true })
})

describe('send and receive', () => {
  it('delivers an addressed message to its recipient and to nobody else', async () => {
    const store = createProvider({ rootDir: root })
    const sent = await store.send({ from: 'a', to: 'b', body: 'may I delete the images?' })

    expect(sent.from).toBe('a')
    expect(sent.sentAt).toBeTruthy()
    expect((await store.receive({ for: 'b' })).map((m) => m.id)).toEqual([sent.id])
    expect(await store.receive({ for: 'c' })).toEqual([])
  })

  it('delivers a broadcast to every agent that checks', async () => {
    const store = createProvider({ rootDir: root })
    const sent = await store.send({ from: 'a', to: PARACRINE_BROADCAST, body: 'freeze lifted' })

    expect((await store.receive({ for: 'b' })).map((m) => m.id)).toEqual([sent.id])
    expect((await store.receive({ for: 'c' })).map((m) => m.id)).toEqual([sent.id])
  })

  it('keeps receive non-destructive: the same message reads back twice', async () => {
    const store = createProvider({ rootDir: root })
    await store.send({ from: 'a', to: 'b', body: 'once' })
    const first = await store.receive({ for: 'b' })
    const second = await store.receive({ for: 'b' })
    expect(second).toEqual(first)
  })

  it('orders by sentAt across mailboxes and broadcasts', async () => {
    const store = createProvider({ rootDir: root })
    const older = await store.send({ from: 'a', to: PARACRINE_BROADCAST, body: 'first' })
    const newer = await store.send({ from: 'a', to: 'b', body: 'second' })
    expect((await store.receive({ for: 'b' })).map((m) => m.body)).toEqual(['first', 'second'])
    expect(older.sentAt <= newer.sentAt).toBe(true)
  })
})

describe('ack and reads — a receipt is the only side effect of reading', () => {
  it('unreadOnly hides exactly what this reader acked, not what others did', async () => {
    const store = createProvider({ rootDir: root })
    const mine = await store.send({ from: 'a', to: 'b', body: 'q1' })
    await store.send({ from: 'a', to: 'b', body: 'q2' })
    await store.send({ from: 'a', to: 'c', body: 'not mine' })

    expect((await store.receive({ for: 'b', unreadOnly: true })).map((m) => m.body)).toEqual([
      'q1',
      'q2',
    ])
    await store.ack(mine.id, 'b')
    expect((await store.receive({ for: 'b', unreadOnly: true })).map((m) => m.body)).toEqual(['q2'])
    // Another reader's receipt changes nothing for b.
    await store.ack(mine.id, 'c')
    expect((await store.receive({ for: 'b', unreadOnly: true })).map((m) => m.body)).toEqual(['q2'])
  })

  it('reads reports who has seen a message, so a sender can wait for an answer', async () => {
    const store = createProvider({ rootDir: root })
    const sent = await store.send({
      from: 'a',
      to: 'bench-1',
      subject: 'images',
      body: 'ok to delete?',
    })
    expect(await store.reads(sent.id)).toEqual([])
    await store.ack(sent.id, 'bench-1')
    const reads = await store.reads(sent.id)
    expect(reads).toHaveLength(1)
    expect(reads[0]?.by).toBe('bench-1')
  })

  it('ack is idempotent: acking twice leaves one receipt', async () => {
    const store = createProvider({ rootDir: root })
    const sent = await store.send({ from: 'a', to: 'b', body: 'twice' })
    await store.ack(sent.id, 'b')
    await store.ack(sent.id, 'b')
    expect(await store.reads(sent.id)).toHaveLength(1)
  })
})

describe('untrusted ids are refused, not sanitized', () => {
  it('refuses a sender/recipient/reader id with path structure', async () => {
    const store = createProvider({ rootDir: root })
    await expect(store.send({ from: '../escape', to: 'b', body: 'x' })).rejects.toThrow(
      /Invalid paracrine sender id/,
    )
    await expect(store.send({ from: 'a', to: '../../etc', body: 'x' })).rejects.toThrow(
      /Invalid paracrine recipient id/,
    )
    await expect(store.receive({ for: 'b/../../../etc' })).rejects.toThrow(
      /Invalid paracrine mailbox id/,
    )
    const sent = await store.send({ from: 'a', to: 'b', body: 'x' })
    await expect(store.ack(sent.id, 'b?query=1')).rejects.toThrow(/Invalid paracrine reader id/)
  })

  it('refuses a message id with path structure at ack and reads', async () => {
    const store = createProvider({ rootDir: root })
    await expect(store.ack('../messages', 'b')).rejects.toThrow(/Invalid paracrine message id/)
    await expect(store.reads('../../root')).rejects.toThrow(/Invalid paracrine message id/)
  })
})

describe('query narrowing', () => {
  it('narrows by since and subject prefix', async () => {
    const store = createProvider({ rootDir: root })
    const first = await store.send({ from: 'a', to: 'b', subject: 'deploy: note', body: '1' })
    await new Promise((resolve) => setTimeout(resolve, 5))
    const second = await store.send({ from: 'a', to: 'b', subject: 'question', body: '2' })

    expect((await store.receive({ for: 'b', since: second.sentAt })).map((m) => m.id)).toEqual([
      second.id,
    ])
    expect((await store.receive({ for: 'b', subjectPrefix: 'deploy:' })).map((m) => m.id)).toEqual([
      first.id,
    ])
    await expect(store.receive({ for: 'b', since: 'not-a-date' })).rejects.toThrow(/since/)
  })
})

describe('concurrent writers never tear a message', () => {
  it('parallel sends all land whole', async () => {
    const store = createProvider({ rootDir: root })
    const senders = Array.from({ length: 24 }, (_, index) =>
      store.send({ from: `agent-${index}`, to: 'b', body: `message ${index}` }),
    )
    await Promise.all(senders)
    const received = await store.receive({ for: 'b' })
    expect(received).toHaveLength(24)
    // A whole message parses and carries its own body — the atomic-rename
    // write is what keeps that true under concurrency.
    expect(new Set(received.map((m) => m.body)).size).toBe(24)
  })
})

describe('a foreign or corrupt file is not a mailbox', () => {
  it('skips a corrupt message file and still reports the readable ones', async () => {
    const store = createProvider({ rootDir: root })
    const good = await store.send({ from: 'a', to: 'b', body: 'good' })
    const { mkdir } = await import('node:fs/promises')
    await mkdir(join(root, 'messages', 'b'), { recursive: true })
    await writeFile(join(root, 'messages', 'b', 'zz-corrupt.json'), '{not json', 'utf8')
    expect((await store.receive({ for: 'b' })).map((m) => m.id)).toEqual([good.id])
  })
})

describe('purge is retention, caller-owned', () => {
  it('removes only messages older than the bound and keeps receipts by default', async () => {
    const store = createProvider({ rootDir: root })
    const old = await store.send({ from: 'a', to: 'b', body: 'old' })
    await new Promise((resolve) => setTimeout(resolve, 10))
    const fresh = await store.send({ from: 'a', to: 'b', body: 'fresh' })
    await store.ack(old.id, 'b')

    const purged = await store.purge({
      before: new Date(Date.parse(fresh.sentAt) - 5).toISOString(),
    })
    expect(purged).toBe(1)
    expect((await store.receive({ for: 'b' })).map((m) => m.id)).toEqual([fresh.id])
    // Receipts survive the message unless the caller says otherwise. A
    // receipt rides along only with the message its own purge removes —
    // receipts of already-purged messages are the caller's to sweep.
    expect(await store.reads(old.id)).toHaveLength(1)
    await store.ack(fresh.id, 'b')
    expect(await store.purge({ before: new Date().toISOString(), includeReceipts: true })).toBe(1)
    expect(await store.receive({ for: 'b' })).toEqual([])
    expect(await store.reads(fresh.id)).toEqual([])
  })
})

describe('the store directory is plain files any process can read', () => {
  it('writes a message as one readable JSON file under the recipient', async () => {
    const store = createProvider({ rootDir: root })
    const sent = await store.send({ from: 'a', to: 'b', subject: 's', body: 'plain truth' })
    const raw = JSON.parse(await readFile(join(root, 'messages', 'b', `${sent.id}.json`), 'utf8'))
    expect(raw).toEqual(sent)
  })
})
