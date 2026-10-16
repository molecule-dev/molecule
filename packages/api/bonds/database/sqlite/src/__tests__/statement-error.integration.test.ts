/**
 * REAL-DEPENDENCY integration tests — the actual better-sqlite3, no mocks.
 *
 * X0 flash-m89 (2026-10-16) measured the gap: a seed inserted a UUID string into
 * `conduit_comments.id` (`INTEGER PRIMARY KEY AUTOINCREMENT`) and better-sqlite3 threw
 * `SqliteError: datatype mismatch` with a stack into pool.ts — no statement, no table. The
 * executor spent 38 s grepping every `create(` call in the app to find which table it had
 * aimed at. Postgres' driver names the table on the same class of failure; SQLite's names
 * nothing, so the pool has to hand the statement back itself.
 *
 * @module
 */

import { mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

import { afterAll, beforeAll, describe, expect, it } from 'vitest'

import type { DatabasePool } from '@molecule/api-database'

import { createPool } from '../pool.js'
import { createStore } from '../store.js'

let workDir: string
let pool: DatabasePool

/** A `SqliteError` as it reached the caller, with the fields better-sqlite3 sets. */
interface SqliteFailure extends Error {
  code?: string
  sql?: string
}

/** Runs a query that must fail and returns the error it threw. */
async function failure(run: Promise<unknown>): Promise<SqliteFailure> {
  try {
    await run
  } catch (error) {
    return error as SqliteFailure
  }
  throw new Error('expected the query to fail, but it resolved')
}

beforeAll(() => {
  workDir = mkdtempSync(join(tmpdir(), 'mol-sqlite-statement-error-'))
  pool = createPool({ path: join(workDir, 'app.db') })
})

afterAll(async () => {
  await pool.end()
  rmSync(workDir, { recursive: true, force: true })
})

describe('a failing statement names itself', () => {
  beforeAll(async () => {
    // The table that produced m89's error, spelled the way the app created it.
    await pool.query(
      `CREATE TABLE "conduit_comments" (
        "id" INTEGER PRIMARY KEY AUTOINCREMENT,
        "body" TEXT NOT NULL
      )`,
    )
  })

  it('appends the statement to a datatype mismatch, and never the bound values', async () => {
    const id = '3f2a6b1e-9c74-4d51-9f0e-8a7b2c4d5e6f'
    const error = await failure(
      pool.query('INSERT INTO "conduit_comments" ("id", "body") VALUES ($1, $2)', [
        id,
        'a comment',
      ]),
    )

    // The statement as the driver saw it: placeholders converted, whitespace collapsed.
    expect(error.sql).toBe('INSERT INTO "conduit_comments" ("id", "body") VALUES (?, ?)')
    expect(error.message).toContain('datatype mismatch')
    expect(error.message).toContain(
      '— in: INSERT INTO "conduit_comments" ("id", "body") VALUES (?, ?)',
    )
    // The values the caller was storing are not in either — they are user data.
    expect(error.message).not.toContain(id)
    expect(error.message).not.toContain('a comment')
    // Class and code survive: the error is mutated, not replaced.
    expect(error.constructor.name).toBe('SqliteError')
    expect(error.code).toBe('SQLITE_MISMATCH')
  })

  it('names a statement that fails at prepare time (no such table)', async () => {
    const error = await failure(pool.query('SELECT * FROM "comments_missing" WHERE "id" = $1', [1]))

    expect(error.sql).toBe('SELECT * FROM "comments_missing" WHERE "id" = ?')
    expect(error.message).toContain('no such table')
    expect(error.message).toContain('SELECT * FROM "comments_missing" WHERE "id" = ?')
    expect(error.message).not.toContain('WHERE "id" = 1')
    expect(error.code).toBe('SQLITE_ERROR')
  })

  it('names the statement of a non-reader statement that violates a constraint', async () => {
    const error = await failure(
      pool.query('INSERT INTO "conduit_comments" ("body") VALUES ($1)', [null]),
    )

    expect(error.message).toContain('NOT NULL constraint failed')
    expect(error.message).toContain('— in: INSERT INTO "conduit_comments" ("body") VALUES (?)')
    expect(error.sql).toBe('INSERT INTO "conduit_comments" ("body") VALUES (?)')
    expect(error.code).toBe('SQLITE_CONSTRAINT_NOTNULL')
  })

  it('keeps the note naming the table the store was asked for', async () => {
    // The store wraps its own queries and appends `(table "…")`; the statement the pool
    // echoes quotes that same table, so the note must not read as already present.
    const store = createStore(pool)
    const error = await failure(
      store.findMany('conduit_comments', {
        where: [{ field: 'body_missing', operator: '=', value: 1 }],
      }),
    )

    expect(error.message).toContain('no such column')
    expect(error.message).toContain('(table "conduit_comments")')
    expect(error.message).toContain(
      '— in: SELECT * FROM "conduit_comments" WHERE "body_missing" = ?',
    )
  })

  it('keeps the statement on one bounded line, and whole on the error', async () => {
    const long = `SELECT ${Array.from({ length: 40 }, (_, i) => `"col_${i}"`).join(', ')}
      FROM "conduit_comments"
      WHERE "no_such_column" = $1`
    const error = await failure(pool.query(long, [1]))

    // `sql` carries it whole (placeholders converted); the message line is collapsed and capped.
    expect(error.sql).toBe(long.replace('$1', '?'))
    expect(error.sql).toContain('\n')
    const named = error.message.slice(error.message.indexOf('— in: ') + '— in: '.length)
    expect(named).not.toContain('\n')
    expect(named.length).toBeLessThanOrEqual(200)
  })
})
