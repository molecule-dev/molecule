/**
 * Type definitions for the MotherDuck database provider.
 *
 * @module
 */

/**
 * Configuration for a MotherDuck-backed pool.
 */
export interface MotherduckConfig {
  /**
   * The `md:` connection string — `md:` (the account's default database) or
   * `md:<database>`. Extra parameters may be appended
   * (`md:my_db?session_name=…`). Defaults to the `MOTHERDUCK_DATABASE` env
   * var, then `md:`.
   */
  connectionString?: string
  /**
   * The MotherDuck token. Read lazily at first use, never at import time.
   * Defaults to the `MOTHERDUCK_TOKEN` env var (the client also auto-reads a
   * lowercase `motherduck_token` env var by itself — either works).
   */
  token?: string
  /**
   * Which env var holds the token (default `MOTHERDUCK_TOKEN`). Only useful
   * for one pool among several.
   */
  tokenEnv?: string
  /**
   * Extra DuckDB settings handed to `DuckDBInstance.fromCache(connectionString,
   * options)` as-is (`session_name`, `dbinstance_inactivity_ttl`,
   * `connection_timeout`, …). The `motherduck_token` entry is set by this bond.
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
 * Environment variables consumed by the MotherDuck database provider.
 */
export interface ProcessEnv {
  MOTHERDUCK_TOKEN?: string
  MOTHERDUCK_DATABASE?: string
}
