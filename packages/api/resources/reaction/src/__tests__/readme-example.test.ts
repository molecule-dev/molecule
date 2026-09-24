/**
 * Proves the module-level `@example` in `src/index.ts` (rendered as the README
 * Quick Start) works as written: the DataStore is bonded through the real
 * `setStore`, with only the postgresql driver replaced by an in-test store, and
 * the handlers are mounted on an Express router behind a session chosen per
 * request (`x-test-user: anon` means no session).
 *
 * @module
 */
const { fakeStore } = vi.hoisted(() => ({
  fakeStore: {
    findById: vi.fn(),
    findOne: vi.fn(),
    findMany: vi.fn(),
    count: vi.fn(),
    create: vi.fn(),
    updateById: vi.fn(),
    updateMany: vi.fn(),
    deleteById: vi.fn(),
    deleteMany: vi.fn(),
  },
}))

vi.mock('@molecule/api-database-postgresql', () => ({ store: fakeStore }))

import type { Server } from 'node:http'
import type { AddressInfo } from 'node:net'

import express from 'express'
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'

import { setStore, type WhereCondition } from '@molecule/api-database'
import { store } from '@molecule/api-database-postgresql'

import {
  addReaction,
  getReactionSummary,
  removeReaction,
  requestHandlerMap as Reaction,
} from '../index.js'

setStore(store)

const router = express.Router()
router.post('/:resourceType/:resourceId/reactions', Reaction.create)
router.delete('/:resourceType/:resourceId/reactions', Reaction.del)
router.get('/:resourceType/:resourceId/reactions', Reaction.list)

const app = express()
app.use(express.json())
// Stand-in for the app's global auth middleware.
app.use((req, res, next) => {
  const user = req.header('x-test-user') ?? 'user-123'
  if (user !== 'anon') res.locals.session = { userId: user }
  next()
})
app.use(router)

let baseUrl = ''
let server: Server

beforeAll(async () => {
  await new Promise<void>((resolve) => {
    server = app.listen(0, '127.0.0.1', () => resolve())
  })
  baseUrl = `http://127.0.0.1:${(server.address() as AddressInfo).port}`
})

afterAll(async () => {
  await new Promise<void>((resolve, reject) =>
    server.close((error) => (error ? reject(error) : resolve())),
  )
})

/** In-test `reactions` rows. */
let rows: Record<string, unknown>[]

/**
 * Evaluates the equality conditions the service issues against a row.
 *
 * @param row - The stored row.
 * @param where - The conditions.
 * @returns Whether every condition holds.
 */
function matches(row: Record<string, unknown>, where: WhereCondition[] = []): boolean {
  return where.every((w) => row[w.field] === w.value)
}

beforeEach(() => {
  rows = []
  fakeStore.findOne.mockImplementation(
    async (_table: string, where: WhereCondition[]) =>
      rows.find((row) => matches(row, where)) ?? null,
  )
  fakeStore.findMany.mockImplementation(
    async (_table: string, options?: { where?: WhereCondition[] }) =>
      rows.filter((row) => matches(row, options?.where)),
  )
  fakeStore.count.mockImplementation(
    async (_table: string, where?: WhereCondition[]) =>
      rows.filter((row) => matches(row, where)).length,
  )
  fakeStore.create.mockImplementation(async (_table: string, data: Record<string, unknown>) => {
    const row = { id: `r-${rows.length + 1}`, ...data }
    rows.push(row)
    return { data: row, affected: 1 }
  })
  fakeStore.deleteMany.mockImplementation(async (_table: string, where: WhereCondition[]) => {
    const before = rows.length
    rows = rows.filter((row) => !matches(row, where))
    return { data: null, affected: before - rows.length }
  })
})

describe('README @example', () => {
  it('adds idempotently, allows several types, removes one and summarises', async () => {
    const userId = 'user-123'
    await addReaction('post', 'post-42', userId, 'like')
    await addReaction('post', 'post-42', userId, 'like')
    await addReaction('post', 'post-42', userId, 'love')
    expect(rows).toHaveLength(2)

    await removeReaction('post', 'post-42', userId, 'love')
    expect(await getReactionSummary('post', 'post-42', userId)).toEqual({
      total: 1,
      counts: { like: 1 },
      userReactions: ['like'],
    })
  })

  it('serves the same flow over HTTP; anonymous readers see counts but cannot react', async () => {
    const liked = await fetch(`${baseUrl}/post/post-42/reactions`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ type: 'like' }),
    })
    expect(liked.status).toBe(201)
    expect(await liked.json()).toMatchObject({ userId: 'user-123', type: 'like' })

    const anonPost = await fetch(`${baseUrl}/post/post-42/reactions`, {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'x-test-user': 'anon' },
      body: JSON.stringify({ type: 'like' }),
    })
    expect(anonPost.status).toBe(401)

    const summary = await fetch(`${baseUrl}/post/post-42/reactions`, {
      headers: { 'x-test-user': 'anon' },
    })
    expect(await summary.json()).toEqual({ total: 1, counts: { like: 1 }, userReactions: [] })
  })
})
