/**
 * Inside `withTransaction()` (from `@molecule/api-database`) a pool query runs
 * on the transaction's client, so the CRUD helpers are part of the
 * transaction instead of committing on their own; outside it they use the pool.
 */
import { beforeEach, describe, expect, it, vi } from 'vitest'

const { clientQuery, poolQuery, PoolClass } = vi.hoisted(() => {
  const clientQuery = vi.fn()
  const poolQuery = vi.fn()
  const client = { query: clientQuery, release: vi.fn() }
  const pgPool = {
    query: poolQuery,
    connect: vi.fn(async () => client),
    end: vi.fn(),
    on: vi.fn(),
  }
  const PoolClass = vi.fn(function () {
    return pgPool
  })
  return { clientQuery, poolQuery, PoolClass }
})
vi.mock('pg', () => ({ default: { Pool: PoolClass }, Pool: PoolClass }))

import { query, setPool, withTransaction } from '@molecule/api-database'

import { createPool } from '../index.js'

beforeEach(() => {
  clientQuery.mockReset().mockResolvedValue({ rows: [], rowCount: 0 })
  poolQuery.mockReset().mockResolvedValue({ rows: [], rowCount: 0 })
  setPool(createPool({ connectionString: 'postgres://localhost/test' }))
})

describe('withTransaction on postgresql', () => {
  it('runs pool queries made inside it on the transaction client', async () => {
    await withTransaction(async () => {
      await query('INSERT INTO t VALUES ($1)', [1])
    })
    expect(clientQuery.mock.calls.map((c) => c[0])).toEqual([
      'BEGIN',
      'INSERT INTO t VALUES ($1)',
      'COMMIT',
    ])
    expect(poolQuery).not.toHaveBeenCalled()
  })

  it('rolls back on a throw, and later queries use the pool again', async () => {
    await expect(
      withTransaction(async () => {
        await query('INSERT INTO t VALUES ($1)', [2])
        throw new Error('boom')
      }),
    ).rejects.toThrow('boom')
    expect(clientQuery.mock.calls.map((c) => c[0])).toEqual([
      'BEGIN',
      'INSERT INTO t VALUES ($1)',
      'ROLLBACK',
    ])
    await query('SELECT 1')
    expect(poolQuery).toHaveBeenCalledWith('SELECT 1', undefined)
  })
})
