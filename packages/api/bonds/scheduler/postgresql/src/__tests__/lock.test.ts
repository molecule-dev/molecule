import type pg from 'pg'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { advisoryKeyForTask, createPostgresTaskRunLock } from '../lock.js'

/** The slice of `pg.Client` the run lock uses. */
interface FakeClient {
  query: ReturnType<typeof vi.fn>
  connect: ReturnType<typeof vi.fn>
  end: ReturnType<typeof vi.fn>
  on: ReturnType<typeof vi.fn>
}

/**
 * Build a client double whose advisory-lock calls answer `locked`.
 *
 * @param locked - What `pg_try_advisory_lock` answers.
 * @returns The fake client (cast through `unknown` by the factory test).
 */
function makeClient(locked: boolean): FakeClient {
  return {
    query: vi.fn(async (sql: string) => {
      if (sql.includes('pg_try_advisory_lock')) return { rows: [{ locked }] }
      return { rows: [] }
    }),
    connect: vi.fn(async () => {}),
    end: vi.fn(async () => {}),
    on: vi.fn(),
  }
}

beforeEach(() => {
  vi.restoreAllMocks()
})

describe('advisoryKeyForTask', () => {
  it('maps the same name to the same key and different names apart', () => {
    expect(advisoryKeyForTask('cleanup')).toBe(advisoryKeyForTask('cleanup'))
    expect(advisoryKeyForTask('cleanup')).not.toBe(advisoryKeyForTask('billing'))
  })

  it('returns a non-negative 31-bit integer', () => {
    for (const name of ['', 'a', 'nightly-sweep', 'a-very-long-task-name-'.repeat(10)]) {
      const key = advisoryKeyForTask(name)
      expect(Number.isInteger(key)).toBe(true)
      expect(key).toBeGreaterThanOrEqual(0)
      expect(key).toBeLessThanOrEqual(0x7fffffff)
    }
  })
})

describe('createPostgresTaskRunLock', () => {
  it('runs the handler while holding a per-task lock, then unlocks', async () => {
    const client = makeClient(true)
    const lock = createPostgresTaskRunLock({
      connectionString: 'postgres://example/db',
      lockClassId: 9,
      connect: async () => client as unknown as pg.Client,
    })
    const run = vi.fn(async () => {})

    await expect(lock.runExclusive('cleanup', run)).resolves.toBe(true)

    expect(run).toHaveBeenCalledTimes(1)
    const key = advisoryKeyForTask('cleanup')
    expect(client.query).toHaveBeenCalledWith('SELECT pg_try_advisory_lock($1, $2) AS locked', [
      9,
      key,
    ])
    expect(client.query).toHaveBeenCalledWith('SELECT pg_advisory_unlock($1, $2)', [9, key])
    await lock.close()
  })

  it('does not run the handler when another instance holds the lock', async () => {
    const client = makeClient(false)
    const lock = createPostgresTaskRunLock({
      connectionString: 'postgres://example/db',
      connect: async () => client as unknown as pg.Client,
    })
    const run = vi.fn(async () => {})

    await expect(lock.runExclusive('cleanup', run)).resolves.toBe(false)
    expect(run).not.toHaveBeenCalled()
    expect(client.query).not.toHaveBeenCalledWith(
      expect.stringContaining('pg_advisory_unlock'),
      expect.anything(),
    )
    await lock.close()
  })

  it('skips the run when the connection cannot be opened', async () => {
    const previous = process.env.DATABASE_URL
    delete process.env.DATABASE_URL
    try {
      const lock = createPostgresTaskRunLock({})
      const run = vi.fn(async () => {})
      await expect(lock.runExclusive('cleanup', run)).resolves.toBe(false)
      expect(run).not.toHaveBeenCalled()
    } finally {
      if (previous === undefined) delete process.env.DATABASE_URL
      else process.env.DATABASE_URL = previous
    }
  })

  it('skips the run when the lock query fails', async () => {
    const client = makeClient(true)
    client.query.mockRejectedValueOnce(new Error('connection terminated'))
    const lock = createPostgresTaskRunLock({
      connectionString: 'postgres://example/db',
      connect: async () => client as unknown as pg.Client,
    })
    const run = vi.fn(async () => {})

    await expect(lock.runExclusive('cleanup', run)).resolves.toBe(false)
    expect(run).not.toHaveBeenCalled()
    await lock.close()
  })

  it('runs uncoordinated when opted in and the lock query fails', async () => {
    const client = makeClient(true)
    client.query.mockRejectedValueOnce(new Error('connection terminated'))
    const lock = createPostgresTaskRunLock({
      connectionString: 'postgres://example/db',
      runUncoordinatedOnLockError: true,
      connect: async () => client as unknown as pg.Client,
    })
    const run = vi.fn(async () => {})

    await expect(lock.runExclusive('cleanup', run)).resolves.toBe(true)
    expect(run).toHaveBeenCalledTimes(1)
    await lock.close()
  })

  it('still unlocks when the handler throws, and rethrows the failure', async () => {
    const client = makeClient(true)
    const lock = createPostgresTaskRunLock({
      connectionString: 'postgres://example/db',
      connect: async () => client as unknown as pg.Client,
    })
    const key = advisoryKeyForTask('cleanup')

    await expect(
      lock.runExclusive('cleanup', async () => {
        throw new Error('boom')
      }),
    ).rejects.toThrow('boom')
    expect(client.query).toHaveBeenCalledWith('SELECT pg_advisory_unlock($1, $2)', [8675311, key])
    await lock.close()
  })

  it('closes the dedicated connection and refuses further runs', async () => {
    const client = makeClient(true)
    const lock = createPostgresTaskRunLock({
      connectionString: 'postgres://example/db',
      connect: async () => client as unknown as pg.Client,
    })
    await lock.runExclusive('cleanup', async () => {})
    await lock.close()

    expect(client.end).toHaveBeenCalledTimes(1)
    const run = vi.fn(async () => {})
    await expect(lock.runExclusive('cleanup', run)).resolves.toBe(false)
    expect(run).not.toHaveBeenCalled()
  })
})
