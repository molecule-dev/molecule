/**
 * Proves the module-level `@example` in `src/index.ts` (rendered as the README
 * Quick Start) works exactly as written. Only the `pg` driver is replaced: its
 * pool is backed by an in-memory SQLite database holding the migrated
 * `feature_flags` table, so the SQL the Postgres bond generates really runs.
 *
 * @module
 */
import Database from 'better-sqlite3'
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest'

import { setStore } from '@molecule/api-database'
import { store } from '@molecule/api-database-postgresql'
import { getFlag, isEnabled, setFlag, setProvider } from '@molecule/api-feature-flags'

import { createProvider } from '../index.js'

const { sqlite } = vi.hoisted(() => ({
  sqlite: { db: null as Database.Database | null },
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
    // $N placeholders → positional ?, reordering the values; booleans → 0/1 like pg's wire format.
    const values: unknown[] = []
    text = text.replace(/\$(\d+)/g, (_m, n: string) => {
      const value = params[Number(n) - 1]
      values.push(typeof value === 'boolean' ? Number(value) : value)
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
  }
  class Client {}
  return { default: { Pool, Client }, Pool, Client }
})

describe('README @example', () => {
  const originalUrl = process.env.DATABASE_URL

  beforeAll(() => {
    process.env.DATABASE_URL = 'postgres://app@db.example.com/app'
    sqlite.db = new Database(':memory:')
    // The migration the remarks describe.
    sqlite.db.exec(`CREATE TABLE feature_flags (
      id TEXT PRIMARY KEY, name TEXT NOT NULL UNIQUE, enabled INTEGER NOT NULL,
      description TEXT, rules TEXT, percentage INTEGER, created_at TEXT, updated_at TEXT)`)
  })

  afterAll(() => {
    if (originalUrl === undefined) delete process.env.DATABASE_URL
    else process.env.DATABASE_URL = originalUrl
  })

  it('stores a rule-gated flag and evaluates it per user', async () => {
    const log = vi.spyOn(console, 'log').mockImplementation(() => undefined)

    setStore(store)
    setProvider(createProvider({ tableName: 'feature_flags' }))

    await setFlag({
      name: 'new-checkout',
      enabled: true,
      description: 'Redesigned checkout flow',
      rules: [{ attribute: 'plan', operator: 'eq', value: 'pro' }],
    })

    const proUser = await isEnabled('new-checkout', { userId: 'u1', attributes: { plan: 'pro' } })
    const freeUser = await isEnabled('new-checkout', { userId: 'u2', attributes: { plan: 'free' } })
    console.log(proUser, freeUser)

    expect(log).toHaveBeenCalledWith(true, false)
    expect(await getFlag('new-checkout')).toMatchObject({
      name: 'new-checkout',
      enabled: true,
      description: 'Redesigned checkout flow',
      rules: [{ attribute: 'plan', operator: 'eq', value: 'pro' }],
    })
    log.mockRestore()
  })
})
