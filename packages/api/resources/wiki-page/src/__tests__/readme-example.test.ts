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
      const now = new Date().toISOString()
      const row: Row = { id: crypto.randomUUID(), createdAt: now, updatedAt: now, ...data }
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

import { create, setStore } from '@molecule/api-database'
import { store } from '@molecule/api-database-postgresql'

import { createPage, createWikiPageRouter, getBreadcrumbs } from '../index.js'

setStore(store)

// The example's `app.use('/pages', createWikiPageRouter())`, behind a stand-in auth middleware.
const router = express.Router()
router.use('/pages', createWikiPageRouter())

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
  it('seeds a space, creates nested pages and resolves breadcrumbs and slugs', async () => {
    const ownerId = '0b5c6a1e-3f7d-4c2a-9e1b-8d4f2a6c7e90'
    const { data: space } = await create<{ id: string }>('wiki_spaces', {
      owner_id: ownerId,
      name: 'Handbook',
      slug: 'handbook',
      is_public: true,
    })
    if (!space) throw new Error('wiki space was not created')

    const parent = await createPage({ space_id: space.id, slug: 'onboarding', title: 'Onboarding' })
    const child = await createPage({
      space_id: space.id,
      parent_id: parent.id,
      slug: 'vpn',
      title: 'VPN',
    })
    const crumbs = await getBreadcrumbs(child.id)
    expect(crumbs.map((c) => c.slug)).toEqual(['onboarding', 'vpn'])

    const created = await call(
      'POST',
      '/pages',
      { userId: ownerId },
      { space_id: space.id, title: 'Laptop Setup' },
    )
    expect(created.status).toBe(201)
    expect(created.json).toMatchObject({ slug: 'laptop-setup', is_published: false })

    const byStranger = await call(
      'POST',
      '/pages',
      { userId: 'someone-else' },
      { space_id: space.id, title: 'Spam' },
    )
    expect(byStranger.status).toBe(404)

    const read = await call('GET', `/pages/by-slug/${space.id}/vpn`, { userId: 'reader-1' })
    expect(read.status).toBe(200)
    expect(read.json.title).toBe('VPN')
    expect(tables.get('wiki_pages')?.size).toBe(3)
  })
})
