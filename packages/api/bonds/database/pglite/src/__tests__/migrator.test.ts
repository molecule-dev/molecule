/**
 * Migration runner against real PGlite.
 *
 * @module
 */

import { mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from 'vitest'

import { applyMigrations, createMigrator, isIdempotencyError } from '../migrator.js'
import { createPool } from '../pool.js'
import type { PglitePool } from '../types.js'

const INIT = `CREATE TABLE IF NOT EXISTS "todos" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "title" TEXT NOT NULL,
  "meta" JSONB NOT NULL DEFAULT '{}'::jsonb,
  "created_at" TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS "todos_title_idx" ON "todos" USING btree ("title");`

const ADD_PK_AGAIN = `CREATE TABLE IF NOT EXISTS "tags" ("id" UUID NOT NULL);
ALTER TABLE "tags" ADD CONSTRAINT "tags_pkey" PRIMARY KEY ("id");`

let workDir: string
let pool: PglitePool

beforeAll(() => {
  workDir = mkdtempSync(join(tmpdir(), 'mol-pglite-migrate-'))
  vi.spyOn(console, 'log').mockImplementation(() => undefined)
  vi.spyOn(console, 'warn').mockImplementation(() => undefined)
  vi.spyOn(console, 'error').mockImplementation(() => undefined)
})

afterEach(async () => {
  await pool?.end()
})

afterAll(() => {
  rmSync(workDir, { recursive: true, force: true })
  vi.restoreAllMocks()
})

describe('applyMigrations', () => {
  it('applies Postgres-dialect migrations in name order and is safe to re-run', async () => {
    pool = createPool({ dataDir: 'memory://' })
    const migrations = [
      { name: '0002_tags.sql', sql: ADD_PK_AGAIN },
      { name: '0001_init.sql', sql: INIT },
    ]
    await applyMigrations(pool, migrations)
    await applyMigrations(pool, migrations) // second run: PK + tables already exist
    const r = await pool.query<{ title: string }>(
      `INSERT INTO "todos" ("title") VALUES ($1) RETURNING "title"`,
      ['write tests'],
    )
    expect(r.rows).toEqual([{ title: 'write tests' }])
    expect(console.warn).toHaveBeenCalledWith(expect.stringContaining('0002_tags.sql'))
  })

  it('fails with every broken file named, after applying the good ones', async () => {
    pool = createPool({ dataDir: 'memory://' })
    await expect(
      applyMigrations(pool, [
        { name: '0001_init.sql', sql: INIT },
        { name: '0002_bad.sql', sql: 'CREATE TABLE oops (' },
        { name: '0003_worse.sql', sql: 'ALTER TABLE "missing" ADD COLUMN x int' },
      ]),
    ).rejects.toThrow(/2 file\(s\)[\s\S]*0002_bad\.sql[\s\S]*0003_worse\.sql/)
    expect((await pool.query('SELECT COUNT(*) AS c FROM "todos"')).rows).toEqual([{ c: '0' }])
  })

  it('treats an empty list as nothing to do', async () => {
    pool = createPool({ dataDir: 'memory://' })
    await expect(applyMigrations(pool, [])).resolves.toBeUndefined()
  })
})

describe('createMigrator', () => {
  it('reads *.sql files from a directory into the given pool', async () => {
    const dir = join(workDir, 'migrations')
    const { mkdirSync } = await import('node:fs')
    mkdirSync(dir, { recursive: true })
    writeFileSync(join(dir, '0001_init.sql'), INIT)
    writeFileSync(join(dir, 'README.md'), 'not a migration')
    pool = createPool({ dataDir: 'memory://' })
    await createMigrator(dir, pool)()
    expect((await pool.query('SELECT COUNT(*) AS c FROM "todos"')).rows).toEqual([{ c: '0' }])
  })

  it('treats a missing directory as no migrations', async () => {
    pool = createPool({ dataDir: 'memory://' })
    await expect(createMigrator(join(workDir, 'nope'), pool)()).resolves.toBeUndefined()
  })
})

describe('isIdempotencyError', () => {
  it('matches duplicate-object SQLSTATEs and messages, nothing else', () => {
    expect(isIdempotencyError({ code: '42P07' })).toBe(true)
    expect(isIdempotencyError(new Error('relation "x" already exists'))).toBe(true)
    expect(isIdempotencyError(Object.assign(new Error('syntax error'), { code: '42601' }))).toBe(
      false,
    )
  })
})
