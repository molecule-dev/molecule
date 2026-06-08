/**
 * SQLite implementation of {@link RemoteDb}, backed by a `better-sqlite3`
 * synchronous database handle. Calls are wrapped in resolved promises so
 * the public surface stays uniform with the Postgres / MySQL clients.
 *
 * @module
 */

import type { SqliteDbFactory, SqliteDbLike } from './driverTypes.js'
import { isMutating } from './keywords.js'
import {
  type ColumnSchema,
  type ForeignKeySchema,
  type IndexSchema,
  type QueryColumn,
  type QueryResult,
  type RemoteDb,
  RemoteDbError,
  type RunQueryOptions,
  type SchemaInfo,
  type TableInfo,
  type TableSchema,
} from './types.js'

const DEFAULT_TIMEOUT_MS = 30_000
const DEFAULT_MAX_ROWS = 1_000

/**
 * Build a {@link RemoteDb} backed by a `better-sqlite3` database handle.
 * Ownership transfers — `disconnect()` calls `db.close()`.
 * @param db
 * @param readonly
 */
export function createSqliteRemoteDb(db: SqliteDbLike, readonly: boolean): RemoteDb {
  let connected = true

  const ensureConnected = (): void => {
    if (!connected) {
      throw new RemoteDbError('not-connected', 'RemoteDb has been disconnected')
    }
  }

  const runQuery = async (
    sql: string,
    params: unknown[] = [],
    opts: RunQueryOptions = {},
  ): Promise<QueryResult> => {
    ensureConnected()
    if (readonly && isMutating(sql)) {
      throw new RemoteDbError(
        'readonly-violation',
        'RemoteDb opened in readonly mode rejected a mutating statement',
      )
    }

    const timeoutMs = opts.timeoutMs ?? DEFAULT_TIMEOUT_MS
    const maxRows = opts.maxRows ?? DEFAULT_MAX_ROWS
    const start = Date.now()

    try {
      const stmt = db.prepare(sql)
      // `reader` is `true` for SELECT-style statements that produce columns.
      if (stmt.reader) {
        // `better-sqlite3` runs statements synchronously and offers no
        // server-side cancellation. We honour `timeoutMs` by checking
        // post-hoc — slow queries surface as a `timeout` error after the
        // fact, which is the best we can do without forking a worker.
        const allRows = stmt.all(...params) as Array<Record<string, unknown>>
        const elapsed = Date.now() - start
        if (elapsed > timeoutMs) {
          throw new RemoteDbError(
            'timeout',
            `SQLite query exceeded ${timeoutMs}ms timeout (took ${elapsed}ms)`,
          )
        }
        const truncated = allRows.length > maxRows
        const rows = truncated ? allRows.slice(0, maxRows) : allRows
        const columnInfo = stmt.columns()
        const columns: QueryColumn[] = columnInfo.map((col) => ({
          name: col.name,
          ...(col.type ? { dataType: col.type } : {}),
        }))
        const result: QueryResult = {
          columns,
          rows,
          rowCount: rows.length,
          executionTimeMs: elapsed,
        }
        if (truncated) result.truncated = true
        return result
      }
      const info = stmt.run(...params)
      const elapsed = Date.now() - start
      if (elapsed > timeoutMs) {
        throw new RemoteDbError(
          'timeout',
          `SQLite query exceeded ${timeoutMs}ms timeout (took ${elapsed}ms)`,
        )
      }
      return {
        columns: [],
        rows: [],
        rowCount: typeof info.changes === 'number' ? info.changes : 0,
        executionTimeMs: elapsed,
      }
    } catch (error) {
      if (error instanceof RemoteDbError) throw error
      const message = error instanceof Error ? error.message : String(error)
      throw new RemoteDbError('query-failed', `SQLite query failed: ${message}`, { cause: error })
    }
  }

  const listSchemas = async (): Promise<SchemaInfo[]> => {
    ensureConnected()
    return [{ name: 'main' }]
  }

  const listTables = async (_schema?: string): Promise<TableInfo[]> => {
    ensureConnected()
    const result = await runQuery(
      `SELECT name, type FROM sqlite_master WHERE type IN ('table', 'view') ORDER BY name`,
    )
    return result.rows
      .filter((row) => typeof row.name === 'string' && !String(row.name).startsWith('sqlite_'))
      .map((row) => ({
        schema: 'main',
        name: String(row.name),
        type: row.type === 'view' ? 'view' : 'table',
      }))
  }

  const describeTable = async (_schemaName: string, tableName: string): Promise<TableSchema> => {
    ensureConnected()
    const tableExists = await runQuery(
      `SELECT name FROM sqlite_master WHERE type IN ('table', 'view') AND name = ?`,
      [tableName],
    )
    if (tableExists.rows.length === 0) {
      throw new RemoteDbError('table-not-found', `Table not found: main.${tableName}`)
    }

    const columnsRes = await runQuery(`PRAGMA table_info(${quoteIdentifier(tableName)})`)
    const columns: ColumnSchema[] = columnsRes.rows.map((row) => {
      const column: ColumnSchema = {
        name: String(row.name),
        dataType: String(row.type ?? ''),
        nullable: Number(row.notnull) === 0,
        primaryKey: Number(row.pk) > 0,
      }
      if (row.dflt_value !== null && row.dflt_value !== undefined) {
        column.defaultValue = String(row.dflt_value)
      }
      return column
    })

    const indexListRes = await runQuery(`PRAGMA index_list(${quoteIdentifier(tableName)})`)
    const indexes: IndexSchema[] = []
    for (const row of indexListRes.rows) {
      const indexName = String(row.name)
      const indexInfoRes = await runQuery(`PRAGMA index_info(${quoteIdentifier(indexName)})`)
      indexes.push({
        name: indexName,
        unique: Number(row.unique) === 1,
        columns: indexInfoRes.rows.map((info) => String(info.name)),
      })
    }

    const fkRes = await runQuery(`PRAGMA foreign_key_list(${quoteIdentifier(tableName)})`)
    const fkMap = new Map<string, ForeignKeySchema>()
    for (const row of fkRes.rows) {
      const id = String(row.id)
      let entry = fkMap.get(id)
      if (!entry) {
        entry = {
          name: `fk_${id}`,
          columns: [],
          referencedTable: String(row.table),
          referencedColumns: [],
        }
        fkMap.set(id, entry)
      }
      entry.columns.push(String(row.from))
      entry.referencedColumns.push(String(row.to))
    }

    return {
      schema: 'main',
      name: tableName,
      columns,
      indexes,
      foreignKeys: [...fkMap.values()],
    }
  }

  const disconnect = async (): Promise<void> => {
    if (!connected) return
    connected = false
    try {
      db.close()
    } catch (_error) {
      // db.close() may throw if the handle is already closed — safe to ignore
      // because we are tearing down and the resource is gone either way.
    }
  }

  return {
    type: 'sqlite',
    readonly,
    listSchemas,
    listTables,
    describeTable,
    runQuery,
    disconnect,
  }
}

/**
 * Quote a SQLite identifier (schema, table, index name). PRAGMA statements
 * do NOT accept bound parameters, so callers must inline names — quoting
 * is the only defence against injection.
 *
 * @param name
 * @internal
 */
export function quoteIdentifier(name: string): string {
  return `"${name.replace(/"/g, '""')}"`
}

/**
 * Lazy-import `better-sqlite3`. Throws
 * {@link RemoteDbError} `code === 'driver-not-installed'` when missing.
 *
 * @internal
 */
export async function defaultSqliteFactory(): Promise<SqliteDbFactory> {
  let mod: { default: SqliteDbFactory } | { ['default']: unknown }
  try {
    mod = (await import('better-sqlite3')) as unknown as { default: SqliteDbFactory }
  } catch (error) {
    throw new RemoteDbError(
      'driver-not-installed',
      "SQLite driver 'better-sqlite3' is not installed — add it to host-project dependencies",
      { cause: error },
    )
  }
  const ctor = (mod as { default: unknown }).default ?? (mod as unknown)
  return ctor as SqliteDbFactory
}
