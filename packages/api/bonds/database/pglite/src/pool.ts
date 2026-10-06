/**
 * PGlite `DatabasePool` implementation.
 *
 * @module
 */

// Side-effect import: registers this bond's secret definitions even when
// pool.js is imported directly (not through the package barrel).
import './secrets.js'
import type { Results } from '@electric-sql/pglite'

import { getLogger } from '@molecule/api-bond'
import type { DatabaseConnection, DatabaseTransaction, QueryResult } from '@molecule/api-database'

import { acquireInstance, type PgliteInstance, releaseInstance } from './instances.js'
import type { PgliteConfig, PglitePool } from './types.js'

/** Default wait for the single connection, matching the postgresql bond's connectionTimeoutMillis. */
const DEFAULT_ACQUIRE_TIMEOUT_MS = 10_000

/**
 * Converts a PGlite result into the core `QueryResult` shape. `rowCount`
 * follows node-postgres: rows returned for a SELECT, rows changed for
 * INSERT/UPDATE/DELETE, `null` for statements without a count (DDL).
 *
 * @param result - The PGlite result.
 * @returns The normalized result.
 */
function toQueryResult<T>(result: Results<T> | undefined): QueryResult<T> {
  if (!result) return { rows: [], rowCount: null, fields: [] }
  return {
    rows: result.rows,
    rowCount: result.rowCount ?? null,
    fields: result.fields.map((f) => ({ name: f.name, dataTypeID: f.dataTypeID })),
  }
}

/**
 * Runs one query on an instance whose lock the caller already holds.
 *
 * With parameters it uses the extended protocol (one statement). Without
 * parameters it uses the simple protocol, like node-postgres does, so a
 * parameterless string may hold several statements; the LAST statement's
 * result is returned (node-postgres returns an array in that case).
 *
 * @param instance - The open instance.
 * @param text - SQL with `$1`, `$2`, … placeholders.
 * @param values - Parameter values.
 * @returns The normalized result.
 */
async function run<T>(
  instance: PgliteInstance,
  text: string,
  values?: unknown[],
): Promise<QueryResult<T>> {
  if (values && values.length > 0) {
    return toQueryResult(await instance.db.query<T>(text, values))
  }
  const results = await instance.db.exec(text)
  return toQueryResult(results[results.length - 1] as Results<T> | undefined)
}

/**
 * Creates a `DatabasePool` backed by PGlite.
 *
 * The database opens on first use, not here, so creating a pool is free and
 * synchronous. See {@link PgliteConfig} for where data is kept.
 *
 * @param config - Data directory, wait timeout and PGlite options.
 * @returns A pool over one PGlite connection.
 */
export const createPool = (config?: PgliteConfig): PglitePool => {
  const timeout = config?.acquireTimeoutMillis ?? DEFAULT_ACQUIRE_TIMEOUT_MS
  let opening: Promise<PgliteInstance> | null = null
  let opened: PgliteInstance | null = null
  let ended = false

  /**
   * Opens the instance once, on first use.
   *
   * @returns The open instance.
   */
  const instance = (): Promise<PgliteInstance> => {
    if (ended) return Promise.reject(new Error('PGlite: this pool has been ended'))
    if (!opening) {
      opening = acquireInstance(config).then((inst) => {
        opened = inst
        return inst
      })
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
   * Takes the connection lock and wraps it as a connection whose queries run
   * without re-taking the lock.
   *
   * @param purpose - Name used in timeout errors.
   * @returns The instance and a once-only release.
   */
  const hold = async (purpose: string): Promise<{ inst: PgliteInstance; release: () => void }> => {
    const inst = await instance()
    const release = await inst.lock.acquire(purpose, timeout)
    return { inst, release }
  }

  const pool: PglitePool = {
    get dataDir() {
      return opened?.dataDir
    },

    async query<T = Record<string, unknown>>(
      text: string,
      values?: unknown[],
    ): Promise<QueryResult<T>> {
      const { inst, release } = await hold('query')
      try {
        return await run<T>(inst, text, values)
      } finally {
        release()
      }
    },

    async exec(sql: string): Promise<void> {
      const { inst, release } = await hold('exec')
      try {
        await inst.db.exec(sql)
      } finally {
        release()
      }
    },

    async connect(): Promise<DatabaseConnection> {
      // A real dedicated connection: holds the single connection until
      // release(), so `BEGIN … COMMIT` on it cannot interleave with other work.
      const { inst, release } = await hold('connect()')
      let released = false
      return {
        async query<T = Record<string, unknown>>(text: string, values?: unknown[]) {
          if (released) throw new Error('PGlite: query on a released connection')
          return run<T>(inst, text, values)
        },
        release() {
          released = true
          release()
        },
      }
    },

    async transaction(): Promise<DatabaseTransaction> {
      const { inst, release } = await hold('transaction()')
      let done = false
      const finish = (): void => {
        done = true
        release()
      }
      try {
        await inst.db.exec('BEGIN')
      } catch (error) {
        finish()
        throw error
      }
      return {
        async query<T = Record<string, unknown>>(text: string, values?: unknown[]) {
          if (done) throw new Error('PGlite: query on a finished transaction')
          return run<T>(inst, text, values)
        },
        release() {
          // Matches the postgresql bond: returns the connection WITHOUT ending
          // the transaction. Roll back first so the session is clean for the
          // next caller (on Postgres the pool would hand back a dirty client).
          if (done) return
          done = true
          inst.db
            .exec('ROLLBACK')
            .catch((error: unknown) => {
              // Nothing awaits release(); surface the failure instead of hiding it.
              getLogger().error('PGlite: rollback on transaction release() failed', { error })
            })
            .finally(release)
        },
        async commit() {
          if (done) return
          try {
            await inst.db.exec('COMMIT')
          } finally {
            finish()
          }
        },
        async rollback() {
          if (done) return
          try {
            await inst.db.exec('ROLLBACK')
          } finally {
            finish()
          }
        },
      }
    },

    async end() {
      if (ended) return
      ended = true
      if (!opening) return
      const inst = await opening
      // Let queued and open work finish before closing — but do not hang
      // shutdown forever on a connection somebody never released.
      let release: (() => void) | undefined
      try {
        release = await inst.lock.acquire('end()', timeout)
      } catch (error) {
        getLogger().warn('PGlite: closing the database while a connection is still held', {
          error,
        })
      }
      try {
        await releaseInstance(inst)
      } finally {
        release?.()
      }
    },

    stats() {
      const lock = opened?.lock
      return {
        total: 1,
        idle: lock?.isLocked ? 0 : 1,
        waiting: lock?.waiting ?? 0,
      }
    },
  }

  return pool
}
