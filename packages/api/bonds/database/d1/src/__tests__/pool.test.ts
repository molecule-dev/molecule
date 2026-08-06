import { beforeEach, describe, expect, it, vi } from 'vitest'

import { createPool } from '../pool.js'
import { createProvider } from '../provider.js'
import type { D1DatabaseLike, D1PreparedStatementLike } from '../types.js'

// D1 differs from better-sqlite3 in exactly two ways that matter: it is async,
// and it uses `?` placeholders with a bind()/all() shape. These cover that
// seam — plus the two places where pretending to support something absent
// would silently corrupt data (transactions) or produce a useless error
// (a missing binding).

interface Call {
  sql: string
  values: unknown[]
}

/** A fake D1 binding that records what it was asked to run. */
function fakeD1(rows: Record<string, unknown>[] = [], meta?: { changes?: number }) {
  const calls: Call[] = []
  const database: D1DatabaseLike = {
    prepare(sql: string): D1PreparedStatementLike {
      const call: Call = { sql, values: [] }
      const statement: D1PreparedStatementLike = {
        bind(...values: unknown[]) {
          call.values = values
          return statement
        },
        async all<T>() {
          calls.push(call)
          return { results: rows as T[], meta }
        },
        async run() {
          calls.push(call)
          return { meta }
        },
      }
      return statement
    },
  }
  return { database, calls }
}

beforeEach(() => {
  vi.clearAllMocks()
})

describe('createPool', () => {
  it('converts $1 placeholders to SQLite ? before binding', async () => {
    const { database, calls } = fakeD1([{ id: 'a' }])
    const pool = createPool({ database })

    await pool.query('SELECT * FROM t WHERE id = $1 AND name = $2', ['a', 'b'])

    expect(calls[0].sql).toBe('SELECT * FROM t WHERE id = ? AND name = ?')
    expect(calls[0].values).toEqual(['a', 'b'])
  })

  it('returns rows and a row count', async () => {
    const { database } = fakeD1([{ id: 'a' }, { id: 'b' }])
    const pool = createPool({ database })

    const result = await pool.query('SELECT * FROM t')

    expect(result.rows).toHaveLength(2)
    expect(result.rowCount).toBe(2)
  })

  it('prefers D1s reported change count for writes', async () => {
    const { database } = fakeD1([], { changes: 3 })
    const pool = createPool({ database })

    const result = await pool.query('DELETE FROM t')

    expect(result.rowCount).toBe(3)
  })

  it('coerces booleans the way the shared SQLite dialect stores them', async () => {
    const { database, calls } = fakeD1()
    const pool = createPool({ database })

    await pool.query('INSERT INTO t (flag) VALUES ($1)', [true])

    // SQLite has no boolean type; binding a raw `true` throws in better-sqlite3
    // and is a silent type mismatch in D1.
    expect(calls[0].values[0]).not.toBe(true)
    expect([1, '1']).toContain(calls[0].values[0])
  })

  it('throws a directive error when the binding is missing', () => {
    expect(() => createPool({ database: undefined as unknown as D1DatabaseLike })).toThrow(
      /must be a D1 binding/,
    )
  })

  it('does NOT expose transaction(), because D1 has no interactive transactions', () => {
    const { database } = fakeD1()
    const pool = createPool({ database })

    // Absent, not a no-op: a fake rollback that reports success is worse than
    // a capability the caller can detect and route around.
    expect(pool.transaction).toBeUndefined()
  })

  it('treats release() as a no-op so pooling-shaped code still works', async () => {
    const { database } = fakeD1()
    const pool = createPool({ database })

    const connection = await pool.connect()

    expect(() => connection.release()).not.toThrow()
    await expect(pool.end()).resolves.toBeUndefined()
  })
})

describe('createProvider', () => {
  it('returns a DataStore that runs the shared SQLite dialect against D1', async () => {
    const { database, calls } = fakeD1([{ id: 'a', name: 'row' }])
    const store = createProvider({ database })

    const found = await store.findById('widgets', 'a')

    expect(found).toEqual({ id: 'a', name: 'row' })
    // Proof the dialect came from the sqlite bond rather than being reimplemented:
    // it emits `?` placeholders and a normal SELECT against the table.
    expect(calls.at(-1)?.sql).toContain('widgets')
    expect(calls.at(-1)?.sql).not.toContain('$1')
  })
})
