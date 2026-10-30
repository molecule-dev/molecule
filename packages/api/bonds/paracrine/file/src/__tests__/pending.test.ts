import { mkdir, mkdtemp, readdir, readFile, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

import { afterEach, beforeEach, describe, expect, it } from 'vitest'

import { createProvider } from '../provider.js'

let root: string

beforeEach(async () => {
  root = await mkdtemp(join(tmpdir(), 'paracrine-pending-test-'))
})

afterEach(async () => {
  await rm(root, { recursive: true, force: true })
})

describe('pending file index', () => {
  it('indexes direct mail, removes it on ack, and preserves reads', async () => {
    const store = createProvider({ rootDir: root })
    const sent = await store.send({ from: 'a', to: 'b', body: 'question' })
    expect(await store.pending('b')).toEqual([sent.id + '.json'])
    const pointer = JSON.parse(
      await readFile(join(root, 'pending', 'b', sent.id + '.json'), 'utf8'),
    )
    expect(pointer).toEqual({ id: sent.id, to: 'b', sentAt: sent.sentAt })
    expect(Number.parseInt(sent.id.split('-')[0]!, 36)).toBe(Date.parse(sent.sentAt))

    await store.ack(sent.id, 'b')
    expect(await store.pending('b')).toEqual([])
    expect((await store.reads(sent.id)).map((receipt) => receipt.by)).toEqual(['b'])
  })

  it('fans a broadcast out only to existing mailboxes and delivers it once per reader', async () => {
    const store = createProvider({ rootDir: root })
    expect(await store.pending('b')).toEqual([])
    expect(await store.pending('c')).toEqual([])
    const sent = await store.send({ from: 'a', to: '*', body: 'freeze lifted' })

    expect(await store.pending('b')).toEqual([sent.id + '.json'])
    expect(await store.pending('c')).toEqual([sent.id + '.json'])
    expect(await store.pending('b')).toEqual([sent.id + '.json'])
    expect(await readdir(join(root, 'pending'))).toEqual(['b', 'c'])
    await store.ack(sent.id, 'b.delivered')
    expect(
      (await store.receive({ for: 'b', unreadOnly: true })).map((message) => message.id),
    ).toEqual([sent.id])
    expect(await store.pending('b')).toEqual([])
    expect(await store.pending('c')).toEqual([sent.id + '.json'])
  })

  it('backfills pre-upgrade direct and broadcast mail exactly when it has no receipt', async () => {
    const store = createProvider({ rootDir: root })
    const sentAt = new Date().toISOString()
    const direct = {
      id: 'pre-upgrade-direct',
      from: 'a',
      to: 'b',
      body: 'old direct',
      sentAt,
    }
    const broadcast = { ...direct, id: 'pre-upgrade-broadcast', to: '*', body: 'old broadcast' }
    const answered = { ...direct, id: 'pre-upgrade-answered', body: 'answered' }
    for (const message of [direct, broadcast, answered]) {
      const dir = join(root, 'messages', message.to)
      await mkdir(dir, { recursive: true })
      await writeFile(join(dir, message.id + '.json'), JSON.stringify(message))
    }
    const receiptDir = join(root, 'reads', answered.id)
    await mkdir(receiptDir, { recursive: true })
    await writeFile(join(receiptDir, 'b.delivered.json'), '{}')

    expect((await store.pending('b')).sort()).toEqual([
      'pre-upgrade-broadcast.json',
      'pre-upgrade-direct.json',
    ])
    expect((await store.pending('b')).sort()).toEqual([
      'pre-upgrade-broadcast.json',
      'pre-upgrade-direct.json',
    ])
  })

  it('receive registers a mailbox for later broadcast fan-out', async () => {
    const store = createProvider({ rootDir: root })
    expect(await store.receive({ for: 'b' })).toEqual([])
    const sent = await store.send({ from: 'a', to: '*', body: 'joined already' })
    expect(await store.pending('b')).toEqual([sent.id + '.json'])
  })

  it('purge removes pending, claimed, and rejected pointers for pruned messages', async () => {
    const store = createProvider({ rootDir: root })
    const sent = await store.send({ from: 'a', to: 'b', body: 'old' })
    const pending = join(root, 'pending', 'b')
    await mkdir(join(pending, '.claimed'), { recursive: true })
    await mkdir(join(pending, '.rejected'), { recursive: true })
    await writeFile(join(pending, '.claimed', sent.id + '.json'), '{}')
    await writeFile(join(pending, '.rejected', sent.id + '.json'), '{}')

    expect(await store.purge({ before: new Date(Date.now() + 1000).toISOString() })).toBe(1)
    expect(await store.pending('b')).toEqual([])
    expect(await readdir(join(pending, '.claimed'))).toEqual([])
    expect(await readdir(join(pending, '.rejected'))).toEqual([])
  })

  it('refuses path-shaped pending recipients', async () => {
    const store = createProvider({ rootDir: root })
    await expect(store.pending('../other')).rejects.toThrow(/Invalid paracrine mailbox id/)
  })
})
