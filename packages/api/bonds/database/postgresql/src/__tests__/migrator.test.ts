import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

// Mock pg (the same pattern index.test.ts uses). Real file I/O is kept — the
// migrator reads .sql files in order and feeds each whole file to
// client.query(); the driver itself is mocked.
const {
  mockClientClass,
  adminQuery,
  adminConnect,
  adminEnd,
  migrateQuery,
  migrateConnect,
  migrateEnd,
} = vi.hoisted(() => {
  const adminQuery = vi.fn().mockResolvedValue({ rows: [] })
  const adminConnect = vi.fn().mockResolvedValue(undefined)
  const adminEnd = vi.fn().mockResolvedValue(undefined)
  const migrateQuery = vi.fn().mockResolvedValue({ rows: [] })
  const migrateConnect = vi.fn().mockResolvedValue(undefined)
  const migrateEnd = vi.fn().mockResolvedValue(undefined)

  // Two connection strings are opened per run: the admin client (against
  // the 'postgres' maintenance db) and the migration client (against the
  // target db). Distinguish by the connectionString's pathname.
  const mockClientClass = vi.fn(function (opts?: { connectionString?: string }) {
    const isAdmin = opts?.connectionString?.endsWith('/postgres')
    return isAdmin
      ? { query: adminQuery, connect: adminConnect, end: adminEnd }
      : { query: migrateQuery, connect: migrateConnect, end: migrateEnd }
  })

  return {
    mockClientClass,
    adminQuery,
    adminConnect,
    adminEnd,
    migrateQuery,
    migrateConnect,
    migrateEnd,
  }
})

vi.mock('pg', () => ({
  default: { Client: mockClientClass },
  Client: mockClientClass,
}))

import { createMigrator } from '../migrator.js'

describe('createMigrator (postgresql)', () => {
  let workDir: string
  let migrationsDir: string
  let savedEnv: NodeJS.ProcessEnv

  beforeEach(() => {
    vi.clearAllMocks()
    adminQuery.mockResolvedValue({ rows: [] })
    migrateQuery.mockResolvedValue({ rows: [] })
    workDir = mkdtempSync(join(tmpdir(), 'mol-pg-migrator-'))
    migrationsDir = join(workDir, 'migrations')
    mkdirSync(migrationsDir, { recursive: true })
    savedEnv = process.env
    process.env = { ...savedEnv, DATABASE_URL: 'postgres://localhost:5432/testdb' }
  })

  afterEach(() => {
    process.env = savedEnv
    rmSync(workDir, { recursive: true, force: true })
  })

  it('applies migration files in lexical order', async () => {
    writeFileSync(join(migrationsDir, '0002_b.sql'), 'CREATE TABLE b (id TEXT);')
    writeFileSync(join(migrationsDir, '0001_a.sql'), 'CREATE TABLE a (id TEXT);')

    await createMigrator(migrationsDir)()

    expect(migrateQuery).toHaveBeenCalledTimes(2)
    expect(migrateQuery.mock.calls[0][0]).toContain('CREATE TABLE a')
    expect(migrateQuery.mock.calls[1][0]).toContain('CREATE TABLE b')
    expect(migrateEnd).toHaveBeenCalled()
  })

  it('continues past an idempotent "already exists" error (IF NOT EXISTS re-runs must not abort)', async () => {
    writeFileSync(join(migrationsDir, '0001_ok.sql'), 'CREATE TABLE ok (id TEXT);')
    writeFileSync(join(migrationsDir, '0002_dup.sql'), 'CREATE TABLE dup (id TEXT);')
    writeFileSync(join(migrationsDir, '0003_ok.sql'), 'CREATE TABLE ok2 (id TEXT);')
    migrateQuery.mockImplementation((sql: string) => {
      if (sql.includes('dup')) {
        const err = Object.assign(new Error('relation "dup" already exists'), { code: '42P07' })
        return Promise.reject(err)
      }
      return Promise.resolve({ rows: [] })
    })

    await expect(createMigrator(migrationsDir)()).resolves.toBeUndefined()
    expect(migrateQuery).toHaveBeenCalledTimes(3) // ran all three despite the middle "duplicate"
    expect(migrateEnd).toHaveBeenCalled()
  })

  it('REGRESSION: a genuinely broken migration (syntax error) fails the run with an actionable summary instead of silently continuing', async () => {
    writeFileSync(join(migrationsDir, '0001_ok.sql'), 'CREATE TABLE ok (id TEXT);')
    writeFileSync(join(migrationsDir, '0002_broken.sql'), 'CREAT TABLE typo (id TEXT);')
    writeFileSync(join(migrationsDir, '0003_ok.sql'), 'CREATE TABLE ok2 (id TEXT);')
    migrateQuery.mockImplementation((sql: string) => {
      if (sql.includes('typo')) {
        // A real syntax error has no idempotency-whitelisted code.
        return Promise.reject(new Error('syntax error at or near "CREAT"'))
      }
      return Promise.resolve({ rows: [] })
    })

    // Before the fix, EVERY per-file error (idempotent or not) was caught and
    // only warn-logged — the app would boot with a missing/partial schema and
    // the real cause (a typo'd migration) would never surface at boot time.
    await expect(createMigrator(migrationsDir)()).rejects.toThrow(/0002_broken\.sql/)
    await expect(createMigrator(migrationsDir)()).rejects.toThrow(/syntax error/)
    // Still attempts every file (0001 and 0003 succeed) rather than aborting
    // at the first failure — the boot log reports every broken file at once.
    expect(migrateQuery).toHaveBeenCalledTimes(6) // 3 files × 2 runs above
    expect(migrateEnd).toHaveBeenCalled() // connection is always closed, even on failure
  })

  it('is a no-op (no query, no throw) when the migrations directory has no .sql files', async () => {
    await expect(createMigrator(migrationsDir)()).resolves.toBeUndefined()
    expect(migrateQuery).not.toHaveBeenCalled()
    expect(migrateEnd).toHaveBeenCalled()
  })

  it('does not abort the run when the database auto-create step fails', async () => {
    adminConnect.mockRejectedValueOnce(new Error('connection refused'))
    writeFileSync(join(migrationsDir, '0001.sql'), 'CREATE TABLE t (id TEXT);')

    await expect(createMigrator(migrationsDir)()).resolves.toBeUndefined()
    expect(migrateQuery).toHaveBeenCalledTimes(1)
  })
})
