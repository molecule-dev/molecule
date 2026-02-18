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
    process.env = { ...originalEnv }
  })

  afterEach(() => {
    process.env = originalEnv
    vi.resetModules()
  })

  describe('createPool()', () => {
    it('should create a pool with default config', async () => {
      const mysql = await import('mysql2/promise')
      const { createPool } = await import('../provider.js')

      const pool = createPool()

      expect(pool).toBeDefined()
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
    it('should return pool statistics', async () => {
      const { createPool } = await import('../provider.js')

      const pool = createPool()
      const stats = pool.stats()

      expect(stats).toEqual({
        total: 0,
        idle: 0,
        waiting: 0,
      })
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
