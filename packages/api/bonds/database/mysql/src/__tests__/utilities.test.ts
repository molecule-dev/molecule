import { describe, expect, it } from 'vitest'

import {
  coerceMysqlParam,
  convertPlaceholders,
  normalizeMysqlRows,
  translateDdlToMysql,
} from '../utilities.js'

describe('convertPlaceholders', () => {
  it('should convert PostgreSQL-style placeholders to MySQL-style', () => {
    expect(convertPlaceholders('SELECT * FROM users WHERE id = $1')).toBe(
      'SELECT * FROM users WHERE id = ?',
    )
  })

  it('should convert multiple placeholders', () => {
    expect(convertPlaceholders('INSERT INTO users (name, email) VALUES ($1, $2)')).toBe(
      'INSERT INTO users (name, email) VALUES (?, ?)',
    )
  })

  it('should convert many placeholders in order', () => {
    const input = 'SELECT * FROM t WHERE a = $1 AND b = $2 AND c = $3 AND d = $4'
    const expected = 'SELECT * FROM t WHERE a = ? AND b = ? AND c = ? AND d = ?'
    expect(convertPlaceholders(input)).toBe(expected)
  })

  it('should handle queries without placeholders', () => {
    expect(convertPlaceholders('SELECT * FROM users')).toBe('SELECT * FROM users')
  })

  it('should handle placeholders with double digits', () => {
    const input = 'SELECT * FROM t WHERE a = $10 AND b = $11'
    const expected = 'SELECT * FROM t WHERE a = ? AND b = ?'
    expect(convertPlaceholders(input)).toBe(expected)
  })

  it('should preserve other query content', () => {
    const input = 'SELECT "column$name" FROM users WHERE id = $1'
    const expected = 'SELECT "column$name" FROM users WHERE id = ?'
    expect(convertPlaceholders(input)).toBe(expected)
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
  it('strips gen_random_uuid default, ::casts, USING method, and INDEX IF NOT EXISTS', () => {
    expect(translateDdlToMysql('"id" UUID PRIMARY KEY DEFAULT gen_random_uuid()')).toBe(
      '"id" CHAR(36) PRIMARY KEY',
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
