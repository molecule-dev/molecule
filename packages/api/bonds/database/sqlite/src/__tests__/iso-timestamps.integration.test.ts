/**
 * REAL-DEPENDENCY integration tests for timestamp column defaults — no mocks,
 * the actual better-sqlite3 and a real migration run.
 *
 * A SQLite app's rows carried `YYYY-MM-DD HH:MM:SS` (space, no `T`/`Z`, whole
 * seconds) because `DEFAULT now()` / `DEFAULT CURRENT_TIMESTAMP` in a Postgres-
 * dialect migration were translated to SQLite's own `current_timestamp`.
 * `new Date(value)` parses that as LOCAL time (every stored timestamp read back
 * hours off) and two rows written in the same second were byte-identical
 * strings, so "newest first" returned them in arbitrary order — the RealWorld
 * Hurl suite asserts ISO-8601 and failed in 8 of 13 files.
 *
 * This file runs migrate → pool → store the way a scaffolded app does and
 * asserts what the fix guarantees: a default-filled column is ISO-8601 UTC with
 * milliseconds, round-trips through `new Date()`, and orders correctly.
 *
 * @module
 */

import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

import { afterAll, beforeAll, describe, expect, it } from 'vitest'

import type { DatabasePool } from '@molecule/api-database'

import { createMigrator } from '../migrator.js'
import { createPool } from '../pool.js'
import { createStore } from '../store.js'

/** `2026-10-16T01:22:21.416Z` — ISO-8601, UTC, milliseconds. */
const ISO_WITH_MS = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/

let workDir: string
let dbPath: string
let pool: DatabasePool
let store: ReturnType<typeof createStore>
let prevSqlitePath: string | undefined

// Both timestamp-default forms the platform's migrations use, authored in
// Postgres dialect on purpose: `now()` (the resource library) and
// `CURRENT_TIMESTAMP` (the template migrations).
const MIGRATION_SQL = `CREATE TABLE "articles" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "title" TEXT NOT NULL,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT now(),
  "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE TABLE "tickets" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "subject" TEXT NOT NULL,
  "createdAt" timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);`

beforeAll(async () => {
  workDir = mkdtempSync(join(tmpdir(), 'mol-sqlite-iso-ts-'))
  const migrationsDir = join(workDir, 'migrations')
  dbPath = join(workDir, 'data', 'app.db')
  mkdirSync(migrationsDir, { recursive: true })
  writeFileSync(join(migrationsDir, '0001_init.sql'), MIGRATION_SQL)

  prevSqlitePath = process.env.SQLITE_PATH
  process.env.SQLITE_PATH = dbPath

  await createMigrator(migrationsDir)()
  pool = createPool({ path: dbPath, walMode: false })
  store = createStore(pool)
})

afterAll(async () => {
  await pool.end()
  if (prevSqlitePath === undefined) delete process.env.SQLITE_PATH
  else process.env.SQLITE_PATH = prevSqlitePath
  rmSync(workDir, { recursive: true, force: true })
})

/** Inserts through the bare-create path (no explicit timestamps) and returns the stored row. */
const insertArticle = async (
  title: string,
): Promise<{ title: string; createdAt: string; updatedAt: string }> => {
  const { data } = await store.create<{
    title: string
    createdAt: string
    updatedAt: string
  }>('articles', { title })
  return data!
}

describe('DEFAULT now() / CURRENT_TIMESTAMP produce ISO-8601 UTC timestamps', () => {
  it('reads a default-filled column back as ISO with milliseconds, unchanged by new Date()', async () => {
    const row = await insertArticle('iso')
    expect(row.createdAt).toMatch(ISO_WITH_MS)
    expect(row.updatedAt).toMatch(ISO_WITH_MS)
    // The value IS what Date.prototype.toISOString() produces — a space-separated
    // `YYYY-MM-DD HH:MM:SS` fails both of these.
    expect(new Date(row.createdAt).toISOString()).toBe(row.createdAt)

    // And it names the SAME instant the wall clock does. The old format reparsed
    // as local time, so this is hours off on any non-UTC machine.
    expect(Math.abs(Date.parse(row.createdAt) - Date.now())).toBeLessThan(60_000)
  })

  it('reads the same ISO shape for the `DEFAULT CURRENT_TIMESTAMP NOT NULL` template form', async () => {
    const { data } = await store.create<{ createdAt: string }>('tickets', { subject: 't1' })
    expect(data!.createdAt).toMatch(ISO_WITH_MS)
    expect(new Date(data!.createdAt).toISOString()).toBe(data!.createdAt)
  })

  it('orders two rows written in the same second', async () => {
    let first: { title: string; createdAt: string } = { title: '', createdAt: '' }
    let second: { title: string; createdAt: string } = { title: '', createdAt: '' }
    let sameSecond = false

    // A first insert landing just before a second boundary can tip the second one
    // into the next second; retry until both land inside ONE second. Every
    // iteration advances the clock past the first row's millisecond first, so
    // `second` is always the later instant.
    for (let attempt = 0; attempt < 200 && !sameSecond; attempt++) {
      first = await insertArticle(`same-second-${attempt}-a`)
      const firstMs = Date.parse(first.createdAt)
      while (Date.now() <= firstMs) {
        // Spin: guarantees the next read of the system clock (which is what
        // SQLite's strftime('now') uses) is strictly later.
      }
      second = await insertArticle(`same-second-${attempt}-b`)
      sameSecond = first.createdAt.slice(0, 19) === second.createdAt.slice(0, 19)
    }

    // Both rows are inside one wall-clock second…
    expect(sameSecond).toBe(true)
    // …and still distinct and ordered, which whole-second timestamps were not.
    expect(second.createdAt > first.createdAt).toBe(true)

    const rows = await store.findMany<{ title: string }>('articles', {
      where: [{ field: 'title', operator: 'in', value: [first.title, second.title] }],
      orderBy: [{ field: 'createdAt', direction: 'desc' }],
    })
    expect(rows.map((r) => r.title)).toEqual([second.title, first.title])
  })
})
