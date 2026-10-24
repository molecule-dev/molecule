/**
 * Type definitions for the DuckDB database provider.
 *
 * @module
 */

/**
 * Configuration for the DuckDB database provider.
 */
export interface DuckdbConfig {
  /**
   * Path of the DuckDB database file — created on first open — or `':memory:'`
   * for a database that lives only for the process's lifetime. Defaults to the
   * `DUCKDB_PATH` env var, then `'./data/app.duckdb'`.
   */
  path?: string
  /**
   * DuckDB `memory_limit` for the instance. DuckDB's own default is 80% of
   * system RAM, which on a shared VM lets one query evict everything else, so
   * this bond caps it at `'1GB'` by default. Accepts DuckDB size strings
   * (`'512MB'`, `'2GB'`) or a plain byte count as a string. Also settable via
   * the `DUCKDB_MEMORY_LIMIT` env var.
   */
  memoryLimit?: string
  /**
   * DuckDB `threads` for the instance. DuckDB's own default is every CPU core,
   * which oversubscribes a shared host, so this bond caps it at `4` by default.
   * Also settable via the `DUCKDB_THREADS` env var.
   */
  threads?: number
  /**
   * Open the database read-only (`access_mode = 'READ_ONLY'`). Multiple
   * processes may read one file concurrently; only read-write mode is
   * exclusive, so a read-only pool never fights an app holding the write lock.
   */
  readOnly?: boolean
  /**
   * Extra DuckDB settings handed to `DuckDBInstance.fromCache(path, options)`
   * as-is (a flat `Record<string, string>` of setting name → value). Entries
   * here win over the `memoryLimit`/`threads`/`readOnly` fields.
   */
  config?: Record<string, string>
  /**
   * How long (ms) a query, `connect()` or `transaction()` waits for the single
   * connection before failing with an error that says who is holding it.
   * Defaults to 30 000.
   */
  acquireTimeoutMillis?: number
}

/**
 * Environment variables consumed by the DuckDB database provider.
 */
export interface ProcessEnv {
  DUCKDB_PATH?: string
  DUCKDB_MEMORY_LIMIT?: string
  DUCKDB_THREADS?: string
}
