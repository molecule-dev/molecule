/**
 * Tests for the SQLite `RemoteDb` implementation. The real `better-sqlite3`
 * binding is replaced with a hand-rolled mock satisfying {@link SqliteDbLike}.
 */

import { describe, expect, it, vi } from 'vitest'

import { connectRemote } from '../connect.js'
import type { SqliteDbLike, SqliteStatementLike } from '../driverTypes.js'
import { quoteIdentifier } from '../sqlite-client.js'

interface PreparedScript {
  match: (sql: string) => boolean
  reader: boolean
  rows?: unknown[]
  columns?: Array<{ name: string; type: string | null }>
  changes?: number
  /** Override `all()` for time-sensitive tests. */
  all?: (...params: unknown[]) => unknown[]
}

interface SqliteState {
  prepared: PreparedScript[]
  prepareCalls: string[]
  closeCalls: number
}

function makeDb(state: SqliteState): SqliteDbLike {
  return {
    prepare(sql: string): SqliteStatementLike {
      state.prepareCalls.push(sql)
      const script = state.prepared.find((p) => p.match(sql)) ?? {
        match: () => true,
        reader: true,
        rows: [],
        columns: [],
      }
      const stmt: SqliteStatementLike = {
        all(...params: unknown[]): unknown[] {
          if (script.all) return script.all(...params)
          return script.rows ?? []
        },
        run(): { changes: number; lastInsertRowid: number | bigint } {
          return { changes: script.changes ?? 0, lastInsertRowid: 0 }
        },
        raw(): SqliteStatementLike {
          return stmt
        },
        columns(): Array<{ name: string; type: string | null }> {
          return script.columns ?? []
        },
        reader: script.reader,
      }
      return stmt
    },
    pragma(): unknown {
      return undefined
    },
    close(): void {
      state.closeCalls += 1
    },
    readonly: false,
  }
}

function freshState(): SqliteState {
  return { prepared: [], prepareCalls: [], closeCalls: 0 }
}

describe('sqlite RemoteDb — listSchemas / listTables', () => {
  it('listSchemas always returns [{ name: "main" }]', async () => {
    const state = freshState()
    const db = await connectRemote(
      { url: ':memory:', type: 'sqlite' },
      { sqliteFactory: () => makeDb(state) },
    )
    expect(await db.listSchemas()).toEqual([{ name: 'main' }])
  })

  it('listTables filters out sqlite_* internal tables', async () => {
    const state = freshState()
    state.prepared.push({
      match: (sql) => sql.includes('FROM sqlite_master'),
      reader: true,
      rows: [
        { name: 'users', type: 'table' },
        { name: 'sqlite_sequence', type: 'table' },
        { name: 'view_orders', type: 'view' },
      ],
      columns: [
        { name: 'name', type: 'TEXT' },
        { name: 'type', type: 'TEXT' },
      ],
    })
    const db = await connectRemote(
      { url: ':memory:', type: 'sqlite' },
      { sqliteFactory: () => makeDb(state) },
    )
    const tables = await db.listTables()
    expect(tables).toEqual([
      { schema: 'main', name: 'users', type: 'table' },
      { schema: 'main', name: 'view_orders', type: 'view' },
    ])
  })
})

describe('sqlite RemoteDb — describeTable', () => {
  it('returns columns / indexes / FKs from PRAGMAs', async () => {
    const state = freshState()
    // tableExists check
    state.prepared.push({
      match: (sql) => sql.includes('FROM sqlite_master WHERE type'),
      reader: true,
      rows: [{ name: 'users' }],
      columns: [{ name: 'name', type: 'TEXT' }],
    })
    // PRAGMA table_info
    state.prepared.push({
      match: (sql) => sql.startsWith('PRAGMA table_info'),
      reader: true,
      rows: [
        {
          cid: 0,
          name: 'id',
          type: 'INTEGER',
          notnull: 1,
          dflt_value: null,
          pk: 1,
        },
        {
          cid: 1,
          name: 'name',
          type: 'TEXT',
          notnull: 0,
          dflt_value: "'anon'",
          pk: 0,
        },
      ],
      columns: [],
    })
    // PRAGMA index_list
    state.prepared.push({
      match: (sql) => sql.startsWith('PRAGMA index_list'),
      reader: true,
      rows: [{ seq: 0, name: 'idx_users_name', unique: 1 }],
      columns: [],
    })
    // PRAGMA index_info
    state.prepared.push({
      match: (sql) => sql.startsWith('PRAGMA index_info'),
      reader: true,
      rows: [{ seqno: 0, cid: 1, name: 'name' }],
      columns: [],
    })
    // PRAGMA foreign_key_list
    state.prepared.push({
      match: (sql) => sql.startsWith('PRAGMA foreign_key_list'),
      reader: true,
      rows: [
        {
          id: 0,
          seq: 0,
          table: 'orgs',
          from: 'org_id',
          to: 'id',
        },
      ],
      columns: [],
    })

    const db = await connectRemote(
      { url: ':memory:', type: 'sqlite' },
      { sqliteFactory: () => makeDb(state) },
    )
    const schema = await db.describeTable('main', 'users')
    expect(schema.columns).toEqual([
      { name: 'id', dataType: 'INTEGER', nullable: false, primaryKey: true },
      {
        name: 'name',
        dataType: 'TEXT',
        nullable: true,
        primaryKey: false,
        defaultValue: "'anon'",
      },
    ])
    expect(schema.indexes).toEqual([{ name: 'idx_users_name', columns: ['name'], unique: true }])
    expect(schema.foreignKeys).toEqual([
      {
        name: 'fk_0',
        columns: ['org_id'],
        referencedTable: 'orgs',
        referencedColumns: ['id'],
      },
    ])
  })

  it('throws table-not-found when sqlite_master returns no rows', async () => {
    const state = freshState()
    state.prepared.push({
      match: (sql) => sql.includes('FROM sqlite_master WHERE type'),
      reader: true,
      rows: [],
      columns: [],
    })
    const db = await connectRemote(
      { url: ':memory:', type: 'sqlite' },
      { sqliteFactory: () => makeDb(state) },
    )
    await expect(db.describeTable('main', 'nope')).rejects.toMatchObject({
      code: 'table-not-found',
    })
  })
})

describe('sqlite RemoteDb — runQuery', () => {
  it('returns rows for reader=true statements', async () => {
    const state = freshState()
    state.prepared.push({
      match: () => true,
      reader: true,
      rows: [{ x: 1 }, { x: 2 }],
      columns: [{ name: 'x', type: 'INTEGER' }],
    })
    const db = await connectRemote(
      { url: ':memory:', type: 'sqlite' },
      { sqliteFactory: () => makeDb(state) },
    )
    const result = await db.runQuery('SELECT x FROM t')
    expect(result.rows).toEqual([{ x: 1 }, { x: 2 }])
    expect(result.columns).toEqual([{ name: 'x', dataType: 'INTEGER' }])
    expect(result.rowCount).toBe(2)
  })

  it('returns rowCount=changes for non-reader statements', async () => {
    const state = freshState()
    state.prepared.push({
      match: () => true,
      reader: false,
      changes: 4,
    })
    const db = await connectRemote(
      { url: ':memory:', type: 'sqlite' },
      { sqliteFactory: () => makeDb(state) },
    )
    const result = await db.runQuery('UPDATE t SET x=1')
    expect(result.rowCount).toBe(4)
    expect(result.rows).toEqual([])
  })

  it('rejects mutating SQL in readonly mode without preparing', async () => {
    const state = freshState()
    const db = await connectRemote(
      { url: ':memory:', type: 'sqlite', readonly: true },
      { sqliteFactory: () => makeDb(state) },
    )
    await expect(db.runQuery('DELETE FROM t')).rejects.toMatchObject({
      code: 'readonly-violation',
    })
    expect(state.prepareCalls).toHaveLength(0)
  })

  it('truncates rows past maxRows', async () => {
    const state = freshState()
    state.prepared.push({
      match: () => true,
      reader: true,
      rows: [{ x: 1 }, { x: 2 }, { x: 3 }, { x: 4 }],
      columns: [{ name: 'x', type: 'INTEGER' }],
    })
    const db = await connectRemote(
      { url: ':memory:', type: 'sqlite' },
      { sqliteFactory: () => makeDb(state) },
    )
    const result = await db.runQuery('SELECT x FROM t', [], { maxRows: 2 })
    expect(result.rows).toEqual([{ x: 1 }, { x: 2 }])
    expect(result.truncated).toBe(true)
  })

  it('reports timeout when synchronous .all() exceeds timeoutMs', async () => {
    const state = freshState()
    state.prepared.push({
      match: () => true,
      reader: true,
      all: () => {
        const start = Date.now()
        // Block for ~30ms to overshoot a 5ms timeout deterministically.
        while (Date.now() - start < 30) {
          /* spin */
        }
        return []
      },
      columns: [],
    })
    const db = await connectRemote(
      { url: ':memory:', type: 'sqlite' },
      { sqliteFactory: () => makeDb(state) },
    )
    await expect(db.runQuery('SELECT slow()', [], { timeoutMs: 5 })).rejects.toMatchObject({
      code: 'timeout',
    })
  })

  it('wraps engine errors as query-failed', async () => {
    const state = freshState()
    const failingDb: SqliteDbLike = {
      prepare(): SqliteStatementLike {
        throw new Error('SQL syntax error near "X"')
      },
      pragma(): unknown {
        return undefined
      },
      close(): void {
        state.closeCalls += 1
      },
      readonly: false,
    }
    const db = await connectRemote(
      { url: ':memory:', type: 'sqlite' },
      { sqliteFactory: () => failingDb },
    )
    await expect(db.runQuery('XXX')).rejects.toMatchObject({ code: 'query-failed' })
  })

  it('disconnect is idempotent and prevents further calls', async () => {
    const state = freshState()
    const db = await connectRemote(
      { url: ':memory:', type: 'sqlite' },
      { sqliteFactory: () => makeDb(state) },
    )
    await db.disconnect()
    expect(state.closeCalls).toBe(1)
    await db.disconnect()
    expect(state.closeCalls).toBe(1)
    await expect(db.runQuery('SELECT 1')).rejects.toMatchObject({ code: 'not-connected' })
  })
})

describe('quoteIdentifier', () => {
  it('quotes plain identifiers', () => {
    expect(quoteIdentifier('users')).toBe('"users"')
  })

  it('escapes embedded double quotes', () => {
    expect(quoteIdentifier('we"ird')).toBe('"we""ird"')
  })
})
