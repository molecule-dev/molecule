/**
 * Unit tests for the driver-free utilities.
 */
import { describe, expect, it } from 'vitest'

import { sqlCapabilities } from '../capabilities.js'
import {
  coerceDuckdbParam,
  normalizeDuckdbRows,
  parseJsonColumns,
  translateDdlToDuckdb,
  UnsupportedSqlFeatureError,
} from '../utilities.js'

describe('translateDdlToDuckdb', () => {
  it('rewrites jsonb as a column type and inside :: casts', () => {
    expect(translateDdlToDuckdb('CREATE TABLE t (meta JSONB NOT NULL)')).toBe(
      'CREATE TABLE t (meta json NOT NULL)',
    )
    expect(
      translateDdlToDuckdb("ALTER TABLE t ALTER COLUMN meta TYPE JSONB USING '{}'::jsonb"),
    ).not.toMatch(/jsonb/i)
  })

  it('drops index access methods DuckDB does not have', () => {
    expect(translateDdlToDuckdb('CREATE INDEX ix ON t USING gin (col)')).toBe(
      'CREATE INDEX ix ON t (col)',
    )
    expect(translateDdlToDuckdb('CREATE INDEX ix ON t USING btree (col)')).toBe(
      'CREATE INDEX ix ON t (col)',
    )
  })

  it('leaves DuckDB-native Postgres constructs untouched', () => {
    const sql = `CREATE TABLE keep (id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      made_at TIMESTAMPTZ DEFAULT now(), body BYTEA, tags TEXT[], score NUMERIC(10,2));
      ALTER TABLE keep ADD COLUMN IF NOT EXISTS extra VARCHAR;
      ALTER TABLE keep DROP COLUMN IF EXISTS ghost;`
    expect(translateDdlToDuckdb(sql)).toBe(sql)
  })

  it('turns a non-unique partial index into an equivalent full index', () => {
    const sql =
      'CREATE INDEX IF NOT EXISTS "idx" ON "addresses" ("userId") WHERE "isDefaultShipping" = TRUE;'
    expect(translateDdlToDuckdb(sql)).toBe(
      'CREATE INDEX IF NOT EXISTS "idx" ON "addresses" ("userId");',
    )
  })

  it('turns a UNIQUE partial index into a CASE expression index, never dropping its WHERE', () => {
    const sql =
      'CREATE UNIQUE INDEX IF NOT EXISTS "payment_methods_userId_default_idx"\n' +
      '  ON "payment_methods" ("userId") WHERE "isDefault" = true;'
    const translated = translateDdlToDuckdb(sql)
    expect(translated).toBe(
      'CREATE UNIQUE INDEX IF NOT EXISTS "payment_methods_userId_default_idx"\n' +
        '  ON "payment_methods" ((CASE WHEN ("isDefault" = true) THEN ("userId") END));',
    )
    // The known-bad shortcut — keeping the index UNIQUE but dropping WHERE —
    // would allow exactly one row per user at all. The CASE form must not do that.
    expect(translated).toContain('CASE WHEN')
  })

  it('parenthesizes every column of a multi-column UNIQUE partial index', () => {
    const sql =
      'CREATE UNIQUE INDEX "courses_org_slug_idx" ON "courses" ("org_id", "slug") ' +
      'WHERE "slug" IS NOT NULL;'
    expect(translateDdlToDuckdb(sql)).toContain(
      '((CASE WHEN ("slug" IS NOT NULL) THEN ("org_id") END), (CASE WHEN ("slug" IS NOT NULL) THEN ("slug") END))',
    )
  })

  it('refuses a referential action instead of silently dropping it', () => {
    const sql =
      'CREATE TABLE "comments" ("parentId" UUID REFERENCES "comments"("id") ON DELETE CASCADE);'
    expect(() => translateDdlToDuckdb(sql, { source: 'comments.sql' })).toThrow(
      UnsupportedSqlFeatureError,
    )
    try {
      translateDdlToDuckdb(sql, { source: 'comments.sql' })
    } catch (error) {
      const refused = error as UnsupportedSqlFeatureError
      expect(refused.feature).toBe('fk-referential-action')
      expect(refused.detail).toBe('ON DELETE CASCADE')
      expect(refused.source).toBe('comments.sql')
      expect(refused.message).toContain('DuckDB cannot apply ON DELETE CASCADE in comments.sql')
    }
  })

  it('leaves the referential actions DuckDB does support alone', () => {
    const sql = 'CREATE TABLE b (a UUID REFERENCES a(id) ON DELETE NO ACTION ON UPDATE RESTRICT);'
    expect(translateDdlToDuckdb(sql)).toBe(sql)
  })

  it('declares every SQL feature the contract knows', () => {
    expect(sqlCapabilities['fk-referential-action']?.support).toBe('unsupported')
    expect(sqlCapabilities['partial-index']?.support).toBe('translated')
    expect(sqlCapabilities['unique-partial-index']?.support).toBe('translated')
  })
})

describe('coerceDuckdbParam', () => {
  it('passes the values the client can infer natively', () => {
    expect(coerceDuckdbParam(null)).toBe(null)
    expect(coerceDuckdbParam(undefined)).toBe(null)
    expect(coerceDuckdbParam(true)).toBe(true)
    expect(coerceDuckdbParam(1.5)).toBe(1.5)
    expect(coerceDuckdbParam(10n)).toBe(10n)
    expect(coerceDuckdbParam('s')).toBe('s')
  })

  it('coerces Date, Uint8Array and plain objects', () => {
    expect(coerceDuckdbParam(new Date('2026-10-24T06:00:00.000Z'))).toBe('2026-10-24T06:00:00.000Z')
    const blob = coerceDuckdbParam(new Uint8Array([1, 2]))
    expect(blob).toBeInstanceOf(Object)
    expect(String((blob as { constructor: { name: string } }).constructor.name)).toMatch(/Blob/)
    expect(coerceDuckdbParam({ a: 1 })).toBe('{"a":1}')
    expect(coerceDuckdbParam([1, 2])).toBe('[1,2]')
  })

  it('refuses an unbindable type with a clear message', () => {
    expect(() => coerceDuckdbParam(Symbol('x'))).toThrow(/cannot bind a value of type symbol/)
  })
})

describe('normalizeDuckdbRows', () => {
  it('turns safe bigints into numbers and unsafe ones into strings', () => {
    const rows = normalizeDuckdbRows<{ n: number | string; huge: string }>([
      { n: 42n, huge: 170141183460469231731687303715884105727n },
    ])
    expect(rows[0]!.n).toBe(42)
    expect(typeof rows[0]!.n).toBe('number')
    expect(rows[0]!.huge).toBe('170141183460469231731687303715884105727')
  })

  it('leaves non-bigint values alone', () => {
    const rows = normalizeDuckdbRows([{ a: 1, b: 'x', c: null, d: true }])
    expect(rows[0]).toEqual({ a: 1, b: 'x', c: null, d: true })
  })
})

describe('parseJsonColumns', () => {
  it('parses JSON text in the named columns only', () => {
    const rows = parseJsonColumns<{ meta: unknown; other: string }>(
      [{ meta: '{"a":1}', other: '{"not":"parsed"}' }],
      new Set(['meta']),
    )
    expect(rows[0]!.meta).toEqual({ a: 1 })
    expect(rows[0]!.other).toBe('{"not":"parsed"}')
  })

  it('matches column names case-insensitively and leaves invalid JSON text alone', () => {
    const rows = parseJsonColumns<{ Meta: unknown }>([{ Meta: 'plain-text' }], new Set(['meta']))
    expect(rows[0]!.Meta).toBe('plain-text')
  })

  it('is a no-op with no JSON columns', () => {
    const rows = [{ a: '{"x":1}' }]
    expect(parseJsonColumns(rows, new Set())).toBe(rows)
  })
})
