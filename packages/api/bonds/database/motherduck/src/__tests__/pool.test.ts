/**
 * MotherDuck pool behavior with `@duckdb/node-api` MOCKED — the boundary this
 * bond adds over the duckdb bond is connection handling (token, md: string,
 * fromCache, lazy open), and these tests pin exactly that; the statement path
 * itself is the duckdb bond's, tested there against the real engine.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const fromCacheMock = vi.hoisted(() => vi.fn())
const connectMock = vi.hoisted(() => vi.fn())
const disconnectMock = vi.hoisted(() => vi.fn())
const runMock = vi.hoisted(() => vi.fn())

vi.mock('@duckdb/node-api', () => ({
  DuckDBInstance: {
    fromCache: fromCacheMock,
  },
  // The numeric enum the duckdb bond's statement path compares against.
  ResultReturnType: {
    INVALID: 0,
    CHANGED_ROWS: 1,
    NOTHING: 2,
    QUERY_RESULT: 3,
  },
}))

import { closeDefaultPool, defaultPoolCreated, pool, store } from '../index.js'
import { createPool } from '../pool.js'

/** A fake materialized result for the statements the pool sends. */
function fakeResult(rows: Record<string, unknown>[] = [], rowsChanged = 0): object {
  return {
    returnType: rowsChanged > 0 && rows.length === 0 ? 1 : 3,
    rowsChanged,
    getRowObjectsJS: async () => rows,
    closeSync: () => {},
  }
}

const instance = { connect: connectMock }

beforeEach(() => {
  vi.unstubAllEnvs()
  delete process.env.MOTHERDUCK_TOKEN
  delete process.env.MOTHERDUCK_DATABASE
  fromCacheMock.mockReset()
  runMock.mockReset()
  runMock.mockImplementation(async () => fakeResult([{ one: 1 }]))
  disconnectMock.mockReset()
  connectMock.mockReset()
  connectMock.mockResolvedValue({ run: runMock, disconnectSync: disconnectMock })
  fromCacheMock.mockResolvedValue(instance)
})
afterEach(async () => {
  await closeDefaultPool()
})

describe('token handling', () => {
  it('throws the tagged config error when no token is set anywhere', async () => {
    const p = createPool()
    const error = await p.query('SELECT 1').catch((e: Error) => e)
    expect((error as { errorKey?: string }).errorKey).toBe('config.notConfigured')
    expect((error as { statusCode?: number }).statusCode).toBe(503)
    expect(error.message).toMatch(/MOTHERDUCK_TOKEN is not set/)
    expect(fromCacheMock).not.toHaveBeenCalled()
  })

  it('reads MOTHERDUCK_TOKEN at first use — a pool created before the env var exists still works', async () => {
    // Create the pool with NO token anywhere: nothing throws yet.
    const p = createPool()
    expect(fromCacheMock).not.toHaveBeenCalled()
    // Env loading (dotenv) lands between pool creation and first use.
    process.env.MOTHERDUCK_TOKEN = 'tok-env'
    const r = await p.query('SELECT 1')
    expect(r.rows[0]).toEqual({ one: 1 })
    expect(fromCacheMock).toHaveBeenCalledWith('md:', { motherduck_token: 'tok-env' })
    await p.end()
  })

  it('a config token wins over the env var; tokenEnv is honored', async () => {
    process.env.MOTHERDUCK_TOKEN = 'tok-env'
    process.env.OTHER_TOKEN_VAR = 'tok-other'
    const p = createPool({ token: 'tok-config' })
    await p.query('SELECT 1')
    expect(fromCacheMock).toHaveBeenCalledWith('md:', { motherduck_token: 'tok-config' })
    await p.end()

    const q = createPool({ tokenEnv: 'OTHER_TOKEN_VAR' })
    await q.query('SELECT 1')
    expect(fromCacheMock).toHaveBeenLastCalledWith('md:', { motherduck_token: 'tok-other' })
    await q.end()
  })

  it("falls back to the client's own lowercase motherduck_token auto-read", async () => {
    process.env.motherduck_token = 'tok-lower'
    const p = createPool()
    await p.query('SELECT 1')
    expect(fromCacheMock).toHaveBeenCalledWith('md:', {})
    await p.end()
  })
})

describe('connection string', () => {
  it('uses MOTHERDUCK_DATABASE, then config.connectionString, then md:', async () => {
    process.env.MOTHERDUCK_TOKEN = 't'
    process.env.MOTHERDUCK_DATABASE = 'md:from_env'
    let p = createPool()
    await p.query('SELECT 1')
    expect(fromCacheMock).toHaveBeenLastCalledWith('md:from_env', { motherduck_token: 't' })
    await p.end()

    p = createPool({ connectionString: 'md:explicit?session_name=s' })
    await p.query('SELECT 1')
    expect(fromCacheMock).toHaveBeenLastCalledWith('md:explicit?session_name=s', {
      motherduck_token: 't',
    })
    await p.end()

    delete process.env.MOTHERDUCK_DATABASE
    p = createPool()
    await p.query('SELECT 1')
    expect(fromCacheMock).toHaveBeenLastCalledWith('md:', { motherduck_token: 't' })
    await p.end()
  })

  it('extra config settings ride along (cache key includes them)', async () => {
    process.env.MOTHERDUCK_TOKEN = 't'
    const p = createPool({ config: { connection_timeout: '5' } })
    await p.query('SELECT 1')
    expect(fromCacheMock).toHaveBeenLastCalledWith('md:', {
      motherduck_token: 't',
      connection_timeout: '5',
    })
    await p.end()
  })
})

describe('queries and transactions', () => {
  beforeEach(() => {
    process.env.MOTHERDUCK_TOKEN = 't'
  })

  it('passes SQL and coerced values straight through with $N placeholders native', async () => {
    const p = createPool()
    await p.query('SELECT * FROM t WHERE a = $1 AND b = $2', ['x', { j: 1 }])
    expect(runMock).toHaveBeenLastCalledWith('SELECT * FROM t WHERE a = $1 AND b = $2', [
      'x',
      '{"j":1}',
    ])
    await p.end()
  })

  it('rowCount follows rowsChanged for plain DML', async () => {
    runMock.mockResolvedValueOnce(fakeResult([], 3))
    const p = createPool()
    const r = await p.query('UPDATE t SET a = 1')
    expect(r.rowCount).toBe(3)
    await p.end()
  })

  it('a transaction sends BEGIN, runs statements and COMMITs on the same connection', async () => {
    const p = createPool()
    const tx = await p.transaction()
    await tx.query('INSERT INTO t VALUES ($1)', ['a'])
    await tx.commit()
    const sql = runMock.mock.calls.map((call) => call[0])
    expect(sql[0]).toBe('BEGIN')
    expect(sql[1]).toBe('INSERT INTO t VALUES ($1)')
    expect(sql[2]).toBe('COMMIT')
    await p.end()
  })

  it('rollback sends ROLLBACK and frees the connection', async () => {
    const p = createPool()
    const tx = await p.transaction()
    await tx.query('INSERT INTO t VALUES ($1)', ['a'])
    await tx.rollback()
    const sql = runMock.mock.calls.map((call) => call[0])
    expect(sql).toContain('ROLLBACK')
    // After the transaction ends the pool serves queries again.
    await p.query('SELECT 1')
    await p.end()
  })

  it('end() disconnects the connection and rejects further work', async () => {
    const p = createPool()
    await p.query('SELECT 1')
    await p.end()
    expect(disconnectMock).toHaveBeenCalledTimes(1)
    await expect(p.query('SELECT 1')).rejects.toThrow(/pool has been ended/)
  })
})

describe('default exports', () => {
  it('the default pool/store are lazy — no connection until first use', async () => {
    process.env.MOTHERDUCK_TOKEN = 't'
    expect(defaultPoolCreated()).toBe(false)
    expect(fromCacheMock).not.toHaveBeenCalled()
    const r = await pool.query('SELECT 1')
    expect(r.rows[0]).toEqual({ one: 1 })
    expect(defaultPoolCreated()).toBe(true)
    expect(store).toBeDefined()
  })
})
