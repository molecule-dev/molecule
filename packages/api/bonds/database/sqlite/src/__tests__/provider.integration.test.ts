/**
 * REAL-DEPENDENCY integration tests — no mocks, the actual better-sqlite3.
 *
 * The unit suites mock either the driver (`migrator.test.ts`) or the pool
 * (`store.test.ts`), so they can only validate OUR assumptions about
 * better-sqlite3 — not better-sqlite3, and not the SQL this bond actually
 * emits. That gap let three classes of problem ship unfelt: an `ilike`
 * condition was silently dropped from the WHERE clause (or produced a bare
 * `WHERE` and a cryptic `near "LIMIT": syntax error`), a raw
 * `query('WITH … SELECT …')` came back as `rows: []` because the old
 * string-heuristic dispatch never called `.all()` on it, and an empty
 * `in`-array compiled to the `IN ()` syntax error. This file exercises the
 * REAL migrate → pool → store lifecycle the way a scaffolded app runs it.
 * The unit mocks stay for shape/edge cases.
 *
 * @module
 */

import { mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

import { afterAll, beforeAll, describe, expect, it } from 'vitest'

import type { DatabasePool } from '@molecule/api-database'

import { createMigrator } from '../migrator.js'
import { createPool } from '../pool.js'
import { createStore } from '../store.js'

let workDir: string
let dbPath: string
let pool: DatabasePool
let store: ReturnType<typeof createStore>
let prevSqlitePath: string | undefined

// Authored in POSTGRES dialect on purpose — resource/template migrations are, and
// the migrator must translate them (gen_random_uuid, ::jsonb, now(), USING btree).
const MIGRATION_SQL = `CREATE TABLE IF NOT EXISTS "todos" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "user_id" UUID NOT NULL,
  "title" TEXT NOT NULL,
  "done" BOOLEAN NOT NULL DEFAULT false,
  "meta" JSONB NOT NULL DEFAULT '{}'::jsonb,
  "created_at" TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS "todos_user_idx" ON "todos" USING btree ("user_id");`

beforeAll(async () => {
  workDir = mkdtempSync(join(tmpdir(), 'mol-sqlite-integration-'))
  const migrationsDir = join(workDir, 'migrations')
  // Nested db path also exercises parent-dir auto-creation.
  dbPath = join(workDir, 'data', 'app.db')

  prevSqlitePath = process.env.SQLITE_PATH
  process.env.SQLITE_PATH = dbPath

  const { mkdirSync } = await import('node:fs')
  mkdirSync(migrationsDir, { recursive: true })
  writeFileSync(join(migrationsDir, '0001_init.sql'), MIGRATION_SQL)

  // Real migration run — and a second run to prove IF NOT EXISTS idempotency
  // (a re-deploy re-runs every migration file).
  const runMigrations = createMigrator(migrationsDir)
  await runMigrations()
  await runMigrations()

  pool = createPool({ path: dbPath })
  store = createStore(pool)
})

afterAll(async () => {
  await pool.end()
  if (prevSqlitePath === undefined) delete process.env.SQLITE_PATH
  else process.env.SQLITE_PATH = prevSqlitePath
  rmSync(workDir, { recursive: true, force: true })
})

describe('@molecule/api-database-sqlite × REAL better-sqlite3', () => {
  it('full lifecycle: migrate (postgres dialect) → bare create → typed round-trip → update → delete', async () => {
    // The documented bare-create pattern: NO explicit id. The store must generate
    // one (the table has an id column), and boolean/json values must round-trip —
    // better-sqlite3 itself can only bind numbers/strings/bigints/buffers/null.
    const created = await store.create<{
      id: string
      user_id: string
      title: string
      done: boolean
      meta: { tags: string[] }
    }>('todos', {
      user_id: 'user-1',
      title: 'Water plants',
      done: false,
      meta: { tags: ['garden', 'weekly'] },
    })
    expect(created.affected).toBe(1)
    expect(created.data?.id).toMatch(/^[0-9a-f-]{36}$/)
    // Storage form (0/1, JSON text) must NOT leak to the caller.
    expect(created.data?.done).toBe(false)
    expect(created.data?.meta).toEqual({ tags: ['garden', 'weekly'] })

    const id = created.data!.id
    const found = await store.findById<{ done: boolean; meta: unknown }>('todos', id)
    expect(found?.done).toBe(false)
    expect(found?.meta).toEqual({ tags: ['garden', 'weekly'] })

    const updated = await store.updateById<{ done: boolean }>('todos', id, { done: true })
    expect(updated.affected).toBe(1)
    expect(updated.data?.done).toBe(true)

    // An empty update object is a no-op READ, not a SQL syntax error — handlers
    // that strip every input field via Zod `.partial().pick({...})` pass {} here.
    const noop = await store.updateById<{ done: boolean }>('todos', id, {})
    expect(noop.affected).toBe(1)
    expect(noop.data?.done).toBe(true)

    // FAILURE DISAMBIGUATION: a delete of a missing row is a clean
    // `affected: 0` — the caller can tell "already gone / wrong id" (404 path)
    // apart from a thrown driver error (500 path).
    expect((await store.deleteById('todos', id)).affected).toBe(1)
    expect((await store.deleteById('todos', id)).affected).toBe(0)
  })

  it('CONSUMER PROPERTY: ilike is a case-insensitive literal-substring search across bonds', async () => {
    await store.create('todos', { user_id: 'user-ilike', title: 'Buy MILK' })
    await store.create('todos', { user_id: 'user-ilike', title: 'buy milk later' })
    await store.create('todos', { user_id: 'user-ilike', title: 'Sell eggs' })
    await store.create('todos', { user_id: 'user-ilike', title: '100%_done report' })

    // The core contract: user-typed search input, case shouldn't matter.
    // (Before the fix this condition was silently DROPPED — the "search" returned
    // every row — or, alone, generated `WHERE  LIMIT` and a syntax error.)
    const milk = await store.findMany<{ title: string }>('todos', {
      where: [
        { field: 'user_id', operator: '=', value: 'user-ilike' },
        { field: 'title', operator: 'ilike', value: 'milk' },
      ],
      orderBy: [{ field: 'title', direction: 'asc' }],
    })
    expect(milk.map((r) => r.title)).toEqual(['Buy MILK', 'buy milk later'])

    // LIKE metacharacters typed by the user are literals, not wildcards:
    // '100%_done' must match ONLY the row containing that exact substring
    // (an unescaped '%' would also match 'Buy MILK' etc. via 100<anything>).
    const literal = await store.findMany<{ title: string }>('todos', {
      where: [
        { field: 'user_id', operator: '=', value: 'user-ilike' },
        { field: 'title', operator: 'ilike', value: '100%_done' },
      ],
    })
    expect(literal.map((r) => r.title)).toEqual(['100%_done report'])
  })

  it('CROSS-BOND CONTRACT: like is case-insensitive AND honors the caller-supplied wildcard pattern (identical to the postgresql/mysql bonds)', async () => {
    await store.create('todos', { user_id: 'user-like', title: 'Buy MILK' })
    await store.create('todos', { user_id: 'user-like', title: 'buy milk later' })
    await store.create('todos', { user_id: 'user-like', title: 'Sell eggs' })

    // Case-insensitive: 'MILK' matches lowercase 'milk' too — before the fix,
    // sqlite's raw LIKE already did this for ASCII by default, but the postgres
    // bond escaped the value into an exact-match, breaking the fleet's
    // `{ operator: 'like', value: \`%${search}%\` }` search filters on postgres
    // while working here. The contract is now IDENTICAL and explicit (LOWER()),
    // not an accident of SQLite's default PRAGMA.
    const milk = await store.findMany<{ title: string }>('todos', {
      where: [
        { field: 'user_id', operator: '=', value: 'user-like' },
        { field: 'title', operator: 'like', value: '%MILK%' },
      ],
      orderBy: [{ field: 'title', direction: 'asc' }],
    })
    expect(milk.map((r) => r.title)).toEqual(['Buy MILK', 'buy milk later'])

    // Unlike ilike, `like` does NOT escape the caller's wildcards — a literal
    // '_' in the pattern matches ANY single character (SQL LIKE semantics),
    // so 'B_y' also matches 'Buy'.
    const wildcard = await store.findMany<{ title: string }>('todos', {
      where: [
        { field: 'user_id', operator: '=', value: 'user-like' },
        { field: 'title', operator: 'like', value: 'b_y%' },
      ],
      orderBy: [{ field: 'title', direction: 'asc' }],
    })
    expect(wildcard.map((r) => r.title)).toEqual(['Buy MILK', 'buy milk later'])
  })

  it('CONSUMER PROPERTY: raw query() honors the $N placeholder style the core docs teach — out of order and repeated', async () => {
    // The core `@molecule/api-database` docs teach `query(sql, values)` with
    // $1/$2 placeholders. $N is positional; sqlite's ? is sequential — the bond
    // must reorder and duplicate values, or hand-written SQL binds garbage.
    await pool.query(`INSERT INTO "todos" ("id", "user_id", "title") VALUES ($3, $1, $2)`, [
      'user-raw',
      'Raw insert',
      'raw-id-1',
    ])
    const outOfOrder = await pool.query<{ id: string; title: string }>(
      `SELECT * FROM "todos" WHERE "user_id" = $1`,
      ['user-raw'],
    )
    expect(outOfOrder.rows).toHaveLength(1)
    expect(outOfOrder.rows[0].id).toBe('raw-id-1')
    expect(outOfOrder.rows[0].title).toBe('Raw insert')

    // Repeated placeholder: the same value referenced twice.
    const repeated = await pool.query(`SELECT * FROM "todos" WHERE "user_id" = $1 OR "id" = $1`, [
      'user-raw',
    ])
    expect(repeated.rows).toHaveLength(1)
  })

  it('CONSUMER PROPERTY: a WITH…SELECT CTE via raw query() returns its rows', async () => {
    // Regression: the old dispatch heuristic (`startsWith('SELECT')`) routed CTEs
    // to stmt.run(), silently returning rows: [] for a valid row-returning query —
    // indistinguishable from a genuinely empty result.
    const result = await pool.query<{ user_id: string; n: number }>(
      `WITH counts AS (
         SELECT "user_id", COUNT(*) AS n FROM "todos" GROUP BY "user_id"
       )
       SELECT * FROM counts WHERE "user_id" = $1`,
      ['user-ilike'],
    )
    expect(result.rows).toHaveLength(1)
    expect(Number(result.rows[0].n)).toBe(4)
  })

  it('FAILURE DISAMBIGUATION: distinct, actionable errors for distinct caller mistakes', async () => {
    const before = await store.count('todos')

    // (1) Unscoped bulk mutations are refused with a "what to do" message — and
    // the table is untouched (vs the silent full-table UPDATE/DELETE they imply).
    await expect(store.updateMany('todos', [], { done: true })).rejects.toThrow(
      'at least one WHERE condition',
    )
    await expect(store.deleteMany('todos', [])).rejects.toThrow('at least one WHERE condition')
    expect(await store.count('todos')).toBe(before)

    // (2) A bad operator names the operator; a bad identifier names the identifier —
    // the two mistakes are not the same fix, so the errors must not read the same.
    await expect(
      store.findMany('todos', {
        where: [{ field: 'title', operator: 'matches' as never, value: 'x' }],
      }),
    ).rejects.toThrow('Invalid SQL operator: matches')
    await expect(store.findById('todos; DROP TABLE todos', '1')).rejects.toThrow(
      'Invalid SQL identifier',
    )

    // (3) A non-array `in` value says exactly what the operator needs.
    await expect(
      store.findMany('todos', { where: [{ field: 'user_id', operator: 'in', value: 'user-1' }] }),
    ).rejects.toThrow(`'in' operator requires an array value`)
  })

  it('empty in/not_in arrays behave like the postgres bond instead of raising `IN ()` syntax errors', async () => {
    // in [] → matches nothing (Postgres `= ANY('{}')` parity).
    const none = await store.findMany('todos', {
      where: [{ field: 'user_id', operator: 'in', value: [] }],
    })
    expect(none).toEqual([])

    // not_in [] → excludes nothing (Postgres `!= ALL('{}')` parity).
    const all = await store.count('todos', [{ field: 'user_id', operator: 'not_in', value: [] }])
    expect(all).toBe(await store.count('todos'))
  })

  it('transactions really isolate: rollback discards, commit persists', async () => {
    const trx1 = await pool.transaction!()
    await trx1.query(`INSERT INTO "todos" ("id", "user_id", "title") VALUES ($1, $2, $3)`, [
      'trx-rollback',
      'user-trx',
      'Should vanish',
    ])
    await trx1.rollback()
    expect(await store.findById('todos', 'trx-rollback')).toBeNull()

    const trx2 = await pool.transaction!()
    await trx2.query(`INSERT INTO "todos" ("id", "user_id", "title") VALUES ($1, $2, $3)`, [
      'trx-commit',
      'user-trx',
      'Should persist',
    ])
    await trx2.commit()
    expect(await store.findById('todos', 'trx-commit')).not.toBeNull()
  })

  it('CONCURRENCY: a second transaction() started before the first commits serializes instead of racing BEGIN', async () => {
    const trxA = await pool.transaction!()
    await trxA.query(`INSERT INTO "todos" ("id", "user_id", "title") VALUES ($1, $2, $3)`, [
      'conc-trx-a',
      'user-conc',
      'trx A',
    ])

    // Start trxB WITHOUT awaiting yet — before the fix this synchronously issues
    // a second BEGIN on the shared connection and throws "cannot start a
    // transaction within a transaction" (trxA is still open).
    const trxBPromise = pool.transaction!()

    await trxA.commit()

    // Must resolve (not throw) once trxA releases the connection.
    const trxB = await trxBPromise
    await trxB.query(`INSERT INTO "todos" ("id", "user_id", "title") VALUES ($1, $2, $3)`, [
      'conc-trx-b',
      'user-conc',
      'trx B',
    ])
    await trxB.commit()

    expect(await store.findById('todos', 'conc-trx-a')).not.toBeNull()
    expect(await store.findById('todos', 'conc-trx-b')).not.toBeNull()
  })

  it('CONCURRENCY: a plain query() issued while a transaction is open is queued, not run inside it', async () => {
    const trx = await pool.transaction!()
    await trx.query(`INSERT INTO "todos" ("id", "user_id", "title") VALUES ($1, $2, $3)`, [
      'conc-inside',
      'user-conc2',
      'inside trx, will roll back',
    ])

    // Fire a plain store.create() (→ pool.query()) WITHOUT awaiting, while the
    // transaction is still open. Before the fix, this ran INSIDE trx's open
    // BEGIN on the shared connection and vanished when trx.rollback() ran —
    // an unrelated request's write silently discarded by someone else's
    // rollback.
    const plainInsert = store.create('todos', {
      id: 'conc-outside',
      user_id: 'user-conc2',
      title: 'outside trx, must persist',
    })

    await trx.rollback()
    await plainInsert

    expect(await store.findById('todos', 'conc-inside')).toBeNull() // rolled back
    expect(await store.findById('todos', 'conc-outside')).not.toBeNull() // survived
  })

  it('filters, sorts, paginates, and counts through real SQL', async () => {
    for (let i = 0; i < 5; i++) {
      await store.create('todos', {
        user_id: 'user-page',
        title: `Task ${i}`,
        done: i % 2 === 0,
      })
    }

    const page = await store.findMany<{ title: string }>('todos', {
      where: [{ field: 'user_id', operator: '=', value: 'user-page' }],
      orderBy: [{ field: 'title', direction: 'desc' }],
      limit: 2,
      offset: 1,
      select: ['title'],
    })
    expect(page.map((r) => r.title)).toEqual(['Task 3', 'Task 2'])

    expect(
      await store.count('todos', [
        { field: 'user_id', operator: '=', value: 'user-page' },
        { field: 'done', operator: '=', value: true },
      ]),
    ).toBe(3)

    const one = await store.findOne<{ title: string }>('todos', [
      { field: 'user_id', operator: '=', value: 'user-page' },
      { field: 'title', operator: 'like', value: 'Task 4' },
    ])
    expect(one?.title).toBe('Task 4')
  })
})
