/**
 * MotherDuck `DatabasePool` implementation — hosted DuckDB reached through
 * the same `@duckdb/node-api` client with an `md:` connection string.
 *
 * @module
 */

// Side-effect import: registers this bond's secret definitions so the
// runtime registry is populated even when pool.js is imported directly
// (not through the package barrel).
import './secrets.js'
import { type DuckDBConnection, DuckDBInstance } from '@duckdb/node-api'

import { getLogger } from '@molecule/api-bond'
import type {
  DatabaseConnection,
  DatabasePool,
  DatabaseTransaction,
  QueryResult,
} from '@molecule/api-database'
import { getActiveTransaction } from '@molecule/api-database'
// Subpath imports (not the barrel) so importing this bond does NOT fire the
// duckdb bond's own lifecycle registration on its default pool — the same
// rule the d1 bond follows for @molecule/api-database-sqlite.
import { runDuckdbQuery } from '@molecule/api-database-duckdb/pool.js'
import { ConnectionLock } from '@molecule/api-database-duckdb/queue.js'
import { coerceDuckdbParam } from '@molecule/api-database-duckdb/utilities.js'
import { configNotConfiguredError } from '@molecule/api-secrets'

import type { MotherduckConfig } from './types.js'

/** Default wait for the single connection. */
const DEFAULT_ACQUIRE_TIMEOUT_MS = 30_000

/** The connection string when nothing is configured. */
const DEFAULT_CONNECTION_STRING = 'md:'

/** The env var this bond reads the token from by default. */
export const DEFAULT_TOKEN_ENV = 'MOTHERDUCK_TOKEN'

/**
 * Resolve the `md:` connection string: config, then `MOTHERDUCK_DATABASE`,
 * then `md:`.
 *
 * @param config - Pool configuration.
 * @returns The connection string.
 */
export function chooseConnectionString(config?: MotherduckConfig): string {
  if (config?.connectionString) return config.connectionString
  return process.env.MOTHERDUCK_DATABASE ?? DEFAULT_CONNECTION_STRING
}

/**
 * Resolve the token from config or the env var, lazily — never at import time.
 * `undefined` when the caller must fall back to the client's own auto-read of
 * a lowercase `motherduck_token` env var.
 *
 * @param config - Pool configuration.
 * @returns The token, or `undefined` when nothing is set.
 */
export function resolveToken(config?: MotherduckConfig): string | undefined {
  if (config?.token) return config.token
  const env = config?.tokenEnv ?? DEFAULT_TOKEN_ENV
  return process.env[env] ?? undefined
}

/**
 * Creates a `DatabasePool` backed by MotherDuck.
 *
 * The connection opens on first use, not here, so creating a pool is free and
 * synchronous. The instance is opened through `DuckDBInstance.fromCache` —
 * mandatory per MotherDuck's docs: the Node client does NOT cache instances
 * by default, and every bare `create('md:…')` re-fetches the catalog.
 *
 * @param config - Connection string, token and wait timeout.
 * @returns A pool over one long-lived MotherDuck connection.
 */
export const createPool = (config?: MotherduckConfig): DatabasePool => {
  const timeout = config?.acquireTimeoutMillis ?? DEFAULT_ACQUIRE_TIMEOUT_MS
  let opening: Promise<{ connection: DuckDBConnection; lock: ConnectionLock }> | null = null
  let ended = false

  /**
   * Opens the instance and its pooled connection once, on first use.
   *
   * @returns The connection and its lock.
   */
  const open = async (): Promise<{ connection: DuckDBConnection; lock: ConnectionLock }> => {
    if (!opening) {
      opening = (async () => {
        const connectionString = chooseConnectionString(config)
        const token = resolveToken(config)
        // A configured-but-missing token is an actionable config error, not an
        // opaque vendor 401 — unless the client's own lowercase-env auto-read
        // can supply it.
        const clientAutoreads = process.env.motherduck_token != null
        if (!token && !clientAutoreads) {
          throw configNotConfiguredError('MOTHERDUCK_TOKEN', 'the MotherDuck database')
        }
        const options: Record<string, string> = {
          ...(token ? { motherduck_token: token } : {}),
          ...(config?.config ?? {}),
        }
        const instance = await DuckDBInstance.fromCache(connectionString, options)
        const connection = await instance.connect()
        const lock = new ConnectionLock()
        getLogger().debug('MotherDuck database connected', { connectionString })
        return { connection, lock }
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
    Promise.reject(new Error('MotherDuck: this pool has been ended'))

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
      const { connection, lock } = await open()
      const release = await lock.acquire('query', timeout)
      try {
        return await runDuckdbQuery<T>(connection, text, values?.map(coerceDuckdbParam))
      } finally {
        release()
      }
    },

    async connect(): Promise<DatabaseConnection> {
      if (ended) return refuseEnded()
      const { connection, lock } = await open()
      const release = await lock.acquire('connect()', timeout)
      let released = false
      return {
        async query<T = Record<string, unknown>>(text: string, values?: unknown[]) {
          if (released) throw new Error('MotherDuck: query on a released connection')
          return runDuckdbQuery<T>(connection, text, values?.map(coerceDuckdbParam))
        },
        release() {
          released = true
          release()
        },
      }
    },

    async transaction(): Promise<DatabaseTransaction> {
      if (ended) return refuseEnded()
      const { connection, lock } = await open()
      // Hold the lock for the WHOLE transaction lifetime (BEGIN → … →
      // COMMIT/ROLLBACK) — a concurrent transaction() or plain query() call
      // queues behind this one instead of racing BEGIN.
      const release = await lock.acquire('transaction()', timeout)
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
          if (done) throw new Error('MotherDuck: query on a finished transaction')
          // Already holds the lock — run directly, do NOT re-acquire.
          return runDuckdbQuery<T>(connection, text, values?.map(coerceDuckdbParam))
        },
        release() {
          // Matches the duckdb bond: returns the connection WITHOUT ending the
          // transaction. Roll back first so the connection is clean for the
          // next caller.
          if (done) return
          done = true
          runDuckdbQuery(connection, 'ROLLBACK')
            .catch((error: unknown) => {
              // Nothing awaits release(); surface the failure instead of hiding it.
              getLogger().error('MotherDuck: rollback on transaction release() failed', { error })
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
      const { connection, lock } = await opening
      // Let queued and open work finish before closing — but do not hang
      // shutdown forever on a connection somebody never released.
      let release: (() => void) | undefined
      try {
        release = await lock.acquire('end()', timeout)
      } catch (error) {
        getLogger().warn('MotherDuck: closing the pool while its connection is still held', {
          error,
        })
      }
      try {
        connection.disconnectSync()
      } finally {
        release?.()
      }
      getLogger().debug('MotherDuck database connection closed')
    },

    stats() {
      // The lock exists only after first use; before that the pool is idle.
      return { total: 1, idle: 1, waiting: 0 }
    },
  }

  return pool
}
