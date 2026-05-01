/**
 * Tests for the {@link connectRemote} dispatcher — engine routing,
 * connection-failure surface, validation.
 */

import { describe, expect, it, vi } from 'vitest'

import { connectRemote } from '../connect.js'
import type {
  MysqlPoolFactory,
  MysqlPoolLike,
  PgPoolClientLike,
  PgPoolFactory,
  PgPoolLike,
  SqliteDbFactory,
  SqliteDbLike,
} from '../driverTypes.js'
import { RemoteDbError } from '../types.js'

function makePgPool(overrides: Partial<PgPoolLike> = {}): PgPoolLike {
  const fakeClient: PgPoolClientLike = {
    query: vi.fn(async () => ({ rows: [], rowCount: 0, fields: [] })),
    release: vi.fn(),
  }
  return {
    query: vi.fn(async () => ({ rows: [], rowCount: 0, fields: [] })),
    connect: vi.fn(async () => fakeClient),
    end: vi.fn(async () => undefined),
    ...overrides,
  }
}

function makeMysqlPool(overrides: Partial<MysqlPoolLike> = {}): MysqlPoolLike {
  return {
    query: vi.fn(async () => [[], []]),
    end: vi.fn(async () => undefined),
    ...overrides,
  }
}

function makeSqliteDb(overrides: Partial<SqliteDbLike> = {}): SqliteDbLike {
  return {
    prepare: vi.fn(),
    pragma: vi.fn(),
    close: vi.fn(),
    readonly: false,
    ...overrides,
  }
}

describe('connectRemote — validation', () => {
  it('rejects empty url with invalid-config', async () => {
    await expect(
      connectRemote({ url: '', type: 'sqlite' }, { sqliteFactory: () => makeSqliteDb() }),
    ).rejects.toMatchObject({
      name: 'RemoteDbError',
      code: 'invalid-config',
    })
  })

  it('rejects unknown engine with unsupported-type', async () => {
    await expect(connectRemote({ url: 'foo', type: 'oracle' as 'sqlite' })).rejects.toMatchObject({
      name: 'RemoteDbError',
      code: 'unsupported-type',
    })
  })
})

describe('connectRemote — postgres', () => {
  it('builds a Postgres handle and probes the pool', async () => {
    const pool = makePgPool()
    const factory: PgPoolFactory = vi.fn(() => pool)
    const db = await connectRemote(
      { url: 'postgresql://x@h/db', type: 'postgresql', poolSize: 7 },
      { pgPoolFactory: factory },
    )
    expect(db.type).toBe('postgresql')
    expect(db.readonly).toBe(false)
    expect(factory).toHaveBeenCalledWith({
      connectionString: 'postgresql://x@h/db',
      max: 7,
    })
    expect(pool.connect).toHaveBeenCalledTimes(1)
    await db.disconnect()
    expect(pool.end).toHaveBeenCalledTimes(1)
  })

  it('surfaces probe failure as connection-failed and closes the pool', async () => {
    const pool = makePgPool({
      connect: vi.fn(async () => {
        throw new Error('ECONNREFUSED')
      }),
    })
    const factory: PgPoolFactory = vi.fn(() => pool)
    await expect(
      connectRemote({ url: 'postgresql://x', type: 'postgresql' }, { pgPoolFactory: factory }),
    ).rejects.toMatchObject({ code: 'connection-failed' })
    expect(pool.end).toHaveBeenCalled()
  })

  it('honours readonly flag', async () => {
    const pool = makePgPool()
    const db = await connectRemote(
      { url: 'postgresql://x', type: 'postgresql', readonly: true },
      { pgPoolFactory: () => pool },
    )
    expect(db.readonly).toBe(true)
  })
})

describe('connectRemote — mysql', () => {
  it('builds a MySQL handle, probes with SELECT 1, parses default db', async () => {
    const pool = makeMysqlPool()
    const factory: MysqlPoolFactory = vi.fn(() => pool)
    const db = await connectRemote(
      { url: 'mysql://u:p@h:3306/shop', type: 'mysql' },
      { mysqlPoolFactory: factory },
    )
    expect(db.type).toBe('mysql')
    expect(factory).toHaveBeenCalledWith({
      uri: 'mysql://u:p@h:3306/shop',
      connectionLimit: 4,
      multipleStatements: false,
    })
    expect(pool.query).toHaveBeenCalledWith('SELECT 1', [])
    await db.disconnect()
    expect(pool.end).toHaveBeenCalled()
  })

  it('surfaces probe failure as connection-failed', async () => {
    const pool = makeMysqlPool({
      query: vi.fn(async () => {
        throw new Error('Access denied')
      }),
    })
    await expect(
      connectRemote({ url: 'mysql://x@h/db', type: 'mysql' }, { mysqlPoolFactory: () => pool }),
    ).rejects.toMatchObject({ code: 'connection-failed' })
    expect(pool.end).toHaveBeenCalled()
  })
})

describe('connectRemote — sqlite', () => {
  it('opens via the supplied factory and reflects the readonly flag', async () => {
    const sqliteDb = makeSqliteDb()
    const factory: SqliteDbFactory = vi.fn(() => sqliteDb)
    const db = await connectRemote(
      { url: ':memory:', type: 'sqlite', readonly: true },
      { sqliteFactory: factory },
    )
    expect(db.type).toBe('sqlite')
    expect(db.readonly).toBe(true)
    expect(factory).toHaveBeenCalledWith(':memory:', { readonly: true })
    await db.disconnect()
    expect(sqliteDb.close).toHaveBeenCalled()
  })

  it('wraps factory errors as connection-failed', async () => {
    await expect(
      connectRemote(
        { url: '/no/such/file.db', type: 'sqlite' },
        {
          sqliteFactory: () => {
            throw new Error('SQLITE_CANTOPEN')
          },
        },
      ),
    ).rejects.toMatchObject({ code: 'connection-failed' })
  })

  it('preserves RemoteDbError thrown by factory (e.g. driver-not-installed)', async () => {
    await expect(
      connectRemote(
        { url: ':memory:', type: 'sqlite' },
        {
          sqliteFactory: () => {
            throw new RemoteDbError('driver-not-installed', 'missing')
          },
        },
      ),
    ).rejects.toMatchObject({ code: 'driver-not-installed' })
  })
})
