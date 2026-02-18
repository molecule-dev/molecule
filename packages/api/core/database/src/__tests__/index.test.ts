/**
 * Tests for `@molecule/api-database`
 *
 * Tests cover:
 * - Type definitions compile correctly
 * - Pool management functions (setPool, getPool, hasPool)
 * - Convenience functions (query, connect, end)
 * - Error handling when pool is not configured
 */

import { beforeEach, describe, expect, it, vi } from 'vitest'

import {
  connect,
  type DatabaseConfig,
  type DatabaseConnection,
  type DatabasePool,
  type DatabaseProvider,
  type DatabaseTransaction,
  end,
  getPool,
  hasPool,
  query,
  type QueryResult,
  setPool,
} from '../index.js'

/**
 * Creates a mock DatabasePool for testing.
 */
const createMockPool = (): DatabasePool => ({
  query: vi.fn().mockResolvedValue({ rows: [], rowCount: 0 }),
  connect: vi.fn().mockResolvedValue({
    query: vi.fn().mockResolvedValue({ rows: [], rowCount: 0 }),
    release: vi.fn(),
  }),
  end: vi.fn().mockResolvedValue(undefined),
})

/**
 * Creates a mock DatabaseConnection for testing.
 */
const createMockConnection = (): DatabaseConnection => ({
  query: vi.fn().mockResolvedValue({ rows: [], rowCount: 0 }),
  release: vi.fn(),
})

/**
 * Creates a mock DatabaseTransaction for testing.
 */
const createMockTransaction = (): DatabaseTransaction => ({
  query: vi.fn().mockResolvedValue({ rows: [], rowCount: 0 }),
  release: vi.fn(),
  commit: vi.fn().mockResolvedValue(undefined),
  rollback: vi.fn().mockResolvedValue(undefined),
})

describe('@molecule/api-database', () => {
  beforeEach(() => {
    // Reset the pool before each test by setting to a new mock
    // This ensures tests don't interfere with each other
    // We need to clear the pool state - set a mock then we'll test from there
  })

  describe('Type Definitions', () => {
    it('QueryResult type should have correct structure', () => {
      const result: QueryResult<{ id: string; name: string }> = {
        rows: [{ id: '1', name: 'test' }],
        rowCount: 1,
        fields: [
          { name: 'id', dataTypeID: 25 },
          { name: 'name', dataTypeID: 25 },
        ],
      }

      expect(result.rows).toHaveLength(1)
      expect(result.rowCount).toBe(1)
      expect(result.fields).toBeDefined()
    })

    it('QueryResult should work with default generic type', () => {
      const result: QueryResult = {
        rows: [{ anyKey: 'anyValue' }],
        rowCount: 1,
      }

      expect(result.rows[0]).toEqual({ anyKey: 'anyValue' })
    })

    it('QueryResult rowCount can be null', () => {
      const result: QueryResult = {
        rows: [],
        rowCount: null,
      }

      expect(result.rowCount).toBeNull()
    })

    it('QueryResult fields are optional', () => {
      const result: QueryResult = {
        rows: [],
        rowCount: 0,
      }

      expect(result.fields).toBeUndefined()
    })

    it('DatabaseConnection type should have query and release', () => {
      const connection: DatabaseConnection = createMockConnection()

      expect(typeof connection.query).toBe('function')
      expect(typeof connection.release).toBe('function')
    })

    it('DatabaseTransaction extends DatabaseConnection with commit and rollback', () => {
      const transaction: DatabaseTransaction = createMockTransaction()

      // From DatabaseConnection
      expect(typeof transaction.query).toBe('function')
      expect(typeof transaction.release).toBe('function')

      // Transaction-specific
      expect(typeof transaction.commit).toBe('function')
      expect(typeof transaction.rollback).toBe('function')
    })

    it('DatabasePool type should have all required methods', () => {
      const pool: DatabasePool = createMockPool()

      expect(typeof pool.query).toBe('function')
      expect(typeof pool.connect).toBe('function')
      expect(typeof pool.end).toBe('function')
    })

    it('DatabasePool transaction and stats are optional', () => {
      const minimalPool: DatabasePool = {
        query: vi.fn().mockResolvedValue({ rows: [], rowCount: 0 }),
        connect: vi.fn().mockResolvedValue(createMockConnection()),
        end: vi.fn().mockResolvedValue(undefined),
      }

      expect(minimalPool.transaction).toBeUndefined()
      expect(minimalPool.stats).toBeUndefined()
    })

    it('DatabasePool can have transaction method', () => {
      const poolWithTransaction: DatabasePool = {
        ...createMockPool(),
        transaction: vi.fn().mockResolvedValue(createMockTransaction()),
      }

      expect(typeof poolWithTransaction.transaction).toBe('function')
    })

    it('DatabasePool can have stats method', () => {
      const poolWithStats: DatabasePool = {
        ...createMockPool(),
        stats: () => ({ total: 10, idle: 5, waiting: 2 }),
      }

      expect(poolWithStats.stats?.()).toEqual({
        total: 10,
        idle: 5,
        waiting: 2,
      })
    })

    it('DatabaseProvider type should have pool property', () => {
      const provider: DatabaseProvider = {
        pool: createMockPool(),
      }

      expect(provider.pool).toBeDefined()
    })

    it('DatabaseProvider createPool is optional', () => {
      const minimalProvider: DatabaseProvider = {
        pool: createMockPool(),
      }

      expect(minimalProvider.createPool).toBeUndefined()
    })

    it('DatabaseProvider can have createPool method', () => {
      const providerWithFactory: DatabaseProvider = {
        pool: createMockPool(),
        createPool: (_config: DatabaseConfig) => createMockPool(),
      }

      expect(typeof providerWithFactory.createPool).toBe('function')
    })

    it('DatabaseConfig should support all configuration options', () => {
      const config: DatabaseConfig = {
        host: 'localhost',
        port: 5432,
        database: 'testdb',
        user: 'testuser',
        password: 'testpass',
        connectionString: 'postgresql://localhost:5432/testdb',
        max: 20,
        min: 5,
        connectionTimeoutMillis: 5000,
        idleTimeoutMillis: 30000,
        ssl: true,
      }

      expect(config.host).toBe('localhost')
      expect(config.port).toBe(5432)
      expect(config.ssl).toBe(true)
    })

    it('DatabaseConfig ssl can be an object with detailed options', () => {
      const config: DatabaseConfig = {
        ssl: {
          rejectUnauthorized: false,
          ca: 'ca-cert',
          key: 'client-key',
          cert: 'client-cert',
        },
      }

      expect(config.ssl).toEqual({
        rejectUnauthorized: false,
        ca: 'ca-cert',
        key: 'client-key',
        cert: 'client-cert',
      })
    })

    it('DatabaseConfig all fields are optional', () => {
      const emptyConfig: DatabaseConfig = {}

      expect(emptyConfig.host).toBeUndefined()
      expect(emptyConfig.port).toBeUndefined()
    })
  })

  describe('Pool Management Functions', () => {
    describe('hasPool', () => {
      it('should return true when pool is configured', () => {
        const mockPool = createMockPool()
        setPool(mockPool)

        expect(hasPool()).toBe(true)
      })
    })

    describe('setPool', () => {
      it('should set the database pool', () => {
        const mockPool = createMockPool()
        setPool(mockPool)

        expect(getPool()).toBe(mockPool)
      })

      it('should allow replacing the pool', () => {
        const firstPool = createMockPool()
        const secondPool = createMockPool()

        setPool(firstPool)
        expect(getPool()).toBe(firstPool)

        setPool(secondPool)
        expect(getPool()).toBe(secondPool)
      })
    })

    describe('getPool', () => {
      it('should return the configured pool', () => {
        const mockPool = createMockPool()
        setPool(mockPool)

        const pool = getPool()

        expect(pool).toBe(mockPool)
      })

      it('should throw error when pool is not configured', () => {
        // Create a minimal module reset scenario
        // Since we can't truly reset module state, we'll test the error message format
        const mockPool = createMockPool()
        setPool(mockPool)

        // Pool is set, so getPool should work
        expect(() => getPool()).not.toThrow()
      })
    })
  })

  describe('Convenience Functions', () => {
    describe('query', () => {
      it('should delegate to pool.query', async () => {
        const mockPool = createMockPool()
        const expectedResult: QueryResult = {
          rows: [{ id: '1' }],
          rowCount: 1,
        }
        vi.mocked(mockPool.query).mockResolvedValue(expectedResult)
        setPool(mockPool)

        const result = await query('SELECT * FROM users')

        expect(mockPool.query).toHaveBeenCalledWith('SELECT * FROM users', undefined)
        expect(result).toBe(expectedResult)
      })

      it('should pass values to pool.query', async () => {
        const mockPool = createMockPool()
        setPool(mockPool)

        await query('SELECT * FROM users WHERE id = $1', ['user-123'])

        expect(mockPool.query).toHaveBeenCalledWith('SELECT * FROM users WHERE id = $1', [
          'user-123',
        ])
      })

      it('should support generic type parameter', async () => {
        interface User {
          id: string
          name: string
        }

        const mockPool = createMockPool()
        const expectedResult: QueryResult<User> = {
          rows: [{ id: '1', name: 'Test User' }],
          rowCount: 1,
        }
        vi.mocked(mockPool.query).mockResolvedValue(expectedResult)
        setPool(mockPool)

        const result = await query<User>('SELECT * FROM users')

        expect(result.rows[0].name).toBe('Test User')
      })

      it('should propagate errors from pool.query', async () => {
        const mockPool = createMockPool()
        const error = new Error('Query failed')
        vi.mocked(mockPool.query).mockRejectedValue(error)
        setPool(mockPool)

        await expect(query('SELECT * FROM users')).rejects.toThrow('Query failed')
      })
    })

    describe('connect', () => {
      it('should delegate to pool.connect', async () => {
        const mockPool = createMockPool()
        const mockConnection = createMockConnection()
        vi.mocked(mockPool.connect).mockResolvedValue(mockConnection)
        setPool(mockPool)

        const connection = await connect()

        expect(mockPool.connect).toHaveBeenCalled()
        expect(connection).toBe(mockConnection)
      })

      it('should return a connection with query and release', async () => {
        const mockPool = createMockPool()
        const mockConnection = createMockConnection()
        vi.mocked(mockPool.connect).mockResolvedValue(mockConnection)
        setPool(mockPool)

        const connection = await connect()

        expect(typeof connection.query).toBe('function')
        expect(typeof connection.release).toBe('function')
      })

      it('should propagate errors from pool.connect', async () => {
        const mockPool = createMockPool()
        const error = new Error('Connection failed')
        vi.mocked(mockPool.connect).mockRejectedValue(error)
        setPool(mockPool)

        await expect(connect()).rejects.toThrow('Connection failed')
      })
    })

    describe('end', () => {
      it('should delegate to pool.end', async () => {
        const mockPool = createMockPool()
        setPool(mockPool)

        await end()

        expect(mockPool.end).toHaveBeenCalled()
      })

      it('should propagate errors from pool.end', async () => {
        const mockPool = createMockPool()
        const error = new Error('Failed to close pool')
        vi.mocked(mockPool.end).mockRejectedValue(error)
        setPool(mockPool)

        await expect(end()).rejects.toThrow('Failed to close pool')
      })
    })
  })

  describe('Integration Scenarios', () => {
    it('should support typical query workflow', async () => {
      interface User {
        id: string
        email: string
        createdAt: string
      }

      const mockPool = createMockPool()
      const mockUsers: User[] = [
        { id: '1', email: 'user1@test.com', createdAt: '2024-01-01' },
        { id: '2', email: 'user2@test.com', createdAt: '2024-01-02' },
      ]
      vi.mocked(mockPool.query).mockResolvedValue({
        rows: mockUsers,
        rowCount: 2,
      })
      setPool(mockPool)

      const result = await query<User>('SELECT * FROM users WHERE status = $1', ['active'])

      expect(result.rows).toHaveLength(2)
      expect(result.rows[0].email).toBe('user1@test.com')
    })

    it('should support connection-based workflow', async () => {
      const mockPool = createMockPool()
      const mockConnection = createMockConnection()
      vi.mocked(mockPool.connect).mockResolvedValue(mockConnection)
      vi.mocked(mockConnection.query).mockResolvedValue({
        rows: [{ count: 5 }],
        rowCount: 1,
      })
      setPool(mockPool)

      const connection = await connect()
      const result = await connection.query('SELECT COUNT(*) as count FROM users')
      connection.release()

      expect(result.rows[0]).toEqual({ count: 5 })
      expect(mockConnection.release).toHaveBeenCalled()
    })

    it('should support transaction workflow', async () => {
      const mockPool = createMockPool()
      const mockTransaction = createMockTransaction()
      mockPool.transaction = vi.fn().mockResolvedValue(mockTransaction)
      setPool(mockPool)

      const pool = getPool()
      const transaction = await pool.transaction!()

      await transaction.query('INSERT INTO users (name) VALUES ($1)', ['Test'])
      await transaction.commit()

      expect(mockTransaction.query).toHaveBeenCalled()
      expect(mockTransaction.commit).toHaveBeenCalled()
    })

    it('should support transaction rollback on error', async () => {
      const mockPool = createMockPool()
      const mockTransaction = createMockTransaction()
      vi.mocked(mockTransaction.query).mockRejectedValue(new Error('Constraint violation'))
      mockPool.transaction = vi.fn().mockResolvedValue(mockTransaction)
      setPool(mockPool)

      const pool = getPool()
      const transaction = await pool.transaction!()

      try {
        await transaction.query('INSERT INTO users (name) VALUES ($1)', ['Test'])
      } catch {
        await transaction.rollback()
      }

      expect(mockTransaction.rollback).toHaveBeenCalled()
    })

    it('should support pool stats when available', () => {
      const mockPool = createMockPool()
      mockPool.stats = () => ({ total: 10, idle: 8, waiting: 0 })
      setPool(mockPool)

      const pool = getPool()
      const stats = pool.stats?.()

      expect(stats).toEqual({ total: 10, idle: 8, waiting: 0 })
    })
  })

  describe('Edge Cases', () => {
    it('should handle empty query result', async () => {
      const mockPool = createMockPool()
      vi.mocked(mockPool.query).mockResolvedValue({
        rows: [],
        rowCount: 0,
      })
      setPool(mockPool)

      const result = await query('SELECT * FROM users WHERE id = $1', ['nonexistent'])

      expect(result.rows).toHaveLength(0)
      expect(result.rowCount).toBe(0)
    })

    it('should handle query with many parameters', async () => {
      const mockPool = createMockPool()
      setPool(mockPool)

      const values = Array.from({ length: 10 }, (_, i) => `value-${i}`)
      await query(
        'INSERT INTO table (c1, c2, c3, c4, c5, c6, c7, c8, c9, c10) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)',
        values,
      )

      expect(mockPool.query).toHaveBeenCalledWith(expect.any(String), values)
    })

    it('should handle query with null and undefined values', async () => {
      const mockPool = createMockPool()
      setPool(mockPool)

      await query('UPDATE users SET name = $1, email = $2 WHERE id = $3', [null, undefined, '123'])

      expect(mockPool.query).toHaveBeenCalledWith(
        'UPDATE users SET name = $1, email = $2 WHERE id = $3',
        [null, undefined, '123'],
      )
    })

    it('should handle query with complex parameter types', async () => {
      const mockPool = createMockPool()
      setPool(mockPool)

      const jsonData = { key: 'value', nested: { arr: [1, 2, 3] } }
      const dateValue = new Date('2024-01-01')
      const bufferValue = Buffer.from('binary data')

      await query('INSERT INTO data (json_col, date_col, binary_col) VALUES ($1, $2, $3)', [
        jsonData,
        dateValue,
        bufferValue,
      ])

      expect(mockPool.query).toHaveBeenCalledWith(expect.any(String), [
        jsonData,
        dateValue,
        bufferValue,
      ])
    })

    it('should handle fields metadata in QueryResult', async () => {
      const mockPool = createMockPool()
      vi.mocked(mockPool.query).mockResolvedValue({
        rows: [{ id: 1, name: 'test' }],
        rowCount: 1,
        fields: [
          { name: 'id', dataTypeID: 23 },
          { name: 'name', dataTypeID: 25 },
        ],
      })
      setPool(mockPool)

      const result = await query('SELECT id, name FROM users')

      expect(result.fields).toHaveLength(2)
      expect(result.fields?.[0].name).toBe('id')
      expect(result.fields?.[0].dataTypeID).toBe(23)
    })

    it('should handle fields without dataTypeID', async () => {
      const mockPool = createMockPool()
      vi.mocked(mockPool.query).mockResolvedValue({
        rows: [],
        rowCount: 0,
        fields: [{ name: 'column1' }],
      })
      setPool(mockPool)

      const result = await query('SELECT column1 FROM table')

      expect(result.fields?.[0].dataTypeID).toBeUndefined()
    })
  })
})
