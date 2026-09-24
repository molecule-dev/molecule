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

import { afterAll, describe, expect, it, vi } from 'vitest'

import { setStore } from '@molecule/api-database'
import { store } from '@molecule/api-database-postgresql'

import {
  clearRestoreCallbacks,
  countTrashedItems,
  getRestoreCallback,
  purgeExpired,
  registerRestoreCallback,
  type RestoreCallback,
  restoreFromTrash,
  trashItem,
} from '../index.js'

afterAll(() => {
  clearRestoreCallbacks()
})

describe('README @example', () => {
  it('trashes a snapshot, restores the parent through the callback and purges on cron', async () => {
    setStore(store)
    const documents = new Map([['doc-1', { id: 'doc-1', title: 'Q3 plan' }]])
    const restoreDocument: RestoreCallback = async (snapshot) => {
      const doc = snapshot as { id: string; title: string }
      documents.set(doc.id, doc)
    }
    registerRestoreCallback('document', restoreDocument)
    expect(getRestoreCallback('document')).toBe(restoreDocument)

    const doc = { id: 'doc-1', title: 'Q3 plan' }
    const trashed = await trashItem({
      resourceType: 'document',
      resourceId: doc.id,
      userId: 'user-1',
      snapshot: doc,
      reason: 'user delete',
      ttlMs: 30 * 24 * 60 * 60 * 1000,
    })
    expect(documents.has('doc-1')).toBe(true)
    documents.delete(doc.id)
    expect(await countTrashedItems({ userId: 'user-1' })).toBe(1)

    const restored = await restoreFromTrash(trashed.id, 'user-1', restoreDocument)
    expect(restored?.trashedItem.restoredBy).toBe('user-1')
    expect(documents.get('doc-1')).toEqual({ id: 'doc-1', title: 'Q3 plan' })
    expect(await restoreFromTrash(trashed.id, 'user-1', restoreDocument)).toBeNull()
    expect(await countTrashedItems({ userId: 'user-1' })).toBe(0)

    const stale = await trashItem({
      resourceType: 'document',
      resourceId: 'doc-2',
      userId: 'user-1',
      snapshot: { id: 'doc-2', title: 'Old' },
      ttlMs: 1,
    })
    expect(await purgeExpired(new Date(Date.now() + 60_000))).toBe(1)
    expect(tables.get('trashedItems')?.get(stale.id)?.purgedAt).toEqual(expect.any(String))
  })
})
