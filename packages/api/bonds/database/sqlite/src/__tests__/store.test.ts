import { beforeEach, describe, expect, it, vi } from 'vitest'

import type { DatabasePool } from '@molecule/api-database'

import { createStore } from '../store.js'

function createMockPool(): DatabasePool & { query: ReturnType<typeof vi.fn> } {
  return {
    query: vi.fn(),
    connect: vi.fn(),
    end: vi.fn(),
  } as unknown as DatabasePool & { query: ReturnType<typeof vi.fn> }
}

describe('createStore', () => {
  let mockPool: ReturnType<typeof createMockPool>
  let store: ReturnType<typeof createStore>

  beforeEach(() => {
    mockPool = createMockPool()
    store = createStore(mockPool)
    vi.clearAllMocks()
  })

  describe('findById', () => {
    it('should query with correct SQL and return the first row', async () => {
      const row = { id: '1', name: 'Alice' }
      mockPool.query.mockResolvedValueOnce({ rows: [row], rowCount: 1 })

      const result = await store.findById('users', '1')

      expect(mockPool.query).toHaveBeenCalledWith('SELECT * FROM "users" WHERE "id" = ? LIMIT 1', [
        '1',
      ])
      expect(result).toEqual(row)
    })

    it('should return null when no row is found', async () => {
      mockPool.query.mockResolvedValueOnce({ rows: [], rowCount: 0 })

      const result = await store.findById('users', '999')

      expect(result).toBeNull()
    })

    it('should accept numeric id', async () => {
      mockPool.query.mockResolvedValueOnce({ rows: [{ id: 42 }], rowCount: 1 })

      await store.findById('users', 42)

      expect(mockPool.query).toHaveBeenCalledWith(
        'SELECT * FROM "users" WHERE "id" = ? LIMIT 1',
        [42],
      )
    })
  })

  describe('findOne', () => {
    it('should build WHERE clause from conditions', async () => {
      const row = { id: '1', status: 'active' }
      mockPool.query.mockResolvedValueOnce({ rows: [row], rowCount: 1 })

      const result = await store.findOne('users', [
        { field: 'status', operator: '=', value: 'active' },
      ])

      expect(mockPool.query).toHaveBeenCalledWith(
        'SELECT * FROM "users" WHERE "status" = ? LIMIT 1',
        ['active'],
      )
      expect(result).toEqual(row)
    })

    it('should return null when no match is found', async () => {
      mockPool.query.mockResolvedValueOnce({ rows: [], rowCount: 0 })

      const result = await store.findOne('users', [
        { field: 'email', operator: '=', value: 'nobody@example.com' },
      ])

      expect(result).toBeNull()
    })

    it('should combine multiple conditions with AND', async () => {
      mockPool.query.mockResolvedValueOnce({ rows: [{ id: '1' }], rowCount: 1 })

      await store.findOne('users', [
        { field: 'status', operator: '=', value: 'active' },
        { field: 'role', operator: '=', value: 'admin' },
      ])

      expect(mockPool.query).toHaveBeenCalledWith(
        'SELECT * FROM "users" WHERE "status" = ? AND "role" = ? LIMIT 1',
        ['active', 'admin'],
      )
    })
  })

  describe('findMany', () => {
    it('should return all rows when no options are provided', async () => {
      const rows = [{ id: '1' }, { id: '2' }]
      mockPool.query.mockResolvedValueOnce({ rows, rowCount: 2 })

      const result = await store.findMany('users')

      expect(mockPool.query).toHaveBeenCalledWith('SELECT * FROM "users"', [])
      expect(result).toEqual(rows)
    })

    it('should support where conditions', async () => {
      mockPool.query.mockResolvedValueOnce({ rows: [], rowCount: 0 })

      await store.findMany('users', {
        where: [{ field: 'active', operator: '=', value: true }],
      })

      expect(mockPool.query).toHaveBeenCalledWith(expect.stringContaining('WHERE "active" = ?'), [
        true,
      ])
    })

    it('should support orderBy', async () => {
      mockPool.query.mockResolvedValueOnce({ rows: [], rowCount: 0 })

      await store.findMany('users', {
        orderBy: [{ field: 'name', direction: 'asc' }],
      })

      expect(mockPool.query).toHaveBeenCalledWith(
        expect.stringContaining('ORDER BY "name" ASC'),
        [],
      )
    })

    it('should support multiple orderBy fields', async () => {
      mockPool.query.mockResolvedValueOnce({ rows: [], rowCount: 0 })

      await store.findMany('users', {
        orderBy: [
          { field: 'name', direction: 'asc' },
          { field: 'created_at', direction: 'desc' },
        ],
      })

      expect(mockPool.query).toHaveBeenCalledWith(
        expect.stringContaining('ORDER BY "name" ASC, "created_at" DESC'),
        [],
      )
    })

    it('should support limit', async () => {
      mockPool.query.mockResolvedValueOnce({ rows: [], rowCount: 0 })

      await store.findMany('users', { limit: 10 })

      expect(mockPool.query).toHaveBeenCalledWith(expect.stringContaining('LIMIT 10'), [])
    })

    it('should support offset', async () => {
      mockPool.query.mockResolvedValueOnce({ rows: [], rowCount: 0 })

      await store.findMany('users', { offset: 20 })

      expect(mockPool.query).toHaveBeenCalledWith(expect.stringContaining('OFFSET 20'), [])
    })

    it('should support select to choose specific columns', async () => {
      mockPool.query.mockResolvedValueOnce({ rows: [], rowCount: 0 })

      await store.findMany('users', { select: ['id', 'name', 'email'] })

      expect(mockPool.query).toHaveBeenCalledWith(
        expect.stringContaining('SELECT "id", "name", "email"'),
        [],
      )
    })

    it('should combine all options together', async () => {
      mockPool.query.mockResolvedValueOnce({ rows: [{ id: '3' }], rowCount: 1 })

      await store.findMany('users', {
        where: [{ field: 'active', operator: '=', value: true }],
        orderBy: [{ field: 'name', direction: 'asc' }],
        limit: 5,
        offset: 10,
        select: ['id', 'name'],
      })

      const sql = mockPool.query.mock.calls[0][0] as string
      expect(sql).toContain('SELECT "id", "name"')
      expect(sql).toContain('FROM "users"')
      expect(sql).toContain('WHERE "active" = ?')
      expect(sql).toContain('ORDER BY "name" ASC')
      expect(sql).toContain('LIMIT 5')
      expect(sql).toContain('OFFSET 10')
      expect(mockPool.query).toHaveBeenCalledWith(sql, [true])
    })
  })

  describe('count', () => {
    it('should return numeric count with no conditions', async () => {
      mockPool.query.mockResolvedValueOnce({ rows: [{ count: 42 }], rowCount: 1 })

      const result = await store.count('users')

      expect(mockPool.query).toHaveBeenCalledWith('SELECT COUNT(*) AS "count" FROM "users" ', [])
      expect(result).toBe(42)
    })

    it('should support where conditions', async () => {
      mockPool.query.mockResolvedValueOnce({ rows: [{ count: 5 }], rowCount: 1 })

      const result = await store.count('users', [{ field: 'active', operator: '=', value: true }])

      expect(mockPool.query).toHaveBeenCalledWith(
        'SELECT COUNT(*) AS "count" FROM "users" WHERE "active" = ?',
        [true],
      )
      expect(result).toBe(5)
    })

    it('should return 0 when no rows match', async () => {
      mockPool.query.mockResolvedValueOnce({ rows: [{ count: 0 }], rowCount: 1 })

      const result = await store.count('users', [{ field: 'deleted', operator: '=', value: true }])

      expect(result).toBe(0)
    })

    it('should return 0 when rows array is empty', async () => {
      mockPool.query.mockResolvedValueOnce({ rows: [], rowCount: 0 })

      const result = await store.count('users')

      expect(result).toBe(0)
    })
  })

  describe('create', () => {
    it('should insert a record and return MutationResult', async () => {
      const created = { id: '1', name: 'Alice', email: 'alice@example.com' }
      mockPool.query.mockResolvedValueOnce({ rows: [created], rowCount: 1 })

      const result = await store.create('users', { name: 'Alice', email: 'alice@example.com' })

      expect(mockPool.query).toHaveBeenCalledWith(
        'INSERT INTO "users" ("name", "email") VALUES (?, ?) RETURNING *',
        ['Alice', 'alice@example.com'],
      )
      expect(result).toEqual({ data: created, affected: 1 })
    })

    it('should handle single field insert', async () => {
      mockPool.query.mockResolvedValueOnce({ rows: [{ id: '1', name: 'Bob' }], rowCount: 1 })

      await store.create('users', { name: 'Bob' })

      expect(mockPool.query).toHaveBeenCalledWith(
        'INSERT INTO "users" ("name") VALUES (?) RETURNING *',
        ['Bob'],
      )
    })

    it('should return null data when no rows are returned', async () => {
      mockPool.query.mockResolvedValueOnce({ rows: [], rowCount: 0 })

      const result = await store.create('users', { name: 'Alice' })

      expect(result).toEqual({ data: null, affected: 0 })
    })
  })

  describe('updateById', () => {
    it('should update by id and return MutationResult', async () => {
      const updated = { id: '1', name: 'Updated' }
      mockPool.query.mockResolvedValueOnce({ rows: [updated], rowCount: 1 })

      const result = await store.updateById('users', '1', { name: 'Updated' })

      expect(mockPool.query).toHaveBeenCalledWith(
        'UPDATE "users" SET "name" = ? WHERE "id" = ? RETURNING *',
        ['Updated', '1'],
      )
      expect(result).toEqual({ data: updated, affected: 1 })
    })

    it('should handle multiple fields in update', async () => {
      const updated = { id: '1', name: 'Updated', email: 'new@example.com' }
      mockPool.query.mockResolvedValueOnce({ rows: [updated], rowCount: 1 })

      await store.updateById('users', '1', { name: 'Updated', email: 'new@example.com' })

      expect(mockPool.query).toHaveBeenCalledWith(
        'UPDATE "users" SET "name" = ?, "email" = ? WHERE "id" = ? RETURNING *',
        ['Updated', 'new@example.com', '1'],
      )
    })

    it('should return null data when row not found', async () => {
      mockPool.query.mockResolvedValueOnce({ rows: [], rowCount: 0 })

      const result = await store.updateById('users', '999', { name: 'Ghost' })

      expect(result).toEqual({ data: null, affected: 0 })
    })
  })

  describe('updateMany', () => {
    it('should update with WHERE clause and return affected count', async () => {
      mockPool.query.mockResolvedValueOnce({ rows: [], rowCount: 3 })

      const result = await store.updateMany(
        'users',
        [{ field: 'active', operator: '=', value: false }],
        { status: 'archived' },
      )

      expect(mockPool.query).toHaveBeenCalledWith(
        'UPDATE "users" SET "status" = ? WHERE "active" = ?',
        ['archived', false],
      )
      expect(result).toEqual({ data: null, affected: 3 })
    })

    it('should handle multiple where conditions and data fields', async () => {
      mockPool.query.mockResolvedValueOnce({ rows: [], rowCount: 2 })

      await store.updateMany(
        'users',
        [
          { field: 'role', operator: '=', value: 'user' },
          { field: 'verified', operator: '=', value: true },
        ],
        { tier: 'premium', updated_at: '2024-01-01' },
      )

      expect(mockPool.query).toHaveBeenCalledWith(
        'UPDATE "users" SET "tier" = ?, "updated_at" = ? WHERE "role" = ? AND "verified" = ?',
        ['premium', '2024-01-01', 'user', true],
      )
    })
  })

  describe('deleteById', () => {
    it('should delete by id and return affected count', async () => {
      mockPool.query.mockResolvedValueOnce({ rows: [], rowCount: 1 })

      const result = await store.deleteById('users', '1')

      expect(mockPool.query).toHaveBeenCalledWith('DELETE FROM "users" WHERE "id" = ?', ['1'])
      expect(result).toEqual({ data: null, affected: 1 })
    })

    it('should return zero affected when row not found', async () => {
      mockPool.query.mockResolvedValueOnce({ rows: [], rowCount: 0 })

      const result = await store.deleteById('users', '999')

      expect(result).toEqual({ data: null, affected: 0 })
    })
  })

  describe('deleteMany', () => {
    it('should delete with WHERE clause', async () => {
      mockPool.query.mockResolvedValueOnce({ rows: [], rowCount: 5 })

      const result = await store.deleteMany('users', [
        { field: 'active', operator: '=', value: false },
      ])

      expect(mockPool.query).toHaveBeenCalledWith('DELETE FROM "users" WHERE "active" = ?', [false])
      expect(result).toEqual({ data: null, affected: 5 })
    })

    it('should handle multiple where conditions', async () => {
      mockPool.query.mockResolvedValueOnce({ rows: [], rowCount: 2 })

      await store.deleteMany('users', [
        { field: 'role', operator: '=', value: 'guest' },
        { field: 'created_at', operator: '<', value: '2023-01-01' },
      ])

      expect(mockPool.query).toHaveBeenCalledWith(
        'DELETE FROM "users" WHERE "role" = ? AND "created_at" < ?',
        ['guest', '2023-01-01'],
      )
    })
  })

  describe('WHERE operators', () => {
    it('should handle = operator', async () => {
      mockPool.query.mockResolvedValueOnce({ rows: [], rowCount: 0 })

      await store.findOne('users', [{ field: 'name', operator: '=', value: 'Alice' }])

      expect(mockPool.query).toHaveBeenCalledWith(
        'SELECT * FROM "users" WHERE "name" = ? LIMIT 1',
        ['Alice'],
      )
    })

    it('should handle != operator', async () => {
      mockPool.query.mockResolvedValueOnce({ rows: [], rowCount: 0 })

      await store.findMany('users', {
        where: [{ field: 'status', operator: '!=', value: 'deleted' }],
      })

      expect(mockPool.query).toHaveBeenCalledWith(expect.stringContaining('WHERE "status" != ?'), [
        'deleted',
      ])
    })

    it('should handle > operator', async () => {
      mockPool.query.mockResolvedValueOnce({ rows: [], rowCount: 0 })

      await store.findMany('users', {
        where: [{ field: 'age', operator: '>', value: 18 }],
      })

      expect(mockPool.query).toHaveBeenCalledWith(expect.stringContaining('WHERE "age" > ?'), [18])
    })

    it('should handle < operator', async () => {
      mockPool.query.mockResolvedValueOnce({ rows: [], rowCount: 0 })

      await store.findMany('users', {
        where: [{ field: 'age', operator: '<', value: 65 }],
      })

      expect(mockPool.query).toHaveBeenCalledWith(expect.stringContaining('WHERE "age" < ?'), [65])
    })

    it('should handle >= operator', async () => {
      mockPool.query.mockResolvedValueOnce({ rows: [], rowCount: 0 })

      await store.findMany('users', {
        where: [{ field: 'score', operator: '>=', value: 90 }],
      })

      expect(mockPool.query).toHaveBeenCalledWith(
        expect.stringContaining('WHERE "score" >= ?'),
        [90],
      )
    })

    it('should handle <= operator', async () => {
      mockPool.query.mockResolvedValueOnce({ rows: [], rowCount: 0 })

      await store.findMany('users', {
        where: [{ field: 'score', operator: '<=', value: 50 }],
      })

      expect(mockPool.query).toHaveBeenCalledWith(
        expect.stringContaining('WHERE "score" <= ?'),
        [50],
      )
    })

    it('should handle in operator', async () => {
      mockPool.query.mockResolvedValueOnce({ rows: [], rowCount: 0 })

      await store.findMany('users', {
        where: [{ field: 'role', operator: 'in', value: ['admin', 'editor', 'viewer'] }],
      })

      expect(mockPool.query).toHaveBeenCalledWith(
        expect.stringContaining('WHERE "role" IN (?, ?, ?)'),
        ['admin', 'editor', 'viewer'],
      )
    })

    it('should handle not_in operator', async () => {
      mockPool.query.mockResolvedValueOnce({ rows: [], rowCount: 0 })

      await store.findMany('users', {
        where: [{ field: 'status', operator: 'not_in', value: ['banned', 'deleted'] }],
      })

      expect(mockPool.query).toHaveBeenCalledWith(
        expect.stringContaining('WHERE "status" NOT IN (?, ?)'),
        ['banned', 'deleted'],
      )
    })

    it('should handle like operator', async () => {
      mockPool.query.mockResolvedValueOnce({ rows: [], rowCount: 0 })

      await store.findMany('users', {
        where: [{ field: 'name', operator: 'like', value: '%alice%' }],
      })

      expect(mockPool.query).toHaveBeenCalledWith(expect.stringContaining('WHERE "name" LIKE ?'), [
        '%alice%',
      ])
    })

    it('should handle is_null operator', async () => {
      mockPool.query.mockResolvedValueOnce({ rows: [], rowCount: 0 })

      await store.findMany('users', {
        where: [{ field: 'deleted_at', operator: 'is_null' }],
      })

      expect(mockPool.query).toHaveBeenCalledWith(
        expect.stringContaining('WHERE "deleted_at" IS NULL'),
        [],
      )
    })

    it('should handle is_not_null operator', async () => {
      mockPool.query.mockResolvedValueOnce({ rows: [], rowCount: 0 })

      await store.findMany('users', {
        where: [{ field: 'verified_at', operator: 'is_not_null' }],
      })

      expect(mockPool.query).toHaveBeenCalledWith(
        expect.stringContaining('WHERE "verified_at" IS NOT NULL'),
        [],
      )
    })

    it('should combine multiple different operators with AND', async () => {
      mockPool.query.mockResolvedValueOnce({ rows: [], rowCount: 0 })

      await store.findMany('users', {
        where: [
          { field: 'active', operator: '=', value: true },
          { field: 'age', operator: '>=', value: 18 },
          { field: 'role', operator: 'in', value: ['admin', 'editor'] },
          { field: 'deleted_at', operator: 'is_null' },
        ],
      })

      const sql = mockPool.query.mock.calls[0][0] as string
      expect(sql).toContain('"active" = ?')
      expect(sql).toContain('"age" >= ?')
      expect(sql).toContain('"role" IN (?, ?)')
      expect(sql).toContain('"deleted_at" IS NULL')
      expect(mockPool.query).toHaveBeenCalledWith(sql, [true, 18, 'admin', 'editor'])
    })
  })
})
