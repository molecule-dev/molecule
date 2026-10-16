/**
 * SQLite DatabasePool implementation using better-sqlite3.
 *
 * @module
 */

import { existsSync, mkdirSync } from 'node:fs'
import { dirname } from 'node:path'

// Side-effect import: registers this bond's secret definitions so the
// runtime registry is populated even when pool.js is imported directly
// (not through the package barrel).
import './secrets.js'
import Database from 'better-sqlite3'

import { getLogger } from '@molecule/api-bond'
import type {
  DatabaseConnection,
  DatabasePool,
  DatabaseTransaction,
  QueryResult,
} from '@molecule/api-database'
import { getActiveTransaction } from '@molecule/api-database'

import type { SqliteConfig } from './types.js'
import { coerceSqliteParam, convertPlaceholders, normalizeSqliteRows } from './utilities.js'

/** How long an operation may wait for the connection before it fails. */
const QUEUE_WAIT_LIMIT_MS = 30_000

/** How much of a failing statement the error message carries (whitespace-collapsed). */
const STATEMENT_IN_MESSAGE_CAP = 200

/**
 * Runs `statement` and, when better-sqlite3 throws, names the statement that failed.
 *
 * better-sqlite3's errors carry a code (`SQLITE_MISMATCH`, `SQLITE_CONSTRAINT_NOTNULL`) but
 * no SQL. X0 flash-m89's seed hit `SqliteError: datatype mismatch` with a stack into this
 * file and nothing else, and the model spent 38 s grepping every `create(` call to find
 * which table the insert was aimed at before finding the statement itself. Postgres' driver
 * hands back `table` and `column` on the same class of failure; SQLite's hands back nothing.
 *
 * The error keeps its class and its `code` (it is mutated, not replaced): its message gains
 * the statement on one line, and `sql` carries the statement whole. The bound VALUES are
 * never part of either — they hold whatever the caller was storing.
 *
 * @param sql - The statement as the driver received it (after placeholder conversion).
 * @param run - Runs the statement and returns its result.
 * @returns Whatever `run` returned.
 */
function withStatementContext<T>(sql: string, run: () => T): T {
  try {
    return run()
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
 * Serializes access to the ONE shared better-sqlite3 connection so
 * transactions and ordinary queries never interleave.
 *
 * better-sqlite3 has no concept of separate transaction-scoped connections —
 * `BEGIN`/`COMMIT`/`ROLLBACK` apply to the SAME handle every `pool.query()`
 * call also uses. Without this queue: (a) two concurrent `transaction()`
 * calls race `BEGIN` and the second throws "cannot start a transaction
 * within a transaction", and (b) an unrelated `pool.query()` issued while a
 * transaction is open silently runs INSIDE it and can be discarded by that
 * transaction's `rollback()`. Every operation (plain query or transaction)
 * acquires this queue in FIFO order; a transaction holds it for its whole
 * lifetime (`BEGIN` → … → `COMMIT`/`ROLLBACK`) so nothing else touches the
 * connection until it releases.
 */
class OperationQueue {
  private locked = false
  private waiters: Array<() => void> = []

  /**
   * Reserves the next slot in the queue, resolving once every
   * previously-queued operation has released. The caller MUST call the
   * returned release function exactly once (even on error) — an operation
   * that never releases blocks every queued operation until its wait limit.
   *
   * @param waitLimitMs - How long to wait before rejecting (default 30 s).
   * @returns A release function that unblocks the next queued operation.
   */
  acquire(waitLimitMs = QUEUE_WAIT_LIMIT_MS): Promise<() => void> {
    const release = (): void => {
      const next = this.waiters.shift()
      if (next) {
        next()
      } else {
        this.locked = false
      }
    }

    if (!this.locked) {
      this.locked = true
      return Promise.resolve(release)
    }

    return new Promise<() => void>((resolve, reject) => {
      const waiter = (): void => {
        clearTimeout(timer)
        this.locked = true
        resolve(release)
      }
      // A query issued INSIDE a transaction through the pool (not through the
      // transaction) waits for that transaction, which waits for it: a
      // deadlock with no error. Fail with the fix instead of hanging.
      const timer = setTimeout(() => {
        this.waiters = this.waiters.filter((w) => w !== waiter)
        reject(
          new Error(
            `SQLite: waited ${waitLimitMs / 1000}s behind an open transaction. If this call is part of that transaction, run the work in withTransaction() from @molecule/api-database (the CRUD helpers and query() join it), or use the transaction's own query().`,
          ),
        )
      }, waitLimitMs)
      this.waiters.push(waiter)
    })
  }
}

/**
 * Creates a SQLite DatabasePool backed by better-sqlite3.
 *
 * @param config - SQLite configuration options.
 * @returns A DatabasePool wrapping a synchronous better-sqlite3 connection.
 */
export const createPool = (config?: SqliteConfig): DatabasePool => {
  const dbPath = config?.path ?? process.env.SQLITE_PATH ?? './data/app.db'
  const walMode = config?.walMode ?? true
  const foreignKeys = config?.foreignKeys ?? true
  const logger = getLogger()

  // Auto-create parent directory
  const dir = dirname(dbPath)
  if (!existsSync(dir)) {
    mkdirSync(dir, { recursive: true })
  }

  const db = new Database(dbPath)

  if (walMode) {
    db.pragma('journal_mode = WAL')
  }
  if (foreignKeys) {
    db.pragma('foreign_keys = ON')
  }

  logger.debug('SQLite database opened')

  const queue = new OperationQueue()
  // Transactions this pool opened: a `query()` made inside `withTransaction()`
  // runs on the active one when it is ours.
  const ownTransactions = new WeakSet<DatabaseTransaction>()

  /**
   * Runs one statement against the shared connection. Does NOT acquire the
   * `OperationQueue` itself — callers (plain `query()` and an open
   * transaction's `query()`) are responsible for holding a slot first, so
   * this can be called either standalone (one acquire/release per call) or
   * repeatedly while a transaction already holds the queue.
   *
   * @param text - SQL text with `$N` placeholders (converted to `?`).
   * @param values - Positional parameter values.
   * @returns The query result (rows + rowCount).
   */
  function runStatement<T = Record<string, unknown>>(
    text: string,
    values?: unknown[],
  ): QueryResult<T> {
    const { text: sql, values: rawParams } = convertPlaceholders(text, values)
    // better-sqlite3 only binds numbers/strings/bigints/buffers/null — coerce
    // booleans → 0/1 and objects/arrays → JSON text so create()/update() with a
    // boolean or jsonb value don't crash at bind time.
    const params = rawParams.map(coerceSqliteParam)

    // `prepare` (unknown table/column, syntax) and `all`/`run` (datatype mismatch,
    // constraint failures) throw from different places, so the whole execution is wrapped:
    // whichever of them fails, the error names the statement (see `withStatementContext`).
    return withStatementContext<QueryResult<T>>(sql, () => {
      const stmt = db.prepare(sql)

      // Dispatch on better-sqlite3's own `Statement.reader` flag — true for ANY
      // statement that returns rows (SELECT, WITH…SELECT CTEs, VALUES, PRAGMA,
      // INSERT/UPDATE/DELETE…RETURNING). The old string heuristic
      // (`startsWith('SELECT') || includes('RETURNING')`) misrouted CTEs and
      // PRAGMAs to `stmt.run()`, which better-sqlite3 executes WITHOUT returning
      // rows — so a perfectly valid raw `query('WITH … SELECT …')` silently came
      // back as `rows: []`, indistinguishable from a genuinely empty result.
      if (stmt.reader) {
        const rows = (params.length > 0 ? stmt.all(...params) : stmt.all()) as Record<
          string,
          unknown
        >[]
        // Round-trip storage form back to JS types (0/1 → boolean, JSON text →
        // value) using the declared column types, matching the Postgres driver.
        return {
          rows: normalizeSqliteRows<T>(rows, stmt.columns()),
          rowCount: rows.length,
        }
      }

      // INSERT/UPDATE/DELETE without RETURNING (and other non-reader statements)
      const result = params.length > 0 ? stmt.run(...params) : stmt.run()
      return {
        rows: [] as T[],
        rowCount: result.changes,
      }
    })
  }

  const pool: DatabasePool = {
    async query<T = Record<string, unknown>>(
      text: string,
      values?: unknown[],
    ): Promise<QueryResult<T>> {
      const active = getActiveTransaction()
      if (active && ownTransactions.has(active)) return active.query<T>(text, values)
      // Acquire the queue for this ONE statement — if a transaction is
      // currently open, this waits until it commits/rolls back instead of
      // running INSIDE it (see `OperationQueue`).
      const release = await queue.acquire()
      try {
        return runStatement<T>(text, values)
      } finally {
        release()
      }
    },

    async connect(): Promise<DatabaseConnection> {
      // SQLite is single-connection — return a wrapper around the same db
      return {
        async query<T = Record<string, unknown>>(
          text: string,
          values?: unknown[],
        ): Promise<QueryResult<T>> {
          return pool.query<T>(text, values)
        },
        release() {
          // No-op for SQLite — no pool to release to
        },
      }
    },

    async transaction(): Promise<DatabaseTransaction> {
      // Hold the queue for the WHOLE transaction lifetime (BEGIN → … →
      // COMMIT/ROLLBACK) — a concurrent transaction() or plain query() call
      // queues behind this one instead of racing BEGIN or running inside it.
      const release = await queue.acquire()
      let released = false
      const releaseOnce = (): void => {
        if (!released) {
          released = true
          release()
        }
      }
      try {
        db.exec('BEGIN')
      } catch (error) {
        releaseOnce()
        throw error
      }

      const conn: DatabaseTransaction = {
        async query<T = Record<string, unknown>>(
          text: string,
          values?: unknown[],
        ): Promise<QueryResult<T>> {
          // Already holds the queue slot acquired above — call the shared
          // executor directly, do NOT re-acquire (that would deadlock).
          return runStatement<T>(text, values)
        },
        release() {
          // No-op
        },
        async commit() {
          try {
            db.exec('COMMIT')
          } finally {
            releaseOnce()
          }
        },
        async rollback() {
          try {
            db.exec('ROLLBACK')
          } finally {
            releaseOnce()
          }
        },
      }
      ownTransactions.add(conn)
      return conn
    },

    async end() {
      db.close()
      logger.debug('SQLite database closed')
    },

    stats() {
      return { total: 1, idle: 1, waiting: 0 }
    },
  }

  return pool
}
