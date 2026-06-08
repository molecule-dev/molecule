/**
 * MySQL implementation of {@link RemoteDb}, backed by a `mysql2/promise` pool.
 *
 * @module
 */

import type {
  MysqlField,
  MysqlOkPacket,
  MysqlPoolFactory,
  MysqlPoolLike,
  MysqlRow,
} from './driverTypes.js'
import { isMutating } from './keywords.js'
import { collectForeignKeys, collectIndexes, raceWithTimeout } from './pg-client.js'
import {
  type ColumnSchema,
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
 * Build a {@link RemoteDb} backed by a `mysql2/promise` pool. The pool is
 * owned by the returned handle — `disconnect()` calls `pool.end()`.
 *
 * @param pool - Connected mysql2 pool.
 * @param defaultDb - Database name parsed from the connection URI; used as
 *   the default `schema` for {@link RemoteDb.listTables} when none is supplied.
 * @param readonly - When `true`, mutating SQL is rejected before the pool
 *   sees it.
 */
export function createMysqlRemoteDb(
  pool: MysqlPoolLike,
  defaultDb: string,
  readonly: boolean,
): RemoteDb {
  let connected = true

  const ensureConnected = (): void => {
    if (!connected) {
      throw new RemoteDbError('not-connected', 'RemoteDb has been disconnected')
    }
  }

  const queryRaw = async <T = MysqlRow>(
    sql: string,
    params: unknown[] | undefined,
    timeoutMs: number,
  ): Promise<{ rows: T[]; fields: MysqlField[]; affectedRows: number; isOk: boolean }> => {
    const queryPromise = pool.query(sql, params)
    const result = await raceWithTimeout(queryPromise, timeoutMs, () => {
      // mysql2 doesn't expose a per-query cancel; the pool will surface
      // the timeout when the handle reports back. Nothing to do here.
    })
    const [rowsOrPacket, fields] = result
    if (Array.isArray(rowsOrPacket)) {
      return {
        rows: rowsOrPacket as T[],
        fields: fields ?? [],
        affectedRows: rowsOrPacket.length,
        isOk: false,
      }
    }
    const ok = rowsOrPacket as MysqlOkPacket
    return {
      rows: [],
      fields: fields ?? [],
      affectedRows: ok.affectedRows ?? 0,
      isOk: true,
    }
  }

  const runQuery = async (
    sql: string,
    params?: unknown[],
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
      const { rows: allRows, fields, affectedRows, isOk } = await queryRaw(sql, params, timeoutMs)
      const truncated = allRows.length > maxRows
      const rows = truncated ? allRows.slice(0, maxRows) : allRows

      const columns: QueryColumn[] = fields.map((field) => ({
        name: field.name,
        ...(field.columnType !== undefined ? { dataType: String(field.columnType) } : {}),
      }))

      const queryResult: QueryResult = {
        columns,
        rows,
        rowCount: isOk ? affectedRows : rows.length,
        executionTimeMs: Date.now() - start,
      }
      if (truncated) queryResult.truncated = true
      return queryResult
    } catch (error) {
      if (error instanceof RemoteDbError) throw error
      const message = error instanceof Error ? error.message : String(error)
      const code: 'timeout' | 'query-failed' = /timeout/i.test(message) ? 'timeout' : 'query-failed'
      throw new RemoteDbError(code, `MySQL query failed: ${message}`, { cause: error })
    }
  }

  const listSchemas = async (): Promise<SchemaInfo[]> => {
    ensureConnected()
    const { rows } = await queryRaw<{ SCHEMA_NAME: string }>(
      `SELECT SCHEMA_NAME
         FROM information_schema.SCHEMATA
        WHERE SCHEMA_NAME NOT IN ('mysql', 'information_schema', 'performance_schema', 'sys')
        ORDER BY SCHEMA_NAME`,
      undefined,
      DEFAULT_TIMEOUT_MS,
    )
    return rows.map((row) => ({ name: row.SCHEMA_NAME }))
  }

  const listTables = async (schema?: string): Promise<TableInfo[]> => {
    ensureConnected()
    const target = schema ?? defaultDb
    const { rows } = await queryRaw<{
      TABLE_SCHEMA: string
      TABLE_NAME: string
      TABLE_TYPE: string
    }>(
      `SELECT TABLE_SCHEMA, TABLE_NAME, TABLE_TYPE
         FROM information_schema.TABLES
        WHERE TABLE_SCHEMA = ?
        ORDER BY TABLE_NAME`,
      [target],
      DEFAULT_TIMEOUT_MS,
    )
    return rows.map((row) => ({
      schema: row.TABLE_SCHEMA,
      name: row.TABLE_NAME,
      type: row.TABLE_TYPE === 'VIEW' ? 'view' : 'table',
    }))
  }

  const describeTable = async (schemaName: string, tableName: string): Promise<TableSchema> => {
    ensureConnected()
    const exists = await queryRaw<{ count: number }>(
      `SELECT COUNT(*) AS count
         FROM information_schema.TABLES
        WHERE TABLE_SCHEMA = ? AND TABLE_NAME = ?`,
      [schemaName, tableName],
      DEFAULT_TIMEOUT_MS,
    )
    if (!exists.rows[0] || Number(exists.rows[0].count) === 0) {
      throw new RemoteDbError('table-not-found', `Table not found: ${schemaName}.${tableName}`)
    }

    const cols = await queryRaw<{
      COLUMN_NAME: string
      COLUMN_TYPE: string
      IS_NULLABLE: string
      COLUMN_DEFAULT: string | null
      COLUMN_KEY: string
    }>(
      `SELECT COLUMN_NAME, COLUMN_TYPE, IS_NULLABLE, COLUMN_DEFAULT, COLUMN_KEY
         FROM information_schema.COLUMNS
        WHERE TABLE_SCHEMA = ? AND TABLE_NAME = ?
        ORDER BY ORDINAL_POSITION`,
      [schemaName, tableName],
      DEFAULT_TIMEOUT_MS,
    )
    const columns: ColumnSchema[] = cols.rows.map((row) => {
      const column: ColumnSchema = {
        name: row.COLUMN_NAME,
        dataType: row.COLUMN_TYPE,
        nullable: row.IS_NULLABLE === 'YES',
        primaryKey: row.COLUMN_KEY === 'PRI',
      }
      if (row.COLUMN_DEFAULT !== null) column.defaultValue = row.COLUMN_DEFAULT
      return column
    })

    const idx = await queryRaw<{
      INDEX_NAME: string
      COLUMN_NAME: string
      NON_UNIQUE: number
      SEQ_IN_INDEX: number
    }>(
      `SELECT INDEX_NAME, COLUMN_NAME, NON_UNIQUE, SEQ_IN_INDEX
         FROM information_schema.STATISTICS
        WHERE TABLE_SCHEMA = ? AND TABLE_NAME = ?
        ORDER BY INDEX_NAME, SEQ_IN_INDEX`,
      [schemaName, tableName],
      DEFAULT_TIMEOUT_MS,
    )
    const indexes = collectIndexes(
      idx.rows.map((row) => ({
        index_name: row.INDEX_NAME,
        column_name: row.COLUMN_NAME,
        is_unique: Number(row.NON_UNIQUE) === 0,
      })),
    )

    const fk = await queryRaw<{
      CONSTRAINT_NAME: string
      COLUMN_NAME: string
      REFERENCED_TABLE_SCHEMA: string
      REFERENCED_TABLE_NAME: string
      REFERENCED_COLUMN_NAME: string
      ORDINAL_POSITION: number
    }>(
      `SELECT CONSTRAINT_NAME, COLUMN_NAME, REFERENCED_TABLE_SCHEMA,
              REFERENCED_TABLE_NAME, REFERENCED_COLUMN_NAME, ORDINAL_POSITION
         FROM information_schema.KEY_COLUMN_USAGE
        WHERE TABLE_SCHEMA = ?
          AND TABLE_NAME = ?
          AND REFERENCED_TABLE_NAME IS NOT NULL
        ORDER BY CONSTRAINT_NAME, ORDINAL_POSITION`,
      [schemaName, tableName],
      DEFAULT_TIMEOUT_MS,
    )
    const foreignKeys = collectForeignKeys(
      fk.rows.map((row) => ({
        constraint_name: row.CONSTRAINT_NAME,
        column_name: row.COLUMN_NAME,
        foreign_schema: row.REFERENCED_TABLE_SCHEMA,
        foreign_table: row.REFERENCED_TABLE_NAME,
        foreign_column: row.REFERENCED_COLUMN_NAME,
      })),
    )

    return {
      schema: schemaName,
      name: tableName,
      columns,
      indexes,
      foreignKeys,
    }
  }

  const disconnect = async (): Promise<void> => {
    if (!connected) return
    connected = false
    try {
      await pool.end()
    } catch (_error) {
      // best-effort cleanup — pool.end() failing is non-fatal because
      // `connected` is already false and no further queries will be issued
    }
  }

  return {
    type: 'mysql',
    readonly,
    listSchemas,
    listTables,
    describeTable,
    runQuery,
    disconnect,
  }
}

/**
 * Lazy-import `mysql2/promise.createPool`. Throws
 * {@link RemoteDbError} `code === 'driver-not-installed'` when the driver
 * is missing.
 *
 * @internal
 */
export async function defaultMysqlPoolFactory(): Promise<MysqlPoolFactory> {
  let mod: {
    createPool: (cfg: {
      uri: string
      connectionLimit?: number
      multipleStatements?: false
    }) => MysqlPoolLike
  }
  try {
    mod = (await import('mysql2/promise')) as unknown as typeof mod
  } catch (error) {
    throw new RemoteDbError(
      'driver-not-installed',
      "MySQL driver 'mysql2' is not installed — add it to host-project dependencies",
      { cause: error },
    )
  }
  return (config) => mod.createPool(config)
}

/**
 * Extract the database name from a `mysql://user:pass@host:port/db` URI.
 * Returns an empty string if the URI has no path.
 *
 * @param uri
 * @internal
 */
export function parseMysqlDatabase(uri: string): string {
  try {
    const parsed = new URL(uri)
    const path = parsed.pathname
    if (!path || path === '/') return ''
    return decodeURIComponent(path.startsWith('/') ? path.slice(1) : path)
  } catch (_error) {
    // URI is not parseable — return empty string as a safe default
    return ''
  }
}
