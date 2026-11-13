import { mkdtemp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

import { afterEach, beforeEach, expect, it, vi } from 'vitest'

import { createProvider } from '../provider.js'

let root: string

beforeEach(async () => {
  root = await mkdtemp(join(tmpdir(), 'paracrine-send-order-'))
})

afterEach(async () => {
  vi.restoreAllMocks()
  await rm(root, { recursive: true, force: true })
})

it('keeps send order for messages sent in the same millisecond', async () => {
  vi.spyOn(Date, 'now').mockReturnValue(Date.parse('2026-11-13T02:00:00.000Z'))
  const store = createProvider({ rootDir: root })
  const sent: string[] = []
  for (let index = 0; index < 40; index += 1) {
    const to = index % 3 === 0 ? '*' : 'b'
    sent.push((await store.send({ from: 'a', to, body: `same-ms ${index}` })).id)
  }
  expect((await store.receive({ for: 'b' })).map((message) => message.id)).toEqual(sent)
  // Direct mail is claimed before broadcasts; each group keeps its own send order.
  const direct = sent.filter((_id, index) => index % 3 !== 0)
  const claimed = await store.claimPending('b', { limit: 20 })
  expect(claimed.claims.map((claim) => claim.messageId)).toEqual(direct.slice(0, 20))
  store.close()
})

it('keeps send order across two handles on one store, as two processes would share it', async () => {
  vi.spyOn(Date, 'now').mockReturnValue(Date.parse('2026-11-13T02:00:00.000Z'))
  const first = createProvider({ rootDir: root })
  const second = createProvider({ rootDir: root })
  const sent: string[] = []
  for (let index = 0; index < 20; index += 1) {
    const store = index % 2 === 0 ? first : second
    sent.push((await store.send({ from: 'a', to: 'b', body: `handle ${index}` })).id)
  }
  expect((await first.receive({ for: 'b' })).map((message) => message.id)).toEqual(sent)
  expect((await second.receive({ for: 'b' })).map((message) => message.id)).toEqual(sent)
  first.close()
  second.close()
})

it('counterexample: sentAt still decides order when a later send carries an earlier time', async () => {
  const now = vi.spyOn(Date, 'now')
  const store = createProvider({ rootDir: root })
  now.mockReturnValue(Date.parse('2026-11-13T02:00:00.005Z'))
  const later = await store.send({ from: 'a', to: 'b', body: 'stamped later' })
  now.mockReturnValue(Date.parse('2026-11-13T02:00:00.001Z'))
  const earlier = await store.send({ from: 'a', to: 'b', body: 'stamped earlier' })
  expect((await store.receive({ for: 'b' })).map((message) => message.id)).toEqual([
    earlier.id,
    later.id,
  ])
  store.close()
})
