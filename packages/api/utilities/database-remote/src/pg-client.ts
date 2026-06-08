/**
 * PostgreSQL implementation of {@link RemoteDb}, backed by an `pg.Pool`.
 *
 * @module
 */

import type { PgPoolFactory, PgPoolLike } from './driverTypes.js'
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

/**
 * Default per-query timeout in milliseconds — applied when
 * {@link RunQueryOptions.timeoutMs} is not set.
 */
export const DEFAULT_TIMEOUT_MS = 30_000
/**
 * Default cap on rows returned by a single {@link RemoteDb.runQuery} call.
 * Excess rows are dropped and `truncated: true` is set on the result.
 */
export const DEFAULT_MAX_ROWS = 1_000
/** Default `pg.Pool` size for remote inspection connections. */
export const DEFAULT_POOL_SIZE = 4

/**
 * Build a {@link RemoteDb} backed by a `pg.Pool`.
 *
 * @param pool - Connected pool. Ownership transfers — the caller must NOT
 *   keep a reference to the pool, as `disconnect()` will drain it.
 * @param readonly - When `true`, mutating SQL is rejected before the pool
 *   sees it.
 * @returns A connected handle.
 */
export function createPgRemoteDb(pool: PgPoolLike, readonly: boolean): RemoteDb {
  let connected = true

  const ensureConnected = (): void => {
    if (!connected) {
      throw new RemoteDbError('not-connected', 'RemoteDb has been disconnected')
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
    const client = await pool.connect()
    try {
      // Statement-level timeout enforced by Postgres itself — guarantees
      // the server stops work even if the Node-side promise leaks.
      await client.query(`SET statement_timeout = ${Math.max(1, Math.floor(timeoutMs))}`)
      // Server-side LIMIT — but we still cap on the Node side because it
      // applies to the materialized result, not the wire format.
      const queryPromise = client.query(sql, params)
      const result = await raceWithTimeout(queryPromise, timeoutMs, () => {
        // Defensive: release the client with an error so pg discards it.
        try {
          client.release(new Error('query timeout'))
        } catch (_error) {
          // ignore — release errors shouldn't surface a second time
        }
      })

      const allRows = result.rows ?? []
      const truncated = allRows.length > maxRows
      const rows = truncated ? allRows.slice(0, maxRows) : allRows

      const columns: QueryColumn[] = (result.fields ?? []).map((field) => ({
        name: field.name,
        ...(field.dataTypeID !== undefined ? { dataType: String(field.dataTypeID) } : {}),
      }))

      const queryResult: QueryResult = {
        columns,
        rows,
        rowCount: typeof result.rowCount === 'number' ? result.rowCount : rows.length,
        executionTimeMs: Date.now() - start,
      }
      if (truncated) queryResult.truncated = true
      return queryResult
    } catch (error) {
      if (error instanceof RemoteDbError) throw error
      const message = error instanceof Error ? error.message : String(error)
      const code: 'timeout' | 'query-failed' = /timeout/i.test(message) ? 'timeout' : 'query-failed'
      throw new RemoteDbError(code, `Postgres query failed: ${message}`, { cause: error })
    } finally {
      try {
        client.release()
      } catch (_error) {
        // ignore — double-release after a successful query; pg discards it
      }
    }
  }

  const listSchemas = async (): Promise<SchemaInfo[]> => {
    ensureConnected()
    const result = await pool.query<{ nspname: string }>(
      `SELECT nspname
         FROM pg_catalog.pg_namespace
        WHERE nspname NOT IN ('pg_catalog', 'information_schema', 'pg_toast')
          AND nspname NOT LIKE 'pg_temp_%'
          AND nspname NOT LIKE 'pg_toast_temp_%'
        ORDER BY nspname`,
    )
    return result.rows.map((row) => ({ name: row.nspname }))
  }

  const listTables = async (schema?: string): Promise<TableInfo[]> => {
    ensureConnected()
    const target = schema ?? 'public'
    const result = await pool.query<{
      table_schema: string
      table_name: string
      table_type: string
    }>(
      `SELECT table_schema, table_name, table_type
         FROM information_schema.tables
        WHERE table_schema = $1
        ORDER BY table_name`,
      [target],
    )
    return result.rows.map((row) => ({
      schema: row.table_schema,
      name: row.table_name,
      type: row.table_type === 'VIEW' ? 'view' : 'table',
    }))
  }

  const describeTable = async (schemaName: string, tableName: string): Promise<TableSchema> => {
    ensureConnected()
    const existsResult = await pool.query<{ count: string }>(
      `SELECT COUNT(*)::text AS count
         FROM information_schema.tables
        WHERE table_schema = $1 AND table_name = $2`,
      [schemaName, tableName],
    )
    if (!existsResult.rows[0] || Number(existsResult.rows[0].count) === 0) {
      throw new RemoteDbError('table-not-found', `Table not found: ${schemaName}.${tableName}`)
    }

    const columnsResult = await pool.query<{
      column_name: string
      data_type: string
      is_nullable: string
      column_default: string | null
      character_maximum_length: number | null
    }>(
      `SELECT column_name, data_type, is_nullable, column_default, character_maximum_length
         FROM information_schema.columns
        WHERE table_schema = $1 AND table_name = $2
        ORDER BY ordinal_position`,
      [schemaName, tableName],
    )

    const pkResult = await pool.query<{ column_name: string }>(
      `SELECT kcu.column_name
         FROM information_schema.table_constraints tc
         JOIN information_schema.key_column_usage kcu
           ON kcu.constraint_name = tc.constraint_name
          AND kcu.table_schema = tc.table_schema
        WHERE tc.table_schema = $1
          AND tc.table_name = $2
          AND tc.constraint_type = 'PRIMARY KEY'
        ORDER BY kcu.ordinal_position`,
      [schemaName, tableName],
    )
    const pkColumns = new Set(pkResult.rows.map((row) => row.column_name))

    const columns: ColumnSchema[] = columnsResult.rows.map((row) => {
      const dataType =
        row.character_maximum_length != null
          ? `${row.data_type}(${row.character_maximum_length})`
          : row.data_type
      const column: ColumnSchema = {
        name: row.column_name,
        dataType,
        nullable: row.is_nullable === 'YES',
        primaryKey: pkColumns.has(row.column_name),
      }
      if (row.column_default !== null) column.defaultValue = row.column_default
      return column
    })

    const indexResult = await pool.query<{
      index_name: string
      column_name: string
      is_unique: boolean
      ordinality: number
    }>(
      `SELECT i.relname  AS index_name,
              a.attname  AS column_name,
              ix.indisunique AS is_unique,
              k.n        AS ordinality
         FROM pg_class t
         JOIN pg_index ix       ON ix.indrelid = t.oid
         JOIN pg_class i        ON i.oid       = ix.indexrelid
         JOIN pg_namespace n    ON n.oid       = t.relnamespace
         JOIN LATERAL unnest(ix.indkey) WITH ORDINALITY AS k(attnum, n) ON TRUE
         JOIN pg_attribute a    ON a.attrelid = t.oid AND a.attnum = k.attnum
        WHERE n.nspname = $1
          AND t.relname = $2
        ORDER BY i.relname, k.n`,
      [schemaName, tableName],
    )
    const indexes = collectIndexes(indexResult.rows)

    const fkResult = await pool.query<{
      constraint_name: string
      column_name: string
      foreign_schema: string
      foreign_table: string
      foreign_column: string
      ordinal_position: number
    }>(
      `SELECT tc.constraint_name,
              kcu.column_name,
              ccu.table_schema AS foreign_schema,
              ccu.table_name   AS foreign_table,
              ccu.column_name  AS foreign_column,
              kcu.ordinal_position
         FROM information_schema.table_constraints tc
         JOIN information_schema.key_column_usage kcu
           ON kcu.constraint_name = tc.constraint_name
          AND kcu.table_schema = tc.table_schema
         JOIN information_schema.constraint_column_usage ccu
           ON ccu.constraint_name = tc.constraint_name
          AND ccu.table_schema = tc.table_schema
        WHERE tc.constraint_type = 'FOREIGN KEY'
          AND tc.table_schema = $1
          AND tc.table_name   = $2
        ORDER BY tc.constraint_name, kcu.ordinal_position`,
      [schemaName, tableName],
    )
    const foreignKeys = collectForeignKeys(fkResult.rows)

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
      // ignore — closing a closed pool shouldn't surface
    }
  }

  return {
    type: 'postgresql',
    readonly,
    listSchemas,
    listTables,
    describeTable,
    runQuery,
    disconnect,
  }
}

/**
 * Construct the default `pg.Pool` factory by lazy-importing `pg`. Throws
 * {@link RemoteDbError} `code === 'driver-not-installed'` if the driver
 * is not installed in the host project.
 *
 * @internal
 */
export async function defaultPgPoolFactory(): Promise<PgPoolFactory> {
  let mod: { Pool: new (cfg: { connectionString: string; max?: number }) => PgPoolLike }
  try {
    mod = (await import('pg')) as unknown as typeof mod
  } catch (error) {
    throw new RemoteDbError(
      'driver-not-installed',
      "Postgres driver 'pg' is not installed — add it to host-project dependencies",
      { cause: error },
    )
  }
  return (config) => new mod.Pool(config)
}

/**
 * Aggregate flat per-column index rows into a deduplicated list of {@link IndexSchema} objects.
 *
 * @param rows
 * @internal
 */
export function collectIndexes(
  rows: Array<{ index_name: string; column_name: string; is_unique: boolean }>,
): IndexSchema[] {
  const map = new Map<string, IndexSchema>()
  for (const row of rows) {
    let entry = map.get(row.index_name)
    if (!entry) {
      entry = { name: row.index_name, columns: [], unique: row.is_unique }
      map.set(row.index_name, entry)
    }
    entry.columns.push(row.column_name)
  }
  return [...map.values()]
}

/**
 * Aggregate flat per-column foreign-key rows into a deduplicated list of {@link ForeignKeySchema} objects.
 *
 * @param rows
 * @internal
 */
export function collectForeignKeys(
  rows: Array<{
    constraint_name: string
    column_name: string
    foreign_schema: string
    foreign_table: string
    foreign_column: string
  }>,
): ForeignKeySchema[] {
  const map = new Map<string, ForeignKeySchema>()
  for (const row of rows) {
    let entry = map.get(row.constraint_name)
    if (!entry) {
      entry = {
        name: row.constraint_name,
        columns: [],
        referencedSchema: row.foreign_schema,
        referencedTable: row.foreign_table,
        referencedColumns: [],
      }
      map.set(row.constraint_name, entry)
    }
    entry.columns.push(row.column_name)
    entry.referencedColumns.push(row.foreign_column)
  }
  return [...map.values()]
}

/**
 * Race a promise against a timeout. The `onTimeout` hook fires once when
 * the timeout wins so the caller can release driver-level resources.
 *
 * @param promise
 * @param timeoutMs
 * @param onTimeout
 * @internal
 */
export function raceWithTimeout<T>(
  promise: Promise<T>,
  timeoutMs: number,
  onTimeout: () => void,
): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => {
      onTimeout()
      reject(new RemoteDbError('timeout', `Query exceeded ${timeoutMs}ms timeout`))
    }, timeoutMs)
    promise.then(
      (value) => {
        clearTimeout(timer)
        resolve(value)
      },
      (error: unknown) => {
        clearTimeout(timer)
        reject(error as Error)
      },
    )
  })
}
