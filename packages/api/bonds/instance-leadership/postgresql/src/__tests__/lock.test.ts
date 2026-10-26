import type pg from 'pg'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { createPostgresLockFactory, PgLeaderLockSession } from '../lock.js'

const clients: FakeClient[] = []

afterEach(async () => {
  for (const client of clients.splice(0)) {
    client.emitLost()
    await client.end()
  }
  vi.useRealTimers()
})

/**
 * The slice of `pg.Client` a leadership session uses.
 */
interface FakeClient {
  query: ReturnType<typeof vi.fn>
  end: ReturnType<typeof vi.fn>
  on: ReturnType<typeof vi.fn>
  emitLost: () => void
}

/**
 * Build a connected-looking client double.
 *
 * @param locked - What `pg_try_advisory_lock` answers.
 * @returns The fake client and its recorded queries.
 */
function makeClient(locked: boolean): FakeClient {
  let lost: (() => void) | null = null
  const query = vi.fn(async (sql: string | pg.QueryConfig) => {
    if ((typeof sql === 'string' ? sql : sql.text).includes('pg_try_advisory_lock'))
      return { rows: [{ locked }] }
    return { rows: [] }
  })
  const client: FakeClient = {
    query,
    end: vi.fn(async () => {}),
    on: vi.fn((event: string, handler: () => void) => {
      if (event === 'error' || event === 'end') lost = handler
    }),
    emitLost: () => lost?.(),
  }
  clients.push(client)
  return client
}

describe('createPostgresLockFactory', () => {
  it('bounds orphaned holders on PostgreSQL and keeps a healthy holder active', async () => {
    vi.useFakeTimers()
    const client = makeClient(true)
    const session = new PgLeaderLockSession(client as unknown as pg.Client, 42)
    await session.tryLock()
    expect(client.query).toHaveBeenCalledWith({
      text: "SET idle_session_timeout = '15s'",
      values: undefined,
      query_timeout: 5_000,
    })
    await vi.advanceTimersByTimeAsync(20_000)
    expect(
      client.query.mock.calls.filter(([sql]) => typeof sql === 'object' && sql.text === 'SELECT 1'),
    ).toHaveLength(4)
    await session.release()
    const calls = client.query.mock.calls.length
    await vi.advanceTimersByTimeAsync(20_000)
    expect(client.query).toHaveBeenCalledTimes(calls)
  })

  it('demotes and closes a leader when its bounded heartbeat fails', async () => {
    vi.useFakeTimers()
    const client = makeClient(true)
    const session = new PgLeaderLockSession(client as unknown as pg.Client, 42)
    const onLost = vi.fn()
    session.onLost(onLost)
    await session.tryLock()
    client.query.mockRejectedValueOnce(new Error('socket timed out'))
    await vi.advanceTimersByTimeAsync(5_000)
    expect(onLost).toHaveBeenCalledTimes(1)
    expect(client.query).toHaveBeenLastCalledWith({
      text: 'SELECT 1',
      values: undefined,
      query_timeout: 5_000,
    })
    expect(client.end).toHaveBeenCalledTimes(1)
    await expect(session.tryLock()).resolves.toBe(false)
    await vi.advanceTimersByTimeAsync(20_000)
    expect(onLost).toHaveBeenCalledTimes(1)
  })

  it('does not heartbeat or stack advisory locks while following', async () => {
    vi.useFakeTimers()
    const client = makeClient(false)
    const session = new PgLeaderLockSession(client as unknown as pg.Client, 42)
    await expect(session.tryLock()).resolves.toBe(false)
    await expect(session.tryLock()).resolves.toBe(false)
    await vi.advanceTimersByTimeAsync(20_000)
    expect(
      client.query.mock.calls.filter(([sql]) => typeof sql === 'object' && sql.text === 'SELECT 1'),
    ).toHaveLength(0)
    expect(
      client.query.mock.calls.filter(
        ([sql]) => typeof sql === 'object' && sql.text === "SET idle_session_timeout = '15s'",
      ),
    ).toHaveLength(1)
    await session.release()
  })

  it('fails with an actionable message when no connection string is configured', async () => {
    const previous = process.env.DATABASE_URL
    delete process.env.DATABASE_URL
    try {
      const factory = createPostgresLockFactory({ lockId: 42 })
      await expect(factory()).rejects.toThrow(/needs DATABASE_URL/)
    } finally {
      if (previous === undefined) delete process.env.DATABASE_URL
      else process.env.DATABASE_URL = previous
    }
  })

  it('dials the configured connection string and asks for the advisory lock', async () => {
    const client = makeClient(true)
    const connect = vi.fn(async () => client as unknown as pg.Client)
    const factory = createPostgresLockFactory({
      lockId: 8675310,
      connectionString: 'postgres://example/db',
      connect,
    })

    const session = await factory()
    await expect(session.tryLock()).resolves.toBe(true)

    expect(connect).toHaveBeenCalledWith('postgres://example/db', undefined)
    expect(client.query).toHaveBeenCalledWith({
      text: 'SELECT pg_try_advisory_lock($1) AS locked',
      values: [8675310],
      query_timeout: 5_000,
    })
  })

  it('reports a lock held by another session as false', async () => {
    const client = makeClient(false)
    const factory = createPostgresLockFactory({
      lockId: 1,
      connectionString: 'postgres://example/db',
      connect: async () => client as unknown as pg.Client,
    })

    const session = await factory()
    await expect(session.tryLock()).resolves.toBe(false)
  })

  it('releases the advisory lock and closes the client', async () => {
    const client = makeClient(true)
    const factory = createPostgresLockFactory({
      lockId: 7,
      connectionString: 'postgres://example/db',
      connect: async () => client as unknown as pg.Client,
    })

    const session = await factory()
    await session.tryLock()
    await session.release()

    expect(client.query).toHaveBeenCalledWith({
      text: 'SELECT pg_advisory_unlock($1)',
      values: [7],
      query_timeout: 5_000,
    })
    expect(client.end).toHaveBeenCalledTimes(1)
  })

  it('skips the unlock (but still closes) after the connection is lost', async () => {
    const client = makeClient(true)
    const factory = createPostgresLockFactory({
      lockId: 7,
      connectionString: 'postgres://example/db',
      connect: async () => client as unknown as pg.Client,
    })

    const session = await factory()
    await session.tryLock()
    client.emitLost()
    await session.release()

    expect(client.query).not.toHaveBeenCalledWith(
      expect.objectContaining({ text: 'SELECT pg_advisory_unlock($1)' }),
    )
    expect(client.end).toHaveBeenCalledTimes(1)
  })

  it('invokes the lost handler once when the connection errors', async () => {
    const client = makeClient(true)
    const factory = createPostgresLockFactory({
      lockId: 7,
      connectionString: 'postgres://example/db',
      connect: async () => client as unknown as pg.Client,
    })

    const session = await factory()
    const onLost = vi.fn()
    session.onLost(onLost)

    client.emitLost()
    client.emitLost()
    expect(onLost).toHaveBeenCalledTimes(1)
  })
})
