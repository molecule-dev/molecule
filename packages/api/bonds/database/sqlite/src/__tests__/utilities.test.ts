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

  it('throws when a value has no $N placeholder, naming the value and the SQL', () => {
    // flash-m88 §+07:07: `ids.map((_, i) => `$${i + 1}`)` restarted at $1, so the
    // SQL named $1..$2 while three values were supplied — and the third was
    // dropped in silence, returning WRONG ROWS (Postgres refuses the same call:
    // `bind message supplies 3 parameters … requires 2`).
    const sql = `SELECT * FROM "reactions" WHERE "resourceType" = $1 AND "userId" = $2 AND "type" = 'favorite' AND "resourceId" IN ($1)`
    expect(() =>
      convertPlaceholders(sql, ['article', 'mvb9y0lb0001fdc54e62', 'mvb9y0le000458f1f82c']),
    ).toThrowError(/bind message supplies 3 parameters, but the statement requires only 2/)
    expect(() =>
      convertPlaceholders(sql, ['article', 'mvb9y0lb0001fdc54e62', 'mvb9y0le000458f1f82c']),
    ).toThrowError(/value 3 has no \$N placeholder/)
    expect(() =>
      convertPlaceholders(sql, ['article', 'mvb9y0lb0001fdc54e62', 'mvb9y0le000458f1f82c']),
    ).toThrowError(/SQL: SELECT \* FROM "reactions"/)
    // a plain surplus: 1 value, no placeholder names it
    expect(() => convertPlaceholders('SELECT 1 FROM t', ['unused'])).not.toThrow()
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
    // a gap in the numbering: $3 is named, only one value was supplied
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

describe('translateDdlToSqlite', () => {
  it('drops IF NOT EXISTS from ADD COLUMN, which SQLite does not parse (flash-m28)', () => {
    expect(translateDdlToSqlite('ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "bio" TEXT;')).toBe(
      'ALTER TABLE "users" ADD COLUMN "bio" TEXT;',
    )
  })

  it('translates DEFAULT gen_random_uuid() to the SQLite random-id default', () => {
    // Must TRANSLATE, not strip: a custom handler using the bare create('t', {…})
    // (no explicit id) relies on the column default. Stripping left `id … NOT NULL`
    // with no default → every such insert hit `NOT NULL constraint failed: t.id`.
    expect(translateDdlToSqlite('"id" UUID PRIMARY KEY DEFAULT gen_random_uuid()')).toBe(
      '"id" UUID PRIMARY KEY DEFAULT (lower(hex(randomblob(16))))',
    )
  })

  it('maps now()/NOW() to the ISO-8601 UTC millisecond default', () => {
    expect(translateDdlToSqlite('"createdAt" TIMESTAMPTZ DEFAULT now()')).toBe(
      `"createdAt" TIMESTAMPTZ DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))`,
    )
    expect(translateDdlToSqlite('DEFAULT NOW()')).toBe(
      `DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))`,
    )
  })

  it('maps a literal DEFAULT CURRENT_TIMESTAMP (either case) to the same ISO default', () => {
    // The form the template migrations use: `… DEFAULT CURRENT_TIMESTAMP NOT NULL`.
    expect(
      translateDdlToSqlite(
        '"createdAt" timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,',
      ),
    ).toBe(
      `"createdAt" timestamp with time zone DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')) NOT NULL,`,
    )
    expect(translateDdlToSqlite('"updatedAt" TIMESTAMPTZ DEFAULT current_timestamp')).toBe(
      `"updatedAt" TIMESTAMPTZ DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))`,
    )
  })

  it('leaves CURRENT_TIMESTAMP alone when it is not a column DEFAULT', () => {
    // Only the DEFAULT form is rewritten — a comparison against the current
    // instant is a different construct and stays as written.
    const sql = '"createdAt" < CURRENT_TIMESTAMP'
    expect(translateDdlToSqlite(sql)).toBe(sql)
  })

  it('is idempotent: translating already-translated DDL changes nothing', () => {
    const once = translateDdlToSqlite(
      `"createdAt" TIMESTAMPTZ NOT NULL DEFAULT now(), "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP`,
    )
    expect(translateDdlToSqlite(once)).toBe(once)
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
    // a custom handler's bare create() inserts NO id — the translated column
    // default must supply one (regression: this used to throw NOT NULL on id).
    db.prepare('INSERT INTO "projects" ("userId") VALUES (?)').run('uuid-3')
    const generated = db.prepare(`SELECT id FROM "projects" WHERE "userId" = ?`).get('uuid-3') as {
      id: string
    }
    expect(generated.id).toMatch(/^[0-9a-f]{32}$/)
    // The translated `DEFAULT now()` must store ISO-8601 UTC with milliseconds —
    // the value `new Date()` round-trips unchanged.
    const { createdAt } = db
      .prepare(`SELECT "createdAt" FROM "projects" WHERE "userId" = ?`)
      .get('uuid-3') as { createdAt: string }
    expect(createdAt).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/)
    expect(new Date(createdAt).toISOString()).toBe(createdAt)
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

  it('refuses a query whose placeholders and values disagree, and stays usable', async () => {
    // The reported failure end to end (flash-m88 §+07:07): a `$N` numbering slip
    // made `"resourceId" IN ($1)` collide with `"resourceType" = $1`. Before the
    // fix this returned the WRONG rows with no error at all, because the value
    // the SQL never named was dropped.
    const pool = createPool({ path: ':memory:', walMode: false, foreignKeys: false })
    await pool.query(
      'CREATE TABLE reactions ("resourceType" TEXT, "userId" TEXT, type TEXT, "resourceId" TEXT)',
    )
    await pool.query('INSERT INTO reactions VALUES ($1, $2, $3, $4)', [
      'article',
      'u1',
      'favorite',
      'a1',
    ])
    await expect(
      pool.query(
        `SELECT * FROM reactions WHERE "resourceType" = $1 AND "userId" = $2 AND type = 'favorite' AND "resourceId" IN ($1)`,
        ['article', 'u1', 'a1'],
      ),
    ).rejects.toThrow(/bind message supplies 3 parameters, but the statement requires only 2/)
    // The refused statement must not wedge the single-connection queue.
    const after = await pool.query<{ n: number }>('SELECT COUNT(*) AS n FROM reactions')
    expect(after.rows[0].n).toBe(1)
  })
})
