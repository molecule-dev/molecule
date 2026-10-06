/**
 * PGlite-specific pool behaviour: persistence modes, isolation, the single
 * connection lock, and options. Real PGlite, no mocks.
 *
 * @module
 */

import { mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'

import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest'

import { chooseDataDir, DEFAULT_NODE_DATA_DIR, MEMORY_DATA_DIR } from '../instances.js'
import { createPool } from '../pool.js'
import type { PglitePool } from '../types.js'

let workDir: string
const opened: PglitePool[] = []

/**
 * Creates a pool and remembers it for cleanup.
 *
 * @param config - Pool config.
 * @returns The pool.
 */
const track = (config: Parameters<typeof createPool>[0]): PglitePool => {
  const pool = createPool(config)
  opened.push(pool)
  return pool
}

beforeAll(() => {
  workDir = mkdtempSync(join(tmpdir(), 'mol-pglite-'))
})

afterEach(async () => {
  while (opened.length) await opened.pop()!.end()
})

afterAll(() => {
  rmSync(workDir, { recursive: true, force: true })
})

describe('data directories', () => {
  it('keeps two in-memory pools fully separate', async () => {
    const a = track({ dataDir: 'memory://' })
    const b = track({ dataDir: 'memory://' })
    await a.query('CREATE TABLE only_in_a (v int)')
    await expect(b.query('SELECT * FROM only_in_a')).rejects.toMatchObject({ code: '42P01' })
    expect(a.dataDir).toBe(MEMORY_DATA_DIR)
  })

  it('keeps two filesystem paths fully separate', async () => {
    const a = track({ dataDir: join(workDir, 'one') })
    const b = track({ dataDir: join(workDir, 'two') })
    await a.query('CREATE TABLE t (v int)')
    await a.query('INSERT INTO t VALUES ($1)', [1])
    await b.query('CREATE TABLE t (v int)')
    expect((await b.query('SELECT * FROM t')).rows).toEqual([])
    expect((await a.query('SELECT * FROM t')).rows).toEqual([{ v: 1 }])
  })

  it('persists a filesystem database across end() and reopen, creating parent folders', async () => {
    const dir = join(workDir, 'nested', 'deeper', 'db')
    const first = createPool({ dataDir: dir })
    await first.query('CREATE TABLE kept (v text)')
    await first.query('INSERT INTO kept VALUES ($1)', ['still here'])
    expect(first.dataDir).toBe(resolve(dir))
    await first.end()

    const second = track({ dataDir: dir })
    expect((await second.query('SELECT v FROM kept')).rows).toEqual([{ v: 'still here' }])
  })

  it('shares one instance between pools on the same directory and closes it with the last', async () => {
    const dir = join(workDir, 'shared')
    const a = createPool({ dataDir: dir })
    const b = createPool({ dataDir: join(workDir, '.', 'shared') })
    await a.query('CREATE TABLE s (v int)')
    await b.query('INSERT INTO s VALUES (1)')
    expect((await a.query('SELECT COUNT(*) AS c FROM s')).rows).toEqual([{ c: '1' }])
    await a.end()
    // b still works after a ended: the instance is reference-counted.
    expect((await b.query('SELECT COUNT(*) AS c FROM s')).rows).toEqual([{ c: '1' }])
    await b.end()
  })

  it('picks dataDir from config, then PGLITE_DATA_DIR, then the Node default', () => {
    const previous = process.env.PGLITE_DATA_DIR
    try {
      delete process.env.PGLITE_DATA_DIR
      expect(chooseDataDir()).toBe(DEFAULT_NODE_DATA_DIR)
      process.env.PGLITE_DATA_DIR = 'idb://from-env'
      expect(chooseDataDir()).toBe('idb://from-env')
      expect(chooseDataDir({ dataDir: 'memory://' })).toBe('memory://')
    } finally {
      if (previous === undefined) delete process.env.PGLITE_DATA_DIR
      else process.env.PGLITE_DATA_DIR = previous
    }
  })
})

describe('the single connection', () => {
  it('connect() holds the connection; a pool query waits and then times out with a clear error', async () => {
    const pool = track({ dataDir: 'memory://', acquireTimeoutMillis: 50 })
    const conn = await pool.connect()
    try {
      expect(pool.stats?.()).toMatchObject({ total: 1, idle: 0 })
      await expect(pool.query('SELECT 1')).rejects.toThrow(/held by an open connect\(\)/)
    } finally {
      conn.release()
    }
    expect((await pool.query('SELECT 1 AS one')).rows).toEqual([{ one: 1 }])
    expect(pool.stats?.()).toEqual({ total: 1, idle: 1, waiting: 0 })
  })

  it('queues work behind an open transaction and runs it after commit', async () => {
    const pool = track({ dataDir: 'memory://' })
    await pool.query('CREATE TABLE q (v int)')
    const tx = await pool.transaction()
    const waiting = pool.query('INSERT INTO q VALUES (2)')
    await tx.query('INSERT INTO q VALUES (1)')
    expect(pool.stats?.().waiting).toBe(1)
    await tx.commit()
    await waiting
    expect((await pool.query('SELECT v FROM q ORDER BY v')).rows).toEqual([{ v: 1 }, { v: 2 }])
  })

  it('a bare transaction release() rolls back and frees the connection', async () => {
    const pool = track({ dataDir: 'memory://' })
    await pool.query('CREATE TABLE r (v int)')
    const tx = await pool.transaction()
    await tx.query('INSERT INTO r VALUES (1)')
    tx.release()
    expect((await pool.query('SELECT * FROM r')).rows).toEqual([])
    await expect(tx.query('SELECT 1')).rejects.toThrow(/finished transaction/)
  })

  it('commit()/rollback() after the transaction ended are no-ops', async () => {
    const pool = track({ dataDir: 'memory://' })
    const tx = await pool.transaction()
    await tx.commit()
    await tx.rollback()
    await tx.commit()
    expect((await pool.query('SELECT 1 AS one')).rows).toEqual([{ one: 1 }])
  })

  it('a released connection refuses further queries', async () => {
    const pool = track({ dataDir: 'memory://' })
    const conn = await pool.connect()
    conn.release()
    conn.release()
    await expect(conn.query('SELECT 1')).rejects.toThrow(/released connection/)
  })
})

describe('queries and options', () => {
  it('runs a parameterless multi-statement string and returns the last result', async () => {
    const pool = track({ dataDir: 'memory://' })
    const r = await pool.query<{ v: number }>(
      'CREATE TABLE m (v int); INSERT INTO m VALUES (1), (2); SELECT v FROM m ORDER BY v',
    )
    expect(r.rows).toEqual([{ v: 1 }, { v: 2 }])
    expect(r.rowCount).toBe(2)
    const ddl = await pool.query('CREATE TABLE n (v int)')
    expect(ddl.rowCount).toBeNull()
  })

  it('exec() runs several statements', async () => {
    const pool = track({ dataDir: 'memory://' })
    await pool.exec('CREATE TABLE e (v int); INSERT INTO e VALUES (7);')
    expect((await pool.query('SELECT v FROM e')).rows).toEqual([{ v: 7 }])
  })

  it('int8AsString: false returns PGlite numbers and BigInts', async () => {
    const pool = track({ dataDir: 'memory://', int8AsString: false })
    const r = await pool.query<{ small: unknown; huge: unknown }>(
      `SELECT 5::int8 AS small, 9007199254740993::int8 AS huge`,
    )
    expect(r.rows[0]).toEqual({ small: 5, huge: 9007199254740993n })
  })

  it('pgliteOptions.parsers override the defaults', async () => {
    const pool = track({
      dataDir: 'memory://',
      pgliteOptions: { parsers: { 1700: (value: string) => Number(value) } },
    })
    const r = await pool.query('SELECT 1.25::numeric AS n, 3::int8 AS b')
    expect(r.rows[0]).toEqual({ n: 1.25, b: '3' })
  })

  it('rejects queries after end(), and end() twice is safe', async () => {
    const pool = createPool({ dataDir: 'memory://' })
    await pool.query('SELECT 1')
    await pool.end()
    await pool.end()
    await expect(pool.query('SELECT 1')).rejects.toThrow(/ended/)
  })

  it('end() on a pool that was never used opens nothing', async () => {
    const pool = createPool({ dataDir: 'memory://' })
    await pool.end()
    expect(pool.dataDir).toBeUndefined()
  })
})
