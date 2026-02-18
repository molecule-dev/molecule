import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

// Use vi.hoisted to create shared mock instances
const { mockPoolClass, mockClientClass, mockQuery, mockEnd, mockRelease } = vi.hoisted(() => {
  const mockQuery = vi.fn()
  const mockConnect = vi.fn()
  const mockEnd = vi.fn()
  const mockRelease = vi.fn()
  const mockOn = vi.fn()

  const mockClient = {
    query: mockQuery,
    connect: mockConnect,
    end: mockEnd,
    release: mockRelease,
    on: mockOn,
  }

  const mockPool = {
    query: mockQuery,
    connect: vi.fn().mockResolvedValue(mockClient),
    end: mockEnd,
    on: mockOn,
    totalCount: 10,
    idleCount: 5,
    waitingCount: 0,
  }

  const mockPoolClass = vi.fn(function () {
    return mockPool
  })
  const mockClientClass = vi.fn(function () {
    return mockClient
  })

  return {
    mockClient,
    mockPool,
    mockPoolClass,
    mockClientClass,
    mockQuery,
    mockEnd,
    mockRelease,
    mockOn,
  }
})

// Mock pg before importing module
vi.mock('pg', () => {
  return {
    default: {
      Pool: mockPoolClass,
      Client: mockClientClass,
    },
    Pool: mockPoolClass,
    Client: mockClientClass,
  }
})

describe('@molecule/api-database-postgresql', () => {
  const originalEnv = { ...process.env }

  beforeEach(() => {
    vi.clearAllMocks()
    // Reset pool constructor mock
    mockPoolClass.mockClear()
  })

  afterEach(() => {
    process.env = { ...originalEnv }
  })

  describe('pool', () => {
    it('should export a pool instance', async () => {
      vi.resetModules()
      const { pool } = await import('../index.js')
      expect(pool).toBeDefined()
      expect(pool.query).toBeDefined()
    })

    it('should create pool without DATABASE_URL', async () => {
      delete process.env.DATABASE_URL
      vi.resetModules()

      const pg = await import('pg')
      vi.mocked(pg.Pool).mockClear()

      const { pool } = await import('../index.js')

      // Trigger lazy initialization by accessing a property on the pool
      void pool.query

      // When DATABASE_URL is not set, Pool is called with no arguments
      expect(pg.Pool).toHaveBeenCalled()
    })

    it('should create pool with DATABASE_URL', async () => {
      process.env.DATABASE_URL = 'postgres://localhost:5432/test'
      vi.resetModules()

      const pg = await import('pg')
      vi.mocked(pg.Pool).mockClear()

      const { pool } = await import('../index.js')

      // Trigger lazy initialization by accessing a property on the pool
      void pool.query

      expect(pg.Pool).toHaveBeenCalledWith({
        connectionString: 'postgres://localhost:5432/test',
        ssl: { rejectUnauthorized: false },
      })
    })
  })

  describe('pool.query()', () => {
    it('should execute a query', async () => {
      vi.resetModules()
      const { pool } = await import('../index.js')

      const mockRows = [{ id: '1', name: 'test' }]
      mockQuery.mockResolvedValueOnce({
        rows: mockRows,
        rowCount: 1,
        command: 'SELECT',
        oid: 0,
        fields: [],
      })

      const result = await pool.query('SELECT * FROM users WHERE id = $1', ['1'])

      expect(mockQuery).toHaveBeenCalledWith('SELECT * FROM users WHERE id = $1', ['1'])
      expect(result.rows).toEqual(mockRows)
      expect(result.rowCount).toBe(1)
    })

    it('should handle query errors', async () => {
      vi.resetModules()
      const { pool } = await import('../index.js')

      const error = new Error('Query failed')
      mockQuery.mockRejectedValueOnce(error)

      await expect(pool.query('INVALID SQL')).rejects.toThrow('Query failed')
    })

    it('should handle parameterized queries', async () => {
      vi.resetModules()
      const { pool } = await import('../index.js')

      mockQuery.mockResolvedValueOnce({
        rows: [],
        rowCount: 1,
        command: 'INSERT',
        oid: 0,
        fields: [],
      })

      await pool.query('INSERT INTO users (name, email) VALUES ($1, $2)', [
        'John',
        'john@example.com',
      ])

      expect(mockQuery).toHaveBeenCalledWith('INSERT INTO users (name, email) VALUES ($1, $2)', [
        'John',
        'john@example.com',
      ])
    })
  })

  describe('createPool()', () => {
    it('should create a new pool with custom config', async () => {
      vi.resetModules()
      const pg = await import('pg')
      vi.mocked(pg.Pool).mockClear()

      const { createPool } = await import('../index.js')

      const customConfig = {
        host: 'custom-host',
        port: 5433,
        database: 'custom-db',
        user: 'custom-user',
        password: 'custom-pass',
      }

      createPool(customConfig)

      // createPool destructures config into pg.Pool options
      expect(pg.Pool).toHaveBeenCalledWith(
        expect.objectContaining({
          host: 'custom-host',
          port: 5433,
          database: 'custom-db',
          user: 'custom-user',
          password: 'custom-pass',
        }),
      )
    })

    it('should create pool with default config when no config provided', async () => {
      vi.resetModules()
      const pg = await import('pg')

      const { createPool } = await import('../index.js')
      vi.mocked(pg.Pool).mockClear()

      createPool()

      expect(pg.Pool).toHaveBeenCalled()
    })
  })

  describe('connection management', () => {
    it('should connect and release connections', async () => {
      vi.resetModules()
      const { pool } = await import('../index.js')

      const client = await pool.connect()

      expect(client).toBeDefined()
      expect(client.query).toBeDefined()
      expect(client.release).toBeDefined()
    })

    it('should close the pool', async () => {
      vi.resetModules()
      const { pool } = await import('../index.js')
      mockEnd.mockClear()

      await pool.end()

      expect(mockEnd).toHaveBeenCalled()
    })

    it('should execute queries on connected client', async () => {
      vi.resetModules()
      const { pool } = await import('../index.js')

      const client = await pool.connect()
      const mockRows = [{ id: '1' }]
      mockQuery.mockResolvedValueOnce({
        rows: mockRows,
        rowCount: 1,
        command: 'SELECT',
        oid: 0,
        fields: [],
      })

      const result = await client.query('SELECT * FROM test')

      expect(result.rows).toEqual(mockRows)
      client.release()
      expect(mockRelease).toHaveBeenCalled()
    })
  })

  describe('pool properties', () => {
    it('should have pool statistics properties', async () => {
      vi.resetModules()
      const { pool } = await import('../index.js')

      const stats = pool.stats()
      expect(stats.total).toBeDefined()
      expect(stats.idle).toBeDefined()
      expect(stats.waiting).toBeDefined()
    })

    // pool.on() is not part of the DatabasePool interface — event listeners are
    // handled at the pg.Pool level, not the wrapped pool.
  })

  describe('type exports', () => {
    it('should export Pool type', async () => {
      vi.resetModules()
      // This is a compile-time check - if types are exported correctly, this will compile
      const module = await import('../index.js')

      // Runtime check that the module exports exist
      expect(module.pool).toBeDefined()
      expect(module.createPool).toBeDefined()
    })
  })

  describe('setup re-export', () => {
    it('should re-export setup module', async () => {
      vi.resetModules()
      const { setup } = await import('../index.js')

      expect(setup).toBeDefined()
      expect(setup.replacements).toBeDefined()
      expect(setup.superSQLFilenames).toBeDefined()
      expect(setup.runSQL).toBeDefined()
      expect(setup.setup).toBeDefined()
    })
  })

  describe('query edge cases', () => {
    it('should handle empty result sets', async () => {
      vi.resetModules()
      const { pool } = await import('../index.js')

      mockQuery.mockResolvedValueOnce({
        rows: [],
        rowCount: 0,
        command: 'SELECT',
        oid: 0,
        fields: [],
      })

      const result = await pool.query('SELECT * FROM empty_table')

      expect(result.rows).toEqual([])
      expect(result.rowCount).toBe(0)
    })

    it('should handle null values in results', async () => {
      vi.resetModules()
      const { pool } = await import('../index.js')

      const mockRows = [{ id: '1', name: null, email: 'test@example.com' }]
      mockQuery.mockResolvedValueOnce({
        rows: mockRows,
        rowCount: 1,
        command: 'SELECT',
        oid: 0,
        fields: [],
      })

      const result = await pool.query('SELECT * FROM users')

      expect(result.rows[0].name).toBeNull()
    })

    it('should handle multiple parameter types', async () => {
      vi.resetModules()
      const { pool } = await import('../index.js')
      mockQuery.mockClear()

      mockQuery.mockResolvedValueOnce({
        rows: [],
        rowCount: 1,
        command: 'INSERT',
        oid: 0,
        fields: [],
      })

      const params = ['string', 123, true, null, new Date('2024-01-01')]
      await pool.query('INSERT INTO test (a, b, c, d, e) VALUES ($1, $2, $3, $4, $5)', params)

      expect(mockQuery).toHaveBeenCalledWith(
        'INSERT INTO test (a, b, c, d, e) VALUES ($1, $2, $3, $4, $5)',
        params,
      )
    })

    it('should handle UPDATE queries', async () => {
      vi.resetModules()
      const { pool } = await import('../index.js')

      mockQuery.mockResolvedValueOnce({
        rows: [],
        rowCount: 2,
        command: 'UPDATE',
        oid: 0,
        fields: [],
      })

      const result = await pool.query('UPDATE users SET status = $1 WHERE active = $2', [
        'inactive',
        false,
      ])

      expect(result.rowCount).toBe(2)
    })

    it('should handle DELETE queries', async () => {
      vi.resetModules()
      const { pool } = await import('../index.js')

      mockQuery.mockResolvedValueOnce({
        rows: [],
        rowCount: 5,
        command: 'DELETE',
        oid: 0,
        fields: [],
      })

      const result = await pool.query('DELETE FROM sessions WHERE expired = $1', [true])

      expect(result.rowCount).toBe(5)
    })
  })
})
