import Database from 'better-sqlite3'
import { describe, expect, it } from 'vitest'

import { convertPlaceholders, translateDdlToSqlite } from '../utilities.js'

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
