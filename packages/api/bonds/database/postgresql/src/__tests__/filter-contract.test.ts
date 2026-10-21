/**
 * The shared query-argument guards run inside this bond's `createStore()` too,
 * not only in the `@molecule/api-database` convenience functions: a direct
 * `store.findMany(...)` / `store.findOne(...)` / `store.count(...)` caller must
 * get the same actionable `TypeError` BEFORE any statement reaches the pool.
 *
 * Provider parity: sqlite, pglite and mysql carry the same assertions.
 *
 * @module
 */

import { beforeEach, describe, expect, it, vi } from 'vitest'

import type { DatabasePool } from '@molecule/api-database'

import { createStore } from '../store.js'

const CONDITION = { field: 'username', operator: '=', value: 'zzz' } as const

function createMockPool(): DatabasePool & { query: ReturnType<typeof vi.fn> } {
  return {
    query: vi.fn().mockResolvedValue({ rows: [], rowCount: 0 }),
    connect: vi.fn(),
    end: vi.fn(),
  } as unknown as DatabasePool & { query: ReturnType<typeof vi.fn> }
}

describe('postgresql store query-argument contract', () => {
  let pool: ReturnType<typeof createMockPool>
  let store: ReturnType<typeof createStore>

  beforeEach(() => {
    pool = createMockPool()
    store = createStore(pool)
    vi.clearAllMocks()
  })

  it('findMany rejects a bare condition array before querying', async () => {
    await expect(store.findMany('users', [CONDITION] as never)).rejects.toBeInstanceOf(TypeError)
    expect(pool.query).not.toHaveBeenCalled()
  })

  it('findMany rejects a key map and a non-array where', async () => {
    await expect(store.findMany('users', { username: 'zzz' } as never)).rejects.toBeInstanceOf(
      TypeError,
    )
    await expect(store.findMany('users', { where: CONDITION } as never)).rejects.toBeInstanceOf(
      TypeError,
    )
    expect(pool.query).not.toHaveBeenCalled()
  })

  it('findOne rejects the findMany options shape before querying', async () => {
    await expect(store.findOne('users', { where: [CONDITION] } as never)).rejects.toBeInstanceOf(
      TypeError,
    )
    expect(pool.query).not.toHaveBeenCalled()
  })

  it('count rejects the findMany options shape before querying', async () => {
    await expect(store.count('users', { where: [CONDITION] } as never)).rejects.toBeInstanceOf(
      TypeError,
    )
    expect(pool.query).not.toHaveBeenCalled()
  })

  it('updateMany / deleteMany reject a malformed where before querying', async () => {
    await expect(
      store.updateMany('users', { where: [CONDITION] } as never, { active: false }),
    ).rejects.toBeInstanceOf(TypeError)
    await expect(store.deleteMany('users', { where: [CONDITION] } as never)).rejects.toBeInstanceOf(
      TypeError,
    )
    await expect(store.deleteMany('users', undefined as never)).rejects.toBeInstanceOf(TypeError)
    expect(pool.query).not.toHaveBeenCalled()
  })

  it('keeps the valid forms working', async () => {
    await expect(store.findMany('users')).resolves.toEqual([])
    await expect(store.findMany('users', { where: [] })).resolves.toEqual([])
    await expect(store.count('users', undefined)).resolves.toBe(0)
    await expect(store.count('users', [])).resolves.toBe(0)
    expect(pool.query).toHaveBeenCalledTimes(4)
  })
})
