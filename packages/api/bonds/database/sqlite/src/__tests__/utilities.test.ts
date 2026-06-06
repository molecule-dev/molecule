import Database from 'better-sqlite3'
import { describe, expect, it } from 'vitest'

import { createPool } from '../pool.js'
import { createStore } from '../store.js'
import {
  coerceSqliteParam,
  convertPlaceholders,
  normalizeSqliteRows,
  translateDdlToSqlite,
} from '../utilities.js'

describe('convertPlaceholders', () => {
  it('should return text unchanged when there are no placeholders and no values', () => {
    const result = convertPlaceholders('SELECT * FROM users')
    expect(result.text).toBe('SELECT * FROM users')
    expect(result.values).toEqual([])
  })

  it('should return empty values array when no values are provided', () => {
    const result = convertPlaceholders('SELECT * FROM users WHERE id = $1')
    expect(result.text).toBe('SELECT * FROM users WHERE id = ?')
    expect(result.values).toEqual([])
  })

  it('should convert $1, $2 placeholders to ? and map values in order', () => {
    const result = convertPlaceholders('SELECT * FROM users WHERE name = $1 AND age = $2', [
      'Alice',
      30,
    ])
    expect(result.text).toBe('SELECT * FROM users WHERE name = ? AND age = ?')
    expect(result.values).toEqual(['Alice', 30])
  })

  it('should reorder values when placeholders appear out of order ($2, $1)', () => {
    const result = convertPlaceholders('SELECT * FROM users WHERE age = $2 AND name = $1', [
      'Alice',
      30,
    ])
    expect(result.text).toBe('SELECT * FROM users WHERE age = ? AND name = ?')
    expect(result.values).toEqual([30, 'Alice'])
  })

  it('should handle repeated placeholders by duplicating the value', () => {
    const result = convertPlaceholders('SELECT * FROM users WHERE first = $1 AND last = $1', [
      'Alice',
    ])
    expect(result.text).toBe('SELECT * FROM users WHERE first = ? AND last = ?')
    expect(result.values).toEqual(['Alice', 'Alice'])
  })

  it('should handle large placeholder indices ($10, $1)', () => {
    const values = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h', 'i', 'j']
    const result = convertPlaceholders('SELECT $10, $1', values)
    expect(result.text).toBe('SELECT ?, ?')
    expect(result.values).toEqual(['j', 'a'])
  })

  it('should handle undefined values parameter the same as empty array', () => {
    const result = convertPlaceholders('SELECT * FROM users WHERE id = $1', undefined)
    expect(result.text).toBe('SELECT * FROM users WHERE id = ?')
    expect(result.values).toEqual([])
  })

  it('should handle explicit empty values array', () => {
    const result = convertPlaceholders('SELECT * FROM users WHERE id = $1', [])
    expect(result.text).toBe('SELECT * FROM users WHERE id = ?')
    expect(result.values).toEqual([])
  })

  it('should handle text with no placeholders and provided values', () => {
    const result = convertPlaceholders('SELECT 1', ['unused'])
    expect(result.text).toBe('SELECT 1')
    expect(result.values).toEqual([])
  })

  it('should handle multiple consecutive placeholders', () => {
    const result = convertPlaceholders('INSERT INTO t (a, b, c) VALUES ($1, $2, $3)', [
      'x',
      'y',
      'z',
    ])
    expect(result.text).toBe('INSERT INTO t (a, b, c) VALUES (?, ?, ?)')
    expect(result.values).toEqual(['x', 'y', 'z'])
  })

  it('should handle mixed value types (string, number, boolean, null)', () => {
    const result = convertPlaceholders('INSERT INTO t (a, b, c, d) VALUES ($1, $2, $3, $4)', [
      'text',
      42,
      true,
      null,
    ])
    expect(result.text).toBe('INSERT INTO t (a, b, c, d) VALUES (?, ?, ?, ?)')
    expect(result.values).toEqual(['text', 42, true, null])
  })

  it('should handle complex reordering with gaps ($3, $1, $3, $2)', () => {
    const result = convertPlaceholders('SELECT $3, $1, $3, $2', ['a', 'b', 'c'])
    expect(result.text).toBe('SELECT ?, ?, ?, ?')
    expect(result.values).toEqual(['c', 'a', 'c', 'b'])
  })

  it('passes values through unchanged for ?-placeholder SQL (the store builds these)', () => {
    // Regression: this used to return values [] (the $N replace never fired),
    // dropping every param → "Too few parameter values were provided".
    const result = convertPlaceholders('INSERT INTO t (a, b) VALUES (?, ?)', ['x', 7])
    expect(result.text).toBe('INSERT INTO t (a, b) VALUES (?, ?)')
    expect(result.values).toEqual(['x', 7])
  })
})

describe('translateDdlToSqlite', () => {
  it('strips DEFAULT gen_random_uuid() (resource layer provides the id)', () => {
    expect(translateDdlToSqlite('"id" UUID PRIMARY KEY DEFAULT gen_random_uuid()')).toBe(
      '"id" UUID PRIMARY KEY',
    )
  })

  it('maps now()/NOW() to current_timestamp', () => {
    expect(translateDdlToSqlite('"createdAt" TIMESTAMPTZ DEFAULT now()')).toBe(
      '"createdAt" TIMESTAMPTZ DEFAULT current_timestamp',
    )
    expect(translateDdlToSqlite('DEFAULT NOW()')).toBe('DEFAULT current_timestamp')
  })

  it('strips ::type casts', () => {
    expect(translateDdlToSqlite(`"data" JSONB DEFAULT '{}'::jsonb`)).toBe(
      `"data" JSONB DEFAULT '{}'`,
    )
  })

  it('strips index access methods (USING gin/btree)', () => {
    expect(translateDdlToSqlite('ON "t" USING GIN ("col")')).toBe('ON "t" ("col")')
  })

  it('is a no-op on already-SQLite DDL', () => {
    const sqlite = `CREATE TABLE recipes (\n  id TEXT PRIMARY KEY,\n  created_at TEXT DEFAULT (datetime('now'))\n)`
    expect(translateDdlToSqlite(sqlite)).toBe(sqlite)
  })

  it('makes a real Postgres-dialect CREATE TABLE execute on better-sqlite3', () => {
    const pg = `CREATE TABLE IF NOT EXISTS "projects" (
      "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      "userId" UUID NOT NULL,
      "packages" JSONB NOT NULL DEFAULT '[]'::jsonb,
      "createdAt" TIMESTAMPTZ NOT NULL DEFAULT now()
    );
    CREATE INDEX "p_idx" ON "projects" USING GIN ("packages");`
    const db = new Database(':memory:')
    expect(() => db.exec(translateDdlToSqlite(pg))).not.toThrow()
    // the resource layer inserts a uuid string id — must be accepted
    db.prepare('INSERT INTO "projects" ("id","userId") VALUES (?,?)').run('uuid-1', 'uuid-2')
    db.close()
  })
})

describe('coerceSqliteParam', () => {
  it('converts booleans to 0/1', () => {
    expect(coerceSqliteParam(true)).toBe(1)
    expect(coerceSqliteParam(false)).toBe(0)
  })
  it('serializes objects and arrays to JSON text', () => {
    expect(coerceSqliteParam({ a: 1 })).toBe('{"a":1}')
    expect(coerceSqliteParam(['x', 'y'])).toBe('["x","y"]')
  })
  it('maps undefined → null', () => {
    expect(coerceSqliteParam(undefined)).toBeNull()
    expect(coerceSqliteParam(null)).toBeNull()
  })
  it('passes through primitives and buffers', () => {
    expect(coerceSqliteParam(42)).toBe(42)
    expect(coerceSqliteParam('s')).toBe('s')
    const buf = new Uint8Array([1, 2])
    expect(coerceSqliteParam(buf)).toBe(buf)
  })
})

describe('normalizeSqliteRows', () => {
  it('converts BOOLEAN 0/1 → boolean and JSON text → value by column type', () => {
    const rows = [{ flag: 1, off: 0, data: '{"a":1}', name: 'x' }]
    const out = normalizeSqliteRows(rows, [
      { name: 'flag', type: 'BOOLEAN' },
      { name: 'off', type: 'BOOLEAN' },
      { name: 'data', type: 'JSONB' },
      { name: 'name', type: 'TEXT' },
    ])
    expect(out[0]).toEqual({ flag: true, off: false, data: { a: 1 }, name: 'x' })
  })
  it('leaves rows untouched when no boolean/json columns', () => {
    const rows = [{ id: '1', n: 5 }]
    expect(
      normalizeSqliteRows(rows, [
        { name: 'id', type: 'TEXT' },
        { name: 'n', type: 'INTEGER' },
      ]),
    ).toEqual([{ id: '1', n: 5 }])
  })
})

describe('store + pool round-trip (real better-sqlite3)', () => {
  it('round-trips boolean + json values through create()/findById()', async () => {
    const pool = createPool({ path: ':memory:', walMode: false, foreignKeys: false })
    await pool.query('CREATE TABLE widgets (id TEXT PRIMARY KEY, active BOOLEAN, meta JSONB)')
    const store = createStore(pool)
    // Before the fix this threw "can only bind numbers, strings, bigints, ..."
    await store.create('widgets', { id: 'w1', active: false, meta: { tags: ['a', 'b'], n: 3 } })
    const row = await store.findById<{ id: string; active: unknown; meta: unknown }>(
      'widgets',
      'w1',
    )
    expect(row?.active).toBe(false) // 0 → boolean
    expect(row?.meta).toEqual({ tags: ['a', 'b'], n: 3 }) // JSON text → object
  })
})
