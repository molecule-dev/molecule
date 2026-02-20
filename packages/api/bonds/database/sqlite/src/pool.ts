/**
 * SQLite DatabasePool implementation using better-sqlite3.
 *
 * @module
 */

import { existsSync, mkdirSync } from 'node:fs'
import { dirname } from 'node:path'

import Database from 'better-sqlite3'

import { getLogger } from '@molecule/api-bond'
import type {
  DatabaseConnection,
  DatabasePool,
  DatabaseTransaction,
  QueryResult,
} from '@molecule/api-database'

import type { SqliteConfig } from './types.js'
import { convertPlaceholders } from './utilities.js'

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

  const pool: DatabasePool = {
    async query<T = Record<string, unknown>>(
      text: string,
      values?: unknown[],
    ): Promise<QueryResult<T>> {
      const { text: sql, values: params } = convertPlaceholders(text, values)
      const trimmed = sql.trim().toUpperCase()

      // SELECT queries and RETURNING queries return rows
      if (trimmed.startsWith('SELECT') || sql.toUpperCase().includes('RETURNING')) {
        const stmt = db.prepare(sql)
        const rows = (params.length > 0 ? stmt.all(...params) : stmt.all()) as T[]
        return {
          rows,
          rowCount: rows.length,
        }
      }

      // INSERT/UPDATE/DELETE without RETURNING
      const stmt = db.prepare(sql)
      const result = params.length > 0 ? stmt.run(...params) : stmt.run()
      return {
        rows: [] as T[],
        rowCount: result.changes,
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
      db.exec('BEGIN')
      const conn: DatabaseTransaction = {
        async query<T = Record<string, unknown>>(
          text: string,
          values?: unknown[],
        ): Promise<QueryResult<T>> {
          return pool.query<T>(text, values)
        },
        release() {
          // No-op
        },
        async commit() {
          db.exec('COMMIT')
        },
        async rollback() {
          db.exec('ROLLBACK')
        },
      }
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
