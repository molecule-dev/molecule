/**
 * Migration runner against the REAL embedded DuckDB engine: temp migration
 * directories, real files, real ledger rows.
 */
import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

import { afterEach, beforeEach, describe, expect, it } from 'vitest'

import { applyMigrations, createMigrator, MIGRATION_LEDGER } from '../migrator.js'
import { createPool } from '../pool.js'

let dir: string
let migrations: string
let dbPath: string

beforeEach(async () => {
  dir = await mkdtemp(join(tmpdir(), 'mol-duckdb-mig-'))
  migrations = join(dir, 'migrations')
  await mkdir(migrations, { recursive: true })
  dbPath = join(dir, 'app.duckdb')
})
afterEach(async () => {
  await rm(dir, { recursive: true, force: true })
})

describe('applyMigrations', () => {
  it('applies new files in lexical order and records each in the ledger', async () => {
    await writeFile(
      join(migrations, '0001_init.sql'),
      'CREATE TABLE a (x INT); INSERT INTO a VALUES (1);',
    )
    await writeFile(join(migrations, '0002_more.sql'), 'CREATE TABLE b (y VARCHAR);')
    const pool = createPool({ path: dbPath })
    await applyMigrations(pool, migrations)
    const rows = await pool.query<{ file: string }>(
      `SELECT file FROM "${MIGRATION_LEDGER}" ORDER BY file`,
    )
    expect(rows.rows.map((r) => r.file)).toEqual(['0001_init.sql', '0002_more.sql'])
    expect((await pool.query<{ n: number }>('SELECT count(*) AS n FROM a')).rows[0]!.n).toBe(1)
    await pool.end()
  })

  it('applies a file only once', async () => {
    await writeFile(
      join(migrations, '0001_seed.sql'),
      'CREATE TABLE s (x INT); INSERT INTO s VALUES (1);',
    )
    const pool = createPool({ path: dbPath })
    await applyMigrations(pool, migrations)
    await applyMigrations(pool, migrations)
    expect((await pool.query<{ n: number }>('SELECT count(*) AS n FROM s')).rows[0]!.n).toBe(1)
    await pool.end()
  })

  it('a failing file applies NONE of its statements and fails the run naming the file', async () => {
    await writeFile(
      join(migrations, '0001_bad.sql'),
      'CREATE TABLE ok (x INT); SELECT * FROM missing;',
    )
    const pool = createPool({ path: dbPath })
    await expect(applyMigrations(pool, migrations)).rejects.toThrow(/0001_bad\.sql/)
    // The whole file rolled back — the table before the bad statement is gone.
    const tables = await pool.query<{ n: number }>(
      "SELECT count(*) AS n FROM information_schema.tables WHERE table_name = 'ok'",
    )
    expect(tables.rows[0]!.n).toBe(0)
    await pool.end()
  })

  it('names EVERY broken file in one error', async () => {
    await writeFile(join(migrations, '0001_bad.sql'), 'SELECT * FROM missing1;')
    await writeFile(join(migrations, '0002_also_bad.sql'), 'SELECT * FROM missing2;')
    const pool = createPool({ path: dbPath })
    const error = await applyMigrations(pool, migrations).catch((e: Error) => e.message)
    expect(error).toMatch(/0001_bad\.sql/)
    expect(error).toMatch(/0002_also_bad\.sql/)
    await pool.end()
  })

  it('an "already exists" error is a warning, not a failure', async () => {
    await writeFile(join(migrations, '0001_init.sql'), 'CREATE TABLE dup (x INT);')
    const pool = createPool({ path: dbPath })
    await applyMigrations(pool, migrations)
    // Hand-craft an unrecorded file that re-creates the same table.
    await writeFile(join(migrations, '0002_dup.sql'), 'CREATE TABLE dup (x INT);')
    await expect(applyMigrations(pool, migrations)).resolves.toBeUndefined()
    await pool.end()
  })

  it('namespaces keep two directories with the same basename independent', async () => {
    const other = join(dir, 'other-migrations')
    await mkdir(other, { recursive: true })
    await writeFile(join(migrations, '0001_init.sql'), 'CREATE TABLE first (x INT);')
    await writeFile(join(other, '0001_init.sql'), 'CREATE TABLE second (x INT);')
    const pool = createPool({ path: dbPath })
    await applyMigrations(pool, migrations)
    await applyMigrations(pool, other, { namespace: 'other' })
    const rows = await pool.query<{ file: string }>(
      `SELECT file FROM "${MIGRATION_LEDGER}" ORDER BY file`,
    )
    expect(rows.rows.map((r) => r.file)).toEqual(['0001_init.sql', 'other/0001_init.sql'])
    await pool.end()
  })

  it('a file managing its own BEGIN/COMMIT runs outside the wrapping transaction', async () => {
    await writeFile(
      join(migrations, '0001_selfmanaged.sql'),
      'BEGIN; CREATE TABLE self (x INT); COMMIT;',
    )
    const pool = createPool({ path: dbPath })
    await applyMigrations(pool, migrations)
    expect(
      (
        await pool.query<{ n: number }>(
          "SELECT count(*) AS n FROM information_schema.tables WHERE table_name = 'self'",
        )
      ).rows[0]!.n,
    ).toBe(1)
    await pool.end()
  })

  it('an empty or missing directory is a no-op, not an error', async () => {
    const pool = createPool({ path: dbPath })
    await expect(applyMigrations(pool, join(dir, 'nope'))).resolves.toBeUndefined()
    await pool.end()
  })
})

describe('Postgres-dialect translation', () => {
  it('translates jsonb types and casts, and drops index USING <method>', async () => {
    await writeFile(
      join(migrations, '0001_pg.sql'),
      `CREATE TABLE pg (id UUID PRIMARY KEY DEFAULT gen_random_uuid(), meta JSONB NOT NULL DEFAULT '{}'::jsonb, made_at TIMESTAMPTZ DEFAULT now());
       CREATE INDEX pg_meta_idx ON pg USING btree (meta);
       ALTER TABLE pg ADD COLUMN IF NOT EXISTS extra VARCHAR;
       ALTER TABLE pg DROP COLUMN IF EXISTS ghost;`,
    )
    const pool = createPool({ path: dbPath })
    await applyMigrations(pool, migrations)
    const type = await pool.query<{ data_type: string }>(
      "SELECT data_type FROM information_schema.columns WHERE table_name = 'pg' AND column_name = 'meta'",
    )
    expect(type.rows[0]!.data_type.toUpperCase()).toBe('JSON')
    await pool.end()
  })
})

describe('createMigrator', () => {
  it('runs against DUCKDB_PATH and closes its own pool', async () => {
    await writeFile(join(migrations, '0001_init.sql'), 'CREATE TABLE via_env (x INT);')
    const previous = process.env.DUCKDB_PATH
    process.env.DUCKDB_PATH = dbPath
    try {
      await createMigrator(migrations)()
      const pool = createPool({ path: dbPath })
      expect(
        (
          await pool.query<{ n: number }>(
            "SELECT count(*) AS n FROM information_schema.tables WHERE table_name = 'via_env'",
          )
        ).rows[0]!.n,
      ).toBe(1)
      await pool.end()
    } finally {
      if (previous === undefined) delete process.env.DUCKDB_PATH
      else process.env.DUCKDB_PATH = previous
    }
  })
})
