/**
 * DataStore CRUD against the REAL embedded DuckDB engine (in-memory), so the
 * SQL the store builds is proven against the actual parser and binder.
 */
import { beforeEach, describe, expect, it } from 'vitest'

import type { DatabasePool } from '@molecule/api-database'

import { createPool } from '../pool.js'
import { createStore } from '../store.js'

let pool: DatabasePool

beforeEach(async () => {
  pool = createPool({ path: ':memory:' })
  await pool.query(`CREATE TABLE items (
    id UUID PRIMARY KEY,
    name VARCHAR NOT NULL,
    flag BOOLEAN NOT NULL DEFAULT false,
    meta JSON,
    score INTEGER,
    created_at TIMESTAMPTZ DEFAULT now()
  )`)
})

describe('create / read', () => {
  it('generates an id when the caller omits one and returns the row', async () => {
    const store = createStore(pool)
    const result = await store.create<{ id: string; name: string }>('items', { name: 'duck' })
    expect(result.affected).toBe(1)
    expect(result.data?.id).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/,
    )
    expect(result.data?.name).toBe('duck')
  })

  it('parses a JSON-typed column back into a value', async () => {
    const store = createStore(pool)
    const created = await store.create<{ id: string; meta: unknown }>('items', {
      name: 'json',
      meta: { nested: [1, 2] },
    })
    expect(created.data?.meta).toEqual({ nested: [1, 2] })
    const found = await store.findById<{ meta: unknown }>('items', String(created.data?.id))
    expect(found?.meta).toEqual({ nested: [1, 2] })
  })

  it('findById returns null for a miss and finds by uuid string', async () => {
    const store = createStore(pool)
    expect(await store.findById('items', '0b6d3f1e-4c1a-4d6e-9a52-9e64bf0a9999')).toBeNull()
    const created = await store.create<{ id: string }>('items', { name: 'x' })
    expect(await store.findById<{ name: string }>('items', String(created.data?.id))).toMatchObject(
      { name: 'x' },
    )
  })
})

describe('findMany / findOne / count', () => {
  beforeEach(async () => {
    const store = createStore(pool)
    await store.create('items', { name: 'Duck', score: 3, flag: true })
    await store.create('items', { name: 'duckling', score: 1, flag: false })
    await store.create('items', { name: 'GOOSE', score: 2, flag: true })
  })

  it('filters with every scalar operator', async () => {
    const store = createStore(pool)
    expect(
      (await store.findMany('items', { where: [{ field: 'score', operator: '>', value: 1 }] }))
        .length,
    ).toBe(2)
    expect(
      (await store.findMany('items', { where: [{ field: 'score', operator: '<=', value: 1 }] }))
        .length,
    ).toBe(1)
    expect(
      (await store.findMany('items', { where: [{ field: 'flag', operator: '=', value: true }] }))
        .length,
    ).toBe(2)
    expect(
      (await store.findMany('items', { where: [{ field: 'name', operator: '!=', value: 'Duck' }] }))
        .length,
    ).toBe(2)
  })

  it("'in' and 'not_in' — including the empty-list edge cases", async () => {
    const store = createStore(pool)
    expect(
      (
        await store.findMany('items', {
          where: [{ field: 'score', operator: 'in', value: [1, 2] }],
        })
      ).length,
    ).toBe(2)
    expect(
      (
        await store.findMany('items', {
          where: [{ field: 'score', operator: 'not_in', value: [1] }],
        })
      ).length,
    ).toBe(2)
    expect(
      (await store.findMany('items', { where: [{ field: 'score', operator: 'in', value: [] }] }))
        .length,
    ).toBe(0)
    expect(
      (
        await store.findMany('items', {
          where: [{ field: 'score', operator: 'not_in', value: [] }],
        })
      ).length,
    ).toBe(3)
  })

  it('like is case-insensitive and honors the caller-wildcard pattern; ilike is a literal contains', async () => {
    const store = createStore(pool)
    expect(
      (
        await store.findMany('items', {
          where: [{ field: 'name', operator: 'like', value: 'duck%' }],
        })
      ).length,
    ).toBe(2)
    expect(
      (
        await store.findMany('items', {
          where: [{ field: 'name', operator: 'ilike', value: 'oo' }],
        })
      ).length,
    ).toBe(1)
    // A % in an ilike VALUE is a literal, not a wildcard.
    await store.create('items', { name: 'a%b' })
    expect(
      (await store.findMany('items', { where: [{ field: 'name', operator: 'ilike', value: '%' }] }))
        .length,
    ).toBe(1)
  })

  it('is_null / is_not_null', async () => {
    const store = createStore(pool)
    expect(
      (
        await store.findMany('items', {
          where: [{ field: 'meta', operator: 'is_null', value: undefined }],
        })
      ).length,
    ).toBe(3)
    expect(
      (
        await store.findMany('items', {
          where: [{ field: 'meta', operator: 'is_not_null', value: undefined }],
        })
      ).length,
    ).toBe(0)
  })

  it('orders, limits and offsets; orderBy applies before limit', async () => {
    const store = createStore(pool)
    const top = await store.findMany<{ score: number }>('items', {
      orderBy: [{ field: 'score', direction: 'desc' }],
      limit: 2,
    })
    expect(top.map((row) => row.score)).toEqual([3, 2])
    const offset = await store.findMany<{ score: number }>('items', {
      orderBy: [{ field: 'score', direction: 'asc' }],
      limit: 2,
      offset: 1,
    })
    expect(offset.map((row) => row.score)).toEqual([2, 3])
  })

  it('select narrows the columns', async () => {
    const store = createStore(pool)
    const rows = await store.findMany('items', { select: ['score'], limit: 1 })
    expect(Object.keys(rows[0] ?? {})).toEqual(['score'])
  })

  it('count() counts, with and without conditions', async () => {
    const store = createStore(pool)
    expect(await store.count('items')).toBe(3)
    expect(await store.count('items', [{ field: 'flag', operator: '=', value: true }])).toBe(2)
  })

  it('findOne returns the first match and null on a miss', async () => {
    const store = createStore(pool)
    expect(
      await store.findOne('items', [{ field: 'name', operator: '=', value: 'GOOSE' }]),
    ).toBeTruthy()
    expect(
      await store.findOne('items', [{ field: 'name', operator: '=', value: 'nope' }]),
    ).toBeNull()
  })
})

describe('update / delete', () => {
  it('updateById returns the updated row and affected 1', async () => {
    const store = createStore(pool)
    const created = await store.create<{ id: string }>('items', { name: 'before' })
    const updated = await store.updateById<{ id: string; name: string }>(
      'items',
      String(created.data?.id),
      { name: 'after' },
    )
    expect(updated.affected).toBe(1)
    expect(updated.data?.name).toBe('after')
    expect(
      (await store.updateById('items', '0b6d3f1e-4c1a-4d6e-9a52-9e64bf0a9999', { name: 'x' }))
        .affected,
    ).toBe(0)
  })

  it('updateById with empty data is a read, not a syntax error', async () => {
    const store = createStore(pool)
    const created = await store.create<{ id: string; name: string }>('items', { name: 'keep' })
    const result = await store.updateById('items', String(created.data?.id), {})
    expect(result.affected).toBe(1)
    expect(result.data).toMatchObject({ name: 'keep' })
  })

  it('updateMany and deleteMany refuse an empty WHERE', async () => {
    const store = createStore(pool)
    await expect(store.updateMany('items', [], { name: 'x' })).rejects.toThrow(
      /at least one WHERE condition/,
    )
    await expect(store.deleteMany('items', [])).rejects.toThrow(/at least one WHERE condition/)
  })

  it('updateMany affects the matching rows; deleteById/deleteMany remove them', async () => {
    const store = createStore(pool)
    await store.create('items', { name: 'a', score: 1 })
    await store.create('items', { name: 'b', score: 1 })
    expect(
      (
        await store.updateMany('items', [{ field: 'score', operator: '=', value: 1 }], {
          flag: true,
        })
      ).affected,
    ).toBe(2)
    const one = await store.findOne<{ id: string }>('items', [
      { field: 'name', operator: '=', value: 'a' },
    ])
    expect((await store.deleteById('items', String(one?.id))).affected).toBe(1)
    expect(
      (await store.deleteMany('items', [{ field: 'score', operator: '=', value: 1 }])).affected,
    ).toBe(1)
    expect(await store.count('items')).toBe(0)
  })
})

describe('guards and errors', () => {
  it('rejects an unsafe identifier before any SQL runs', async () => {
    const store = createStore(pool)
    await expect(store.findMany('items; DROP TABLE items')).rejects.toThrow(
      /Invalid SQL identifier/,
    )
    await expect(
      store.findMany('items', {
        where: [{ field: 'name; DROP', operator: '=', value: 'x' }],
      } as never),
    ).rejects.toThrow()
  })

  it('refuses a list for a scalar operator and a scalar for in', async () => {
    const store = createStore(pool)
    await expect(
      store.findMany('items', { where: [{ field: 'name', operator: '=', value: ['a'] }] }),
    ).rejects.toThrow(/takes one value, not a list/)
    await expect(
      store.findMany('items', { where: [{ field: 'name', operator: 'in', value: 'a' }] }),
    ).rejects.toThrow(/requires an array value/)
  })

  it('names the table on a "does not exist" error', async () => {
    const store = createStore(pool)
    await expect(store.findMany('missing_table')).rejects.toThrow(/\(table "missing_table"\)\s*$/)
  })

  it('refuses an unknown operator instead of dropping the condition', async () => {
    const store = createStore(pool)
    await expect(
      store.findMany('items', {
        where: [{ field: 'name', operator: 'CONTAINS' as never, value: 'x' }],
      }),
    ).rejects.toThrow(/Invalid SQL operator/)
  })
})
