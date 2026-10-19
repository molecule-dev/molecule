/**
 * Per-task PostgreSQL session advisory locks.
 *
 * One dedicated connection per scheduler provider holds a session lock for the
 * DURATION of each task run. Two instances tick on their own timers; only the
 * one that wins the lock runs the handler, so a scheduled task runs once across
 * the platform per tick.
 *
 * A session lock is released by the backend when the connection ends, so an
 * instance that crashes mid-run does not leave the task locked.
 *
 * @module
 */

import pg from 'pg'

import { getLogger } from '@molecule/api-bond'
import type { SchedulerTaskRunLock } from '@molecule/api-scheduler'

/**
 * One run lock backed by a dedicated PostgreSQL connection.
 */
export interface PostgresTaskRunLock extends SchedulerTaskRunLock {
  /** {@inheritDoc SchedulerTaskRunLock.close} */
  close(): Promise<void>
}

/**
 * Derive a stable 31-bit advisory-lock key from a task name.
 *
 * The name is the contract shared by every instance: the same task must map to
 * the same key in every process, so the hash is fixed rather than salted.
 * FNV-1a over UTF-16 code units, masked to 31 bits (the second key of
 * `pg_try_advisory_lock(classId, objectId)` is a signed int4).
 *
 * @param taskName - The scheduler task name.
 * @returns A non-negative 31-bit integer.
 */
export function advisoryKeyForTask(taskName: string): number {
  let hash = 0x811c9dc5
  for (let index = 0; index < taskName.length; index++) {
    hash ^= taskName.charCodeAt(index)
    hash = Math.imul(hash, 0x01000193)
  }
  return hash >>> 1
}

/**
 * Build a run lock over a dedicated PostgreSQL connection.
 *
 * The connection is opened lazily on the first run and re-opened after a
 * failure. A lock query that cannot reach the database returns `false` (the
 * run is skipped) unless `runUncoordinatedOnLockError` is set.
 *
 * @param options - Connection string, advisory-lock class id and failure policy.
 * @returns The run lock.
 */
export function createPostgresTaskRunLock(options: {
  connectionString?: string
  lockClassId?: number
  runUncoordinatedOnLockError?: boolean
  /**
   * Open and connect a client. Injected by tests (and by a host that owns its
   * connection settings); the default creates a `pg.Client` from the
   * connection string.
   *
   * @param connectionString - The resolved connection string.
   * @returns A connected client.
   */
  connect?: (connectionString: string) => Promise<pg.Client>
}): PostgresTaskRunLock {
  const logger = getLogger()
  const lockClassId = options.lockClassId ?? 8675311
  let client: pg.Client | null = null
  let closed = false

  /**
   * Get or open the dedicated lock connection.
   *
   * @returns A connected client.
   */
  const getClient = async (): Promise<pg.Client> => {
    if (client) return client
    const connectionString = options.connectionString ?? process.env.DATABASE_URL
    if (!connectionString) {
      throw new Error(
        'The PostgreSQL scheduler needs DATABASE_URL (or an explicit connectionString): a per-task ' +
          'advisory lock is how one scheduled run happens across every API instance.',
      )
    }
    const next = options.connect
      ? await options.connect(connectionString)
      : new pg.Client({ connectionString, connectionTimeoutMillis: 10_000 })
    if (!options.connect) await next.connect()
    next.on('error', (error) => {
      // The lock is gone with the session; the next run opens a fresh
      // connection. The in-flight run cannot be stopped, so log it loudly.
      logger.warn('Scheduler lock connection error', { error })
      if (client === next) client = null
    })
    next.on('end', () => {
      if (client === next) client = null
    })
    await next.connect()
    client = next
    return next
  }

  /**
   * Tasks whose lock this instance is STILL holding for the rest of their
   * interval (a pending unlock). Local only: it stops this instance racing its
   * own hold; siblings rely on the advisory lock itself.
   */
  const heldUnlocks = new Map<string, ReturnType<typeof setTimeout>>()

  /**
   * Release one task's advisory lock and stop tracking the hold.
   *
   * @param connection - The connection that holds it.
   * @param key - The task's lock key.
   * @param taskName - The task name (for the log line).
   */
  const releaseTaskLock = async (
    connection: pg.Client,
    key: number,
    taskName: string,
  ): Promise<void> => {
    heldUnlocks.delete(taskName)
    try {
      await connection.query('SELECT pg_advisory_unlock($1, $2)', [lockClassId, key])
    } catch (error) {
      // The session ends either way and PostgreSQL releases its locks.
      logger.debug(`Scheduler task '${taskName}' lock release failed`, { error })
    }
  }

  return {
    async runExclusive(
      taskName: string,
      run: () => Promise<void>,
      runOptions?: { holdMs?: number },
    ): Promise<boolean> {
      if (closed) return false
      // This instance already ran the current window and is holding the lock
      // for the rest of it — do not race itself.
      if (heldUnlocks.has(taskName)) return false
      const key = advisoryKeyForTask(taskName)
      let connection: pg.Client
      try {
        connection = await getClient()
      } catch (error) {
        if (options.runUncoordinatedOnLockError) {
          logger.warn(`Scheduler task '${taskName}' ran without a lock (lock store unreachable)`, {
            error,
          })
          await run()
          return true
        }
        logger.warn(`Scheduler task '${taskName}' skipped: lock store unreachable`, { error })
        return false
      }

      let locked: boolean
      try {
        const { rows } = await connection.query<{ locked: boolean }>(
          'SELECT pg_try_advisory_lock($1, $2) AS locked',
          [lockClassId, key],
        )
        locked = rows[0]?.locked === true
      } catch (error) {
        if (client === connection) client = null
        void connection.end().catch(() => undefined)
        if (options.runUncoordinatedOnLockError) {
          logger.warn(`Scheduler task '${taskName}' ran without a lock (lock query failed)`, {
            error,
          })
          await run()
          return true
        }
        logger.warn(`Scheduler task '${taskName}' skipped: lock query failed`, { error })
        return false
      }

      if (!locked) {
        logger.debug(`Scheduler task '${taskName}' skipped: another instance holds the run lock`)
        return false
      }

      try {
        await run()
      } catch (error) {
        // A failed run releases immediately: the next tick may retry it.
        await releaseTaskLock(connection, key, taskName)
        throw error
      }

      // Hold the lock for the rest of the interval. Two instances tick a few
      // milliseconds apart; without the hold the second would re-run the SAME
      // window the instant the first released. The unlock is scheduled, not
      // awaited, so this connection stays free for every other task.
      const holdMs = Math.max(0, runOptions?.holdMs ?? 0)
      if (holdMs === 0) {
        await releaseTaskLock(connection, key, taskName)
      } else {
        const timer = setTimeout(() => {
          void releaseTaskLock(connection, key, taskName)
        }, holdMs)
        timer.unref?.()
        heldUnlocks.set(taskName, timer)
      }
      return true
    },

    async close(): Promise<void> {
      closed = true
      for (const timer of heldUnlocks.values()) clearTimeout(timer)
      heldUnlocks.clear()
      const current = client
      client = null
      if (current) {
        try {
          await current.end()
        } catch (error) {
          logger.debug('Scheduler lock connection close failed', { error })
        }
      }
    },
  }
}
