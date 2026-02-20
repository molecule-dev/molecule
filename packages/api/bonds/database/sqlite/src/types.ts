/**
 * Type definitions for the SQLite database provider.
 * @module
 */

/**
 * Configuration for the SQLite database provider.
 */
export interface SqliteConfig {
  /** Path to the SQLite database file. Defaults to SQLITE_PATH env var or './data/app.db'. */
  path?: string
  /** Enable WAL mode for better concurrent read performance. Defaults to true. */
  walMode?: boolean
  /** Enable foreign key constraints. Defaults to true. */
  foreignKeys?: boolean
}

/**
 * Environment variables consumed by the SQLite database provider.
 */
export interface ProcessEnv {
  SQLITE_PATH?: string
}
