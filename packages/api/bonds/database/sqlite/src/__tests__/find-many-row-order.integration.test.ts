/**
 * REAL-DEPENDENCY integration test — the real migrator, pool and store over a
 * temp SQLite database, no mocks.
 *
 * `DataStore.findMany` documents that the row order is UNSPECIFIED unless
 * `orderBy` is given, and names the trap that makes it bite: a `where` on an
 * INDEXED column is answered from that index, so the rows come back in the
 * INDEX's order — not the order they were inserted in. That claim is what makes
 * `findMany` without `orderBy` unsafe to build a list on (an order's `items`,
 * an article's `tagList`, a spec asserting `tagList[0]`), so it is asserted here
 * rather than assumed.
 *
 * The third case is the reason the bug survives development: with no index to
 * use, the same query DOES come back in insertion order, so a dev database full
 * of fresh rows looks correct right up until the table grows an index or the
 * rows are read through a different bond.
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

/**
 * A join table shaped like the real ones in the fleet: a foreign key with a
 * composite index whose SECOND column orders the rows differently from the
 * order they were inserted in (`@molecule/api-resource-article`'s
 * `article_tags` is `UNIQUE ("articleId", "tag")`; this is the same shape with
 * an explicit index). `no_index_items` is the control: the same columns, no
 * index to answer the `where` from.
 */
const MIGRATION_SQL = `CREATE TABLE IF NOT EXISTS "line_items" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "groupId" UUID NOT NULL,
  "name" VARCHAR(100) NOT NULL,
  "position" INTEGER NOT NULL DEFAULT 0,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS "idx_line_items_group_name" ON "line_items" USING btree ("groupId", "name");

CREATE TABLE IF NOT EXISTS "no_index_items" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "groupId" UUID NOT NULL,
  "name" VARCHAR(100) NOT NULL,
  "position" INTEGER NOT NULL DEFAULT 0,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT now()
);`

/** Insertion order, deliberately NOT the index order: same group, names z, a, m. */
const NAMES = ['z', 'a', 'm'] as const

/** Index order for the (groupId, name) index: name ascending. */
const INDEX_ORDER = ['a', 'm', 'z']

const GROUP = 'group-1'

let workDir: string
let dbPath: string
let pool: DatabasePool
let store: ReturnType<typeof createStore>
let prevSqlitePath: string | undefined

beforeAll(async () => {
  workDir = mkdtempSync(join(tmpdir(), 'mol-sqlite-row-order-'))
  const migrationsDir = join(workDir, 'migrations')
  const { mkdirSync } = await import('node:fs')
  mkdirSync(migrationsDir, { recursive: true })
  writeFileSync(join(migrationsDir, '0001_init.sql'), MIGRATION_SQL)

  prevSqlitePath = process.env.SQLITE_PATH
  process.env.SQLITE_PATH = join(workDir, 'data', 'app.db')

  await createMigrator(migrationsDir)()

  dbPath = process.env.SQLITE_PATH
  pool = createPool({ path: dbPath })
  store = createStore(pool)

  // Seeded through the store, the way a resource package writes them: name and
  // position both follow the insertion index.
  for (const table of ['line_items', 'no_index_items']) {
    for (const [position, name] of NAMES.entries()) {
      await store.create(table, { groupId: GROUP, name, position })
    }
  }
})

afterAll(async () => {
  await pool.end()
  if (prevSqlitePath === undefined) delete process.env.SQLITE_PATH
  else process.env.SQLITE_PATH = prevSqlitePath
  rmSync(workDir, { recursive: true, force: true })
})

const namesFrom = (rows: Array<{ name: string }>): string[] => rows.map((r) => r.name)

describe('findMany row order × REAL SQLite', () => {
  it('answers a `where` on an indexed column from the INDEX, so no `orderBy` means index order', async () => {
    // The premise of the assertion below — if this stops holding the row order
    // would be free to be anything, and this test would be demonstrating nothing.
    const plan = await pool.query<{ detail: string }>(
      'EXPLAIN QUERY PLAN SELECT * FROM "line_items" WHERE "groupId" = ?',
      [GROUP],
    )
    expect(plan.rows.map((r) => r.detail).join(' | ')).toContain('idx_line_items_group_name')

    const rows = await store.findMany<{ name: string }>('line_items', {
      where: [{ field: 'groupId', operator: '=', value: GROUP }],
    })

    // Inserted z, a, m — read back a, m, z. The row order is the database's,
    // which is exactly why any list whose order matters must pass `orderBy`.
    expect(namesFrom(rows)).toEqual(INDEX_ORDER)
    expect(namesFrom(rows)).not.toEqual([...NAMES])
  })

  it('returns the order the caller declares when `orderBy` is given', async () => {
    const rows = await store.findMany<{ name: string }>('line_items', {
      where: [{ field: 'groupId', operator: '=', value: GROUP }],
      orderBy: [{ field: 'position', direction: 'asc' }],
    })

    expect(namesFrom(rows)).toEqual([...NAMES])
  })

  it('returns insertion order when no index can answer the `where` — why the trap is invisible in dev', async () => {
    const rows = await store.findMany<{ name: string }>('no_index_items', {
      where: [{ field: 'groupId', operator: '=', value: GROUP }],
    })

    expect(namesFrom(rows)).toEqual([...NAMES])
  })

  it('keeps a stored `position` authoritative even against the index order', async () => {
    // The fix resource packages use when no column encodes the intended order:
    // store one, write it from the array index, and order by it.
    const rows = await store.findMany<{ name: string; position: number }>('line_items', {
      where: [{ field: 'groupId', operator: '=', value: GROUP }],
      orderBy: [{ field: 'position', direction: 'asc' }],
      select: ['name', 'position'],
    })

    expect(rows.map((r) => r.position)).toEqual([0, 1, 2])
    expect(namesFrom(rows)).toEqual([...NAMES])
  })
})
