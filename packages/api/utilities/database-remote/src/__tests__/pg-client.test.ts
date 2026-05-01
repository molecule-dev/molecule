/**
 * Tests for the Postgres `RemoteDb` implementation. The real `pg` driver
 * is replaced with a hand-rolled mock satisfying {@link PgPoolLike}.
 */

import { describe, expect, it, vi } from 'vitest'

import { connectRemote } from '../connect.js'
import type { PgPoolClientLike, PgPoolLike, PgQueryResult } from '../driverTypes.js'

interface PoolState {
  poolQueries: Array<{ sql: string; params?: unknown[] }>
  clientQueries: Array<{ sql: string; params?: unknown[] }>
  poolResults: Array<PgQueryResult>
  clientResults: Array<PgQueryResult>
  clientReleased: number
  endCalls: number
}

function makePool(state: PoolState): PgPoolLike {
  const client: PgPoolClientLike = {
    async query<T = Record<string, unknown>>(
      sql: string,
      params?: unknown[],
    ): Promise<PgQueryResult<T>> {
      state.clientQueries.push({ sql, params })
      const next = state.clientResults.shift()
      return (next ?? { rows: [], rowCount: 0, fields: [] }) as PgQueryResult<T>
    },
    release(): void {
      state.clientReleased += 1
    },
  }
  return {
    async query<T = Record<string, unknown>>(
      sql: string,
      params?: unknown[],
    ): Promise<PgQueryResult<T>> {
      state.poolQueries.push({ sql, params })
      const next = state.poolResults.shift()
      return (next ?? { rows: [], rowCount: 0, fields: [] }) as PgQueryResult<T>
    },
    async connect(): Promise<PgPoolClientLike> {
      return client
    },
    async end(): Promise<void> {
      state.endCalls += 1
    },
  }
}

function freshState(): PoolState {
  return {
    poolQueries: [],
    clientQueries: [],
    poolResults: [],
    clientResults: [],
    clientReleased: 0,
    endCalls: 0,
  }
}

describe('pg RemoteDb — listSchemas / listTables', () => {
  it('lists schemas via pg_namespace', async () => {
    const state = freshState()
    state.poolResults.push({
      rows: [{ nspname: 'public' }, { nspname: 'analytics' }],
      rowCount: 2,
    })
    const db = await connectRemote(
      { url: 'postgresql://x', type: 'postgresql' },
      { pgPoolFactory: () => makePool(state) },
    )
    const schemas = await db.listSchemas()
    expect(schemas).toEqual([{ name: 'public' }, { name: 'analytics' }])
    expect(state.poolQueries[0]?.sql).toMatch(/pg_namespace/)
  })

  it('lists tables in a schema (default = public)', async () => {
    const state = freshState()
    state.poolResults.push({
      rows: [
        { table_schema: 'public', table_name: 'users', table_type: 'BASE TABLE' },
        { table_schema: 'public', table_name: 'orders_view', table_type: 'VIEW' },
      ],
      rowCount: 2,
    })
    const db = await connectRemote(
      { url: 'postgresql://x', type: 'postgresql' },
      { pgPoolFactory: () => makePool(state) },
    )
    const tables = await db.listTables()
    expect(tables).toEqual([
      { schema: 'public', name: 'users', type: 'table' },
      { schema: 'public', name: 'orders_view', type: 'view' },
    ])
    expect(state.poolQueries[0]?.params).toEqual(['public'])
  })
})

describe('pg RemoteDb — describeTable', () => {
  it('builds a TableSchema from columns/PK/index/FK queries', async () => {
    const state = freshState()
    // exists
    state.poolResults.push({ rows: [{ count: '1' }], rowCount: 1 })
    // columns
    state.poolResults.push({
      rows: [
        {
          column_name: 'id',
          data_type: 'integer',
          is_nullable: 'NO',
          column_default: 'nextval(...)',
          character_maximum_length: null,
        },
        {
          column_name: 'name',
          data_type: 'character varying',
          is_nullable: 'NO',
          column_default: null,
          character_maximum_length: 255,
        },
      ],
      rowCount: 2,
    })
    // pk
    state.poolResults.push({ rows: [{ column_name: 'id' }], rowCount: 1 })
    // indexes
    state.poolResults.push({
      rows: [
        { index_name: 'users_pkey', column_name: 'id', is_unique: true, ordinality: 1 },
        { index_name: 'users_name_idx', column_name: 'name', is_unique: false, ordinality: 1 },
      ],
      rowCount: 2,
    })
    // fks
    state.poolResults.push({
      rows: [
        {
          constraint_name: 'users_org_fk',
          column_name: 'org_id',
          foreign_schema: 'public',
          foreign_table: 'orgs',
          foreign_column: 'id',
          ordinal_position: 1,
        },
      ],
      rowCount: 1,
    })

    const db = await connectRemote(
      { url: 'postgresql://x', type: 'postgresql' },
      { pgPoolFactory: () => makePool(state) },
    )
    const schema = await db.describeTable('public', 'users')
    expect(schema.name).toBe('users')
    expect(schema.columns).toEqual([
      {
        name: 'id',
        dataType: 'integer',
        nullable: false,
        primaryKey: true,
        defaultValue: 'nextval(...)',
      },
      {
        name: 'name',
        dataType: 'character varying(255)',
        nullable: false,
        primaryKey: false,
      },
    ])
    expect(schema.indexes).toEqual([
      { name: 'users_pkey', columns: ['id'], unique: true },
      { name: 'users_name_idx', columns: ['name'], unique: false },
    ])
    expect(schema.foreignKeys[0]).toMatchObject({
      name: 'users_org_fk',
      columns: ['org_id'],
      referencedTable: 'orgs',
      referencedColumns: ['id'],
    })
  })

  it('throws table-not-found when COUNT(*) returns 0', async () => {
    const state = freshState()
    state.poolResults.push({ rows: [{ count: '0' }], rowCount: 1 })
    const db = await connectRemote(
      { url: 'postgresql://x', type: 'postgresql' },
      { pgPoolFactory: () => makePool(state) },
    )
    await expect(db.describeTable('public', 'nope')).rejects.toMatchObject({
      code: 'table-not-found',
    })
  })
})

describe('pg RemoteDb — runQuery', () => {
  it('returns a normalized QueryResult with columns + rows + executionTimeMs', async () => {
    const state = freshState()
    // SET statement_timeout — first client.query
    state.clientResults.push({ rows: [], rowCount: 0, fields: [] })
    // Actual SELECT
    state.clientResults.push({
      rows: [
        { id: 1, name: 'a' },
        { id: 2, name: 'b' },
      ],
      rowCount: 2,
      fields: [
        { name: 'id', dataTypeID: 23 },
        { name: 'name', dataTypeID: 25 },
      ],
    })
    const db = await connectRemote(
      { url: 'postgresql://x', type: 'postgresql' },
      { pgPoolFactory: () => makePool(state) },
    )
    const result = await db.runQuery('SELECT * FROM users WHERE id > $1', [0])
    expect(result.rows.length).toBe(2)
    expect(result.columns).toEqual([
      { name: 'id', dataType: '23' },
      { name: 'name', dataType: '25' },
    ])
    expect(result.rowCount).toBe(2)
    expect(result.truncated).toBeUndefined()
    expect(typeof result.executionTimeMs).toBe('number')
    expect(state.clientReleased).toBeGreaterThanOrEqual(1)
  })

  it('truncates rows past maxRows and sets truncated:true', async () => {
    const state = freshState()
    state.clientResults.push({ rows: [], rowCount: 0, fields: [] })
    state.clientResults.push({
      rows: [{ x: 1 }, { x: 2 }, { x: 3 }],
      rowCount: 3,
      fields: [{ name: 'x' }],
    })
    const db = await connectRemote(
      { url: 'postgresql://x', type: 'postgresql' },
      { pgPoolFactory: () => makePool(state) },
    )
    const result = await db.runQuery('SELECT x FROM t', [], { maxRows: 2 })
    expect(result.rows).toEqual([{ x: 1 }, { x: 2 }])
    expect(result.truncated).toBe(true)
  })

  it('rejects mutating SQL when readonly:true', async () => {
    const state = freshState()
    const db = await connectRemote(
      { url: 'postgresql://x', type: 'postgresql', readonly: true },
      { pgPoolFactory: () => makePool(state) },
    )
    await expect(db.runQuery('DELETE FROM users')).rejects.toMatchObject({
      code: 'readonly-violation',
    })
    // No SET statement_timeout, no DELETE — readonly check happens before
    // the pool is touched.
    expect(state.clientQueries.length).toBe(0)
  })

  it('surfaces a timeout error and releases the pooled client', async () => {
    const state: PoolState = freshState()
    // SET statement_timeout responds promptly.
    state.clientResults.push({ rows: [], rowCount: 0, fields: [] })

    // Build a custom pool whose second client.query NEVER resolves.
    const baseClient: PgPoolClientLike = {
      query: vi.fn(async (sql: string) => {
        if (sql.startsWith('SET statement_timeout')) {
          return { rows: [], rowCount: 0, fields: [] }
        }
        return new Promise(() => {
          /* never resolves */
        })
      }),
      release: vi.fn(),
    }
    const pool: PgPoolLike = {
      async query() {
        return { rows: [], rowCount: 0, fields: [] }
      },
      async connect() {
        return baseClient
      },
      async end() {
        state.endCalls += 1
      },
    }

    const db = await connectRemote(
      { url: 'postgresql://x', type: 'postgresql' },
      { pgPoolFactory: () => pool },
    )
    await expect(db.runQuery('SELECT pg_sleep(60)', [], { timeoutMs: 25 })).rejects.toMatchObject({
      code: 'timeout',
    })
    expect(baseClient.release).toHaveBeenCalled()
  })

  it('rejects calls after disconnect with not-connected', async () => {
    const state = freshState()
    const db = await connectRemote(
      { url: 'postgresql://x', type: 'postgresql' },
      { pgPoolFactory: () => makePool(state) },
    )
    await db.disconnect()
    expect(state.endCalls).toBe(1)
    await expect(db.runQuery('SELECT 1')).rejects.toMatchObject({
      code: 'not-connected',
    })
    // disconnect is idempotent
    await db.disconnect()
    expect(state.endCalls).toBe(1)
  })
})
