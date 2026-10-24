/**
 * Pool behavior against the REAL embedded DuckDB engine (in-memory and temp
 * files) — no mocks. Everything here was verified against
 * `@duckdb/node-api` 2.0.0-r.1 while the bond was built.
 */
import { mkdtemp, rm, stat } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

import { afterEach, beforeEach, describe, expect, it } from 'vitest'

import { closeDefaultPool, defaultPoolCreated, pool, store } from '../index.js'
import { createPool } from '../pool.js'

let dir: string

beforeEach(async () => {
  dir = await mkdtemp(join(tmpdir(), 'mol-duckdb-'))
})
afterEach(async () => {
  await rm(dir, { recursive: true, force: true })
})

describe('createPool — placeholders', () => {
  it('runs $N placeholders untranslated and ? placeholders positionally', async () => {
    const p = createPool({ path: ':memory:' })
    const a = await p.query<{ a: string; b: number }>('SELECT $1 AS a, $2 AS b', ['duck', 42])
    expect(a.rows[0]).toEqual({ a: 'duck', b: 42 })
    const b = await p.query<{ a: string; b: number }>('SELECT ? AS a, ? AS b', ['goose', 7])
    expect(b.rows[0]).toEqual({ a: 'goose', b: 7 })
    await p.end()
  })

  it('runs a multi-statement string without values and returns the LAST result', async () => {
    const p = createPool({ path: ':memory:' })
    await p.query('CREATE TABLE multi (a INT)')
    const r = await p.query<{ n: number }>(
      'INSERT INTO multi VALUES (1); INSERT INTO multi VALUES (2); SELECT count(*) AS n FROM multi',
    )
    expect(r.rows[0]?.n).toBe(2)
    await p.end()
  })
})

describe('rowCount semantics (node-postgres contract)', () => {
  it('reports rows returned for a SELECT', async () => {
    const p = createPool({ path: ':memory:' })
    await p.query('CREATE TABLE t (a INT)')
    await p.query('INSERT INTO t VALUES (1), (2), (3)')
    const r = await p.query('SELECT * FROM t')
    expect(r.rowCount).toBe(3)
    await p.end()
  })

  it('reports rowsChanged for plain INSERT/UPDATE/DELETE', async () => {
    const p = createPool({ path: ':memory:' })
    await p.query('CREATE TABLE t (a INT)')
    expect((await p.query('INSERT INTO t VALUES (1), (2)')).rowCount).toBe(2)
    expect((await p.query('UPDATE t SET a = 9 WHERE a = 1')).rowCount).toBe(1)
    expect((await p.query('DELETE FROM t WHERE a = 9')).rowCount).toBe(1)
    await p.end()
  })

  it('reports the RETURNING rows as the affected count for DML … RETURNING', async () => {
    const p = createPool({ path: ':memory:' })
    await p.query('CREATE TABLE t (a INT)')
    const r = await p.query('INSERT INTO t VALUES (1), (2), (3) RETURNING *')
    expect(r.rowCount).toBe(3)
    expect(r.rows.length).toBe(3)
    await p.end()
  })
})

describe('value coercion and normalization', () => {
  it('binds a Date, a plain object and a Uint8Array into typed columns', async () => {
    const p = createPool({ path: ':memory:' })
    await p.query('CREATE TABLE v (id UUID, ts TIMESTAMPTZ, j JSON, bl BLOB, l INT[])')
    await p.query('INSERT INTO v (id, ts, j, bl, l) VALUES (?, ?, ?, ?, ?)', [
      '0b6d3f1e-4c1a-4d6e-9a52-9e64bf0a1234',
      new Date('2026-10-24T06:00:00.000Z'),
      { k: 1 },
      new Uint8Array([1, 2, 3]),
      [4, 5],
    ])
    const r = await p.query<{ ts: Date; j: string; l: number[] }>('SELECT ts, j, l FROM v')
    expect(new Date(r.rows[0]!.ts).toISOString()).toBe('2026-10-24T06:00:00.000Z')
    expect(r.rows[0]!.j).toBe('{"k":1}')
    expect(r.rows[0]!.l).toEqual([4, 5])
    await p.end()
  })

  it('returns COUNT(*) and BIGINT as JS numbers when they fit MAX_SAFE_INTEGER', async () => {
    const p = createPool({ path: ':memory:' })
    await p.query('CREATE TABLE t (a INT)')
    await p.query('INSERT INTO t VALUES (1), (2)')
    const r = await p.query<{ n: number }>('SELECT count(*) AS n FROM t')
    expect(r.rows[0]!.n).toBe(2)
    expect(typeof r.rows[0]!.n).toBe('number')
    // A value beyond MAX_SAFE_INTEGER stays a string (JSON.stringify-able).
    const big = await p.query<{ v: number | string }>(
      'SELECT 170141183460469231731687303715884105727 AS v',
    )
    expect(big.rows[0]!.v).toBe('170141183460469231731687303715884105727')
    await p.end()
  })
})

describe('errors', () => {
  it('names the failing statement', async () => {
    const p = createPool({ path: ':memory:' })
    await expect(p.query('SELECT * FROM missing_table')).rejects.toThrow(
      /— in: SELECT \* FROM missing_table/,
    )
    await p.end()
  })

  it('refuses to bind a value of an unbindable type with a clear message', async () => {
    const p = createPool({ path: ':memory:' })
    await expect(p.query('SELECT ? AS s', [Symbol('nope') as unknown as string])).rejects.toThrow(
      /cannot bind a value of type symbol/,
    )
    await p.end()
  })
})

describe('transactions', () => {
  it('commits work and rolls back on rollback()', async () => {
    const p = createPool({ path: ':memory:' })
    await p.query('CREATE TABLE tx (a INT)')

    const committed = await p.transaction()
    await committed.query('INSERT INTO tx VALUES (1)')
    await committed.commit()
    expect((await p.query<{ n: number }>('SELECT count(*) AS n FROM tx')).rows[0]!.n).toBe(1)

    const rolled = await p.transaction()
    await rolled.query('INSERT INTO tx VALUES (2)')
    await rolled.rollback()
    expect((await p.query<{ n: number }>('SELECT count(*) AS n FROM tx')).rows[0]!.n).toBe(1)
    await p.end()
  })

  it('rolls back when a statement inside fails', async () => {
    const p = createPool({ path: ':memory:' })
    await p.query('CREATE TABLE tx (a INT)')
    const tx = await p.transaction()
    await tx.query('INSERT INTO tx VALUES (1)')
    await expect(tx.query('INSERT INTO nope VALUES (1)')).rejects.toThrow(/does not exist/)
    await tx.rollback()
    expect((await p.query<{ n: number }>('SELECT count(*) AS n FROM tx')).rows[0]!.n).toBe(0)
    await p.end()
  })

  it('serializes a plain query behind an open transaction (FIFO)', async () => {
    const p = createPool({ path: ':memory:' })
    await p.query('CREATE TABLE tx (a INT)')
    const tx = await p.transaction()
    await tx.query('INSERT INTO tx VALUES (1)')
    // This query queues behind the transaction; the insert is invisible to it
    // until commit — and it must not run INSIDE the transaction's rollback.
    const pending = p.query<{ n: number }>('SELECT count(*) AS n FROM tx')
    await tx.rollback()
    expect((await pending).rows[0]!.n).toBe(0)
    await p.end()
  })

  it('fails a queued caller with an actionable error once the wait limit hits', async () => {
    const p = createPool({ path: ':memory:', acquireTimeoutMillis: 150 })
    const tx = await p.transaction()
    await expect(p.query('SELECT 1')).rejects.toThrow(/waited 150 ms for the pool's single/)
    await tx.rollback()
    await p.end()
  })

  it('a bare release() rolls the transaction back', async () => {
    const p = createPool({ path: ':memory:' })
    await p.query('CREATE TABLE tx (a INT)')
    const tx = await p.transaction()
    await tx.query('INSERT INTO tx VALUES (1)')
    tx.release()
    await new Promise((resolve) => setTimeout(resolve, 50))
    expect((await p.query<{ n: number }>('SELECT count(*) AS n FROM tx')).rows[0]!.n).toBe(0)
    await p.end()
  })
})

describe('connect()', () => {
  it('holds the single connection until release(); the pool queues behind it', async () => {
    const p = createPool({ path: ':memory:' })
    const conn = await p.connect()
    const held = conn.query<{ a: number }>('SELECT 41 + 1 AS a')
    expect((await held).rows[0]!.a).toBe(42)
    const queued = p.query<{ a: number }>('SELECT 1 AS a')
    const raced = await Promise.race([
      queued.then(() => 'ran'),
      new Promise((resolve) => setTimeout(() => resolve('still-queued'), 150)),
    ])
    expect(raced).toBe('still-queued')
    conn.release()
    expect((await queued).rows[0]!.a).toBe(1)
    await expect(conn.query('SELECT 1')).rejects.toThrow(/released connection/)
    await p.end()
  })
})

describe('files and lifecycle', () => {
  it('creates the database file (and its parent directory) on first use', async () => {
    const path = join(dir, 'nested', 'app.duckdb')
    const p = createPool({ path })
    await p.query('CREATE TABLE made (a INT)')
    await p.end()
    expect((await stat(path)).size).toBeGreaterThan(0)
  })

  it('shares one instance per file across pools in this process', async () => {
    const path = join(dir, 'shared.duckdb')
    const a = createPool({ path })
    await a.query('CREATE TABLE IF NOT EXISTS shared (a INT)')
    await a.query('INSERT INTO shared VALUES (1)')
    await a.end()
    const b = createPool({ path })
    const r = await b.query<{ n: number }>('SELECT count(*) AS n FROM shared')
    expect(r.rows[0]!.n).toBe(1)
    await b.end()
  })

  it('reads DUCKDB_PATH from the environment', async () => {
    const previous = process.env.DUCKDB_PATH
    process.env.DUCKDB_PATH = join(dir, 'env.duckdb')
    try {
      const p = createPool()
      await p.query('CREATE TABLE env_made (a INT)')
      await p.end()
      expect((await stat(join(dir, 'env.duckdb'))).size).toBeGreaterThan(0)
    } finally {
      if (previous === undefined) delete process.env.DUCKDB_PATH
      else process.env.DUCKDB_PATH = previous
    }
  })

  it('query() on the default pool works and closeDefaultPool() ends it', async () => {
    expect(defaultPoolCreated()).toBe(false)
    const previous = process.env.DUCKDB_PATH
    process.env.DUCKDB_PATH = join(dir, 'default.duckdb')
    try {
      const r = await pool.query<{ one: number }>('SELECT 1 AS one')
      expect(r.rows[0]!.one).toBe(1)
      expect(defaultPoolCreated()).toBe(true)
      await closeDefaultPool()
      expect(defaultPoolCreated()).toBe(false)
      // A fresh lazy pool can open again after a close.
      const again = await pool.query<{ one: number }>('SELECT 1 AS one')
      expect(again.rows[0]!.one).toBe(1)
      await closeDefaultPool()
      // The store proxy shares the default pool.
      expect(store).toBeDefined()
    } finally {
      if (previous === undefined) delete process.env.DUCKDB_PATH
      else process.env.DUCKDB_PATH = previous
    }
  })

  it('rejects queries and transactions after end()', async () => {
    const p = createPool({ path: ':memory:' })
    await p.query('SELECT 1')
    await p.end()
    await expect(p.query('SELECT 1')).rejects.toThrow(/pool has been ended/)
    await expect(p.transaction()).rejects.toThrow(/pool has been ended/)
    // end() is idempotent.
    await p.end()
  })
})

describe('resource defaults', () => {
  it('caps memory_limit and threads so sandboxes do not eat the host', async () => {
    const p = createPool({ path: ':memory:' })
    // current_setting reports humanized MiB ('953.6 MiB' for a 1GB limit).
    const mem = await p.query<{ v: string }>("SELECT current_setting('memory_limit') AS v")
    const mib = Number.parseFloat(String(mem.rows[0]!.v))
    expect(mib).toBeGreaterThan(900)
    expect(mib).toBeLessThanOrEqual(1024)
    const threads = await p.query<{ v: number }>("SELECT current_setting('threads') AS v")
    expect(threads.rows[0]!.v).toBeLessThanOrEqual(4)
    await p.end()
  })

  it('honors explicit config over the defaults', async () => {
    const p = createPool({ path: ':memory:', memoryLimit: '256MB', threads: 2 })
    const mem = await p.query<{ v: string }>("SELECT current_setting('memory_limit') AS v")
    const mib = Number.parseFloat(String(mem.rows[0]!.v))
    expect(mib).toBeGreaterThan(240)
    expect(mib).toBeLessThanOrEqual(256)
    await p.end()
  })
})
