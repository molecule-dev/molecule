/**
 * Proves the module-level `@example` in `src/index.ts` (rendered as the README
 * Quick Start) works exactly as written. Only the `mysql2` driver is replaced:
 * its pool is backed by an in-memory SQLite database (which accepts MySQL's
 * backtick identifiers), so the bond's generated SQL actually executes.
 *
 * @module
 */
import Database from 'better-sqlite3'
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest'

import { create, findMany, setPool, setStore, updateById } from '@molecule/api-database'

const { sqlite, createPoolMock } = vi.hoisted(() => ({
  sqlite: { db: null as Database.Database | null },
  createPoolMock: vi.fn(),
}))

vi.mock('mysql2/promise', () => {
  const query = async (sql: string, params: unknown[] = []): Promise<[unknown, unknown]> => {
    const db = sqlite.db
    if (!db) throw new Error('test database not initialised')
    // MySQL's information_schema column lookups → SQLite's pragma_table_info.
    const introspect = /FROM information_schema\.columns/i.test(sql)
    const text = introspect
      ? /column_name = 'id'/.test(sql)
        ? `SELECT 1 AS x FROM pragma_table_info(?) WHERE name = 'id' LIMIT 1`
        : `SELECT name AS column_name, lower(type) AS data_type FROM pragma_table_info(?)`
      : sql
    const stmt = db.prepare(text)
    if (stmt.reader) return [stmt.all(...params), []]
    return [{ affectedRows: stmt.run(...params).changes }, undefined]
  }
  const pool = { query, getConnection: vi.fn(), end: vi.fn() }
  createPoolMock.mockImplementation(() => pool)
  return { default: { createPool: createPoolMock }, createPool: createPoolMock }
})

describe('README @example', () => {
  const originalUrl = process.env.MYSQL_URL

  afterAll(() => {
    if (originalUrl === undefined) delete process.env.MYSQL_URL
    else process.env.MYSQL_URL = originalUrl
  })

  beforeAll(() => {
    process.env.MYSQL_URL = 'mysql://app@db.example.com:3306/app'
    sqlite.db = new Database(':memory:')
    sqlite.db.exec(
      'CREATE TABLE posts (id VARCHAR(36) PRIMARY KEY, title VARCHAR(255) NOT NULL, status VARCHAR(16) NOT NULL)',
    )
  })

  it('bonds pool + store from MYSQL_URL and runs create → update → findMany', async () => {
    const { pool, store } = await import('../index.js')

    setPool(pool)
    setStore(store)

    interface Post {
      id: string
      title: string
      status: 'draft' | 'published'
    }

    const { data: draft } = await create<Post>('posts', { title: 'Hello MySQL', status: 'draft' })
    expect(draft?.id).toMatch(/^[0-9a-f-]{36}$/)
    if (draft) {
      await updateById<Post>('posts', draft.id, { status: 'published' })
    }

    const published = await findMany<Post>('posts', {
      where: [{ field: 'status', operator: '=', value: 'published' }],
      orderBy: [{ field: 'title', direction: 'asc' }],
      limit: 20,
    })

    expect(published).toEqual([{ id: draft?.id, title: 'Hello MySQL', status: 'published' }])
    expect(createPoolMock).toHaveBeenCalledWith({
      uri: 'mysql://app@db.example.com:3306/app',
    })
  })
})
