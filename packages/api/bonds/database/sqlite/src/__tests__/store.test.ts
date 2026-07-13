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
    it('should return all rows when no options are provided (default LIMIT cap applied)', async () => {
      const rows = [{ id: '1' }, { id: '2' }]
      mockPool.query.mockResolvedValueOnce({ rows, rowCount: 2 })

      const result = await store.findMany('users')

      const sql = mockPool.query.mock.calls[0][0] as string
      expect(sql).toContain('SELECT * FROM "users"')
      // A default LIMIT 10000 is applied to prevent unbounded scans.
      expect(sql).toContain('LIMIT 10000')
      expect(mockPool.query).toHaveBeenCalledWith(sql, [])
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
    it('should insert a record and return MutationResult (explicit id skips id-gen)', async () => {
      const created = { id: '1', name: 'Alice', email: 'alice@example.com' }
      mockPool.query.mockResolvedValueOnce({ rows: [created], rowCount: 1 })

      const result = await store.create('users', {
        id: '1',
        name: 'Alice',
        email: 'alice@example.com',
      })

      expect(mockPool.query).toHaveBeenCalledWith(
        'INSERT INTO "users" ("id", "name", "email") VALUES (?, ?, ?) RETURNING *',
        ['1', 'Alice', 'alice@example.com'],
      )
      expect(result).toEqual({ data: created, affected: 1 })
    })

    it('should handle single field insert (explicit id)', async () => {
      mockPool.query.mockResolvedValueOnce({ rows: [{ id: '1', name: 'Bob' }], rowCount: 1 })

      await store.create('users', { id: '1', name: 'Bob' })

      expect(mockPool.query).toHaveBeenCalledWith(
        'INSERT INTO "users" ("id", "name") VALUES (?, ?) RETURNING *',
        ['1', 'Bob'],
      )
    })

    it('should return null data when no rows are returned', async () => {
      mockPool.query.mockResolvedValueOnce({ rows: [{ x: 1 }], rowCount: 1 }) // pragma: has id
      mockPool.query.mockResolvedValueOnce({ rows: [], rowCount: 0 }) // insert

      const result = await store.create('users', { name: 'Alice' })

      expect(result).toEqual({ data: null, affected: 0 })
    })

    it('generates a uuid id when omitted and the table has an id column', async () => {
      mockPool.query.mockResolvedValueOnce({ rows: [{ x: 1 }], rowCount: 1 }) // pragma: has id
      mockPool.query.mockResolvedValueOnce({ rows: [{ id: 'gen', name: 'Cara' }], rowCount: 1 })

      await store.create('contacts', { name: 'Cara' })

      // calls[0] is the id-column probe, calls[1] is the insert with a generated id
      const insertCall = mockPool.query.mock.calls[1]
      expect(insertCall[0]).toBe('INSERT INTO "contacts" ("id", "name") VALUES (?, ?) RETURNING *')
      expect(insertCall[1][0]).toMatch(/^[0-9a-f-]{36}$/) // a uuid
      expect(insertCall[1][1]).toBe('Cara')
    })

    it('does NOT inject an id into a composite-PK table with no id column', async () => {
      mockPool.query.mockResolvedValueOnce({ rows: [], rowCount: 0 }) // pragma: no id column
      mockPool.query.mockResolvedValueOnce({
        rows: [{ group_id: 'g', user_id: 'u' }],
        rowCount: 1,
      })

      await store.create('group_members', { group_id: 'g', user_id: 'u' })

      const insertCall = mockPool.query.mock.calls[1]
      expect(insertCall[0]).toBe(
        'INSERT INTO "group_members" ("group_id", "user_id") VALUES (?, ?) RETURNING *',
      )
      expect(insertCall[1]).toEqual(['g', 'u'])
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

    it('handles the like operator case-insensitively, without escaping the caller-supplied pattern [cross-bond contract]', async () => {
      mockPool.query.mockResolvedValueOnce({ rows: [], rowCount: 0 })

      await store.findMany('users', {
        where: [{ field: 'name', operator: 'like', value: '%alice%' }],
      })

      expect(mockPool.query).toHaveBeenCalledWith(
        expect.stringContaining('WHERE LOWER("name") LIKE LOWER(?)'),
        ['%alice%'],
      )
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

  describe('SQL identifier validation (assertSafeIdentifier)', () => {
    // Regression for the SQLite SQL-injection hole: table/column/order-by/select
    // identifiers are interpolated directly into the SQL string (they cannot be `?`
    // placeholders), so every interpolated identifier must be whitelist-validated.
    // The classic exploit is a user-supplied `sort_by` column smuggling a `"`-delimited
    // ORDER BY subquery for blind exfiltration. Each case below MUST throw before the
    // query ever reaches the pool.
    beforeEach(() => {
      // Default resolve so methods that probe before erroring don't hang on undefined.
      mockPool.query.mockResolvedValue({ rows: [], rowCount: 0 })
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

      it('count rejects unsafe table', async () => {
        await expect(store.count(bad)).rejects.toThrow('Invalid SQL identifier')
      })

      it('create rejects unsafe table', async () => {
        await expect(store.create(bad, { name: 'x' })).rejects.toThrow('Invalid SQL identifier')
      })

      it('updateById rejects unsafe table', async () => {
        await expect(store.updateById(bad, '1', { name: 'x' })).rejects.toThrow(
          'Invalid SQL identifier',
        )
      })

      it('updateMany rejects unsafe table', async () => {
        await expect(
          store.updateMany(bad, [{ field: 'id', operator: '=', value: '1' }], { name: 'x' }),
        ).rejects.toThrow('Invalid SQL identifier')
      })

      it('deleteById rejects unsafe table', async () => {
        await expect(store.deleteById(bad, '1')).rejects.toThrow('Invalid SQL identifier')
      })

      it('deleteMany rejects unsafe table', async () => {
        await expect(
          store.deleteMany(bad, [{ field: 'id', operator: '=', value: '1' }]),
        ).rejects.toThrow('Invalid SQL identifier')
      })

      it('[M7-3] updateMany rejects an empty WHERE (no accidental full-table update)', async () => {
        await expect(store.updateMany('users', [], { name: 'x' })).rejects.toThrow(
          /at least one WHERE condition/,
        )
      })

      it('[M7-3] deleteMany rejects an empty WHERE (no accidental full-table delete)', async () => {
        await expect(store.deleteMany('users', [])).rejects.toThrow(/at least one WHERE condition/)
      })
    })

    describe('enforced on column names in WHERE conditions', () => {
      it('rejects unsafe field in WHERE', async () => {
        await expect(
          store.findOne('users', [{ field: 'col"inject', operator: '=', value: '1' }]),
        ).rejects.toThrow('Invalid SQL identifier')
      })
    })

    describe('enforced on column names in ORDER BY (the sort_by exploit)', () => {
      it('rejects unsafe field in orderBy', async () => {
        await expect(
          store.findMany('users', {
            orderBy: [
              {
                field: 'created_at" , (SELECT password_hash FROM users) --',
                direction: 'asc',
              },
            ],
          }),
        ).rejects.toThrow('Invalid SQL identifier')
      })

      it('rejects a "; DROP-laden orderBy field', async () => {
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

      it('rejects unsafe key in updateMany data', async () => {
        await expect(
          store.updateMany('users', [{ field: 'id', operator: '=', value: '1' }], {
            'col"name': 'value',
          }),
        ).rejects.toThrow('Invalid SQL identifier')
      })
    })

    describe('direction is whitelisted, never interpolated', () => {
      it('coerces an unexpected direction to ASC', async () => {
        await store.findMany('users', {
          // Cast to feed a deliberately-invalid direction the type forbids.
          orderBy: [{ field: 'name', direction: 'desc; DROP TABLE' as 'asc' }],
        })
        const sql = mockPool.query.mock.calls[0][0] as string
        expect(sql).toContain('ORDER BY "name" ASC')
        expect(sql).not.toContain('DROP')
      })

      it('honors a legitimate desc direction', async () => {
        await store.findMany('users', { orderBy: [{ field: 'name', direction: 'desc' }] })
        const sql = mockPool.query.mock.calls[0][0] as string
        expect(sql).toContain('ORDER BY "name" DESC')
      })
    })
  })

  describe('default LIMIT cap', () => {
    beforeEach(() => {
      mockPool.query.mockResolvedValue({ rows: [], rowCount: 0 })
    })

    it('applies LIMIT 10000 when no limit specified', async () => {
      await store.findMany('users')
      const sql = mockPool.query.mock.calls[0][0] as string
      expect(sql).toContain('LIMIT 10000')
    })

    it('caps limit at 10000 when limit exceeds 10000', async () => {
      await store.findMany('users', { limit: 50000 })
      const sql = mockPool.query.mock.calls[0][0] as string
      expect(sql).toContain('LIMIT 10000')
    })

    it('uses specified limit when under 10000', async () => {
      await store.findMany('users', { limit: 25 })
      const sql = mockPool.query.mock.calls[0][0] as string
      expect(sql).toContain('LIMIT 25')
    })
  })

  describe('OFFSET validation', () => {
    beforeEach(() => {
      mockPool.query.mockResolvedValue({ rows: [], rowCount: 0 })
    })

    it('treats negative offset as 0 (no OFFSET clause)', async () => {
      await store.findMany('users', { offset: -5 })
      const sql = mockPool.query.mock.calls[0][0] as string
      expect(sql).not.toContain('OFFSET')
    })

    it('floors a fractional offset to an integer', async () => {
      await store.findMany('users', { offset: 10.7 })
      const sql = mockPool.query.mock.calls[0][0] as string
      expect(sql).toContain('OFFSET 10')
      expect(sql).not.toContain('OFFSET 10.7')
    })
  })
})
