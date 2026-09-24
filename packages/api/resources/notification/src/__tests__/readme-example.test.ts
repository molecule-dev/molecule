/**
 * Proves the module-level `@example` in `src/index.ts` (rendered as the README
 * Quick Start) works as written: the real database notification-center
 * provider is bonded over the real `setStore`, the handlers are mounted on an
 * Express router and driven over HTTP. Only the postgresql driver is replaced by
 * an in-test store, and the global auth middleware by a fixed session.
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
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest'

import { setStore, type WhereCondition } from '@molecule/api-database'
import { store } from '@molecule/api-database-postgresql'
import { send, setProvider } from '@molecule/api-notification-center'
import { createProvider } from '@molecule/api-notification-center-database'

import { requestHandlerMap as Notification } from '../index.js'

/** In-test `notifications` table keyed by id. */
const rows = new Map<string, Record<string, unknown>>()

/**
 * Evaluates the equality conditions the provider issues against a row.
 *
 * @param row - The stored row.
 * @param where - The conditions.
 * @returns Whether every condition holds.
 */
function matches(row: Record<string, unknown>, where: WhereCondition[] = []): boolean {
  return where.every((w) => row[w.field] === w.value)
}

fakeStore.create.mockImplementation(async (_table: string, data: Record<string, unknown>) => {
  rows.set(String(data.id), data)
  return { data, affected: 1 }
})
fakeStore.findMany.mockImplementation(
  async (_table: string, options?: { where?: WhereCondition[] }) =>
    [...rows.values()].filter((row) => matches(row, options?.where)),
)
fakeStore.count.mockImplementation(
  async (_table: string, where?: WhereCondition[]) =>
    [...rows.values()].filter((row) => matches(row, where)).length,
)
fakeStore.updateMany.mockImplementation(
  async (_table: string, where: WhereCondition[], data: Record<string, unknown>) => {
    const hits = [...rows.values()].filter((row) => matches(row, where))
    for (const row of hits) rows.set(String(row.id), { ...row, ...data })
    return { data: null, affected: hits.length }
  },
)

setStore(store)
setProvider(createProvider())

const router = express.Router()
router.get('/notifications', Notification.list)
router.get('/notifications/unread-count', Notification.unreadCount)
router.get('/notifications/preferences', Notification.getPreferences)
router.post('/notifications/:id/read', Notification.markRead)
router.post('/notifications/read-all', Notification.markAllRead)
router.put('/notifications/preferences', Notification.updatePreferences)
router.delete('/notifications/:id', Notification.del)

const app = express()
app.use(express.json())
// Stand-in for the app's global auth middleware: `x-test-user` picks the session user.
app.use((req, res, next) => {
  res.locals.session = { userId: req.header('x-test-user') ?? 'user-123' }
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

describe('README @example', () => {
  it('lists a notification created via the core, counts it unread and marks it read', async () => {
    const created = await send('user-123', {
      type: 'order',
      title: 'Order shipped',
      body: 'Order #1042 is on its way.',
    })

    const list = await fetch(`${baseUrl}/notifications`)
    expect(await list.json()).toMatchObject({
      items: [{ id: created.id, title: 'Order shipped', read: false }],
      total: 1,
      offset: 0,
      limit: 50,
    })

    expect(await (await fetch(`${baseUrl}/notifications/unread-count`)).json()).toEqual({
      count: 1,
    })

    const stranger = await fetch(`${baseUrl}/notifications/${created.id}/read`, {
      method: 'POST',
      headers: { 'x-test-user': 'someone-else' },
    })
    expect(stranger.status).toBe(404)

    const read = await fetch(`${baseUrl}/notifications/${created.id}/read`, { method: 'POST' })
    expect(read.status).toBe(204)
    expect(await (await fetch(`${baseUrl}/notifications/unread-count`)).json()).toEqual({
      count: 0,
    })
  })
})
