/**
 * `ALTER TABLE … DROP COLUMN IF EXISTS` against a REAL SQLite database.
 *
 * The m103 production deploy crashed on exactly this statement: the agent repaired
 * a column only its DEV database had (a since-deleted migration added it) with the
 * Postgres idempotent form, and production's FRESH database — where the column never
 * existed — rejected the clause with `near "EXISTS": syntax error` and refused to
 * boot (X1 flash-m103, 2026-10-17).
 */
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

import Database from 'better-sqlite3'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'

import { createMigrator } from '../migrator.js'

describe('createMigrator (sqlite) — DROP COLUMN IF EXISTS', () => {
  let workDir: string
  let migrationsDir: string
  let dbPath: string
  let prev: string | undefined

  beforeEach(() => {
    workDir = mkdtempSync(join(tmpdir(), 'mol-sqlite-drop-column-'))
    migrationsDir = join(workDir, 'migrations')
    mkdirSync(migrationsDir, { recursive: true })
    dbPath = join(workDir, 'app.db')
    prev = process.env.SQLITE_PATH
    process.env.SQLITE_PATH = dbPath
  })

  afterEach(() => {
    if (prev === undefined) delete process.env.SQLITE_PATH
    else process.env.SQLITE_PATH = prev
    rmSync(workDir, { recursive: true, force: true })
  })

  /** The live column names of a table, read from the database the migrator wrote. */
  const columns = (table: string): string[] => {
    const db = new Database(dbPath)
    try {
      return (
        db.prepare('SELECT name FROM pragma_table_info(?)').all(table) as { name: string }[]
      ).map((c) => c.name)
    } finally {
      db.close()
    }
  }

  /** Write one migration file into the app's migrations directory. */
  const migration = (file: string, sql: string): void =>
    writeFileSync(join(migrationsDir, file), sql)

  it('drops the column when it exists — the repair the agent meant', async () => {
    migration(
      '0001_users.sql',
      'CREATE TABLE IF NOT EXISTS "usersSecrets" ("id" TEXT PRIMARY KEY, "userId" TEXT NOT NULL);',
    )
    await createMigrator(migrationsDir)()
    expect(columns('usersSecrets')).toEqual(['id', 'userId'])

    migration('0002_drop.sql', 'ALTER TABLE "usersSecrets" DROP COLUMN IF EXISTS "userId";')
    await expect(createMigrator(migrationsDir)()).resolves.toBeUndefined()
    expect(columns('usersSecrets')).toEqual(['id'])
  })

  it('is a no-op on a FRESH database where the column never existed (flash-m103)', async () => {
    // Production's shape: an earlier file created the table, and the dev-only column
    // (added by a since-deleted migration) is not there. Postgres drops nothing and
    // succeeds; before this, SQLite rejected the clause and the app did not boot.
    migration(
      '0001_users.sql',
      'CREATE TABLE IF NOT EXISTS "usersSecrets" ("id" TEXT PRIMARY KEY);',
    )
    migration('0002_drop.sql', 'ALTER TABLE "usersSecrets" DROP COLUMN IF EXISTS "userId";')

    await expect(createMigrator(migrationsDir)()).resolves.toBeUndefined()
    expect(columns('usersSecrets')).toEqual(['id'])
  })

  it('still fails when the TABLE does not exist — the clause is not a blanket no-op', async () => {
    migration('0001_drop.sql', 'ALTER TABLE "ghost" DROP COLUMN IF EXISTS "userId";')

    // Postgres refuses this too (`relation "ghost" does not exist`), so the migration
    // must still fail the run and name the file rather than vanish.
    await expect(createMigrator(migrationsDir)()).rejects.toThrow(
      /- 0001_drop\.sql: no such table: ghost/,
    )
  })

  it('runs inside a multi-statement file without swallowing its neighbours', async () => {
    migration(
      '0001_init.sql',
      [
        'CREATE TABLE IF NOT EXISTS "usersSecrets" ("id" TEXT PRIMARY KEY);',
        'CREATE TABLE IF NOT EXISTS "notes" ("id" TEXT PRIMARY KEY);',
        'INSERT INTO "notes" ("id") VALUES (\'kept\');',
        'ALTER TABLE "usersSecrets" DROP COLUMN IF EXISTS "userId";',
      ].join('\n'),
    )

    await createMigrator(migrationsDir)()
    expect(columns('usersSecrets')).toEqual(['id'])
    const db = new Database(dbPath)
    try {
      expect((db.prepare('SELECT count(*) AS n FROM notes').get() as { n: number }).n).toBe(1)
    } finally {
      db.close()
    }
  })
})
