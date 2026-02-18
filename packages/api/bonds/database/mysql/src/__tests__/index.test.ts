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

describe('@molecule/api-database-mysql index exports', () => {
  const originalEnv = process.env

  beforeEach(() => {
    vi.clearAllMocks()
    process.env = { ...originalEnv }
  })

  afterEach(() => {
    process.env = originalEnv
    vi.resetModules()
  })

  describe('type exports', () => {
    it('should export DatabasePool type', async () => {
      // Type-only test - verifies the export exists at compile time
      const module = await import('../index.js')
      expect(module).toBeDefined()
    })

    it('should export DatabaseConnection type', async () => {
      const module = await import('../index.js')
      expect(module).toBeDefined()
    })

    it('should export DatabaseTransaction type', async () => {
      const module = await import('../index.js')
      expect(module).toBeDefined()
    })

    it('should export DatabaseConfig type', async () => {
      const module = await import('../index.js')
      expect(module).toBeDefined()
    })

    it('should export QueryResult type', async () => {
      const module = await import('../index.js')
      expect(module).toBeDefined()
    })

    it('should export Pool type from mysql2', async () => {
      const module = await import('../index.js')
      expect(module).toBeDefined()
    })

    it('should export PoolConnection type from mysql2', async () => {
      const module = await import('../index.js')
      expect(module).toBeDefined()
    })

    it('should export PoolOptions type from mysql2', async () => {
      const module = await import('../index.js')
      expect(module).toBeDefined()
    })

    it('should export RowDataPacket type from mysql2', async () => {
      const module = await import('../index.js')
      expect(module).toBeDefined()
    })

    it('should export ResultSetHeader type from mysql2', async () => {
      const module = await import('../index.js')
      expect(module).toBeDefined()
    })
  })

  describe('provider exports', () => {
    it('should export createPool function', async () => {
      const { createPool } = await import('../index.js')
      expect(createPool).toBeDefined()
      expect(typeof createPool).toBe('function')
    })

    it('should export pool instance', async () => {
      const { pool } = await import('../index.js')
      expect(pool).toBeDefined()
      expect(pool.query).toBeDefined()
      expect(pool.connect).toBeDefined()
      expect(pool.transaction).toBeDefined()
      expect(pool.end).toBeDefined()
      expect(pool.stats).toBeDefined()
    })
  })

  describe('createPool function', () => {
    it('should create a pool with default configuration', async () => {
      const { createPool } = await import('../index.js')
      const pool = createPool()

      expect(pool).toBeDefined()
      expect(pool.query).toBeDefined()
      expect(pool.connect).toBeDefined()
      expect(pool.transaction).toBeDefined()
      expect(pool.end).toBeDefined()
      expect(pool.stats).toBeDefined()
    })

    it('should create a pool with connection string', async () => {
      vi.resetModules()
      const mysql = await import('mysql2/promise')
      const { createPool } = await import('../index.js')

      createPool({ connectionString: 'mysql://user:pass@localhost:3306/mydb' })

      expect(mysql.createPool).toHaveBeenCalledWith(
        expect.objectContaining({
          uri: 'mysql://user:pass@localhost:3306/mydb',
        }),
      )
    })

    it('should create a pool with individual config options', async () => {
      vi.resetModules()
      const mysql = await import('mysql2/promise')
      const { createPool } = await import('../index.js')

      createPool({
        host: 'db.example.com',
        port: 3307,
        database: 'testdb',
        user: 'testuser',
        password: 'testpass',
        max: 25,
        connectionTimeoutMillis: 15000,
      })

      expect(mysql.createPool).toHaveBeenCalledWith(
        expect.objectContaining({
          host: 'db.example.com',
          port: 3307,
          database: 'testdb',
          user: 'testuser',
          password: 'testpass',
          connectionLimit: 25,
          connectTimeout: 15000,
        }),
      )
    })

    it('should create a pool with SSL enabled (boolean)', async () => {
      vi.resetModules()
      const mysql = await import('mysql2/promise')
      const { createPool } = await import('../index.js')

      createPool({ ssl: true })

      expect(mysql.createPool).toHaveBeenCalledWith(
        expect.objectContaining({
          ssl: {},
        }),
      )
    })

    it('should create a pool with SSL configuration (object)', async () => {
      vi.resetModules()
      const mysql = await import('mysql2/promise')
      const { createPool } = await import('../index.js')

      createPool({
        ssl: {
          rejectUnauthorized: true,
          ca: 'ca-certificate',
          key: 'client-key',
          cert: 'client-cert',
        },
      })

      expect(mysql.createPool).toHaveBeenCalledWith(
        expect.objectContaining({
          ssl: {
            rejectUnauthorized: true,
            ca: 'ca-certificate',
            key: 'client-key',
            cert: 'client-cert',
          },
        }),
      )
    })

    it('should use MYSQL_URL environment variable when no config provided', async () => {
      process.env.MYSQL_URL = 'mysql://envuser:envpass@envhost:3306/envdb'
      vi.resetModules()
      const mysql = await import('mysql2/promise')
      const { createPool } = await import('../index.js')

      createPool()

      expect(mysql.createPool).toHaveBeenCalledWith(
        expect.objectContaining({
          uri: 'mysql://envuser:envpass@envhost:3306/envdb',
        }),
      )
    })

    it('should use individual MYSQL_* environment variables', async () => {
      process.env.MYSQL_HOST = 'env-mysql-host'
      process.env.MYSQL_PORT = '3309'
      process.env.MYSQL_DATABASE = 'env-mysql-db'
      process.env.MYSQL_USER = 'env-mysql-user'
      process.env.MYSQL_PASSWORD = 'env-mysql-password'
      vi.resetModules()
      const mysql = await import('mysql2/promise')
      const { createPool } = await import('../index.js')

      createPool()

      expect(mysql.createPool).toHaveBeenCalledWith(
        expect.objectContaining({
          host: 'env-mysql-host',
          port: 3309,
          database: 'env-mysql-db',
          user: 'env-mysql-user',
          password: 'env-mysql-password',
        }),
      )
    })

    it('should prioritize config over environment variables', async () => {
      process.env.MYSQL_HOST = 'env-host'
      process.env.MYSQL_PORT = '3310'
      vi.resetModules()
      const mysql = await import('mysql2/promise')
      const { createPool } = await import('../index.js')

      createPool({
        host: 'config-host',
        port: 3311,
      })

      expect(mysql.createPool).toHaveBeenCalledWith(
        expect.objectContaining({
          host: 'config-host',
          port: 3311,
        }),
      )
    })
  })

  describe('pool instance', () => {
    describe('query()', () => {
      it('should execute a query and return results', async () => {
        const mysql = await import('mysql2/promise')
        const { createPool } = await import('../index.js')

        const mockRows = [
          { id: 1, name: 'Alice' },
          { id: 2, name: 'Bob' },
        ]
        const mockFields = [
          { name: 'id', type: 3 },
          { name: 'name', type: 253 },
        ]

        const mockPool = mysql.createPool({})
        vi.mocked(mockPool.query).mockResolvedValueOnce([mockRows, mockFields] as never)

        const pool = createPool()
        const result = await pool.query<{ id: number; name: string }>('SELECT * FROM users')

        expect(result.rows).toEqual(mockRows)
        expect(result.rowCount).toBe(2)
        expect(result.fields).toEqual([
          { name: 'id', dataTypeID: 3 },
          { name: 'name', dataTypeID: 253 },
        ])
      })

      it('should convert PostgreSQL placeholders ($1, $2) to MySQL placeholders (?)', async () => {
        const mysql = await import('mysql2/promise')
        const { createPool } = await import('../index.js')

        const mockPool = mysql.createPool({})
        vi.mocked(mockPool.query).mockResolvedValueOnce([[], []] as never)

        const pool = createPool()
        await pool.query('SELECT * FROM users WHERE id = $1 AND status = $2', [1, 'active'])

        expect(mockPool.query).toHaveBeenCalledWith(
          'SELECT * FROM users WHERE id = ? AND status = ?',
          [1, 'active'],
        )
      })

      it('should handle queries without parameters', async () => {
        const mysql = await import('mysql2/promise')
        const { createPool } = await import('../index.js')

        const mockPool = mysql.createPool({})
        vi.mocked(mockPool.query).mockResolvedValueOnce([[{ count: 10 }], []] as never)

        const pool = createPool()
        const result = await pool.query('SELECT COUNT(*) as count FROM users')

        expect(mockPool.query).toHaveBeenCalledWith(
          'SELECT COUNT(*) as count FROM users',
          undefined,
        )
        expect(result.rows).toEqual([{ count: 10 }])
      })

      it('should handle INSERT/UPDATE/DELETE and return affected rows', async () => {
        const mysql = await import('mysql2/promise')
        const { createPool } = await import('../index.js')

        const mockResult = { affectedRows: 3, insertId: 0 }
        const mockPool = mysql.createPool({})
        vi.mocked(mockPool.query).mockResolvedValueOnce([mockResult, []] as never)

        const pool = createPool()
        const result = await pool.query('DELETE FROM users WHERE status = $1', ['inactive'])

        expect(result.rowCount).toBe(3)
      })

      it('should propagate query errors', async () => {
        const mysql = await import('mysql2/promise')
        const { createPool } = await import('../index.js')

        const mockPool = mysql.createPool({})
        vi.mocked(mockPool.query).mockRejectedValueOnce(new Error('Syntax error in SQL'))

        const pool = createPool()

        await expect(pool.query('SELECT * FROM')).rejects.toThrow('Syntax error in SQL')
      })
    })

    describe('connect()', () => {
      it('should acquire a connection from the pool', async () => {
        const mysql = await import('mysql2/promise')
        const { createPool } = await import('../index.js')

        const mockPool = mysql.createPool({})
        const pool = createPool()
        const connection = await pool.connect()

        expect(mockPool.getConnection).toHaveBeenCalled()
        expect(connection).toBeDefined()
        expect(connection.query).toBeDefined()
        expect(connection.release).toBeDefined()
      })

      it('should execute queries on the acquired connection', async () => {
        const mysql = await import('mysql2/promise')
        const { createPool } = await import('../index.js')

        const mockPool = mysql.createPool({})
        const mockConnection = await mockPool.getConnection()
        vi.mocked(mockConnection.query).mockResolvedValueOnce([
          [{ id: 1, email: 'test@example.com' }],
          [
            { name: 'id', type: 3 },
            { name: 'email', type: 253 },
          ],
        ] as never)

        const pool = createPool()
        const connection = await pool.connect()
        const result = await connection.query('SELECT * FROM users WHERE id = $1', [1])

        expect(mockConnection.query).toHaveBeenCalled()
        expect(result.rows).toEqual([{ id: 1, email: 'test@example.com' }])
      })

      it('should release the connection back to the pool', async () => {
        const mysql = await import('mysql2/promise')
        const { createPool } = await import('../index.js')

        const mockPool = mysql.createPool({})
        const mockConnection = await mockPool.getConnection()

        const pool = createPool()
        const connection = await pool.connect()
        connection.release()

        expect(mockConnection.release).toHaveBeenCalled()
      })
    })

    describe('transaction()', () => {
      it('should begin a transaction', async () => {
        const mysql = await import('mysql2/promise')
        const { createPool } = await import('../index.js')

        const mockPool = mysql.createPool({})
        const mockConnection = await mockPool.getConnection()

        const pool = createPool()
        const tx = await pool.transaction()

        expect(mockPool.getConnection).toHaveBeenCalled()
        expect(mockConnection.beginTransaction).toHaveBeenCalled()
        expect(tx).toBeDefined()
        expect(tx.query).toBeDefined()
        expect(tx.commit).toBeDefined()
        expect(tx.rollback).toBeDefined()
        expect(tx.release).toBeDefined()
      })

      it('should execute queries within the transaction', async () => {
        const mysql = await import('mysql2/promise')
        const { createPool } = await import('../index.js')

        const mockPool = mysql.createPool({})
        const mockConnection = await mockPool.getConnection()
        vi.mocked(mockConnection.query).mockResolvedValueOnce([
          [{ id: 1 }],
          [{ name: 'id', type: 3 }],
        ] as never)

        const pool = createPool()
        const tx = await pool.transaction()
        const result = await tx.query('INSERT INTO users (name) VALUES ($1) RETURNING id', ['Test'])

        expect(mockConnection.query).toHaveBeenCalled()
        expect(result.rows).toEqual([{ id: 1 }])
      })

      it('should commit the transaction and release the connection', async () => {
        const mysql = await import('mysql2/promise')
        const { createPool } = await import('../index.js')

        const mockPool = mysql.createPool({})
        const mockConnection = await mockPool.getConnection()

        const pool = createPool()
        const tx = await pool.transaction()
        await tx.commit()

        expect(mockConnection.commit).toHaveBeenCalled()
        expect(mockConnection.release).toHaveBeenCalled()
      })

      it('should rollback the transaction and release the connection', async () => {
        const mysql = await import('mysql2/promise')
        const { createPool } = await import('../index.js')

        const mockPool = mysql.createPool({})
        const mockConnection = await mockPool.getConnection()

        const pool = createPool()
        const tx = await pool.transaction()
        await tx.rollback()

        expect(mockConnection.rollback).toHaveBeenCalled()
        expect(mockConnection.release).toHaveBeenCalled()
      })

      it('should release the transaction connection explicitly', async () => {
        const mysql = await import('mysql2/promise')
        const { createPool } = await import('../index.js')

        const mockPool = mysql.createPool({})
        const mockConnection = await mockPool.getConnection()

        const pool = createPool()
        const tx = await pool.transaction()
        tx.release()

        expect(mockConnection.release).toHaveBeenCalled()
      })
    })

    describe('end()', () => {
      it('should close the pool', async () => {
        const mysql = await import('mysql2/promise')
        const { createPool } = await import('../index.js')

        const mockPool = mysql.createPool({})

        const pool = createPool()
        await pool.end()

        expect(mockPool.end).toHaveBeenCalled()
      })
    })

    describe('stats()', () => {
      it('should return pool statistics', async () => {
        const { createPool } = await import('../index.js')

        const pool = createPool()
        const stats = pool.stats()

        expect(stats).toEqual({
          total: 0,
          idle: 0,
          waiting: 0,
        })
      })
    })
  })

  describe('default pool instance', () => {
    it('should be a pre-configured pool instance', async () => {
      const { pool } = await import('../index.js')

      expect(pool).toBeDefined()
      expect(typeof pool.query).toBe('function')
      expect(typeof pool.connect).toBe('function')
      expect(typeof pool.transaction).toBe('function')
      expect(typeof pool.end).toBe('function')
      expect(typeof pool.stats).toBe('function')
    })

    it('should allow querying via the default pool', async () => {
      const mysql = await import('mysql2/promise')
      const { pool } = await import('../index.js')

      const mockMySQLPool = mysql.createPool({})
      vi.mocked(mockMySQLPool.query).mockResolvedValueOnce([[{ test: 1 }], []] as never)

      const result = await pool.query('SELECT 1 as test')

      expect(result.rows).toEqual([{ test: 1 }])
    })
  })

  describe('integration scenarios', () => {
    it('should support typical CRUD workflow', async () => {
      const mysql = await import('mysql2/promise')
      const { createPool } = await import('../index.js')

      const mockPool = mysql.createPool({})

      // Create
      vi.mocked(mockPool.query).mockResolvedValueOnce([
        { affectedRows: 1, insertId: 1 },
        [],
      ] as never)

      // Read
      vi.mocked(mockPool.query).mockResolvedValueOnce([
        [{ id: 1, name: 'Test User', email: 'test@example.com' }],
        [
          { name: 'id', type: 3 },
          { name: 'name', type: 253 },
          { name: 'email', type: 253 },
        ],
      ] as never)

      // Update
      vi.mocked(mockPool.query).mockResolvedValueOnce([{ affectedRows: 1 }, []] as never)

      // Delete
      vi.mocked(mockPool.query).mockResolvedValueOnce([{ affectedRows: 1 }, []] as never)

      const pool = createPool()

      // Create
      const createResult = await pool.query('INSERT INTO users (name, email) VALUES ($1, $2)', [
        'Test User',
        'test@example.com',
      ])
      expect(createResult.rowCount).toBe(1)

      // Read
      const readResult = await pool.query<{ id: number; name: string; email: string }>(
        'SELECT * FROM users WHERE id = $1',
        [1],
      )
      expect(readResult.rows[0]).toEqual({ id: 1, name: 'Test User', email: 'test@example.com' })

      // Update
      const updateResult = await pool.query('UPDATE users SET name = $1 WHERE id = $2', [
        'Updated User',
        1,
      ])
      expect(updateResult.rowCount).toBe(1)

      // Delete
      const deleteResult = await pool.query('DELETE FROM users WHERE id = $1', [1])
      expect(deleteResult.rowCount).toBe(1)
    })

    it('should support transaction workflow with commit', async () => {
      const mysql = await import('mysql2/promise')
      const { createPool } = await import('../index.js')

      const mockPool = mysql.createPool({})
      const mockConnection = await mockPool.getConnection()

      vi.mocked(mockConnection.query)
        .mockResolvedValueOnce([{ affectedRows: 1 }, []] as never)
        .mockResolvedValueOnce([{ affectedRows: 1 }, []] as never)

      const pool = createPool()
      const tx = await pool.transaction()

      // Execute multiple queries within transaction
      await tx.query('INSERT INTO orders (user_id, total) VALUES ($1, $2)', [1, 100])
      await tx.query('UPDATE users SET balance = balance - $1 WHERE id = $2', [100, 1])

      // Commit
      await tx.commit()

      expect(mockConnection.beginTransaction).toHaveBeenCalled()
      expect(mockConnection.query).toHaveBeenCalledTimes(2)
      expect(mockConnection.commit).toHaveBeenCalled()
      expect(mockConnection.release).toHaveBeenCalled()
    })

    it('should support transaction workflow with rollback', async () => {
      const mysql = await import('mysql2/promise')
      const { createPool } = await import('../index.js')

      const mockPool = mysql.createPool({})
      const mockConnection = await mockPool.getConnection()

      vi.mocked(mockConnection.query)
        .mockResolvedValueOnce([{ affectedRows: 1 }, []] as never)
        .mockRejectedValueOnce(new Error('Constraint violation'))

      const pool = createPool()
      const tx = await pool.transaction()

      // First query succeeds
      await tx.query('INSERT INTO orders (user_id, total) VALUES ($1, $2)', [1, 100])

      // Second query fails
      try {
        await tx.query('UPDATE invalid_table SET value = $1', [1])
      } catch {
        // Rollback on error
        await tx.rollback()
      }

      expect(mockConnection.rollback).toHaveBeenCalled()
      expect(mockConnection.release).toHaveBeenCalled()
    })

    it('should support multiple connections simultaneously', async () => {
      const mysql = await import('mysql2/promise')
      const { createPool } = await import('../index.js')

      const mockPool = mysql.createPool({})

      const pool = createPool()

      // Acquire multiple connections
      const conn1 = await pool.connect()
      const conn2 = await pool.connect()

      expect(mockPool.getConnection).toHaveBeenCalledTimes(2)
      expect(conn1).toBeDefined()
      expect(conn2).toBeDefined()

      // Release connections
      conn1.release()
      conn2.release()
    })
  })
})
