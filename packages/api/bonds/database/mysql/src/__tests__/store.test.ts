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

describe('createStore (mysql)', () => {
  let mockPool: ReturnType<typeof createMockPool>
  let store: ReturnType<typeof createStore>

  beforeEach(() => {
    mockPool = createMockPool()
    store = createStore(mockPool)
    vi.resetAllMocks()
  })

  describe('findById', () => {
    it('queries with backtick-quoted identifiers and returns the first row', async () => {
      const row = { id: '1', name: 'Alice' }
      mockPool.query.mockResolvedValueOnce({ rows: [row], rowCount: 1 })

      const result = await store.findById('users', '1')

      expect(mockPool.query).toHaveBeenCalledWith('SELECT * FROM `users` WHERE `id` = ? LIMIT 1', [
        '1',
      ])
      expect(result).toEqual(row)
    })

    it('returns null when no row is found', async () => {
      mockPool.query.mockResolvedValueOnce({ rows: [], rowCount: 0 })
      expect(await store.findById('users', '999')).toBeNull()
    })

    it('rejects unsafe table identifiers', async () => {
      await expect(store.findById('users; DROP TABLE x', '1')).rejects.toThrow(
        'Invalid SQL identifier',
      )
    })
  })

  describe('findOne / findMany', () => {
    it('builds WHERE clauses with ? placeholders', async () => {
      mockPool.query.mockResolvedValueOnce({ rows: [{ id: '1' }], rowCount: 1 })

      await store.findOne('users', [
        { field: 'status', operator: '=', value: 'active' },
        { field: 'age', operator: '>', value: 21 },
      ])

      expect(mockPool.query).toHaveBeenCalledWith(
        'SELECT * FROM `users` WHERE `status` = ? AND `age` > ? LIMIT 1',
        ['active', 21],
      )
    })

    it('supports in / like / ilike / null operators', async () => {
      mockPool.query.mockResolvedValue({ rows: [], rowCount: 0 })

      await store.findMany('users', {
        where: [
          { field: 'role', operator: 'in', value: ['admin', 'editor'] },
          { field: 'name', operator: 'like', value: 'A%' },
          { field: 'email', operator: 'ilike', value: '@EXAMPLE.com' },
          { field: 'deletedAt', operator: 'is_null' },
        ],
      })

      const [sql, values] = mockPool.query.mock.calls[0] as [string, unknown[]]
      expect(sql).toContain('`role` IN (?, ?)')
      // `like` is case-insensitive and does NOT escape the caller's own wildcards
      // (cross-bond contract — see @molecule/api-database WhereCondition JSDoc).
      expect(sql).toContain('LOWER(`name`) LIKE LOWER(?)')
      expect(sql).toContain('LOWER(`email`) LIKE LOWER(?)')
      expect(sql).toContain('`deletedAt` IS NULL')
      // ilike is the documented literal-substring contains match: the value's LIKE
      // metacharacters are escaped and the bond wraps it with %…% (postgres parity).
      expect(values).toEqual(['admin', 'editor', 'A%', '%@EXAMPLE.com%'])
    })

    it('like does NOT escape caller-supplied wildcards — the pattern is used as-is (contrast with ilike above)', async () => {
      mockPool.query.mockResolvedValue({ rows: [], rowCount: 0 })
      await store.findMany('users', {
        where: [{ field: 'name', operator: 'like', value: '100%_done' }],
      })
      const [, values] = mockPool.query.mock.calls[0] as [string, unknown[]]
      expect(values).toEqual(['100%_done'])
    })

    it('treats LIKE wildcards typed into an ilike value as literals (postgres parity)', async () => {
      mockPool.query.mockResolvedValue({ rows: [], rowCount: 0 })
      await store.findMany('users', {
        where: [{ field: 'email', operator: 'ilike', value: '100%_done' }],
      })
      const [, values] = mockPool.query.mock.calls[0] as [string, unknown[]]
      expect(values).toEqual(['%100\\%\\_done%'])
    })

    it('compiles empty in/not_in arrays to constant predicates instead of `IN ()` syntax errors', async () => {
      mockPool.query.mockResolvedValue({ rows: [], rowCount: 0 })
      await store.findMany('users', {
        where: [
          { field: 'role', operator: 'in', value: [] },
          { field: 'status', operator: 'not_in', value: [] },
        ],
      })
      const [sql, values] = mockPool.query.mock.calls[0] as [string, unknown[]]
      expect(sql).toContain('1 = 0') // in [] matches nothing (= ANY('{}') parity)
      expect(sql).toContain('1 = 1') // not_in [] matches everything (!= ALL('{}') parity)
      expect(values).toEqual([])
    })

    it('rejects a non-array value for in/not_in with an actionable message', async () => {
      await expect(
        store.findMany('users', {
          where: [{ field: 'role', operator: 'in', value: 'admin' }],
        }),
      ).rejects.toThrow(`'in' operator requires an array value`)
      expect(mockPool.query).not.toHaveBeenCalled()
    })

    it('rejects an unknown operator loudly instead of silently dropping the condition', async () => {
      await expect(
        store.findMany('users', {
          where: [{ field: 'role', operator: 'matches' as never, value: 'x' }],
        }),
      ).rejects.toThrow('Invalid SQL operator: matches')
      expect(mockPool.query).not.toHaveBeenCalled()
    })

    it('applies orderBy, limit, and offset safely', async () => {
      mockPool.query.mockResolvedValueOnce({ rows: [], rowCount: 0 })

      await store.findMany('items', {
        orderBy: [{ field: 'views', direction: 'desc' }],
        limit: 5,
        offset: 10,
      })

      const [sql] = mockPool.query.mock.calls[0] as [string]
      expect(sql).toContain('ORDER BY `views` DESC')
      expect(sql).toContain('LIMIT 5')
      expect(sql).toContain('OFFSET 10')
    })

    it('caps an unbounded findMany at the default limit', async () => {
      mockPool.query.mockResolvedValueOnce({ rows: [], rowCount: 0 })
      await store.findMany('items')
      const [sql] = mockPool.query.mock.calls[0] as [string]
      expect(sql).toContain('LIMIT 10000')
    })
  })

  describe('create', () => {
    it('inserts with an explicit id, then re-reads the row (no RETURNING in MySQL)', async () => {
      mockPool.query
        .mockResolvedValueOnce({ rows: [], rowCount: 1 }) // INSERT
        .mockResolvedValueOnce({ rows: [{ id: 'u1', name: 'Ada' }], rowCount: 1 }) // re-read

      const result = await store.create('users', { id: 'u1', name: 'Ada' })

      expect(mockPool.query).toHaveBeenNthCalledWith(
        1,
        'INSERT INTO `users` (`id`, `name`) VALUES (?, ?)',
        ['u1', 'Ada'],
      )
      expect(mockPool.query).toHaveBeenNthCalledWith(
        2,
        'SELECT * FROM `users` WHERE `id` = ? LIMIT 1',
        ['u1'],
      )
      expect(result).toEqual({ data: { id: 'u1', name: 'Ada' }, affected: 1 })
    })

    it('auto-generates a uuid id when omitted and the table has an id column', async () => {
      mockPool.query
        .mockResolvedValueOnce({ rows: [{ x: 1 }], rowCount: 1 }) // information_schema id check
        .mockResolvedValueOnce({ rows: [], rowCount: 1 }) // INSERT
        .mockResolvedValueOnce({ rows: [{ id: 'generated' }], rowCount: 1 }) // re-read

      await store.create('users', { name: 'NoId' })

      const insert = mockPool.query.mock.calls[1] as [string, unknown[]]
      expect(insert[0]).toBe('INSERT INTO `users` (`id`, `name`) VALUES (?, ?)')
      expect(String(insert[1][0])).toMatch(/^[0-9a-f-]{36}$/)
    })

    it('does NOT inject an id for tables without an id column', async () => {
      mockPool.query
        .mockResolvedValueOnce({ rows: [], rowCount: 0 }) // id-column check: none
        .mockResolvedValueOnce({ rows: [], rowCount: 1 }) // INSERT

      const result = await store.create('user_roles', { userId: 'u1', roleId: 'r1' })

      const insert = mockPool.query.mock.calls[1] as [string, unknown[]]
      expect(insert[0]).toBe('INSERT INTO `user_roles` (`userId`, `roleId`) VALUES (?, ?)')
      expect(result.data).toBeNull()
      expect(result.affected).toBe(1)
    })
  })

  describe('updateById / deleteById', () => {
    it('updates then re-reads the row', async () => {
      mockPool.query
        .mockResolvedValueOnce({ rows: [], rowCount: 1 }) // UPDATE
        .mockResolvedValueOnce({ rows: [{ id: 'u1', name: 'New' }], rowCount: 1 }) // re-read

      const result = await store.updateById('users', 'u1', { name: 'New' })

      expect(mockPool.query).toHaveBeenNthCalledWith(
        1,
        'UPDATE `users` SET `name` = ? WHERE `id` = ?',
        ['New', 'u1'],
      )
      expect(result).toEqual({ data: { id: 'u1', name: 'New' }, affected: 1 })
    })

    it('treats an empty update object as a no-op read instead of a SQL syntax error', async () => {
      // Handlers that strip every input field (Zod .partial().pick) pass {} here;
      // an empty SET clause would be a syntax error (postgres-bond parity).
      mockPool.query.mockResolvedValueOnce({ rows: [{ id: 'u1', name: 'Same' }], rowCount: 1 })

      const result = await store.updateById('users', 'u1', {})

      expect(mockPool.query).toHaveBeenCalledTimes(1)
      expect(mockPool.query).toHaveBeenCalledWith('SELECT * FROM `users` WHERE `id` = ? LIMIT 1', [
        'u1',
      ])
      expect(result).toEqual({ data: { id: 'u1', name: 'Same' }, affected: 1 })
    })

    it('deletes by id', async () => {
      mockPool.query.mockResolvedValueOnce({ rows: [], rowCount: 1 })
      const result = await store.deleteById('users', 'u1')
      expect(mockPool.query).toHaveBeenCalledWith('DELETE FROM `users` WHERE `id` = ?', ['u1'])
      expect(result.affected).toBe(1)
    })
  })

  describe('bulk-mutation guards', () => {
    it('refuses updateMany with an empty WHERE (no accidental full-table update)', async () => {
      await expect(store.updateMany('users', [], { name: 'x' })).rejects.toThrow(
        'at least one WHERE condition',
      )
      expect(mockPool.query).not.toHaveBeenCalled()
    })

    it('refuses deleteMany with an empty WHERE (no accidental full-table delete)', async () => {
      await expect(store.deleteMany('users', [])).rejects.toThrow('at least one WHERE condition')
      expect(mockPool.query).not.toHaveBeenCalled()
    })

    it('scopes updateMany/deleteMany by the WHERE clause', async () => {
      mockPool.query.mockResolvedValue({ rows: [], rowCount: 3 })

      await store.updateMany('users', [{ field: 'status', operator: '=', value: 'old' }], {
        status: 'archived',
      })
      expect(mockPool.query).toHaveBeenCalledWith(
        'UPDATE `users` SET `status` = ? WHERE `status` = ?',
        ['archived', 'old'],
      )

      const del = await store.deleteMany('users', [
        { field: 'status', operator: '=', value: 'archived' },
      ])
      expect(del.affected).toBe(3)
    })
  })

  describe('count', () => {
    it('counts with a WHERE clause', async () => {
      mockPool.query.mockResolvedValueOnce({ rows: [{ count: 7 }], rowCount: 1 })
      const n = await store.count('users', [{ field: 'status', operator: '=', value: 'active' }])
      expect(mockPool.query).toHaveBeenCalledWith(
        'SELECT COUNT(*) AS `count` FROM `users` WHERE `status` = ?',
        ['active'],
      )
      expect(n).toBe(7)
    })
  })
})
