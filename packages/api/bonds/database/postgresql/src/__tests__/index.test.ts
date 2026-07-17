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
    // A safe baseline so accessing the default pool doesn't trip the DATABASE_URL
    // fail-fast in tests that aren't specifically exercising it — those `delete`
    // this to test the throw path instead.
    process.env = { ...originalEnv, DATABASE_URL: 'postgres://localhost:5432/test' }
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
      expect(pool.connect).toBeDefined()
      // transaction() is part of the cross-bond contract (sqlite/mysql implement
      // it too) — without it, transactional code breaks on a swap to postgres.
      expect(pool.transaction).toBeDefined()
    })

    it('FAIL-FAST: throws an actionable "DATABASE_URL is not set" error when the URL is unset, instead of silently connecting to the pg driver defaults', async () => {
      delete process.env.DATABASE_URL
      vi.resetModules()

      const pg = await import('pg')
      vi.mocked(pg.Pool).mockClear()

      const { pool } = await import('../index.js')

      // Before the fix, first use silently constructed a pg.Pool with the driver
      // defaults (localhost:5432, OS user, no password) and only failed LATER on
      // the first query with a raw ECONNREFUSED/auth error — never naming
      // DATABASE_URL as the thing to set. Now lazy init throws immediately.
      expect(() => {
        void pool.query
      }).toThrow(/DATABASE_URL/)
      expect(pg.Pool).not.toHaveBeenCalled()
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
        max: 10,
        connectionTimeoutMillis: 10_000,
        idleTimeoutMillis: 30_000,
      })
    })

    it('defaults pool max to 10, NOT the server max_connections [hostile-default fix]', async () => {
      process.env.DATABASE_URL = 'postgres://localhost:5432/test'
      delete process.env.DATABASE_POOL_MAX
      vi.resetModules()

      const pg = await import('pg')
      vi.mocked(pg.Pool).mockClear()

      const { pool } = await import('../index.js')
      void pool.query

      // A pool max equal to the server's default max_connections (100) lets one
      // app instance consume every slot — starving a second instance, the
      // migrator, and a debugging psql session. pg's own default (10) is safe.
      expect(pg.Pool).toHaveBeenCalledWith(expect.objectContaining({ max: 10 }))
    })

    it('honors DATABASE_POOL_MAX as the tuning knob', async () => {
      process.env.DATABASE_URL = 'postgres://localhost:5432/test'
      process.env.DATABASE_POOL_MAX = '25'
      vi.resetModules()

      const pg = await import('pg')
      vi.mocked(pg.Pool).mockClear()

      const { pool } = await import('../index.js')
      void pool.query

      expect(pg.Pool).toHaveBeenCalledWith(expect.objectContaining({ max: 25 }))
      delete process.env.DATABASE_POOL_MAX
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

  describe('pool.transaction() — cross-bond contract (parity with sqlite/mysql)', () => {
    // pg is mocked (matching this suite), so these assert the BEGIN/COMMIT/
    // ROLLBACK/release SEQUENCE on a dedicated client rather than real row
    // persistence — the sqlite bond's integration test covers real isolation.

    it('begins a transaction on a dedicated client and returns a DatabaseTransaction', async () => {
      vi.resetModules()
      const { pool } = await import('../index.js')
      mockQuery.mockResolvedValue({ rows: [], rowCount: 0, command: 'BEGIN', oid: 0, fields: [] })

      const tx = await pool.transaction!()

      expect(mockQuery).toHaveBeenCalledWith('BEGIN')
      expect(tx.query).toBeDefined()
      expect(tx.commit).toBeDefined()
      expect(tx.rollback).toBeDefined()
      expect(tx.release).toBeDefined()
    })

    it('COMMIT on success: issues COMMIT then releases the client exactly once (row would persist)', async () => {
      vi.resetModules()
      const { pool } = await import('../index.js')
      mockQuery.mockResolvedValue({ rows: [], rowCount: 0, command: 'COMMIT', oid: 0, fields: [] })
      mockRelease.mockClear()

      const tx = await pool.transaction!()
      // The row the caller inserts within the transaction.
      mockQuery.mockResolvedValueOnce({
        rows: [{ id: 'tx-commit' }],
        rowCount: 1,
        command: 'INSERT',
        oid: 0,
        fields: [],
      })
      const inserted = await tx.query('INSERT INTO "todos" ("id") VALUES ($1) RETURNING *', [
        'tx-commit',
      ])
      await tx.commit()

      expect(inserted.rows).toEqual([{ id: 'tx-commit' }])
      expect(mockQuery).toHaveBeenCalledWith('COMMIT')
      expect(mockQuery).not.toHaveBeenCalledWith('ROLLBACK')
      expect(mockRelease).toHaveBeenCalledTimes(1)
    })

    it('ROLLBACK on throw: a failed query rolls back (never COMMITs) and releases once (row would NOT persist)', async () => {
      vi.resetModules()
      const { pool } = await import('../index.js')
      mockQuery.mockResolvedValue({ rows: [], rowCount: 0, command: 'BEGIN', oid: 0, fields: [] })
      mockRelease.mockClear()

      const tx = await pool.transaction!()

      // Simulate the documented usage: run work, roll back on error, always
      // release. The insert rejects (e.g. a constraint violation).
      mockQuery.mockRejectedValueOnce(new Error('constraint violation'))
      let threw = false
      try {
        await tx.query('INSERT INTO "todos" ("id") VALUES ($1)', ['dup'])
        await tx.commit()
      } catch (_error) {
        // Intentionally ignore the error value — this test asserts the ROLLBACK
        // path runs, not the specific error surfaced by the failed insert.
        await tx.rollback()
        threw = true
      }

      expect(threw).toBe(true)
      expect(mockQuery).toHaveBeenCalledWith('ROLLBACK')
      expect(mockQuery).not.toHaveBeenCalledWith('COMMIT')
      expect(mockRelease).toHaveBeenCalledTimes(1)
    })

    it('the returned transaction is a working connection: tx.query routes to the dedicated client and adapts the pg result', async () => {
      vi.resetModules()
      const { pool } = await import('../index.js')
      mockQuery.mockResolvedValue({ rows: [], rowCount: 0, command: 'BEGIN', oid: 0, fields: [] })

      const tx = await pool.transaction!()
      // Statements run inside the transaction go through tx.query (same shape as
      // the sqlite/mysql bonds — see the sqlite integration test) and get the
      // same { rows, rowCount, fields } adaptation as pool.query.
      mockQuery.mockResolvedValueOnce({
        rows: [{ id: 'in-tx', title: 'hi' }],
        rowCount: 1,
        command: 'INSERT',
        oid: 0,
        fields: [{ name: 'id', dataTypeID: 25 }],
      })

      const result = await tx.query(
        'INSERT INTO "todos" ("id", "title") VALUES ($1, $2) RETURNING *',
        ['in-tx', 'hi'],
      )

      expect(result.rows).toEqual([{ id: 'in-tx', title: 'hi' }])
      expect(result.rowCount).toBe(1)
      expect(result.fields).toEqual([{ name: 'id', dataTypeID: 25 }])
    })

    it('releases the client (no leak) when BEGIN itself fails', async () => {
      vi.resetModules()
      const { pool } = await import('../index.js')
      mockRelease.mockClear()
      mockQuery.mockRejectedValueOnce(new Error('cannot start transaction'))

      await expect(pool.transaction!()).rejects.toThrow('cannot start transaction')
      expect(mockRelease).toHaveBeenCalledTimes(1)
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
      expect(setup.runSQL).toBeDefined()
      expect(setup.setup).toBeDefined()
    })
  })

  describe('secret definitions', () => {
    it('registers DATABASE_URL in the @molecule/api-secrets registry when the barrel is imported', async () => {
      vi.resetModules()
      await import('../index.js')
      const { getSecretDefinition } = await import('@molecule/api-secrets')
      expect(getSecretDefinition('DATABASE_URL')).toBeDefined()
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

  describe('LIKE operator — cross-bond contract (case-insensitive, raw pattern)', () => {
    let store: Store

    beforeEach(async () => {
      vi.resetModules()
      const { createStore } = await import('../store.js')
      const { pool } = await import('../index.js')
      mockQuery.mockResolvedValue({ rows: [], rowCount: 0, command: 'SELECT', oid: 0, fields: [] })
      store = createStore(pool)
    })

    it('emits ILIKE (case-insensitive), not LIKE, to match the sqlite/mysql default', async () => {
      await store.findMany('users', { where: [{ field: 'name', operator: 'like', value: '100%' }] })
      const callArgs = mockQuery.mock.calls[mockQuery.mock.calls.length - 1]
      expect(callArgs[0]).toContain('ILIKE')
    })

    it('does NOT escape % — the caller-supplied wildcard is honored as a pattern', async () => {
      await store.findMany('users', { where: [{ field: 'name', operator: 'like', value: '100%' }] })
      const callArgs = mockQuery.mock.calls[mockQuery.mock.calls.length - 1]
      expect(callArgs[1]).toEqual(['100%'])
    })

    it('does NOT escape _ — the caller-supplied wildcard is honored as a pattern', async () => {
      await store.findMany('users', { where: [{ field: 'name', operator: 'like', value: 'a_b' }] })
      const callArgs = mockQuery.mock.calls[mockQuery.mock.calls.length - 1]
      expect(callArgs[1]).toEqual(['a_b'])
    })

    it('whitelists ORDER BY direction — never interpolates raw caller input [M7-1]', async () => {
      // Cast bypasses the 'asc'|'desc' type to simulate hand-written/AI-generated code that
      // routes unvalidated input into direction. The bond must coerce to ASC, not interpolate.
      await store.findMany('users', {
        orderBy: [{ field: 'name', direction: 'desc); DROP TABLE users; --' as 'asc' | 'desc' }],
      })
      const sql = mockQuery.mock.calls[mockQuery.mock.calls.length - 1][0] as string
      expect(sql).toContain('ORDER BY "name" ASC') // unrecognized direction → ASC
      expect(sql).not.toContain('DROP TABLE')
    })

    it('emits DESC only for a literal desc direction [M7-1]', async () => {
      await store.findMany('users', { orderBy: [{ field: 'name', direction: 'desc' }] })
      const sql = mockQuery.mock.calls[mockQuery.mock.calls.length - 1][0] as string
      expect(sql).toContain('ORDER BY "name" DESC')
    })

    it('does NOT escape a literal backslash — passed through verbatim', async () => {
      await store.findMany('users', { where: [{ field: 'name', operator: 'like', value: 'a\\b' }] })
      const callArgs = mockQuery.mock.calls[mockQuery.mock.calls.length - 1]
      expect(callArgs[1]).toEqual(['a\\b'])
    })

    it('passes normal strings unchanged', async () => {
      await store.findMany('users', {
        where: [{ field: 'name', operator: 'like', value: 'hello' }],
      })
      const callArgs = mockQuery.mock.calls[mockQuery.mock.calls.length - 1]
      expect(callArgs[1]).toContain('hello')
    })
  })

  describe('ILIKE operator', () => {
    let store: Store

    beforeEach(async () => {
      vi.resetModules()
      const { createStore } = await import('../store.js')
      const { pool } = await import('../index.js')
      mockQuery.mockResolvedValue({ rows: [], rowCount: 0, command: 'SELECT', oid: 0, fields: [] })
      store = createStore(pool)
    })

    it('emits ILIKE with %-wrapped value for case-insensitive contains', async () => {
      await store.findMany('users', {
        where: [{ field: 'name', operator: 'ilike', value: 'Postgres' }],
      })
      const callArgs = mockQuery.mock.calls[mockQuery.mock.calls.length - 1]
      expect(callArgs[0]).toContain('ILIKE')
      expect(callArgs[1]).toEqual(['%Postgres%'])
    })

    it('escapes LIKE metacharacters in the value before wrapping', async () => {
      await store.findMany('users', {
        where: [{ field: 'name', operator: 'ilike', value: '50%' }],
      })
      const callArgs = mockQuery.mock.calls[mockQuery.mock.calls.length - 1]
      expect(callArgs[1]).toEqual(['%50\\%%'])
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
