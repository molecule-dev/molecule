/**
 * `SQLITE_PATH=:memory:` is one database for the process: the migrations a server runs at boot and
 * the pool it then serves from see the same tables.
 */
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

import { afterEach, beforeEach, expect, it, vi } from 'vitest'

import { createMigrator } from '../migrator.js'
import { createPool } from '../pool.js'

let workDir: string
let migrationsDir: string
let previous: string | undefined

beforeEach(() => {
  workDir = mkdtempSync(join(tmpdir(), 'mol-sqlite-memory-'))
  migrationsDir = join(workDir, 'migrations')
  mkdirSync(migrationsDir)
  writeFileSync(
    join(migrationsDir, '001_users.sql'),
    'CREATE TABLE users (id TEXT PRIMARY KEY, email TEXT);',
  )
  previous = process.env.SQLITE_PATH
  process.env.SQLITE_PATH = ':memory:'
  vi.spyOn(console, 'log').mockImplementation(() => {})
})

afterEach(() => {
  if (previous === undefined) delete process.env.SQLITE_PATH
  else process.env.SQLITE_PATH = previous
  rmSync(workDir, { recursive: true, force: true })
  vi.restoreAllMocks()
})

it('serves the tables the migrations created when SQLITE_PATH is :memory:', async () => {
  // OLD MUSTFAIL: the migrator and the pool each opened their own :memory: connection, so a
  // server started with SQLITE_PATH=:memory: answered "no such table: users" right after
  // "Migrations complete" (harness scaffold eval, 2026-11-26).
  await createMigrator(migrationsDir)()
  const pool = createPool()
  try {
    await pool.query('INSERT INTO users (id, email) VALUES ($1, $2)', ['u1', 'a@example.com'])
    expect((await pool.query('SELECT email FROM users')).rows).toEqual([{ email: 'a@example.com' }])
  } finally {
    await pool.end()
  }
})

it('starts an empty in-memory database once the pool that held it closes', async () => {
  await createMigrator(migrationsDir)()
  await createPool().end()
  const next = createPool()
  try {
    await expect(next.query('SELECT * FROM users')).rejects.toThrow(/no such table/)
  } finally {
    await next.end()
  }
})

it('keeps a pool that names its own :memory: path private', async () => {
  // Counterexample: a caller that passes the path itself (a test's throwaway pool) still gets a
  // database of its own.
  await createMigrator(migrationsDir)()
  const own = createPool({ path: ':memory:' })
  const configured = createPool()
  try {
    await expect(own.query('SELECT * FROM users')).rejects.toThrow(/no such table/)
    expect((await configured.query('SELECT count(*) AS n FROM users')).rows).toEqual([{ n: 0 }])
  } finally {
    await own.end()
    await configured.end()
  }
})
