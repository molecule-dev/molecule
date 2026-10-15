/**
 * Inside `withTransaction()` (from `@molecule/api-database`) a pool query runs
 * on the transaction's connection; a COMMIT that fails still returns the
 * connection to the pool.
 */
import { beforeEach, describe, expect, it, vi } from 'vitest'

const { connection, poolQuery, createPoolMock } = vi.hoisted(() => {
  const connection = {
    query: vi.fn(),
    release: vi.fn(),
    beginTransaction: vi.fn(),
    commit: vi.fn(),
    rollback: vi.fn(),
  }
  const poolQuery = vi.fn()
  const mysqlPool = {
    query: poolQuery,
    getConnection: vi.fn(async () => connection),
    end: vi.fn(),
  }
  const createPoolMock = vi.fn(() => mysqlPool)
  return { connection, poolQuery, createPoolMock }
})
vi.mock('mysql2/promise', () => ({
  default: { createPool: createPoolMock },
  createPool: createPoolMock,
}))

import { query, setPool, withTransaction } from '@molecule/api-database'

import { createPool } from '../provider.js'

beforeEach(() => {
  vi.clearAllMocks()
  connection.query.mockResolvedValue([[], []])
  connection.commit.mockResolvedValue(undefined)
  poolQuery.mockResolvedValue([[], []])
  setPool(createPool({ connectionString: 'mysql://localhost/test' }))
})

describe('withTransaction on mysql', () => {
  it('runs pool queries made inside it on the transaction connection', async () => {
    await withTransaction(async () => {
      await query('INSERT INTO t VALUES ($1)', [1])
    })
    expect(connection.beginTransaction).toHaveBeenCalledTimes(1)
    expect(connection.query).toHaveBeenCalledWith('INSERT INTO t VALUES (?)', [1])
    expect(connection.commit).toHaveBeenCalledTimes(1)
    expect(poolQuery).not.toHaveBeenCalled()
  })

  it('releases the connection when COMMIT fails', async () => {
    connection.commit.mockRejectedValueOnce(new Error('deadlock found'))
    await expect(withTransaction(async () => 1)).rejects.toThrow('deadlock found')
    expect(connection.release).toHaveBeenCalledTimes(1)
  })
})
