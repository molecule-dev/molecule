import { describe, expect, it } from 'vitest'

import {
  coerceMysqlParam,
  convertPlaceholders,
  normalizeMysqlRows,
  translateDdlToMysql,
} from '../utilities.js'

describe('convertPlaceholders', () => {
  it('should convert PostgreSQL-style placeholders to MySQL-style', () => {
    const result = convertPlaceholders('SELECT * FROM users WHERE id = $1', ['u1'])
    expect(result.text).toBe('SELECT * FROM users WHERE id = ?')
    expect(result.values).toEqual(['u1'])
  })

  it('should convert multiple placeholders', () => {
    const result = convertPlaceholders('INSERT INTO users (name, email) VALUES ($1, $2)', [
      'Ada',
      'ada@example.com',
    ])
    expect(result.text).toBe('INSERT INTO users (name, email) VALUES (?, ?)')
    expect(result.values).toEqual(['Ada', 'ada@example.com'])
  })

  it('should convert many placeholders in order', () => {
    const result = convertPlaceholders(
      'SELECT * FROM t WHERE a = $1 AND b = $2 AND c = $3 AND d = $4',
      [1, 2, 3, 4],
    )
    expect(result.text).toBe('SELECT * FROM t WHERE a = ? AND b = ? AND c = ? AND d = ?')
    expect(result.values).toEqual([1, 2, 3, 4])
  })

  it('reorders values for out-of-order placeholders ($2, $1)', () => {
    // $N is positional; ? is sequential. A text-only substitution used to bind
    // ['Alice', 30] to ($2, $1) — silently swapping the values.
    const result = convertPlaceholders('SELECT * FROM users WHERE age = $2 AND name = $1', [
      'Alice',
      30,
    ])
    expect(result.text).toBe('SELECT * FROM users WHERE age = ? AND name = ?')
    expect(result.values).toEqual([30, 'Alice'])
  })

  it('duplicates values for repeated placeholders ($1 … $1)', () => {
    // Common hand-written SQL: the same param used twice. Text-only substitution
    // under-supplied parameters (mysql2: "Incorrect arguments" / wrong bindings).
    const result = convertPlaceholders('SELECT * FROM users WHERE first = $1 OR last = $1', [
      'Alice',
    ])
    expect(result.text).toBe('SELECT * FROM users WHERE first = ? OR last = ?')
    expect(result.values).toEqual(['Alice', 'Alice'])
  })

  it('should handle queries without placeholders', () => {
    const result = convertPlaceholders('SELECT * FROM users')
    expect(result.text).toBe('SELECT * FROM users')
    expect(result.values).toEqual([])
  })

  it('drops unused values when the SQL has no placeholders at all', () => {
    const result = convertPlaceholders('SELECT 1', ['unused'])
    expect(result.text).toBe('SELECT 1')
    expect(result.values).toEqual([])
  })

  it('passes values through unchanged for ?-placeholder SQL (the store builds these)', () => {
    const result = convertPlaceholders('INSERT INTO t (a, b) VALUES (?, ?)', ['x', 7])
    expect(result.text).toBe('INSERT INTO t (a, b) VALUES (?, ?)')
    expect(result.values).toEqual(['x', 7])
  })

  it('should handle placeholders with double digits', () => {
    const values = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h', 'i', 'j', 'k']
    const result = convertPlaceholders('SELECT * FROM t WHERE a = $10 AND b = $11', values)
    expect(result.text).toBe('SELECT * FROM t WHERE a = ? AND b = ?')
    expect(result.values).toEqual(['j', 'k'])
  })

  it('should preserve other query content', () => {
    const result = convertPlaceholders('SELECT "column$name" FROM users WHERE id = $1', ['u1'])
    expect(result.text).toBe('SELECT "column$name" FROM users WHERE id = ?')
    expect(result.values).toEqual(['u1'])
  })
})

describe('translateDdlToMysql', () => {
  it('maps postgres types to mysql (uuid/timestamptz/jsonb)', () => {
    const out = translateDdlToMysql('"id" UUID, "at" TIMESTAMPTZ, "data" JSONB')
    expect(out).toContain('CHAR(36)')
    expect(out).toContain('TIMESTAMP')
    expect(out).toContain('JSON')
    expect(out).not.toMatch(/\bUUID\b|TIMESTAMPTZ|JSONB/)
  })
  it('translates gen_random_uuid default to (UUID()), and strips ::casts, USING method, INDEX IF NOT EXISTS', () => {
    // Must TRANSLATE (not strip): a bare create('t', {…}) with no explicit id relies
    // on the column default; stripping left `id … NOT NULL` with no default. The
    // translation runs AFTER UUID→CHAR(36) so the introduced UUID() isn't corrupted.
    expect(translateDdlToMysql('"id" UUID PRIMARY KEY DEFAULT gen_random_uuid()')).toBe(
      '"id" CHAR(36) PRIMARY KEY DEFAULT (UUID())',
    )
    expect(translateDdlToMysql(`DEFAULT '{}'::jsonb`)).toBe(`DEFAULT '{}'`)
    expect(translateDdlToMysql('CREATE INDEX IF NOT EXISTS "i" ON "t" ("c");')).toBe(
      'CREATE INDEX "i" ON "t" ("c");',
    )
    expect(translateDdlToMysql('CREATE UNIQUE INDEX IF NOT EXISTS "i" ON "t" ("c");')).toContain(
      'CREATE UNIQUE INDEX',
    )
  })
  it('parenthesizes TEXT/JSON literal defaults and DEFAULT CURRENT_DATE', () => {
    expect(translateDdlToMysql(`"s" TEXT NOT NULL DEFAULT 'draft'`)).toBe(
      `"s" TEXT NOT NULL DEFAULT ('draft')`,
    )
    expect(translateDdlToMysql('"d" DATE DEFAULT CURRENT_DATE')).toBe(
      '"d" DATE DEFAULT (CURRENT_DATE)',
    )
  })
  it('adds an index prefix to long-varchar/TEXT indexed columns', () => {
    const sql =
      'CREATE TABLE "t" (\n  "id" UUID PRIMARY KEY,\n  "email" VARCHAR(1023)\n);\nCREATE INDEX "i" ON "t" ("email");'
    const out = translateDdlToMysql(sql)
    expect(out).toContain('"email"(191)')
  })
  it('drops indexes on JSON columns and functional/expression indexes', () => {
    const sql =
      'CREATE TABLE "t" (\n  "id" UUID PRIMARY KEY,\n  "data" JSONB\n);\nCREATE INDEX "i" ON "t" ("data");'
    expect(translateDdlToMysql(sql)).not.toContain('CREATE INDEX "i"')
    expect(
      translateDdlToMysql('CREATE UNIQUE INDEX "i" ON "t" ("a", COALESCE("b", \'\'));'),
    ).not.toContain('CREATE UNIQUE INDEX')
  })
  it('handles hyphenated identifiers', () => {
    const sql =
      'CREATE TABLE "resource-shares" (\n  "id" UUID PRIMARY KEY,\n  "rt" VARCHAR(255)\n);\nCREATE INDEX "i" ON "resource-shares" ("rt");'
    expect(translateDdlToMysql(sql)).toContain('"rt"(191)')
  })
})

describe('coerceMysqlParam', () => {
  it('serializes objects/arrays to JSON, maps undefined→null, passes the rest', () => {
    expect(coerceMysqlParam({ a: 1 })).toBe('{"a":1}')
    expect(coerceMysqlParam(['x'])).toBe('["x"]')
    expect(coerceMysqlParam(undefined)).toBeNull()
    expect(coerceMysqlParam(false)).toBe(false) // mysql2 handles booleans
    expect(coerceMysqlParam(7)).toBe(7)
    const d = new Date()
    expect(coerceMysqlParam(d)).toBe(d)
  })
})

describe('normalizeMysqlRows', () => {
  it('converts TINYINT(1) (BOOLEAN) columns to JS boolean, leaves plain TINYINT', () => {
    const rows = [{ flag: 1, off: 0, cnt: 5 }]
    const out = normalizeMysqlRows(rows, [
      { name: 'flag', type: 1, columnLength: 1 },
      { name: 'off', type: 1, columnLength: 1 },
      { name: 'cnt', type: 1, columnLength: 4 },
    ])
    expect(out[0]).toEqual({ flag: true, off: false, cnt: 5 })
  })
})
