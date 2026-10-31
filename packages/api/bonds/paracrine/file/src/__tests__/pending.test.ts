import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

import { afterEach, beforeEach, describe, expect, it } from 'vitest'

import { createProvider } from '../provider.js'
import { waitForLegacyImport } from './test-helpers.js'

let root: string

beforeEach(async () => {
  root = await mkdtemp(join(tmpdir(), 'paracrine-pending-test-'))
})

afterEach(async () => {
  await rm(root, { recursive: true, force: true })
})

describe('pending delivery rows', () => {
  it('lists direct pending ids, acknowledges exactly one recipient, and preserves reads', async () => {
    const store = createProvider({ rootDir: root })
    const sent = await store.send({ from: 'a', to: 'b', body: 'question' })
    expect(await store.pending('b')).toEqual([sent.id + '.json'])
    await store.ack(sent.id, 'b')
    expect(await store.pending('b')).toEqual([])
    expect((await store.reads(sent.id)).map((receipt) => receipt.by)).toEqual(['b'])
  })

  it("Sol 3: b.delivered cannot acknowledge b's broadcast delivery", async () => {
    const store = createProvider({ rootDir: root })
    await store.pending('b')
    await store.pending('b.delivered')
    await store.pending('c')
    const sent = await store.send({ from: 'a', to: '*', body: 'freeze lifted' })
    await store.ack(sent.id, 'b.delivered')

    expect(await store.pending('b')).toEqual([sent.id + '.json'])
    expect(await store.pending('b.delivered')).toEqual([])
    expect(await store.pending('c')).toEqual([sent.id + '.json'])
  })

  it('Sol 2: imports legacy mail with a 1 ms filename/sentAt difference', async () => {
    const sentMs = Date.parse('2026-01-01T00:00:00.000Z')
    const direct = {
      id: `${sentMs.toString(36)}-01234567-89ab-cdef-8123-456789abcdef`,
      from: 'a',
      to: 'b',
      body: 'old direct',
      sentAt: new Date(sentMs + 1).toISOString(),
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

    const store = createProvider({ rootDir: root })
    await store.pending('b')
    await waitForLegacyImport(root)
    expect((await store.pending('b')).sort()).toEqual(
      ['pre-upgrade-answered.json', 'pre-upgrade-broadcast.json', `${direct.id}.json`].sort(),
    )
    expect(
      JSON.parse(await readFile(join(root, 'messages', 'b', `${direct.id}.json`), 'utf8')),
    ).toEqual(direct)
  })

  it('Sol 3: legacy broadcast receipts also keep b and b.delivered distinct', async () => {
    for (const recipient of ['b', 'b.delivered'])
      await mkdir(join(root, 'pending', recipient), { recursive: true })
    const message = {
      id: 'legacy-broadcast-receipt',
      from: 'a',
      to: '*',
      body: 'broadcast',
      sentAt: new Date().toISOString(),
    }
    await mkdir(join(root, 'messages', '*'), { recursive: true })
    await writeFile(join(root, 'messages', '*', `${message.id}.json`), JSON.stringify(message))
    await mkdir(join(root, 'reads', message.id), { recursive: true })
    await writeFile(join(root, 'reads', message.id, 'b.delivered.json'), '{}')

    const store = createProvider({ rootDir: root })
    await store.pending('b')
    await waitForLegacyImport(root)
    expect(await store.pending('b')).toEqual([`${message.id}.json`])
    expect(await store.pending('b.delivered')).toEqual([])
  })

  it('registers later readers for broadcasts idempotently', async () => {
    const store = createProvider({ rootDir: root })
    const before = await store.send({ from: 'a', to: '*', body: 'before join' })
    expect((await store.receive({ for: 'b' })).map((message) => message.id)).toEqual([before.id])
    const after = await store.send({ from: 'a', to: '*', body: 'after join' })
    expect(await store.pending('b')).toEqual([before.id + '.json', after.id + '.json'])
    expect(await store.pending('b')).toEqual([before.id + '.json', after.id + '.json'])
  })

  it('purge removes deliveries and optionally receipts without touching legacy files', async () => {
    const store = createProvider({ rootDir: root })
    const sent = await store.send({ from: 'a', to: 'b', body: 'old' })
    await store.ack(sent.id, 'b')
    expect(await store.purge({ before: new Date(Date.now() + 1000).toISOString() })).toBe(1)
    expect(await store.pending('b')).toEqual([])
    expect(await store.reads(sent.id)).toHaveLength(1)
  })

  it('refuses path-shaped pending recipients', async () => {
    const store = createProvider({ rootDir: root })
    await expect(store.pending('../other')).rejects.toThrow(/Invalid paracrine mailbox id/)
  })
})
