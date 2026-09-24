/**
 * Proves the module-level `@example` in `src/index.ts` (rendered as the README
 * Quick Start) works as written: the DataStore is bonded through the real
 * `setStore`, with only the postgresql driver replaced by an in-memory store.
 *
 * @module
 */
const { fakeStore, tables } = vi.hoisted(() => {
  type Row = Record<string, unknown>
  type Where = { field: string; operator: string; value?: unknown }
  const tables = new Map<string, Map<string, Row>>()
  const primaryKeys = new Map<string, string>()

  /**
   * Returns (creating on first use) an in-test table.
   *
   * @param name - Table name.
   * @returns The table's rows keyed by primary key.
   */
  const table = (name: string): Map<string, Row> => {
    const existing = tables.get(name)
    if (existing) return existing
    const created = new Map<string, Row>()
    tables.set(name, created)
    return created
  }

  /**
   * Evaluates the where-conditions the service issues against a row.
   *
   * @param row - The stored row.
   * @param where - The conditions.
   * @returns Whether every condition holds.
   */
  const matches = (row: Row, where: Where[] = []): boolean =>
    where.every((w) => {
      const v = row[w.field]
      switch (w.operator) {
        case '=':
          return v === w.value
        case '!=':
          return v !== w.value
        case 'in':
          return (w.value as unknown[]).includes(v)
        case 'not_in':
          return !(w.value as unknown[]).includes(v)
        case 'is_null':
          return v === null || v === undefined
        case 'is_not_null':
          return v !== null && v !== undefined
        case '>':
          return String(v) > String(w.value)
        case '<':
          return String(v) < String(w.value)
        case '>=':
          return String(v) >= String(w.value)
        case '<=':
          return String(v) <= String(w.value)
        case 'like':
        case 'ilike':
          return String(v).toLowerCase().includes(String(w.value).replace(/%/g, '').toLowerCase())
        default:
          throw new Error(`fake store: unsupported operator ${w.operator}`)
      }
    })

  const fakeStore = {
    findById: vi.fn(
      async (name: string, id: string | number) => table(name).get(String(id)) ?? null,
    ),
    findOne: vi.fn(
      async (name: string, where: Where[]) =>
        [...table(name).values()].find((row) => matches(row, where)) ?? null,
    ),
    findMany: vi.fn(
      async (
        name: string,
        options: {
          where?: Where[]
          orderBy?: { field: string; direction: 'asc' | 'desc' }[]
          limit?: number
          offset?: number
        } = {},
      ) => {
        let rows = [...table(name).values()].filter((row) => matches(row, options.where))
        for (const order of [...(options.orderBy ?? [])].reverse()) {
          rows = rows.sort((a, b) => {
            const cmp = String(a[order.field]).localeCompare(String(b[order.field]))
            return order.direction === 'desc' ? -cmp : cmp
          })
        }
        const offset = options.offset ?? 0
        return rows.slice(offset, options.limit === undefined ? undefined : offset + options.limit)
      },
    ),
    count: vi.fn(
      async (name: string, where?: Where[]) =>
        [...table(name).values()].filter((row) => matches(row, where)).length,
    ),
    create: vi.fn(async (name: string, data: Row) => {
      const key = primaryKeys.get(name) ?? 'id'
      const row: Row = { id: crypto.randomUUID(), ...data }
      table(name).set(String(row[key]), row)
      return { data: row, affected: 1 }
    }),
    updateById: vi.fn(async (name: string, id: string | number, data: Row) => {
      const current = table(name).get(String(id))
      if (!current) return { data: null, affected: 0 }
      const row = { ...current, ...data }
      table(name).set(String(id), row)
      return { data: row, affected: 1 }
    }),
    updateMany: vi.fn(async (name: string, where: Where[], data: Row) => {
      let affected = 0
      for (const [id, row] of table(name)) {
        if (!matches(row, where)) continue
        table(name).set(id, { ...row, ...data })
        affected += 1
      }
      return { data: null, affected }
    }),
    deleteById: vi.fn(async (name: string, id: string | number) => ({
      data: null,
      affected: table(name).delete(String(id)) ? 1 : 0,
    })),
    deleteMany: vi.fn(async (name: string, where: Where[]) => {
      let affected = 0
      for (const [id, row] of table(name)) {
        if (!matches(row, where)) continue
        table(name).delete(id)
        affected += 1
      }
      return { data: null, affected }
    }),
  }
  return { fakeStore, tables, primaryKeys }
})

vi.mock('@molecule/api-database-postgresql', () => ({ store: fakeStore }))

import type { Server } from 'node:http'
import type { AddressInfo } from 'node:net'

import express from 'express'
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest'

import { setStore } from '@molecule/api-database'
import { store } from '@molecule/api-database-postgresql'

import { createTaskForOwner, createTaskRouter } from '../index.js'

setStore(store)

// The example's `app.use('/tasks', createTaskRouter())`, behind a stand-in auth middleware.
const router = express.Router()
router.use('/tasks', createTaskRouter())

const app = express()
app.use(express.json())
// Stand-in for the app's global auth middleware: `x-test-session` carries the session JSON.
app.use((req, res, next) => {
  const raw = req.header('x-test-session')
  if (raw) res.locals.session = JSON.parse(raw) as Record<string, unknown>
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

/**
 * Sends a JSON request to the test server.
 *
 * @param method - HTTP method.
 * @param path - Request path.
 * @param session - Session placed on `res.locals.session`, or `undefined` for anonymous.
 * @param body - Optional JSON body.
 * @returns The response status and parsed JSON body (empty for a non-JSON body).
 */
async function call(
  method: string,
  path: string,
  session?: Record<string, unknown>,
  body?: unknown,
): Promise<{ status: number; json: Record<string, unknown> }> {
  const headers: Record<string, string> = { 'content-type': 'application/json' }
  if (session) headers['x-test-session'] = JSON.stringify(session)
  const response = await fetch(`${baseUrl}${path}`, {
    method,
    headers,
    body: body === undefined ? undefined : JSON.stringify(body),
  })
  const isJson = response.headers.get('content-type')?.includes('application/json') ?? false
  return {
    status: response.status,
    json: isJson ? ((await response.json()) as Record<string, unknown>) : {},
  }
}

describe('README @example', () => {
  it('creates, completes and lists the caller’s tasks over HTTP', async () => {
    const session = { userId: 'user-1' }
    const created = await call('POST', '/tasks', session, {
      title: 'Ship release',
      priority: 1,
      due_date: '2026-10-01',
    })
    expect(created.status).toBe(201)
    expect(created.json).toMatchObject({
      title: 'Ship release',
      priority: 1,
      due_date: '2026-10-01',
      completed: false,
    })

    const done = await call('PUT', `/tasks/${String(created.json.id)}`, session, {
      is_completed: true,
    })
    expect(done.status).toBe(200)
    expect(done.json.completed).toBe(true)
    expect(typeof done.json.completed_at).toBe('string')

    const strangers = await call('GET', `/tasks/${String(created.json.id)}`, { userId: 'user-2' })
    expect(strangers.status).toBe(404)
    expect((await call('GET', '/tasks')).status).toBe(401)
  })

  it('creates a recurring task outside HTTP with the service function', async () => {
    const task = await createTaskForOwner('user-1', {
      title: 'Water plants',
      recurrence_rule: 'every 1 week',
    })
    expect(task.recurring).toBe('weekly')
    expect(tables.get('tasks')?.get(task.id)?.owner_id).toBe('user-1')
    expect(fakeStore.create).toHaveBeenCalledTimes(2)
  })
})
