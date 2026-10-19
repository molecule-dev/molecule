import type pg from 'pg'
import { describe, expect, it, vi } from 'vitest'

import { createPostgresLockFactory } from '../lock.js'

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
  const query = vi.fn(async (sql: string) => {
    if (sql.includes('pg_try_advisory_lock')) return { rows: [{ locked }] }
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
  return client
}

describe('createPostgresLockFactory', () => {
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
    expect(client.query).toHaveBeenCalledWith(
      'SELECT pg_try_advisory_lock($1) AS locked',
      [8675310],
    )
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

    expect(client.query).toHaveBeenCalledWith('SELECT pg_advisory_unlock($1)', [7])
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

    expect(client.query).not.toHaveBeenCalledWith('SELECT pg_advisory_unlock($1)', [7])
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
