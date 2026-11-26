/**
 * Opens the app's configured SQLite database (`SQLITE_PATH`) for the migrator and the default
 * pool.
 *
 * @module
 */

import { existsSync, mkdirSync } from 'node:fs'
import { dirname } from 'node:path'

import Database from 'better-sqlite3'

/** The database file the migrator and the default pool open: `SQLITE_PATH`, or `./data/app.db`. */
export const configuredDatabasePath = (): string => process.env.SQLITE_PATH ?? './data/app.db'

/** Whether `path` names a database private to the connection that opens it (`:memory:`, `''`). */
export const isPrivateDatabasePath = (path: string): boolean => path === ':memory:' || path === ''

/**
 * The process's in-memory app database. SQLite gives every connection to `:memory:` an empty
 * database of its own, so with `SQLITE_PATH=:memory:` the migrations and the server's pool used to
 * see two databases: the server answered "no such table" right after "Migrations complete".
 */
let inMemory: Database.Database | null = null

/** An open app database and how its opener lets go of it. */
export interface OpenedDatabase {
  db: Database.Database
  /** Closes a file database; an in-memory one stays open for the next opener (see `closeDatabase`). */
  release: () => void
  /** Closes the database, an in-memory one included: its contents are gone afterwards. */
  closeDatabase: () => void
}

/**
 * Opens the database at `path`, creating a file's parent directory. An in-memory `path` read from
 * `SQLITE_PATH` is one database for the whole process, shared by every caller, until one of them
 * calls `closeDatabase()`; any other path gets its own connection.
 *
 * @param path - The database path.
 * @param fromEnvironment - Whether `path` is the app's configured database (`SQLITE_PATH`) rather
 *   than one a caller named itself. Only the configured database is shared.
 * @returns The connection, with `release` and `closeDatabase`.
 */
export function openDatabase(path: string, fromEnvironment: boolean): OpenedDatabase {
  if (fromEnvironment && isPrivateDatabasePath(path)) {
    const db = (inMemory ??= new Database(path))
    return {
      db,
      release: () => {},
      closeDatabase: () => {
        if (inMemory === db) inMemory = null
        db.close()
      },
    }
  }
  if (!isPrivateDatabasePath(path)) {
    const dir = dirname(path)
    if (!existsSync(dir)) mkdirSync(dir, { recursive: true })
  }
  const db = new Database(path)
  const close = (): void => {
    db.close()
  }
  return { db, release: close, closeDatabase: close }
}
