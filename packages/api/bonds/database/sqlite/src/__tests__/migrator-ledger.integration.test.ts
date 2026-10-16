/**
 * The migration ledger, against a real SQLite file: a file runs once, a recorded
 * file never re-runs, a database migrated before the ledger is adopted, and a
 * new file whose first statement already applied says the rest did not run.
 */
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

import Database from 'better-sqlite3'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { createMigrator, MIGRATION_LEDGER } from '../migrator.js'

describe('createMigrator (sqlite) — ledger', () => {
  let workDir: string
  let migrationsDir: string
  let dbPath: string
  let prev: string | undefined

  beforeEach(() => {
    workDir = mkdtempSync(join(tmpdir(), 'mol-sqlite-ledger-'))
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
    vi.restoreAllMocks()
  })

  const query = <T>(sql: string): T[] => {
    const db = new Database(dbPath)
    try {
      return db.prepare(sql).all() as T[]
    } finally {
      db.close()
    }
  }

  it('runs a file once: a DROP or seed in it does not repeat on the next boot', async () => {
    writeFileSync(
      join(migrationsDir, '0001_init.sql'),
      'CREATE TABLE IF NOT EXISTS "notes" ("id" INTEGER PRIMARY KEY, "body" TEXT);',
    )
    writeFileSync(
      join(migrationsDir, '0002_seed.sql'),
      'INSERT INTO "notes" ("body") VALUES (\'seed\');',
    )
    await createMigrator(migrationsDir)()
    await createMigrator(migrationsDir)()
    expect(query<{ n: number }>('SELECT count(*) AS n FROM notes')[0].n).toBe(1)
    expect(
      query<{ file: string }>(`SELECT file FROM "${MIGRATION_LEDGER}" ORDER BY file`).map(
        (r) => r.file,
      ),
    ).toEqual(['0001_init.sql', '0002_seed.sql'])
  })

  it('still adds a column added to an applied CREATE TABLE, ignoring commas in comments (flash-m39)', async () => {
    const file = join(migrationsDir, '0001_init.sql')
    writeFileSync(file, 'CREATE TABLE IF NOT EXISTS "notes" ("id" INTEGER PRIMARY KEY);')
    await createMigrator(migrationsDir)()
    writeFileSync(
      file,
      'CREATE TABLE IF NOT EXISTS "notes" (\n  "id" INTEGER PRIMARY KEY,\n  -- PUT, and create + update\n  "title" TEXT\n);',
    )
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    vi.spyOn(console, 'log').mockImplementation(() => {})
    await createMigrator(migrationsDir)()
    expect(
      query<{ name: string }>("SELECT name FROM pragma_table_info('notes')").map((c) => c.name),
    ).toEqual(['id', 'title'])
    expect(warn).not.toHaveBeenCalled()
  })

  it('adopts a database migrated before the ledger: old files are recorded, not failed', async () => {
    const db = new Database(dbPath)
    db.exec('CREATE TABLE "notes" ("id" INTEGER PRIMARY KEY, "seq" INTEGER)')
    db.close()
    writeFileSync(
      join(migrationsDir, '0001_init.sql'),
      'CREATE TABLE "notes" ("id" INTEGER PRIMARY KEY);',
    )
    writeFileSync(
      join(migrationsDir, '0002_seq.sql'),
      'ALTER TABLE "notes" ADD COLUMN "seq" INTEGER;',
    )
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    vi.spyOn(console, 'log').mockImplementation(() => {})
    await createMigrator(migrationsDir)()
    expect(String(warn.mock.calls[0]?.[0])).toContain('applied before; now recorded')
    expect(query<{ file: string }>(`SELECT file FROM "${MIGRATION_LEDGER}"`)).toHaveLength(2)
  })

  it('says the rest of a new file did not run when its first statement already applied (flash-m39)', async () => {
    writeFileSync(
      join(migrationsDir, '0001_init.sql'),
      'CREATE TABLE IF NOT EXISTS "notes" ("id" INTEGER PRIMARY KEY, "seq" INTEGER);',
    )
    await createMigrator(migrationsDir)()
    writeFileSync(
      join(migrationsDir, '0002_backfill.sql'),
      'ALTER TABLE "notes" ADD COLUMN "seq" INTEGER;\nUPDATE "notes" SET "seq" = "id";',
    )
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    vi.spyOn(console, 'log').mockImplementation(() => {})
    await createMigrator(migrationsDir)()
    expect(String(warn.mock.calls[0]?.[0])).toContain('nothing in this file was applied')
    expect(
      query<{ file: string }>(`SELECT file FROM "${MIGRATION_LEDGER}"`).map((r) => r.file),
    ).toEqual(['0001_init.sql'])
  })

  it('applies none of a file that fails partway, so its fixed version runs whole (flash-m40)', async () => {
    const file = join(migrationsDir, '0001_init.sql')
    writeFileSync(
      file,
      'CREATE TABLE "users" ("id" INTEGER PRIMARY KEY);\nALTER TABLE "users" ADD COLUMN "passwordHash" TEXT;\nCREATE TABLE "comments" (oops',
    )
    vi.spyOn(console, 'error').mockImplementation(() => {})
    vi.spyOn(console, 'log').mockImplementation(() => {})
    await expect(createMigrator(migrationsDir)()).rejects.toThrow(/0001_init\.sql/)
    expect(query<{ name: string }>("SELECT name FROM sqlite_master WHERE name = 'users'")).toEqual(
      [],
    )
    writeFileSync(
      file,
      'CREATE TABLE "users" ("id" INTEGER PRIMARY KEY);\nALTER TABLE "users" ADD COLUMN "passwordHash" TEXT;\nCREATE TABLE "comments" ("id" INTEGER PRIMARY KEY);',
    )
    await createMigrator(migrationsDir)()
    expect(
      query<{ name: string }>("SELECT name FROM sqlite_master WHERE name = 'comments'"),
    ).toHaveLength(1)
  })

  it('honors ADD COLUMN IF NOT EXISTS on a column that is there: skipped, file records, no warning', async () => {
    // SQLite has no `ADD COLUMN IF NOT EXISTS`; translated to a bare ADD COLUMN it
    // failed with `duplicate column name`, rolled the file back, left it unrecorded
    // and warned "nothing in this file was applied" on every boot while the schema
    // was complete (a new column declared in a setup file with `IF NOT EXISTS`).
    writeFileSync(
      join(migrationsDir, '0001_init.sql'),
      'CREATE TABLE IF NOT EXISTS "notes" ("id" INTEGER PRIMARY KEY, "seq" INTEGER);\n' +
        'ALTER TABLE "notes" ADD COLUMN IF NOT EXISTS "seq" INTEGER;',
    )
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    vi.spyOn(console, 'log').mockImplementation(() => {})
    await createMigrator(migrationsDir)()
    expect(warn).not.toHaveBeenCalled()
    expect(
      query<{ name: string }>("SELECT name FROM pragma_table_info('notes')").map((c) => c.name),
    ).toEqual(['id', 'seq'])
    expect(
      query<{ file: string }>(`SELECT file FROM "${MIGRATION_LEDGER}"`).map((r) => r.file),
    ).toEqual(['0001_init.sql'])
  })

  it('applies ADD COLUMN IF NOT EXISTS when the column really is missing', async () => {
    writeFileSync(
      join(migrationsDir, '0001_init.sql'),
      'CREATE TABLE IF NOT EXISTS "notes" ("id" INTEGER PRIMARY KEY);',
    )
    await createMigrator(migrationsDir)()
    writeFileSync(
      join(migrationsDir, '0002_seq.sql'),
      'ALTER TABLE "notes" ADD COLUMN IF NOT EXISTS "seq" INTEGER NOT NULL DEFAULT 0;',
    )
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    vi.spyOn(console, 'log').mockImplementation(() => {})
    await createMigrator(migrationsDir)()
    expect(warn).not.toHaveBeenCalled()
    expect(
      query<{ name: string }>("SELECT name FROM pragma_table_info('notes')").map((c) => c.name),
    ).toEqual(['id', 'seq'])
    expect(
      query<{ file: string }>(`SELECT file FROM "${MIGRATION_LEDGER}" ORDER BY file`).map(
        (r) => r.file,
      ),
    ).toEqual(['0001_init.sql', '0002_seq.sql'])
  })

  it('still adds the column when the table exists without it, even though the file declares it', async () => {
    // Postgres's reading of the clause, which this bond matches: on the existing
    // table the file's own `CREATE TABLE IF NOT EXISTS` is a no-op, so the ADD
    // COLUMN is what has to deliver the column — the same shape as a setup file
    // that adds a column to a table created by an earlier file.
    writeFileSync(
      join(migrationsDir, '0001_init.sql'),
      'CREATE TABLE IF NOT EXISTS "notes" ("id" INTEGER PRIMARY KEY);',
    )
    await createMigrator(migrationsDir)()
    writeFileSync(
      join(migrationsDir, '0002_seq.sql'),
      'CREATE TABLE IF NOT EXISTS "notes" ("id" INTEGER PRIMARY KEY, "seq" INTEGER);\n' +
        'ALTER TABLE "notes" ADD COLUMN IF NOT EXISTS "seq" INTEGER;',
    )
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    vi.spyOn(console, 'log').mockImplementation(() => {})
    await createMigrator(migrationsDir)()
    expect(warn).not.toHaveBeenCalled()
    expect(
      query<{ name: string }>("SELECT name FROM pragma_table_info('notes')").map((c) => c.name),
    ).toEqual(['id', 'seq'])
    expect(
      query<{ file: string }>(`SELECT file FROM "${MIGRATION_LEDGER}" ORDER BY file`).map(
        (r) => r.file,
      ),
    ).toEqual(['0001_init.sql', '0002_seq.sql'])
  })

  it('still fails the run when ADD COLUMN IF NOT EXISTS names a table that is not there', async () => {
    writeFileSync(
      join(migrationsDir, '0001_init.sql'),
      'ALTER TABLE "missing" ADD COLUMN IF NOT EXISTS "seq" INTEGER;',
    )
    vi.spyOn(console, 'error').mockImplementation(() => {})
    vi.spyOn(console, 'log').mockImplementation(() => {})
    await expect(createMigrator(migrationsDir)()).rejects.toThrow(/0001_init\.sql/)
  })
})
