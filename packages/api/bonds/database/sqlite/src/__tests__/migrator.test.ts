import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

// better-sqlite3 is a native addon; mock it (the driver) like the mysql bond mocks
// mysql2. Real file I/O is kept — the migrator's job is to read .sql files in order
// and feed each WHOLE file to db.exec() (not prepare/run, which runs one statement).
// vi.hoisted so the spies exist when the hoisted vi.mock factory runs.
const { execSpy, closeSpy, DatabaseMock } = vi.hoisted(() => {
  const execSpy = vi.fn()
  const closeSpy = vi.fn()
  // Regular function (not arrow) so it works with `new Database(...)`.
  const DatabaseMock = vi.fn(function MockDatabase() {
    return { exec: execSpy, close: closeSpy }
  })
  return { execSpy, closeSpy, DatabaseMock }
})
vi.mock('better-sqlite3', () => ({ default: DatabaseMock }))

import { createMigrator } from '../migrator.js'

describe('createMigrator (sqlite)', () => {
  let workDir: string
  let migrationsDir: string
  let dbPath: string
  let prevSqlitePath: string | undefined

  beforeEach(() => {
    vi.clearAllMocks()
    workDir = mkdtempSync(join(tmpdir(), 'mol-sqlite-migrator-'))
    migrationsDir = join(workDir, 'migrations')
    mkdirSync(migrationsDir, { recursive: true })
    // Nested path so we also exercise parent-dir auto-creation.
    dbPath = join(workDir, 'data', 'app.db')
    prevSqlitePath = process.env.SQLITE_PATH
    process.env.SQLITE_PATH = dbPath
  })

  afterEach(() => {
    if (prevSqlitePath === undefined) delete process.env.SQLITE_PATH
    else process.env.SQLITE_PATH = prevSqlitePath
    rmSync(workDir, { recursive: true, force: true })
  })

  it('opens the db at SQLITE_PATH and feeds a MULTI-statement file to exec() in one call', async () => {
    // Two statements in one file. A prepared statement / the pool's query() runs only
    // ONE and would throw; exec() applies the whole file — the reason this migrator exists.
    const sql =
      'CREATE TABLE categories (id TEXT PRIMARY KEY, name TEXT NOT NULL);\n' +
      'CREATE TABLE recipes (id TEXT PRIMARY KEY, title TEXT NOT NULL, category TEXT);'
    writeFileSync(join(migrationsDir, '0001_init.sql'), sql)

    await createMigrator(migrationsDir)()

    expect(DatabaseMock).toHaveBeenCalledWith(dbPath)
    // The entire multi-statement file goes to exec() in a single call.
    expect(execSpy).toHaveBeenCalledTimes(1)
    expect(execSpy).toHaveBeenCalledWith(sql)
    expect(closeSpy).toHaveBeenCalled()
  })

  it('applies migration files in lexical order', async () => {
    writeFileSync(join(migrationsDir, '0002_b.sql'), 'CREATE TABLE b (id TEXT);')
    writeFileSync(join(migrationsDir, '0001_a.sql'), 'CREATE TABLE a (id TEXT);')

    await createMigrator(migrationsDir)()

    expect(execSpy).toHaveBeenCalledTimes(2)
    expect(execSpy.mock.calls[0][0]).toContain('CREATE TABLE a')
    expect(execSpy.mock.calls[1][0]).toContain('CREATE TABLE b')
  })

  it('continues past a failing migration (idempotent IF-NOT-EXISTS files must not abort the run)', async () => {
    writeFileSync(join(migrationsDir, '0001_ok.sql'), 'CREATE TABLE ok (id TEXT);')
    writeFileSync(join(migrationsDir, '0002_bad.sql'), 'CREATE TABLE bad (id TEXT);')
    writeFileSync(join(migrationsDir, '0003_ok.sql'), 'CREATE TABLE ok2 (id TEXT);')
    execSpy.mockImplementation((s: string) => {
      if (s.includes('bad')) throw new Error('boom')
    })

    await expect(createMigrator(migrationsDir)()).resolves.toBeUndefined()
    expect(execSpy).toHaveBeenCalledTimes(3) // ran all three despite the middle failure
    expect(closeSpy).toHaveBeenCalled()
  })

  it('is a no-op (no exec, no throw) when the migrations directory has no .sql files', async () => {
    await expect(createMigrator(migrationsDir)()).resolves.toBeUndefined()
    expect(execSpy).not.toHaveBeenCalled()
    expect(closeSpy).toHaveBeenCalled()
  })
})
