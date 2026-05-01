/**
 * Tests for the MySQL `RemoteDb` implementation. The real `mysql2/promise`
 * pool is replaced with a hand-rolled mock satisfying {@link MysqlPoolLike}.
 */

import { describe, expect, it, vi } from 'vitest'

import { connectRemote } from '../connect.js'
import type {
  MysqlField,
  MysqlOkPacket,
  MysqlPoolLike,
  MysqlQueryResult,
  MysqlRow,
} from '../driverTypes.js'
import { parseMysqlDatabase } from '../mysql-client.js'

interface MysqlState {
  queries: Array<{ sql: string; params?: unknown[] }>
  results: MysqlQueryResult[]
  endCalls: number
}

function makePool(state: MysqlState): MysqlPoolLike {
  return {
    async query(sql: string, params?: unknown[]): Promise<MysqlQueryResult> {
      state.queries.push({ sql, params })
      const next = state.results.shift()
      if (!next) return [[] as MysqlRow[], [] as MysqlField[]]
      return next
    },
    async end(): Promise<void> {
      state.endCalls += 1
    },
  }
}

function freshState(): MysqlState {
  return { queries: [], results: [], endCalls: 0 }
}

describe('mysql RemoteDb — listSchemas / listTables', () => {
  it('lists schemas from information_schema.SCHEMATA', async () => {
    const state = freshState()
    // probe SELECT 1
    state.results.push([[{ '1': 1 }] as MysqlRow[], []])
    // listSchemas
    state.results.push([[{ SCHEMA_NAME: 'shop' }, { SCHEMA_NAME: 'analytics' }] as MysqlRow[], []])
    const db = await connectRemote(
      { url: 'mysql://u@h/shop', type: 'mysql' },
      { mysqlPoolFactory: () => makePool(state) },
    )
    expect(await db.listSchemas()).toEqual([{ name: 'shop' }, { name: 'analytics' }])
  })

  it('listTables defaults to db parsed from URI', async () => {
    const state = freshState()
    state.results.push([[{ '1': 1 }] as MysqlRow[], []])
    state.results.push([
      [
        { TABLE_SCHEMA: 'shop', TABLE_NAME: 'orders', TABLE_TYPE: 'BASE TABLE' },
        { TABLE_SCHEMA: 'shop', TABLE_NAME: 'order_summary', TABLE_TYPE: 'VIEW' },
      ] as MysqlRow[],
      [],
    ])
    const db = await connectRemote(
      { url: 'mysql://u@h/shop', type: 'mysql' },
      { mysqlPoolFactory: () => makePool(state) },
    )
    const tables = await db.listTables()
    expect(tables).toEqual([
      { schema: 'shop', name: 'orders', type: 'table' },
      { schema: 'shop', name: 'order_summary', type: 'view' },
    ])
    expect(state.queries.at(-1)?.params).toEqual(['shop'])
  })
})

describe('mysql RemoteDb — describeTable', () => {
  it('builds a TableSchema with columns/indexes/foreign keys', async () => {
    const state = freshState()
    // probe
    state.results.push([[{ '1': 1 }] as MysqlRow[], []])
    // exists
    state.results.push([[{ count: 1 }] as MysqlRow[], []])
    // columns
    state.results.push([
      [
        {
          COLUMN_NAME: 'id',
          COLUMN_TYPE: 'int(11)',
          IS_NULLABLE: 'NO',
          COLUMN_DEFAULT: null,
          COLUMN_KEY: 'PRI',
        },
        {
          COLUMN_NAME: 'name',
          COLUMN_TYPE: 'varchar(255)',
          IS_NULLABLE: 'YES',
          COLUMN_DEFAULT: null,
          COLUMN_KEY: '',
        },
      ] as MysqlRow[],
      [],
    ])
    // indexes
    state.results.push([
      [{ INDEX_NAME: 'PRIMARY', COLUMN_NAME: 'id', NON_UNIQUE: 0, SEQ_IN_INDEX: 1 }] as MysqlRow[],
      [],
    ])
    // FKs
    state.results.push([
      [
        {
          CONSTRAINT_NAME: 'orders_user_fk',
          COLUMN_NAME: 'user_id',
          REFERENCED_TABLE_SCHEMA: 'shop',
          REFERENCED_TABLE_NAME: 'users',
          REFERENCED_COLUMN_NAME: 'id',
          ORDINAL_POSITION: 1,
        },
      ] as MysqlRow[],
      [],
    ])

    const db = await connectRemote(
      { url: 'mysql://u@h/shop', type: 'mysql' },
      { mysqlPoolFactory: () => makePool(state) },
    )
    const schema = await db.describeTable('shop', 'orders')
    expect(schema.columns[0]).toMatchObject({
      name: 'id',
      dataType: 'int(11)',
      nullable: false,
      primaryKey: true,
    })
    expect(schema.columns[1]?.nullable).toBe(true)
    expect(schema.indexes).toEqual([{ name: 'PRIMARY', columns: ['id'], unique: true }])
    expect(schema.foreignKeys).toEqual([
      {
        name: 'orders_user_fk',
        columns: ['user_id'],
        referencedSchema: 'shop',
        referencedTable: 'users',
        referencedColumns: ['id'],
      },
    ])
  })

  it('throws table-not-found when none exists', async () => {
    const state = freshState()
    state.results.push([[{ '1': 1 }] as MysqlRow[], []])
    state.results.push([[{ count: 0 }] as MysqlRow[], []])
    const db = await connectRemote(
      { url: 'mysql://u@h/shop', type: 'mysql' },
      { mysqlPoolFactory: () => makePool(state) },
    )
    await expect(db.describeTable('shop', 'nope')).rejects.toMatchObject({
      code: 'table-not-found',
    })
  })
})

describe('mysql RemoteDb — runQuery', () => {
  it('returns rows for SELECT-style results', async () => {
    const state = freshState()
    state.results.push([[{ '1': 1 }] as MysqlRow[], []])
    state.results.push([
      [{ id: 1 }, { id: 2 }, { id: 3 }] as MysqlRow[],
      [{ name: 'id', columnType: 3 }] as MysqlField[],
    ])
    const db = await connectRemote(
      { url: 'mysql://u@h/shop', type: 'mysql' },
      { mysqlPoolFactory: () => makePool(state) },
    )
    const result = await db.runQuery('SELECT id FROM orders LIMIT ?', [10])
    expect(result.rows.length).toBe(3)
    expect(result.columns).toEqual([{ name: 'id', dataType: '3' }])
    expect(result.rowCount).toBe(3)
  })

  it('reports affectedRows for OkPacket results', async () => {
    const state = freshState()
    state.results.push([[{ '1': 1 }] as MysqlRow[], []])
    state.results.push([{ affectedRows: 7 } as MysqlOkPacket, undefined])
    const db = await connectRemote(
      { url: 'mysql://u@h/shop', type: 'mysql' },
      { mysqlPoolFactory: () => makePool(state) },
    )
    const result = await db.runQuery('UPDATE t SET x = ?', [1])
    expect(result.rowCount).toBe(7)
    expect(result.rows).toEqual([])
  })

  it('rejects mutating SQL in readonly mode', async () => {
    const state = freshState()
    state.results.push([[{ '1': 1 }] as MysqlRow[], []])
    const db = await connectRemote(
      { url: 'mysql://u@h/shop', type: 'mysql', readonly: true },
      { mysqlPoolFactory: () => makePool(state) },
    )
    await expect(db.runQuery('UPDATE t SET x = 1')).rejects.toMatchObject({
      code: 'readonly-violation',
    })
  })

  it('truncates rows past maxRows', async () => {
    const state = freshState()
    state.results.push([[{ '1': 1 }] as MysqlRow[], []])
    state.results.push([
      [{ id: 1 }, { id: 2 }, { id: 3 }] as MysqlRow[],
      [{ name: 'id' }] as MysqlField[],
    ])
    const db = await connectRemote(
      { url: 'mysql://u@h/shop', type: 'mysql' },
      { mysqlPoolFactory: () => makePool(state) },
    )
    const result = await db.runQuery('SELECT id FROM t', [], { maxRows: 1 })
    expect(result.rows).toEqual([{ id: 1 }])
    expect(result.truncated).toBe(true)
  })

  it('honours timeoutMs', async () => {
    const state = freshState()
    state.results.push([[{ '1': 1 }] as MysqlRow[], []])
    const slowPool: MysqlPoolLike = {
      query: vi.fn(async (sql: string) => {
        if (sql === 'SELECT 1') return [[{ '1': 1 }] as MysqlRow[], []]
        return new Promise(() => {
          /* never resolves */
        })
      }),
      end: vi.fn(async () => undefined),
    }
    const db = await connectRemote(
      { url: 'mysql://u@h/shop', type: 'mysql' },
      { mysqlPoolFactory: () => slowPool },
    )
    await expect(db.runQuery('SELECT SLEEP(60)', [], { timeoutMs: 20 })).rejects.toMatchObject({
      code: 'timeout',
    })
  })

  it('disconnect ends the pool and prevents further calls', async () => {
    const state = freshState()
    state.results.push([[{ '1': 1 }] as MysqlRow[], []])
    const db = await connectRemote(
      { url: 'mysql://u@h/shop', type: 'mysql' },
      { mysqlPoolFactory: () => makePool(state) },
    )
    await db.disconnect()
    expect(state.endCalls).toBe(1)
    await expect(db.runQuery('SELECT 1')).rejects.toMatchObject({ code: 'not-connected' })
  })
})

describe('parseMysqlDatabase', () => {
  it('extracts the path segment as the database name', () => {
    expect(parseMysqlDatabase('mysql://u:p@h:3306/shop')).toBe('shop')
  })

  it('returns empty string when there is no path', () => {
    expect(parseMysqlDatabase('mysql://u:p@h')).toBe('')
    expect(parseMysqlDatabase('not-a-url')).toBe('')
  })
})
