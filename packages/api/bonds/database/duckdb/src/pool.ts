/**
 * DuckDB `DatabasePool` implementation using `@duckdb/node-api`.
 *
 * @module
 */

// Side-effect import: registers this bond's secret definitions so the
// runtime registry is populated even when pool.js is imported directly
// (not through the package barrel).
import './secrets.js'
import type { DuckDBConnection, DuckDBValue } from '@duckdb/node-api'
import { ResultReturnType } from '@duckdb/node-api'

import { getLogger } from '@molecule/api-bond'
import type {
  DatabaseConnection,
  DatabasePool,
  DatabaseTransaction,
  QueryResult,
} from '@molecule/api-database'
import { getActiveTransaction } from '@molecule/api-database'

import { acquireInstance, type DuckdbInstanceHandle, releaseInstance } from './instances.js'
import type { DuckdbConfig } from './types.js'
import { coerceDuckdbParam, normalizeDuckdbRows } from './utilities.js'

/** Default wait for the single connection. */
const DEFAULT_ACQUIRE_TIMEOUT_MS = 30_000

/** How much of a failing statement the error message carries (whitespace-collapsed). */
const STATEMENT_IN_MESSAGE_CAP = 200

/**
 * Runs `statement` and, when the client throws, names the statement that failed.
 *
 * DuckDB's errors carry no SQL at all (`Catalog Error: Table with name x does
 * not exist!`, `Binder Error: …`) — the same blind spot the sqlite bond patches
 * with `withStatementContext`. The error keeps its class and message; its
 * message gains the statement on one line, and `sql` carries the statement
 * whole. The bound VALUES are never part of either.
 *
 * @param sql - The statement as the driver received it.
 * @param run - Runs the statement and returns its result.
 * @returns Whatever `run` returned.
 */
async function withStatementContext<R>(sql: string, run: () => Promise<R>): Promise<R> {
  try {
    return await run()
  } catch (error) {
    if (error instanceof Error && !(error as { sql?: unknown }).sql) {
      const oneLine = sql.replace(/\s+/g, ' ').trim().slice(0, STATEMENT_IN_MESSAGE_CAP)
      ;(error as { sql?: string }).sql = sql
      error.message = `${error.message} — in: ${oneLine}`
    }
    throw error
  }
}

/**
 * Runs one statement on a connection and normalizes its result into the core
 * `QueryResult` shape. `$1`-style and `?` placeholders pass through to
 * DuckDB untranslated — both are native. With VALUES the client prepares the
 * statement (one statement only); without values a multi-statement string
 * runs in full and the LAST statement's result is returned (the pglite bond's
 * simple-query behavior).
 *
 * `rowCount` follows node-postgres: rows returned for a statement that
 * produced rows (a SELECT, or `INSERT/UPDATE/DELETE … RETURNING` — DuckDB
 * reports 0 changed rows for a RETURNING statement, so the returned rows ARE
 * the affected count), `rowsChanged` for plain DML, `null` for DDL.
 *
 * @param connection - The connection to run on.
 * @param text - SQL with `$1, $2, …` or `?` placeholders.
 * @param values - Positional parameter values (already coerced).
 * @returns The normalized result.
 */
export async function runDuckdbQuery<T = Record<string, unknown>>(
  connection: DuckDBConnection,
  text: string,
  values?: DuckDBValue[],
): Promise<QueryResult<T>> {
  return withStatementContext(text, async (): Promise<QueryResult<T>> => {
    const result =
      values && values.length > 0 ? await connection.run(text, values) : await connection.run(text)
    try {
      if (result.returnType !== ResultReturnType.QUERY_RESULT) {
        // Plain INSERT/UPDATE/DELETE/DDL: no rows to read; rowsChanged is the
        // affected count (0 for DDL).
        return { rows: [] as T[], rowCount: result.rowsChanged }
      }
      const rows = normalizeDuckdbRows<T>(await result.getRowObjectsJS())
      return { rows, rowCount: rows.length }
    } finally {
      // On DuckDB 2.0 an unread streaming result blocks its connection from
      // starting another statement until closed; a materialized result we have
      // fully read can be released eagerly to hand the buffers back.
      result.closeSync()
    }
  })
}

/**
 * Runs one query with caller values, coercing them on the way in.
 *
 * @param connection - The connection to run on.
 * @param text - SQL with `$1, $2, …` or `?` placeholders.
 * @param values - Parameter values as the caller passed them.
 * @returns The normalized result.
 */
async function runWithValues<T = Record<string, unknown>>(
  connection: DuckDBConnection,
  text: string,
  values?: unknown[],
): Promise<QueryResult<T>> {
  return runDuckdbQuery<T>(connection, text, values?.map(coerceDuckdbParam))
}

/**
 * Creates a `DatabasePool` backed by DuckDB.
 *
 * The database opens on first use, not here, so creating a pool is free and
 * synchronous. See {@link DuckdbConfig} for where the file lives and the
 * resource defaults the instance gets.
 *
 * @param config - Database path, resource limits and wait timeout.
 * @returns A pool over one DuckDB connection.
 */
export const createPool = (config?: DuckdbConfig): DatabasePool => {
  const timeout = config?.acquireTimeoutMillis ?? DEFAULT_ACQUIRE_TIMEOUT_MS
  let opening: Promise<{ handle: DuckdbInstanceHandle; connection: DuckDBConnection }> | null = null
  let ended = false

  /**
   * Opens the instance and its pooled connection once, on first use.
   *
   * @returns The instance handle and its connection.
   */
  const open = (): Promise<{ handle: DuckdbInstanceHandle; connection: DuckDBConnection }> => {
    if (!opening) {
      opening = (async () => {
        const handle = await acquireInstance(config)
        const connection = await handle.instance.connect()
        getLogger().debug('DuckDB database opened', { path: handle.path })
        return { handle, connection }
      })()
      // A failed open can be retried by the next call.
      opening.catch((_error) => {
        // The same rejection reaches the caller awaiting `opening`; resetting
        // here only lets a later call try again.
        opening = null
      })
    }
    return opening
  }

  /**
   * Rejects after `end()` — the connection is gone.
   *
   * @returns A rejected promise.
   */
  const refuseEnded = (): Promise<never> =>
    Promise.reject(new Error('DuckDB: this pool has been ended'))

  // Transactions this pool opened: a `query()` made inside `withTransaction()`
  // runs on the active one when it is ours.
  const ownTransactions = new WeakSet<DatabaseTransaction>()

  const pool: DatabasePool = {
    async query<T = Record<string, unknown>>(
      text: string,
      values?: unknown[],
    ): Promise<QueryResult<T>> {
      if (ended) return refuseEnded()
      const active = getActiveTransaction()
      if (active && ownTransactions.has(active)) return active.query<T>(text, values)
      const { handle, connection } = await open()
      const release = await handle.lock.acquire('query', timeout)
      try {
        return await runWithValues<T>(connection, text, values)
      } finally {
        release()
      }
    },

    async connect(): Promise<DatabaseConnection> {
      if (ended) return refuseEnded()
      const { handle, connection } = await open()
      const release = await handle.lock.acquire('connect()', timeout)
      let released = false
      return {
        async query<T = Record<string, unknown>>(text: string, values?: unknown[]) {
          if (released) throw new Error('DuckDB: query on a released connection')
          return runWithValues<T>(connection, text, values)
        },
        release() {
          released = true
          release()
        },
      }
    },

    async transaction(): Promise<DatabaseTransaction> {
      if (ended) return refuseEnded()
      const { handle, connection } = await open()
      // Hold the lock for the WHOLE transaction lifetime (BEGIN → … →
      // COMMIT/ROLLBACK) — a concurrent transaction() or plain query() call
      // queues behind this one instead of racing BEGIN or conflicting with it.
      const release = await handle.lock.acquire('transaction()', timeout)
      let done = false
      const finish = (): void => {
        done = true
        release()
      }
      try {
        await runDuckdbQuery(connection, 'BEGIN')
      } catch (error) {
        finish()
        throw error
      }
      const tx: DatabaseTransaction = {
        async query<T = Record<string, unknown>>(text: string, values?: unknown[]) {
          if (done) throw new Error('DuckDB: query on a finished transaction')
          // Already holds the lock — run directly, do NOT re-acquire.
          return runWithValues<T>(connection, text, values)
        },
        release() {
          // Matches the pglite bond: returns the connection WITHOUT ending the
          // transaction. Roll back first so the connection is clean for the
          // next caller.
          if (done) return
          done = true
          runDuckdbQuery(connection, 'ROLLBACK')
            .catch((error: unknown) => {
              // Nothing awaits release(); surface the failure instead of hiding it.
              getLogger().error('DuckDB: rollback on transaction release() failed', { error })
            })
            .finally(release)
        },
        async commit() {
          if (done) return
          try {
            await runDuckdbQuery(connection, 'COMMIT')
          } finally {
            finish()
          }
        },
        async rollback() {
          if (done) return
          try {
            await runDuckdbQuery(connection, 'ROLLBACK')
          } finally {
            finish()
          }
        },
      }
      ownTransactions.add(tx)
      return tx
    },

    async end() {
      if (ended) return
      ended = true
      if (!opening) return
      const { handle, connection } = await opening
      // Let queued and open work finish before closing — but do not hang
      // shutdown forever on a connection somebody never released.
      let release: (() => void) | undefined
      try {
        release = await handle.lock.acquire('end()', timeout)
      } catch (error) {
        getLogger().warn('DuckDB: closing the pool while its connection is still held', { error })
      }
      try {
        connection.disconnectSync()
        releaseInstance(handle)
      } finally {
        release?.()
      }
      getLogger().debug('DuckDB database closed', { path: handle.path })
    },

    stats() {
      // This pool owns exactly one connection. Before first use the lock does
      // not exist yet, and forcing a connection just to answer stats() would
      // be wrong — report the idle pool; once open, waiting queries surface
      // through the lock's timeout error instead.
      return { total: 1, idle: 1, waiting: 0 }
    },
  }

  return pool
}
