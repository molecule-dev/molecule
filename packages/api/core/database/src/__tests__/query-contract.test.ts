/**
 * Query-argument contract tests for the exported DataStore convenience
 * functions.
 *
 * `findMany(table, options)` takes `{ where: [...] }`; `findOne`, `count`,
 * `updateMany` and `deleteMany` take the condition ARRAY itself. A bare
 * condition array given to `findMany` used to be read as "no options", so
 * `options.where` was `undefined` and the query returned EVERY row — the m355
 * defect (a seed helper asked `findMany(table, [{ username }])` and every
 * existence check matched the first seeded user).
 *
 * These tests pin the fix at the shared API boundary: the malformed shapes
 * throw a `TypeError` BEFORE the bonded store is called (no query is built),
 * and every documented valid shape still delegates unchanged.
 *
 * @module
 */

import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'

import * as db from '../index.js'
import type { DataStore } from '../store.js'

// The bonded store is a spy: a rejected argument must never reach it.
const store = {
  findById: vi.fn(),
  findOne: vi.fn(),
  findMany: vi.fn(),
  count: vi.fn(),
  create: vi.fn(),
  updateById: vi.fn(),
  updateMany: vi.fn(),
  deleteById: vi.fn(),
  deleteMany: vi.fn(),
}

beforeAll(() => {
  db.setStore(store as unknown as DataStore)
})

beforeEach(() => {
  vi.clearAllMocks()
  store.findMany.mockResolvedValue([])
  store.findOne.mockResolvedValue(null)
  store.count.mockResolvedValue(0)
  store.updateMany.mockResolvedValue({ data: null, affected: 0 })
  store.deleteMany.mockResolvedValue({ data: null, affected: 0 })
})

const CONDITION = { field: 'username', operator: '=', value: 'zzz' } as const

describe('findMany: the second argument is an options OBJECT', () => {
  it('rejects a bare condition array before any query (the m355 shape)', async () => {
    const rejection = db.findMany('users', [CONDITION] as never)

    await expect(rejection).rejects.toBeInstanceOf(TypeError)
    await expect(rejection).rejects.toThrow(/bare condition array/)
    await expect(rejection).rejects.toThrow(/where: \[\.\.\.\]/)
    expect(store.findMany).not.toHaveBeenCalled()
  })

  it('rejects a single condition object passed as the options object', async () => {
    const rejection = db.findMany('users', CONDITION as never)

    await expect(rejection).rejects.toBeInstanceOf(TypeError)
    await expect(rejection).rejects.toThrow(/single condition/)
    expect(store.findMany).not.toHaveBeenCalled()
  })

  it('rejects a key map (the shape that silently returned every row)', async () => {
    const rejection = db.findMany('users', { username: 'zzz' } as never)

    await expect(rejection).rejects.toBeInstanceOf(TypeError)
    await expect(rejection).rejects.toThrow(/"username"/)
    expect(store.findMany).not.toHaveBeenCalled()
  })

  it('rejects a filter alias such as { conditions: [...] }', async () => {
    const rejection = db.findMany('users', { conditions: [CONDITION] } as never)

    await expect(rejection).rejects.toBeInstanceOf(TypeError)
    await expect(rejection).rejects.toThrow(/"conditions"/)
    expect(store.findMany).not.toHaveBeenCalled()
  })

  it('rejects options.where given a single condition object instead of an array', async () => {
    const rejection = db.findMany('users', { where: CONDITION } as never)

    await expect(rejection).rejects.toBeInstanceOf(TypeError)
    await expect(rejection).rejects.toThrow(/findMany\(table, options\)\.where/)
    await expect(rejection).rejects.toThrow(/ARRAY/)
    expect(store.findMany).not.toHaveBeenCalled()
  })

  it('rejects options.where given null', async () => {
    const rejection = db.findMany('users', { where: null } as never)

    await expect(rejection).rejects.toBeInstanceOf(TypeError)
    expect(store.findMany).not.toHaveBeenCalled()
  })

  it('rejects a null options argument', async () => {
    const rejection = db.findMany('users', null as never)

    await expect(rejection).rejects.toBeInstanceOf(TypeError)
    await expect(rejection).rejects.toThrow(/got null/)
    expect(store.findMany).not.toHaveBeenCalled()
  })

  it('delegates when options are omitted or undefined', async () => {
    await db.findMany('users')
    await db.findMany('users', undefined)

    expect(store.findMany).toHaveBeenNthCalledWith(1, 'users', undefined)
    expect(store.findMany).toHaveBeenNthCalledWith(2, 'users', undefined)
  })

  it('delegates an empty options object and an empty where array unchanged', async () => {
    const empty = {}
    const emptyWhere = { where: [] }

    await db.findMany('users', empty)
    await db.findMany('users', emptyWhere)

    expect(store.findMany).toHaveBeenNthCalledWith(1, 'users', empty)
    expect(store.findMany).toHaveBeenNthCalledWith(2, 'users', emptyWhere)
  })

  it('delegates a fully populated options object unchanged', async () => {
    const options = {
      where: [CONDITION],
      orderBy: [{ field: 'createdAt', direction: 'desc' as const }],
      limit: 50,
      offset: 10,
      select: ['id', 'username'],
    }

    await db.findMany('users', options)

    expect(store.findMany).toHaveBeenCalledWith('users', options)
  })
})

describe('findOne / count / updateMany / deleteMany: the condition ARRAY itself', () => {
  it('findOne rejects the findMany options shape before any query', async () => {
    const rejection = db.findOne('users', { where: [CONDITION] } as never)

    await expect(rejection).rejects.toBeInstanceOf(TypeError)
    await expect(rejection).rejects.toThrow(/findOne\(table, where\)/)
    await expect(rejection).rejects.toThrow(/findMany options shape/)
    expect(store.findOne).not.toHaveBeenCalled()
  })

  it('findOne rejects a key map and a missing where', async () => {
    await expect(db.findOne('users', { username: 'zzz' } as never)).rejects.toBeInstanceOf(
      TypeError,
    )
    await expect(db.findOne('users', undefined as never)).rejects.toBeInstanceOf(TypeError)
    expect(store.findOne).not.toHaveBeenCalled()
  })

  it('findOne rejects a malformed condition entry', async () => {
    await expect(db.findOne('users', [null] as never)).rejects.toBeInstanceOf(TypeError)
    await expect(
      db.findOne('users', [{ operator: '=', value: 1 }] as never),
    ).rejects.toBeInstanceOf(TypeError)
    await expect(
      db.findOne('users', [{ field: 'id', operator: 1, value: 1 }] as never),
    ).rejects.toBeInstanceOf(TypeError)
    expect(store.findOne).not.toHaveBeenCalled()
  })

  it('findOne still accepts an empty array and a condition array', async () => {
    await db.findOne('users', [])
    await db.findOne('users', [CONDITION])

    expect(store.findOne).toHaveBeenNthCalledWith(1, 'users', [])
    expect(store.findOne).toHaveBeenNthCalledWith(2, 'users', [CONDITION])
  })

  it('count rejects the findMany options shape and keeps undefined/empty valid', async () => {
    await expect(db.count('users', { where: [CONDITION] } as never)).rejects.toBeInstanceOf(
      TypeError,
    )
    expect(store.count).not.toHaveBeenCalled()

    await db.count('users')
    await db.count('users', undefined)
    await db.count('users', [])
    await db.count('users', [CONDITION])

    expect(store.count).toHaveBeenNthCalledWith(1, 'users', undefined)
    expect(store.count).toHaveBeenNthCalledWith(2, 'users', undefined)
    expect(store.count).toHaveBeenNthCalledWith(3, 'users', [])
    expect(store.count).toHaveBeenNthCalledWith(4, 'users', [CONDITION])
  })

  it('updateMany rejects a malformed where before any write', async () => {
    await expect(
      db.updateMany('users', { where: [CONDITION] } as never, { active: false }),
    ).rejects.toBeInstanceOf(TypeError)
    await expect(
      db.updateMany('users', undefined as never, { active: false }),
    ).rejects.toBeInstanceOf(TypeError)

    expect(store.updateMany).not.toHaveBeenCalled()
  })

  it('deleteMany rejects a malformed where before any delete', async () => {
    await expect(db.deleteMany('users', { where: [CONDITION] } as never)).rejects.toBeInstanceOf(
      TypeError,
    )

    expect(store.deleteMany).not.toHaveBeenCalled()
  })

  it('updateMany / deleteMany still delegate a valid condition array', async () => {
    await db.updateMany('users', [CONDITION], { active: false })
    await db.deleteMany('users', [CONDITION])

    expect(store.updateMany).toHaveBeenCalledWith('users', [CONDITION], { active: false })
    expect(store.deleteMany).toHaveBeenCalledWith('users', [CONDITION])
  })
})
