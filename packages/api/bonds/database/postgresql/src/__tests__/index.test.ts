import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import type { createStore } from '../store.js'

type Store = Awaited<ReturnType<typeof createStore>>

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
        ssl: false,
        max: 100,
        connectionTimeoutMillis: 10_000,
        idleTimeoutMillis: 30_000,
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

  describe('SQL identifier validation (assertSafeIdentifier)', () => {
    let store: Store

    beforeEach(async () => {
      vi.resetModules()
      const { createStore } = await import('../store.js')
      const { pool } = await import('../index.js')
      mockQuery.mockResolvedValue({ rows: [], rowCount: 0, command: 'SELECT', oid: 0, fields: [] })
      store = createStore(pool)
    })

    describe('valid identifiers should be accepted', () => {
      it.each(['users', 'created_at', '_private', 'A123'])('accepts "%s"', async (name) => {
        await expect(store.findById(name, '1')).resolves.not.toThrow()
      })
    })

    describe('invalid identifiers should throw', () => {
      it.each([
        ['SQL injection', 'users; DROP TABLE'],
        ['double quote', 'col"name'],
        ['starts with digit', '123col'],
        ['empty string', ''],
        ['contains space', 'col name'],
        ['backtick', 'col`name'],
      ])('rejects %s: "%s"', async (_label, name) => {
        await expect(store.findById(name, '1')).rejects.toThrow('Invalid SQL identifier')
      })
    })

    describe('enforced on table names', () => {
      const bad = 'users; DROP TABLE'

      it('findById rejects unsafe table', async () => {
        await expect(store.findById(bad, '1')).rejects.toThrow('Invalid SQL identifier')
      })

      it('findOne rejects unsafe table', async () => {
        await expect(
          store.findOne(bad, [{ field: 'id', operator: '=', value: '1' }]),
        ).rejects.toThrow('Invalid SQL identifier')
      })

      it('findMany rejects unsafe table', async () => {
        await expect(store.findMany(bad)).rejects.toThrow('Invalid SQL identifier')
      })

      it('create rejects unsafe table', async () => {
        await expect(store.create(bad, { name: 'x' })).rejects.toThrow('Invalid SQL identifier')
      })

      it('updateById rejects unsafe table', async () => {
        await expect(store.updateById(bad, '1', { name: 'x' })).rejects.toThrow(
          'Invalid SQL identifier',
        )
      })

      it('deleteById rejects unsafe table', async () => {
        await expect(store.deleteById(bad, '1')).rejects.toThrow('Invalid SQL identifier')
      })
    })

    describe('enforced on column names in WHERE conditions', () => {
      it('rejects unsafe field in WHERE', async () => {
        await expect(
          store.findOne('users', [{ field: 'col"inject', operator: '=', value: '1' }]),
        ).rejects.toThrow('Invalid SQL identifier')
      })
    })

    describe('enforced on column names in ORDER BY', () => {
      it('rejects unsafe field in orderBy', async () => {
        await expect(
          store.findMany('users', { orderBy: [{ field: 'col; DROP', direction: 'asc' }] }),
        ).rejects.toThrow('Invalid SQL identifier')
      })
    })

    describe('enforced on column names in SELECT', () => {
      it('rejects unsafe field in select', async () => {
        await expect(store.findMany('users', { select: ['id', 'col"name'] })).rejects.toThrow(
          'Invalid SQL identifier',
        )
      })
    })

    describe('enforced on column names in INSERT/UPDATE data keys', () => {
      it('rejects unsafe key in create data', async () => {
        await expect(store.create('users', { 'col; DROP': 'value' })).rejects.toThrow(
          'Invalid SQL identifier',
        )
      })

      it('rejects unsafe key in updateById data', async () => {
        await expect(store.updateById('users', '1', { 'col"name': 'value' })).rejects.toThrow(
          'Invalid SQL identifier',
        )
      })
    })
  })

  describe('LIKE operator escaping', () => {
    let store: Store

    beforeEach(async () => {
      vi.resetModules()
      const { createStore } = await import('../store.js')
      const { pool } = await import('../index.js')
      mockQuery.mockResolvedValue({ rows: [], rowCount: 0, command: 'SELECT', oid: 0, fields: [] })
      store = createStore(pool)
    })

    it('escapes % to \\%', async () => {
      await store.findMany('users', { where: [{ field: 'name', operator: 'like', value: '100%' }] })
      const callArgs = mockQuery.mock.calls[mockQuery.mock.calls.length - 1]
      expect(callArgs[1]).toContain('100\\%')
    })

    it('escapes _ to \\_', async () => {
      await store.findMany('users', { where: [{ field: 'name', operator: 'like', value: 'a_b' }] })
      const callArgs = mockQuery.mock.calls[mockQuery.mock.calls.length - 1]
      expect(callArgs[1]).toContain('a\\_b')
    })

    it('escapes \\ to \\\\', async () => {
      await store.findMany('users', { where: [{ field: 'name', operator: 'like', value: 'a\\b' }] })
      const callArgs = mockQuery.mock.calls[mockQuery.mock.calls.length - 1]
      expect(callArgs[1]).toContain('a\\\\b')
    })

    it('passes normal strings unchanged', async () => {
      await store.findMany('users', {
        where: [{ field: 'name', operator: 'like', value: 'hello' }],
      })
      const callArgs = mockQuery.mock.calls[mockQuery.mock.calls.length - 1]
      expect(callArgs[1]).toContain('hello')
    })
  })

  describe('updateMany/deleteMany WHERE requirement', () => {
    let store: Store

    beforeEach(async () => {
      vi.resetModules()
      const { createStore } = await import('../store.js')
      const { pool } = await import('../index.js')
      mockQuery.mockResolvedValue({ rows: [], rowCount: 0, command: 'UPDATE', oid: 0, fields: [] })
      store = createStore(pool)
    })

    it('updateMany with empty where throws', async () => {
      await expect(store.updateMany('users', [], { name: 'x' })).rejects.toThrow(
        'requires at least one WHERE condition',
      )
    })

    it('deleteMany with empty where throws', async () => {
      await expect(store.deleteMany('users', [])).rejects.toThrow(
        'requires at least one WHERE condition',
      )
    })

    it('updateMany works with at least one condition', async () => {
      await expect(
        store.updateMany('users', [{ field: 'active', operator: '=', value: false }], {
          name: 'x',
        }),
      ).resolves.not.toThrow()
    })

    it('deleteMany works with at least one condition', async () => {
      await expect(
        store.deleteMany('users', [{ field: 'active', operator: '=', value: false }]),
      ).resolves.not.toThrow()
    })
  })

  describe('default LIMIT cap', () => {
    let store: Store

    beforeEach(async () => {
      vi.resetModules()
      const { createStore } = await import('../store.js')
      const { pool } = await import('../index.js')
      mockQuery.mockResolvedValue({ rows: [], rowCount: 0, command: 'SELECT', oid: 0, fields: [] })
      store = createStore(pool)
    })

    it('applies LIMIT 10000 when no limit specified', async () => {
      await store.findMany('users')
      const sql = mockQuery.mock.calls[mockQuery.mock.calls.length - 1][0] as string
      expect(sql).toContain('LIMIT 10000')
    })

    it('caps limit at 10000 when limit exceeds 10000', async () => {
      await store.findMany('users', { limit: 50000 })
      const sql = mockQuery.mock.calls[mockQuery.mock.calls.length - 1][0] as string
      expect(sql).toContain('LIMIT 10000')
    })

    it('uses specified limit when under 10000', async () => {
      await store.findMany('users', { limit: 25 })
      const sql = mockQuery.mock.calls[mockQuery.mock.calls.length - 1][0] as string
      expect(sql).toContain('LIMIT 25')
    })
  })

  describe('offset validation', () => {
    let store: Store

    beforeEach(async () => {
      vi.resetModules()
      const { createStore } = await import('../store.js')
      const { pool } = await import('../index.js')
      mockQuery.mockResolvedValue({ rows: [], rowCount: 0, command: 'SELECT', oid: 0, fields: [] })
      store = createStore(pool)
    })

    it('treats negative offset as 0 (no OFFSET clause)', async () => {
      await store.findMany('users', { offset: -5 })
      const sql = mockQuery.mock.calls[mockQuery.mock.calls.length - 1][0] as string
      expect(sql).not.toContain('OFFSET')
    })

    it('floors non-integer offset', async () => {
      await store.findMany('users', { offset: 10.7 })
      const sql = mockQuery.mock.calls[mockQuery.mock.calls.length - 1][0] as string
      expect(sql).toContain('OFFSET 10')
      expect(sql).not.toContain('OFFSET 10.7')
    })
  })

  describe('default operator rejection', () => {
    let store: Store

    beforeEach(async () => {
      vi.resetModules()
      const { createStore } = await import('../store.js')
      const { pool } = await import('../index.js')
      mockQuery.mockResolvedValue({ rows: [], rowCount: 0, command: 'SELECT', oid: 0, fields: [] })
      store = createStore(pool)
    })

    it('throws on unknown operator', async () => {
      await expect(
        store.findMany('users', {
          where: [{ field: 'name', operator: 'BOGUS' as '=', value: 'x' }],
        }),
      ).rejects.toThrow('Invalid SQL operator')
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
