/**
 * Proves the module-level `@example` in `src/index.ts` (rendered as the README
 * Quick Start) works as written: the handlers are mounted on a real Express
 * router and driven over HTTP, and the service calls run against the bonded
 * DataStore. Only the postgresql driver is replaced by an in-test store, and the
 * app's global auth middleware by a session chosen per request.
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
  getOrCreateThread,
  getTotalUnreadCount,
  markRead,
  requestHandlerMap as Message,
  sendMessage,
} from '../index.js'

setStore(store)

const router = express.Router()
router.post('/message-threads', Message.createThread)
router.get('/message-threads', Message.listThreads)
router.get('/message-threads/unread-count', Message.unreadCount)
router.get('/message-threads/:threadId', Message.readThread)
router.get('/message-threads/:threadId/messages', Message.listMessages)
router.post('/message-threads/:threadId/messages', Message.sendMessage)
router.post('/message-threads/:threadId/read', Message.markRead)
router.patch('/message-threads/messages/:messageId', Message.editMessage)
router.delete('/message-threads/messages/:messageId', Message.deleteMessage)

const app = express()
app.use(express.json())
// Stand-in for the app's global auth middleware: `x-test-user` picks the session user.
app.use((req, res, next) => {
  res.locals.session = { userId: req.header('x-test-user') ?? 'user-alice' }
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

/** In-test tables keyed by table name then id. */
let tables: Map<string, Map<string, Record<string, unknown>>>

/**
 * Returns (creating on first use) the in-test table with the given name.
 *
 * @param name - Table name.
 * @returns The table's rows keyed by id.
 */
function table(name: string): Map<string, Record<string, unknown>> {
  const existing = tables.get(name)
  if (existing) return existing
  const created = new Map<string, Record<string, unknown>>()
  tables.set(name, created)
  return created
}

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
  tables = new Map()
  fakeStore.create.mockImplementation(async (name: string, data: Record<string, unknown>) => {
    const row = { id: `${name}-${table(name).size + 1}`, ...data }
    table(name).set(row.id, row)
    return { data: row, affected: 1 }
  })
  fakeStore.findById.mockImplementation(
    async (name: string, id: string) => table(name).get(id) ?? null,
  )
  fakeStore.findOne.mockImplementation(
    async (name: string, where: WhereCondition[]) =>
      [...table(name).values()].find((row) => matches(row, where)) ?? null,
  )
  fakeStore.findMany.mockImplementation(
    async (name: string, options?: { where?: WhereCondition[] }) =>
      [...table(name).values()].filter((row) => matches(row, options?.where)),
  )
  fakeStore.updateById.mockImplementation(
    async (name: string, id: string, data: Record<string, unknown>) => {
      const row = { ...table(name).get(id), ...data }
      table(name).set(id, row)
      return { data: row, affected: 1 }
    },
  )
})

describe('README @example', () => {
  it('opens one canonical thread, counts the unread DM and clears it on read', async () => {
    const thread = await getOrCreateThread('user-alice', 'user-bob')
    expect((await getOrCreateThread('user-bob', 'user-alice')).id).toBe(thread.id)

    await sendMessage(thread.id, 'user-alice', 'Your order has shipped!')
    expect(await getTotalUnreadCount('user-bob')).toBe(1)
    expect(await getTotalUnreadCount('user-alice')).toBe(0)

    await markRead(thread.id, 'user-bob')
    expect(await getTotalUnreadCount('user-bob')).toBe(0)

    await expect(sendMessage(thread.id, 'user-mallory', 'hi')).rejects.toThrow(/participant/)
  })

  it('serves the same flow over the mounted routes', async () => {
    const created = await fetch(`${baseUrl}/message-threads`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ participantId: 'user-bob' }),
    })
    expect(created.status).toBe(201)
    const thread = (await created.json()) as { id: string }

    const sent = await fetch(`${baseUrl}/message-threads/${thread.id}/messages`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ body: 'Your order has shipped!' }),
    })
    expect(sent.status).toBe(201)
    expect(await sent.json()).toMatchObject({ senderId: 'user-alice' })

    const unread = await fetch(`${baseUrl}/message-threads/unread-count`, {
      headers: { 'x-test-user': 'user-bob' },
    })
    expect(await unread.json()).toEqual({ unreadCount: 1 })

    const outsider = await fetch(`${baseUrl}/message-threads/${thread.id}/messages`, {
      headers: { 'x-test-user': 'user-mallory' },
    })
    expect(outsider.status).toBe(403)
  })
})
