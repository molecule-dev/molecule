/**
 * Column reconciliation — the migrator's re-read of an ALREADY-APPLIED `CREATE TABLE
 * IF NOT EXISTS` — is limited to the file that CREATES a table, and never adds a
 * `NOT NULL` column with no default.
 *
 * X1 m103 rewrote an applied migration whose `usersSecrets` declaration gained
 * `"userId" TEXT NOT NULL`; the reconciler added it to the package's own (empty) table,
 * and `@molecule/api-resource-user`'s INSERT — which does not write that column — failed
 * every signup with `NOT NULL constraint failed: usersSecrets.userId`. These are the
 * run's own files, applied to a real SQLite database.
 */
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

import Database from 'better-sqlite3'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { createMigrator } from '../migrator.js'

/** The scaffold's own migration, exactly as `mlcl` writes it. */
const SCAFFOLD_USERS_SECRETS = `CREATE TABLE IF NOT EXISTS "usersSecrets" (
  "id" uuid UNIQUE PRIMARY KEY NOT NULL,
  "passwordHash" text,
  "passwordResetToken" text,
  "passwordResetTokenAt" timestamptz,
  "pendingTwoFactorSecret" text,
  "twoFactorSecret" text
);`

/** `1792202928890_create_conduit_users.sql` before the rewrite: it declares the same table. */
const CONDUIT_BEFORE = `CREATE TABLE IF NOT EXISTS "usersSecrets" (
  "id" uuid UNIQUE PRIMARY KEY NOT NULL,
  "passwordHash" text
);`

/** …and after it, with the columns the run's service never writes. */
const CONDUIT_REWRITTEN = `CREATE TABLE IF NOT EXISTS "usersSecrets" (
  "id" uuid UNIQUE PRIMARY KEY NOT NULL,
  "userId" TEXT NOT NULL,
  "passwordHash" text,
  "createdAt" TEXT NOT NULL,
  "updatedAt" TEXT NOT NULL
);`

describe('createMigrator (sqlite) — who owns a table', () => {
  let workDir: string
  let migrationsDir: string
  let dbPath: string
  let prev: string | undefined

  beforeEach(() => {
    workDir = mkdtempSync(join(tmpdir(), 'mol-sqlite-owner-'))
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

  /** The columns the live database holds for a table. */
  const columns = (table: string): string[] => {
    const db = new Database(dbPath)
    try {
      return (
        db.prepare(`SELECT name FROM pragma_table_info(?)`).all(table) as { name: string }[]
      ).map((c) => c.name)
    } finally {
      db.close()
    }
  }

  const quiet = (): ReturnType<typeof vi.spyOn> => {
    vi.spyOn(console, 'log').mockImplementation(() => {})
    return vi.spyOn(console, 'warn').mockImplementation(() => {})
  }

  it('adds nothing for a table ANOTHER file creates, so the package INSERT still works (m103)', async () => {
    const owner = join(migrationsDir, '1792202928883_create_usersSecrets_table.sql')
    const conduit = join(migrationsDir, '1792202928890_create_conduit_users.sql')
    writeFileSync(owner, SCAFFOLD_USERS_SECRETS)
    writeFileSync(conduit, CONDUIT_BEFORE)
    quiet()
    await createMigrator(migrationsDir)()

    // The run rewrote the applied file to declare columns the package never writes.
    writeFileSync(conduit, CONDUIT_REWRITTEN)
    const warn = quiet()
    await createMigrator(migrationsDir)()

    // Before the fix the reconciler ALTERed all three NOT NULL columns onto the empty
    // table (SQLite only refuses with rows present) — the exact production break.
    expect(columns('usersSecrets')).toEqual([
      'id',
      'passwordHash',
      'passwordResetToken',
      'passwordResetTokenAt',
      'pendingTwoFactorSecret',
      'twoFactorSecret',
    ])
    const said = warn.mock.calls.map((c) => String(c[0])).join('\n')
    expect(said).toContain('CREATE TABLE IF NOT EXISTS "usersSecrets" is a no-op')
    expect(said).toContain('1792202928883_create_usersSecrets_table.sql creates it')

    // `@molecule/api-resource-user`'s own insert shape: id + passwordHash only.
    const db = new Database(dbPath)
    try {
      expect(() =>
        db
          .prepare('INSERT INTO "usersSecrets" ("id", "passwordHash") VALUES (?, ?)')
          .run('5c1c6a54-1111-4111-8111-111111111111', 'hash'),
      ).not.toThrow()
    } finally {
      db.close()
    }
  })

  it('never adds a NOT NULL column with no DEFAULT, even to an EMPTY table (m103)', async () => {
    const file = join(migrationsDir, '0001_usersSecrets.sql')
    writeFileSync(
      file,
      'CREATE TABLE IF NOT EXISTS "usersSecrets" ("id" TEXT PRIMARY KEY NOT NULL, "passwordHash" text);',
    )
    quiet()
    await createMigrator(migrationsDir)()

    // The file OWNS this table, so reconciliation runs — but `userId` has no default.
    writeFileSync(
      file,
      'CREATE TABLE IF NOT EXISTS "usersSecrets" (\n' +
        '  "id" TEXT PRIMARY KEY NOT NULL,\n' +
        '  "passwordHash" text,\n' +
        '  "userId" TEXT NOT NULL,\n' +
        '  "createdAt" TEXT NOT NULL DEFAULT \'1970-01-01T00:00:00.000Z\'\n);',
    )
    const warn = quiet()
    await createMigrator(migrationsDir)()

    // The constant-default column is added; the NOT NULL one without a default is not.
    expect(columns('usersSecrets')).toEqual(['id', 'passwordHash', 'createdAt'])
    const said = warn.mock.calls.map((c) => String(c[0])).join('\n')
    expect(said).toContain('usersSecrets.userId is NOT NULL with no DEFAULT')
  })
})
