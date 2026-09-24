/**
 * Proves the module-level `@example` in `src/index.ts` (rendered as the README
 * Quick Start) works exactly as written. Only the `pg` driver is replaced: its
 * pool is backed by an in-memory SQLite database (which understands the
 * bond's double-quoted identifiers and `RETURNING *`), so the generated SQL
 * actually executes.
 *
 * @module
 */
import Database from 'better-sqlite3'
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest'

import { create, findMany, setPool, setStore, updateById } from '@molecule/api-database'

const { sqlite, poolConfigs } = vi.hoisted(() => ({
  sqlite: { db: null as Database.Database | null },
  poolConfigs: [] as Array<Record<string, unknown>>,
}))

vi.mock('pg', () => {
  const query = async (
    sql: string,
    params: unknown[] = [],
  ): Promise<{ rows: unknown[]; rowCount: number; fields: [] }> => {
    const db = sqlite.db
    if (!db) throw new Error('test database not initialised')
    // Postgres information_schema column lookups → SQLite's pragma_table_info.
    let text = sql
    if (/FROM information_schema\.columns/i.test(sql)) {
      text = /column_name = 'id'/.test(sql)
        ? `SELECT 1 FROM pragma_table_info($1) WHERE name = 'id' LIMIT 1`
        : `SELECT name AS column_name FROM pragma_table_info($1) WHERE lower(type) IN ('json', 'jsonb')`
    }
    // $N placeholders → positional ?, reordering the values to match.
    const values: unknown[] = []
    text = text.replace(/\$(\d+)/g, (_m, n: string) => {
      values.push(params[Number(n) - 1])
      return '?'
    })
    const stmt = db.prepare(text)
    if (stmt.reader) {
      const rows = stmt.all(...values)
      return { rows, rowCount: rows.length, fields: [] }
    }
    return { rows: [], rowCount: stmt.run(...values).changes, fields: [] }
  }
  class Pool {
    query = query
    on = vi.fn()
    connect = vi.fn()
    end = vi.fn()
    totalCount = 0
    idleCount = 0
    waitingCount = 0
    constructor(config: Record<string, unknown>) {
      poolConfigs.push(config)
    }
  }
  class Client {}
  return { default: { Pool, Client }, Pool, Client }
})

describe('README @example', () => {
  const originalUrl = process.env.DATABASE_URL

  beforeAll(() => {
    process.env.DATABASE_URL = 'postgres://app:secret@localhost:5432/app'
    sqlite.db = new Database(':memory:')
    sqlite.db.exec(
      'CREATE TABLE posts (id TEXT PRIMARY KEY, title TEXT NOT NULL, status TEXT NOT NULL)',
    )
  })

  afterAll(() => {
    if (originalUrl === undefined) delete process.env.DATABASE_URL
    else process.env.DATABASE_URL = originalUrl
  })

  it('bonds pool + store from DATABASE_URL and runs create → update → findMany', async () => {
    const { pool, store } = await import('../index.js')

    setPool(pool)
    setStore(store)

    interface Post {
      id: string
      title: string
      status: 'draft' | 'published'
    }

    const { data: draft } = await create<Post>('posts', {
      title: 'Hello Postgres',
      status: 'draft',
    })
    expect(draft?.id).toMatch(/^[0-9a-f-]{36}$/)
    if (draft) {
      await updateById<Post>('posts', draft.id, { status: 'published' })
    }

    const published = await findMany<Post>('posts', {
      where: [{ field: 'status', operator: '=', value: 'published' }],
      orderBy: [{ field: 'title', direction: 'asc' }],
      limit: 20,
    })

    expect(published).toEqual([{ id: draft?.id, title: 'Hello Postgres', status: 'published' }])
    expect(poolConfigs[0]).toMatchObject({
      connectionString: 'postgres://app:secret@localhost:5432/app',
      max: 10,
    })
  })
})
