/**
 * Proves the module-level `@example` in `src/index.ts` (rendered as the README
 * Quick Start) works as written: the DataStore and raw pool are bonded through
 * the real `setStore`/`setPool`, with only the postgresql driver replaced by
 * in-test doubles, and the router is driven over HTTP behind a fixed session.
 *
 * @module
 */
const { fakeStore, fakePool } = vi.hoisted(() => ({
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
  fakePool: {
    query: vi.fn(),
    connect: vi.fn(),
    end: vi.fn(),
  },
}))

vi.mock('@molecule/api-database-postgresql', () => ({ store: fakeStore, pool: fakePool }))

import type { Server } from 'node:http'
import type { AddressInfo } from 'node:net'

import express from 'express'
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'

import { setPool, setStore } from '@molecule/api-database'
import { pool, store } from '@molecule/api-database-postgresql'

import { computeStreak, createEntryForOwner, createJournalEntryRouter } from '../index.js'

setPool(pool)
setStore(store)
const app = express()
app.use(express.json())
// Stand-in for the app's global auth middleware, which sets the session.
app.use((_req, res, next) => {
  res.locals.session = { userId: 'user-123' }
  next()
})
app.use('/api/journal', createJournalEntryRouter())

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
  vi.clearAllMocks()
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
  fakeStore.findMany.mockImplementation(async (name: string) => [...table(name).values()])
  // Raw SQL: the same-day mood lookup finds nothing; the streak sees today's entry.
  fakePool.query.mockImplementation(async (text: string) =>
    text.includes('to_char')
      ? { rows: [{ day: new Date().toISOString().slice(0, 10) }], rowCount: 1 }
      : { rows: [], rowCount: 0 },
  )
})

describe('README @example', () => {
  it('creates an entry with a linked mood and counts the streak', async () => {
    const userId = 'user-123'
    const entry = await createEntryForOwner(userId, {
      title: 'Morning pages',
      body: 'Slept well and went for a run before work.',
      mood: 'good',
      tags: ['sleep', 'exercise'],
    })

    expect(entry?.mood).toBe('good')
    expect(entry?.word_count).toBe(9)
    expect(entry?.tags).toEqual(['sleep', 'exercise'])
    expect(fakeStore.create).toHaveBeenCalledWith(
      'mood_entries',
      expect.objectContaining({ user_id: 'user-123', score: 4, label: 'good' }),
    )
    expect(await computeStreak(userId)).toBe(1)
  })

  it('serves the same create through POST /api/journal/entries and lists it', async () => {
    const response = await fetch(`${baseUrl}/api/journal/entries`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ title: 'Morning pages', body: 'Slept well.', mood: 'good' }),
    })
    expect(response.status).toBe(201)
    expect(await response.json()).toMatchObject({ title: 'Morning pages', mood: 'good' })

    const list = await fetch(`${baseUrl}/api/journal/entries`)
    const entries = (await list.json()) as { title: string }[]
    expect(Array.isArray(entries)).toBe(true)
    expect(entries.map((e) => e.title)).toEqual(['Morning pages'])
  })
})
