import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

// Mock mysql2/promise (the existing provider tests mock it the same way). Real
// file I/O is kept — the migrator reads .sql files in order and runs each via a
// multi-statement connection; the driver itself is mocked.
const { createConnectionMock, adminQuery, adminEnd, migrationQuery, migrationEnd } = vi.hoisted(
  () => {
    const adminQuery = vi.fn()
    const adminEnd = vi.fn()
    const migrationQuery = vi.fn()
    const migrationEnd = vi.fn()
    // Stateless (no call counter to reset between tests): the migration
    // connection is the one opened with multipleStatements; the admin/createdb
    // connection is not.
    const createConnectionMock = vi.fn((cfg?: { multipleStatements?: boolean }) =>
      cfg?.multipleStatements
        ? { query: migrationQuery, end: migrationEnd }
        : { query: adminQuery, end: adminEnd },
    )
    return { createConnectionMock, adminQuery, adminEnd, migrationQuery, migrationEnd }
  },
)

vi.mock('mysql2/promise', () => ({
  default: { createConnection: createConnectionMock },
  createConnection: createConnectionMock,
}))

import { createMigrator } from '../migrator.js'

describe('createMigrator (mysql)', () => {
  let workDir: string
  let migrationsDir: string
  let savedEnv: NodeJS.ProcessEnv

  beforeEach(() => {
    vi.clearAllMocks()
    workDir = mkdtempSync(join(tmpdir(), 'mol-mysql-migrator-'))
    migrationsDir = join(workDir, 'migrations')
    mkdirSync(migrationsDir, { recursive: true })
    savedEnv = process.env
    process.env = { ...savedEnv, MYSQL_DATABASE: 'recipes', MYSQL_HOST: 'db', MYSQL_USER: 'app' }
    delete process.env.MYSQL_URL
  })

  afterEach(() => {
    process.env = savedEnv
    rmSync(workDir, { recursive: true, force: true })
  })

  it('creates the database then runs migrations on a multi-statement connection', async () => {
    writeFileSync(
      join(migrationsDir, '0001_init.sql'),
      'CREATE TABLE categories (id VARCHAR(36) PRIMARY KEY);\n' +
        'CREATE TABLE recipes (id VARCHAR(36) PRIMARY KEY, category VARCHAR(36));',
    )

    await createMigrator(migrationsDir)()

    // Admin connection (no database) issues CREATE DATABASE IF NOT EXISTS.
    expect(adminQuery).toHaveBeenCalledWith('CREATE DATABASE IF NOT EXISTS `recipes`')
    expect(adminEnd).toHaveBeenCalled()
    // Migration connection selects the db and enables multi-statement.
    expect(createConnectionMock).toHaveBeenLastCalledWith(
      expect.objectContaining({ database: 'recipes', multipleStatements: true }),
    )
    // The migrator issues two SET statements (ANSI_QUOTES + FK checks) before the
    // migration files; assert on the file queries (non-SET) only.
    const fileCalls = migrationQuery.mock.calls.filter((c) => !/^SET /i.test(String(c[0])))
    expect(fileCalls).toHaveLength(1)
    expect(migrationQuery).toHaveBeenCalledWith(expect.stringContaining('ANSI_QUOTES'))
    expect(migrationEnd).toHaveBeenCalled()
  })

  it('derives host/user/db from MYSQL_URL when set', async () => {
    process.env.MYSQL_URL = 'mysql://root:secret@dbhost:3307/shop'
    writeFileSync(join(migrationsDir, '0001.sql'), 'CREATE TABLE t (id INT);')

    await createMigrator(migrationsDir)()

    expect(adminQuery).toHaveBeenCalledWith('CREATE DATABASE IF NOT EXISTS `shop`')
    expect(createConnectionMock).toHaveBeenCalledWith(
      expect.objectContaining({ host: 'dbhost', port: 3307, user: 'root', database: 'shop' }),
    )
  })

  it('applies migration files in lexical order', async () => {
    writeFileSync(join(migrationsDir, '0002_b.sql'), 'CREATE TABLE b (id INT);')
    writeFileSync(join(migrationsDir, '0001_a.sql'), 'CREATE TABLE a (id INT);')

    await createMigrator(migrationsDir)()

    const fileCalls = migrationQuery.mock.calls.filter((c) => !/^SET /i.test(String(c[0])))
    expect(fileCalls).toHaveLength(2)
    expect(fileCalls[0][0]).toContain('CREATE TABLE a')
    expect(fileCalls[1][0]).toContain('CREATE TABLE b')
  })

  it('is a no-op (no migration query, no throw) when there are no .sql files', async () => {
    await expect(createMigrator(migrationsDir)()).resolves.toBeUndefined()
    // No migration FILE queries (the two SET statements may still run).
    expect(migrationQuery.mock.calls.filter((c) => !/^SET /i.test(String(c[0])))).toHaveLength(0)
    expect(migrationEnd).toHaveBeenCalled()
  })

  it('continues past an idempotent "already exists" error (IF NOT EXISTS re-runs must not abort)', async () => {
    writeFileSync(join(migrationsDir, '0001_ok.sql'), 'CREATE TABLE ok (id VARCHAR(36));')
    writeFileSync(join(migrationsDir, '0002_dup.sql'), 'CREATE TABLE dup (id VARCHAR(36));')
    writeFileSync(join(migrationsDir, '0003_ok.sql'), 'CREATE TABLE ok2 (id VARCHAR(36));')
    migrationQuery.mockImplementation((sql: string) => {
      if (/^SET /i.test(sql)) return Promise.resolve()
      if (sql.includes('dup')) {
        const err = Object.assign(new Error("Table 'dup' already exists"), {
          code: 'ER_TABLE_EXISTS_ERROR',
        })
        return Promise.reject(err)
      }
      return Promise.resolve()
    })

    await expect(createMigrator(migrationsDir)()).resolves.toBeUndefined()
    const fileCalls = migrationQuery.mock.calls.filter((c) => !/^SET /i.test(String(c[0])))
    expect(fileCalls).toHaveLength(3) // ran all three despite the middle "duplicate"
  })

  it('REGRESSION: a genuinely broken migration fails the run with an actionable summary instead of silently continuing', async () => {
    writeFileSync(join(migrationsDir, '0001_ok.sql'), 'CREATE TABLE ok (id VARCHAR(36));')
    writeFileSync(join(migrationsDir, '0002_broken.sql'), 'CREAT TABLE typo (id VARCHAR(36));')
    writeFileSync(join(migrationsDir, '0003_ok.sql'), 'CREATE TABLE ok2 (id VARCHAR(36));')
    migrationQuery.mockImplementation((sql: string) => {
      if (/^SET /i.test(sql)) return Promise.resolve()
      if (sql.includes('typo')) {
        return Promise.reject(new Error('You have an error in your SQL syntax'))
      }
      return Promise.resolve()
    })

    // Before the fix, EVERY per-file error (idempotent or not) was only
    // warn-logged — the app would boot with a missing/partial schema.
    await expect(createMigrator(migrationsDir)()).rejects.toThrow(/0002_broken\.sql/)
    const fileCalls = migrationQuery.mock.calls.filter((c) => !/^SET /i.test(String(c[0])))
    expect(fileCalls).toHaveLength(3) // still attempts every file
    expect(migrationEnd).toHaveBeenCalled() // connection closed even on failure
  })
})
