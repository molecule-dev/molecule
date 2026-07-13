import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

// Use vi.hoisted to create shared mock instances
const { mockCreatePool } = vi.hoisted(() => {
  const mockQuery = vi.fn()
  const mockGetConnection = vi.fn()
  const mockEnd = vi.fn()
  const mockRelease = vi.fn()
  const mockBeginTransaction = vi.fn()
  const mockCommit = vi.fn()
  const mockRollback = vi.fn()

  const mockConnection = {
    query: mockQuery,
    release: mockRelease,
    beginTransaction: mockBeginTransaction,
    commit: mockCommit,
    rollback: mockRollback,
  }

  const mockPool = {
    query: mockQuery,
    getConnection: mockGetConnection.mockResolvedValue(mockConnection),
    end: mockEnd,
  }

  const mockCreatePool = vi.fn(() => mockPool)

  return { mockPool, mockCreatePool, mockConnection }
})

// Mock mysql2/promise before importing
vi.mock('mysql2/promise', () => {
  return {
    default: {
      createPool: mockCreatePool,
    },
    createPool: mockCreatePool,
  }
})

describe('@molecule/api-database-mysql', () => {
  const originalEnv = process.env

  beforeEach(() => {
    vi.clearAllMocks()
    // A safe baseline so createPool() with no args doesn't trip the [env-assumption
    // fix] fail-fast check in tests that aren't specifically exercising it — those
    // tests `delete` this to test the throw path instead.
    process.env = { ...originalEnv, MYSQL_DATABASE: 'testdb' }
  })

  afterEach(() => {
    process.env = originalEnv
    vi.resetModules()
  })

  describe('createPool()', () => {
    it('FAIL-FAST: throws an actionable config error instead of silently defaulting to root@localhost with no password [env-assumption fix]', async () => {
      delete process.env.MYSQL_URL
      delete process.env.MYSQL_DATABASE
      vi.resetModules()

      const mysql = await import('mysql2/promise')
      const { createPool } = await import('../provider.js')

      // Before the fix, this call silently created a pool that would only fail
      // LATER, on first query, with a raw ECONNREFUSED/ER_ACCESS_DENIED — never
      // naming MYSQL_URL as the thing to set.
      expect(() => createPool()).toThrow(/MYSQL_URL/)
      expect(mysql.createPool).not.toHaveBeenCalled()
    })

    it("does not throw when an explicit (even partial) config object is passed — that is the caller's deliberate choice", async () => {
      delete process.env.MYSQL_URL
      delete process.env.MYSQL_DATABASE
      vi.resetModules()

      const mysql = await import('mysql2/promise')
      const { createPool } = await import('../provider.js')

      expect(() => createPool({ host: 'discrete-host', user: 'discrete-user' })).not.toThrow()
      expect(mysql.createPool).toHaveBeenCalled()
    })

    it('does not throw when only the discrete MYSQL_DATABASE env var is set (no MYSQL_URL)', async () => {
      delete process.env.MYSQL_URL
      process.env.MYSQL_DATABASE = 'discrete-db'
      vi.resetModules()

      const mysql = await import('mysql2/promise')
      const { createPool } = await import('../provider.js')

      expect(() => createPool()).not.toThrow()
      expect(mysql.createPool).toHaveBeenCalled()
    })

    it('should create pool with MYSQL_URL', async () => {
      process.env.MYSQL_URL = 'mysql://localhost:3306/test'
      vi.resetModules()

      const mysql = await import('mysql2/promise')
      const { createPool } = await import('../provider.js')

      createPool()

      expect(mysql.createPool).toHaveBeenCalledWith(
        expect.objectContaining({
          uri: 'mysql://localhost:3306/test',
        }),
      )
    })

    it('should create pool with individual config options', async () => {
      vi.resetModules()

      const mysql = await import('mysql2/promise')
      const { createPool } = await import('../provider.js')

      createPool({
        host: 'custom-host',
        port: 3307,
        database: 'custom-db',
        user: 'custom-user',
        password: 'custom-pass',
        max: 20,
        connectionTimeoutMillis: 5000,
      })

      expect(mysql.createPool).toHaveBeenCalledWith(
        expect.objectContaining({
          host: 'custom-host',
          port: 3307,
          database: 'custom-db',
          user: 'custom-user',
          password: 'custom-pass',
          connectionLimit: 20,
          connectTimeout: 5000,
        }),
      )
    })

    it('should create pool with SSL config (boolean)', async () => {
      vi.resetModules()

      const mysql = await import('mysql2/promise')
      const { createPool } = await import('../provider.js')

      createPool({ ssl: true })

      expect(mysql.createPool).toHaveBeenCalledWith(
        expect.objectContaining({
          ssl: {},
        }),
      )
    })

    it('should create pool with SSL config (object)', async () => {
      vi.resetModules()

      const mysql = await import('mysql2/promise')
      const { createPool } = await import('../provider.js')

      createPool({
        ssl: {
          rejectUnauthorized: false,
          ca: 'ca-cert',
          key: 'key-cert',
          cert: 'cert',
        },
      })

      expect(mysql.createPool).toHaveBeenCalledWith(
        expect.objectContaining({
          ssl: {
            rejectUnauthorized: false,
            ca: 'ca-cert',
            key: 'key-cert',
            cert: 'cert',
          },
        }),
      )
    })

    it('should use environment variables as defaults', async () => {
      process.env.MYSQL_HOST = 'env-host'
      process.env.MYSQL_PORT = '3308'
      process.env.MYSQL_DATABASE = 'env-db'
      process.env.MYSQL_USER = 'env-user'
      process.env.MYSQL_PASSWORD = 'env-pass'
      vi.resetModules()

      const mysql = await import('mysql2/promise')
      const { createPool } = await import('../provider.js')

      createPool()

      expect(mysql.createPool).toHaveBeenCalledWith(
        expect.objectContaining({
          host: 'env-host',
          port: 3308,
          database: 'env-db',
          user: 'env-user',
          password: 'env-pass',
        }),
      )
    })
  })

  describe('pool.query()', () => {
    it('should execute a query and return results', async () => {
      const mysql = await import('mysql2/promise')
      const { createPool } = await import('../provider.js')

      const mockRows = [{ id: 1, name: 'test' }]
      const mockFields = [
        { name: 'id', type: 3 },
        { name: 'name', type: 253 },
      ]

      const mockPool = mysql.createPool({})
      vi.mocked(mockPool.query).mockResolvedValueOnce([mockRows, mockFields] as never)

      const pool = createPool()
      const result = await pool.query('SELECT * FROM users WHERE id = $1', [1])

      expect(result.rows).toEqual(mockRows)
      expect(result.rowCount).toBe(1)
      expect(result.fields).toEqual([
        { name: 'id', dataTypeID: 3 },
        { name: 'name', dataTypeID: 253 },
      ])
    })

    it('should convert PostgreSQL placeholders to MySQL placeholders', async () => {
      const mysql = await import('mysql2/promise')
      const { createPool } = await import('../provider.js')

      const mockPool = mysql.createPool({})
      vi.mocked(mockPool.query).mockResolvedValueOnce([[], []] as never)

      const pool = createPool()
      await pool.query('SELECT * FROM users WHERE id = $1 AND name = $2', [1, 'test'])

      expect(mockPool.query).toHaveBeenCalledWith('SELECT * FROM users WHERE id = ? AND name = ?', [
        1,
        'test',
      ])
    })

    it('should handle query errors', async () => {
      const mysql = await import('mysql2/promise')
      const { createPool } = await import('../provider.js')

      const mockPool = mysql.createPool({})
      vi.mocked(mockPool.query).mockRejectedValueOnce(new Error('Query error'))

      const pool = createPool()
      await expect(pool.query('INVALID SQL')).rejects.toThrow('Query error')
    })

    it('should return affected rows for INSERT/UPDATE/DELETE', async () => {
      const mysql = await import('mysql2/promise')
      const { createPool } = await import('../provider.js')

      const mockResult = { affectedRows: 5 }
      const mockPool = mysql.createPool({})
      vi.mocked(mockPool.query).mockResolvedValueOnce([mockResult, []] as never)

      const pool = createPool()
      const result = await pool.query('UPDATE users SET name = $1', ['test'])

      expect(result.rowCount).toBe(5)
    })
  })

  describe('pool.connect()', () => {
    it('should acquire a connection from the pool', async () => {
      const mysql = await import('mysql2/promise')
      const { createPool } = await import('../provider.js')

      const mockPool = mysql.createPool({})

      const pool = createPool()
      const connection = await pool.connect()

      expect(mockPool.getConnection).toHaveBeenCalled()
      expect(connection).toBeDefined()
      expect(connection.query).toBeDefined()
      expect(connection.release).toBeDefined()
    })

    it('should execute queries on the connection', async () => {
      const mysql = await import('mysql2/promise')
      const { createPool } = await import('../provider.js')

      const mockPool = mysql.createPool({})
      const mockConnection = await mockPool.getConnection()
      vi.mocked(mockConnection.query).mockResolvedValueOnce([
        [{ id: 1 }],
        [{ name: 'id', type: 3 }],
      ] as never)

      const pool = createPool()
      const connection = await pool.connect()
      const result = await connection.query('SELECT * FROM users WHERE id = $1', [1])

      expect(result.rows).toEqual([{ id: 1 }])
    })

    it('should release the connection', async () => {
      const mysql = await import('mysql2/promise')
      const { createPool } = await import('../provider.js')

      const mockPool = mysql.createPool({})
      const mockConnection = await mockPool.getConnection()

      const pool = createPool()
      const connection = await pool.connect()
      connection.release()

      expect(mockConnection.release).toHaveBeenCalled()
    })
  })

  describe('pool.transaction()', () => {
    it('should begin a transaction', async () => {
      const mysql = await import('mysql2/promise')
      const { createPool } = await import('../provider.js')

      const mockPool = mysql.createPool({})
      const mockConnection = await mockPool.getConnection()

      const pool = createPool()
      const tx = await pool.transaction()

      expect(mockPool.getConnection).toHaveBeenCalled()
      expect(mockConnection.beginTransaction).toHaveBeenCalled()
      expect(tx).toBeDefined()
    })

    it('should commit the transaction', async () => {
      const mysql = await import('mysql2/promise')
      const { createPool } = await import('../provider.js')

      const mockPool = mysql.createPool({})
      const mockConnection = await mockPool.getConnection()

      const pool = createPool()
      const tx = await pool.transaction()
      await tx.commit()

      expect(mockConnection.commit).toHaveBeenCalled()
      expect(mockConnection.release).toHaveBeenCalled()
    })

    it('should rollback the transaction', async () => {
      const mysql = await import('mysql2/promise')
      const { createPool } = await import('../provider.js')

      const mockPool = mysql.createPool({})
      const mockConnection = await mockPool.getConnection()

      const pool = createPool()
      const tx = await pool.transaction()
      await tx.rollback()

      expect(mockConnection.rollback).toHaveBeenCalled()
      expect(mockConnection.release).toHaveBeenCalled()
    })

    it('should execute queries within the transaction', async () => {
      const mysql = await import('mysql2/promise')
      const { createPool } = await import('../provider.js')

      const mockPool = mysql.createPool({})
      const mockConnection = await mockPool.getConnection()
      vi.mocked(mockConnection.query).mockResolvedValueOnce([[{ id: 1 }], []] as never)

      const pool = createPool()
      const tx = await pool.transaction()
      const result = await tx.query('SELECT * FROM users')

      expect(result.rows).toEqual([{ id: 1 }])
    })
  })

  describe('pool.end()', () => {
    it('should close the pool', async () => {
      const mysql = await import('mysql2/promise')
      const { createPool } = await import('../provider.js')

      const mockPool = mysql.createPool({})

      const pool = createPool()
      await pool.end()

      expect(mockPool.end).toHaveBeenCalled()
    })
  })

  describe('pool.stats()', () => {
    it('is undefined (mysql2 exposes no real stats) instead of a misleading hardcoded 0/0/0 [ambiguous-failure fix]', async () => {
      const { createPool } = await import('../provider.js')

      // Before the fix, `pool.stats()` always returned `{ total: 0, idle: 0,
      // waiting: 0 }` — a health page reading those zeros could not tell "MySQL
      // bond, unsupported" from "pool down". `stats` is optional on
      // `DatabasePool`, so callers use `pool.stats?.()` and correctly treat
      // `undefined` as "unavailable".
      const pool = createPool({ host: 'h', database: 'd' })
      expect(pool.stats).toBeUndefined()
    })
  })

  describe('pool (default export)', () => {
    it('should export a default pool instance', async () => {
      const { pool } = await import('../provider.js')

      expect(pool).toBeDefined()
      expect(pool.query).toBeDefined()
      expect(pool.connect).toBeDefined()
      expect(pool.transaction).toBeDefined()
      expect(pool.end).toBeDefined()
    })
  })
})
