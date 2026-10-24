import { describe, expect, it } from 'vitest'

import {
  coerceMysqlParam,
  convertPlaceholders,
  normalizeMysqlRows,
  translateDdlToMysql,
  UnsupportedSqlFeatureError,
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

  it('throws when a value has no $N placeholder, naming the value and the SQL', () => {
    // A `$N` numbering slip (a list numbered from the loop index that restarts at
    // $1) used to drop the surplus value in silence and return the wrong rows.
    // Postgres refuses the same call: `bind message supplies 3 parameters … requires 2`.
    const sql = `SELECT * FROM reactions WHERE "resourceType" = $1 AND "userId" = $2 AND "type" = 'favorite' AND "resourceId" IN ($1)`
    expect(() => convertPlaceholders(sql, ['article', 'u1', 'a1'])).toThrowError(
      /bind message supplies 3 parameters, but the statement requires only 2/,
    )
    expect(() => convertPlaceholders(sql, ['article', 'u1', 'a1'])).toThrowError(
      /value 3 has no \$N placeholder/,
    )
    expect(() => convertPlaceholders(sql, ['article', 'u1', 'a1'])).toThrowError(
      /SQL: SELECT \* FROM reactions/,
    )
    expect(() => convertPlaceholders('SELECT $1 FROM t', ['a', 'b'])).toThrowError(
      /supplies 2 parameters, but the statement requires only 1/,
    )
  })

  it('throws when a $N has no value, naming the placeholder and the SQL', () => {
    expect(() =>
      convertPlaceholders('SELECT * FROM t WHERE a = $1 AND b = $2', ['x']),
    ).toThrowError(/bind message supplies 1 parameters, but the SQL names \$2 with no value/)
    expect(() =>
      convertPlaceholders('SELECT * FROM t WHERE a = $1 AND b = $2', ['x']),
    ).toThrowError(/SQL: SELECT \* FROM t WHERE a = \$1 AND b = \$2/)
    expect(() => convertPlaceholders('SELECT * FROM t WHERE a = $3', ['x'])).toThrowError(
      /the SQL names \$3 with no value/,
    )
  })

  it('throws on a $0 placeholder, which no value can fill', () => {
    // The off-by-one the other way (`ids.map((_, i) => `$${i}`)`) used to bind
    // values[-1] — undefined → NULL — and return the wrong rows.
    expect(() => convertPlaceholders('SELECT * FROM t WHERE a = $0', ['x'])).toThrowError(
      /the SQL names \$0 with no value — placeholders are \$1-based/,
    )
  })

  it('still binds an explicit undefined value as NULL, like Postgres', () => {
    // Not a placeholders/values disagreement: the counts agree, and node-postgres
    // sends undefined as NULL, so this bond must not start refusing it.
    const result = convertPlaceholders('SELECT * FROM t WHERE a = $1', [undefined])
    expect(result.text).toBe('SELECT * FROM t WHERE a = ?')
    expect(result.values).toEqual([undefined])
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
  it('drops the ADD COLUMN IF NOT EXISTS clause MySQL does not parse', () => {
    // MySQL 8 rejects the clause outright (a syntax error that fails the whole
    // migration run). The migrator honors it by applying the statement on its own
    // and treating a duplicate column as the clause's meaning; this rewrite is
    // what keeps the statement parseable.
    expect(
      translateDdlToMysql(
        'ALTER TABLE "article_tags" ADD COLUMN IF NOT EXISTS "position" INTEGER;',
      ),
    ).toBe('ALTER TABLE "article_tags" ADD COLUMN "position" INTEGER;')
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

describe('translateDdlToMysql — UNIQUE partial indexes are refused, not widened', () => {
  const paymentMethods = `CREATE TABLE IF NOT EXISTS "payment_methods" (
  "id" UUID PRIMARY KEY,
  "userId" UUID NOT NULL,
  "isDefault" BOOLEAN NOT NULL DEFAULT false
);
CREATE UNIQUE INDEX IF NOT EXISTS "payment_methods_userId_default_idx"
  ON "payment_methods" ("userId") WHERE "isDefault" = true;`

  it('throws instead of applying the index to every row', () => {
    // The old rewrite rebuilt CREATE INDEX from the column list and dropped
    // WHERE, so one default per USER became one payment method per user.
    expect(() => translateDdlToMysql(paymentMethods, { source: 'payment_methods.sql' })).toThrow(
      /MySQL cannot apply WHERE "isDefault" = true in payment_methods\.sql/,
    )
  })

  it('the error is tagged and carries the construct, the file and the provider note', () => {
    let caught: unknown
    try {
      translateDdlToMysql(paymentMethods, { source: 'payment_methods.sql' })
    } catch (error) {
      caught = error
    }
    expect(caught).toBeInstanceOf(UnsupportedSqlFeatureError)
    const error = caught as UnsupportedSqlFeatureError
    expect(error.name).toBe('UnsupportedSqlFeatureError')
    expect(error.feature).toBe('unique-partial-index')
    expect(error.detail).toBe('WHERE "isDefault" = true')
    expect(error.source).toBe('payment_methods.sql')
    expect(error.message).toContain('MySQL has no partial indexes')
  })

  it('refuses a multi-column UNIQUE partial index, keeping the whole predicate in the detail', () => {
    const sql = `CREATE UNIQUE INDEX "courses_org_slug_idx"
  ON "courses" ("org_id", "slug")
  WHERE "slug" IS NOT NULL;`
    expect(() => translateDdlToMysql(sql)).toThrowError(UnsupportedSqlFeatureError)
    expect(() => translateDdlToMysql(sql)).toThrow(/WHERE "slug" IS NOT NULL/)
  })

  it('refuses mixed-case SQL, comments and quoted identifiers included', () => {
    const sql = `-- setup for courses
create unique index if not exists "courses_org_slug_idx"
  on "courses" ("org_id", "slug") where "slug" is not null;`
    expect(() => translateDdlToMysql(sql)).toThrowError(/WHERE "slug" is not null/)
  })

  it('refuses when the partial index is one of several statements, before rewriting any', () => {
    const sql = `CREATE INDEX "a" ON "t" ("c");
CREATE UNIQUE INDEX "b" ON "t" ("c") WHERE "c" IS NOT NULL;
CREATE INDEX "d" ON "t" ("c") WHERE "c" IS NOT NULL;`
    expect(() => translateDdlToMysql(sql)).toThrowError(/unique|UNIQUE/)
  })

  it('does NOT refuse the construct inside a comment or a string literal', () => {
    const sql = [
      '-- CREATE UNIQUE INDEX "i" ON "t" ("c") WHERE "c" IS NOT NULL;',
      `INSERT INTO "notes" ("body") VALUES ('CREATE UNIQUE INDEX "i" ON "t" ("c") WHERE "c" IS NOT NULL;');`,
      'CREATE INDEX "plain" ON "t" ("c");',
    ].join('\n')
    const out = translateDdlToMysql(sql)
    expect(out).toContain('CREATE INDEX "plain" ON "t" ("c");')
  })

  it('still translates a NON-unique partial index to a full index (results unchanged)', () => {
    const out = translateDdlToMysql('CREATE INDEX "i" ON "t" ("c") WHERE "deletedAt" IS NULL;')
    expect(out).toBe('CREATE INDEX "i" ON "t" ("c");')
  })

  it('leaves a UNIQUE index with no predicate alone', () => {
    expect(translateDdlToMysql('CREATE UNIQUE INDEX "i" ON "t" ("c");')).toBe(
      'CREATE UNIQUE INDEX "i" ON "t" ("c");',
    )
  })

  it('the supported resource setup SQL still translates (no regression)', () => {
    const address = `CREATE TABLE IF NOT EXISTS "addresses" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "userId" UUID NOT NULL,
  "isDefaultShipping" BOOLEAN NOT NULL DEFAULT FALSE
);
CREATE INDEX IF NOT EXISTS "idx_addresses_user_default_shipping"
  ON "addresses" ("userId") WHERE "isDefaultShipping" = TRUE;`
    const out = translateDdlToMysql(address)
    expect(out).toContain('CREATE INDEX "idx_addresses_user_default_shipping" ON "addresses"')
    expect(out).not.toMatch(/WHERE "isDefaultShipping"/)
    expect(out).toContain('CHAR(36)')
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
