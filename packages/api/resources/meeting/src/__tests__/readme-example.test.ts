/**
 * Proves the module-level `@example` in `src/index.ts` (rendered as the README
 * Quick Start) works as written: the DataStore is bonded through the real
 * `setStore`, with only the postgresql driver replaced by an in-test store, and
 * the router is driven over HTTP behind a fixed session.
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

import { setStore } from '@molecule/api-database'
import { store } from '@molecule/api-database-postgresql'

import {
  createActionItem,
  createMeetingForOwner,
  createMeetingRouter,
  updateMeetingForOwner,
} from '../index.js'

setStore(store)
const app = express()
app.use(express.json())
// Stand-in for the app's global auth middleware, which sets the session.
app.use((_req, res, next) => {
  res.locals.session = { userId: 'user-123' }
  next()
})
app.use('/meetings', createMeetingRouter())

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
  fakeStore.updateById.mockImplementation(
    async (name: string, id: string, data: Record<string, unknown>) => {
      const row = { ...table(name).get(id), ...data }
      table(name).set(id, row)
      return { data: row, affected: 1 }
    },
  )
})

describe('README @example', () => {
  it('schedules a meeting, adds an action item and derives the duration in seconds', async () => {
    const userId = 'user-123'
    const meeting = await createMeetingForOwner(userId, {
      title: 'Sprint planning',
      scheduled_at: '2026-08-01T10:00:00Z',
      attendees: [{ name: 'Ada', email: 'ada@example.com' }],
    })
    const item = await createActionItem(meeting.id, userId, { description: 'Send recap' })
    const done = await updateMeetingForOwner(meeting.id, userId, {
      status: 'completed',
      started_at: '2026-08-01T10:00:00Z',
      ended_at: '2026-08-01T10:45:00Z',
    })

    expect(meeting.status).toBe('scheduled')
    expect(item?.is_completed).toBe(false)
    expect(done?.status).toBe('completed')
    expect(done?.duration_seconds).toBe(2700)
    expect(await createActionItem(meeting.id, 'someone-else', { description: 'x' })).toBeNull()
  })

  it('creates an unscheduled meeting as completed through POST /meetings', async () => {
    const response = await fetch(`${baseUrl}/meetings`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ title: 'Hallway chat' }),
    })

    expect(response.status).toBe(201)
    expect(await response.json()).toMatchObject({ owner_id: 'user-123', status: 'completed' })
  })
})
