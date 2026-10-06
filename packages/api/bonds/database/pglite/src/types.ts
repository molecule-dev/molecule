/**
 * Type definitions for the PGlite database provider.
 *
 * @module
 */

import type { PGliteOptions } from '@electric-sql/pglite'

import type { DatabasePool, DatabaseTransaction } from '@molecule/api-database'

/**
 * Configuration for a PGlite-backed pool.
 */
export interface PgliteConfig {
  /**
   * Where the database lives:
   *
   * - `'memory://'` — in memory; gone when the pool ends or the process exits.
   * - a filesystem path (Node only), e.g. `'./data/pglite'` — a Postgres data
   *   directory; parent directories are created for you.
   * - `'idb://<name>'` — the browser's IndexedDB (needs an `indexedDB` global).
   *
   * Defaults to the `PGLITE_DATA_DIR` env var, then `'./data/pglite'` when a
   * Node runtime is present, else `'memory://'`.
   */
  dataDir?: string

  /**
   * How long (ms) a query, `connect()` or `transaction()` waits for the single
   * connection before failing with an error that says who is holding it.
   * Defaults to 10 000 (the postgresql bond's `connectionTimeoutMillis`).
   */
  acquireTimeoutMillis?: number

  /**
   * Return `int8`/`bigint` values (`COUNT(*)`, `SUM(int)`, `bigint` columns) as
   * strings, exactly like node-postgres. PGlite's own default is a JS number,
   * or a `BigInt` above 2^53 — which `JSON.stringify` cannot serialize.
   * Defaults to `true` so app code behaves the same here and on the
   * postgresql bond.
   */
  int8AsString?: boolean

  /**
   * Extra options handed to the `PGlite` constructor as-is (extensions,
   * `relaxedDurability`, custom `parsers`, `debug`, …). `dataDir` is set by
   * the field above; a `parsers` entry here wins over `int8AsString`.
   */
  pgliteOptions?: Omit<PGliteOptions, 'dataDir'>
}

/**
 * A `DatabasePool` backed by PGlite, plus the two things only this bond has.
 */
export interface PglitePool extends DatabasePool {
  /**
   * Begins a transaction on the single connection (always implemented here).
   *
   * @returns The open transaction; end it with `commit()` or `rollback()`.
   */
  transaction(): Promise<DatabaseTransaction>

  /**
   * Runs SQL that may hold several statements (a migration file) through
   * Postgres's simple-query protocol. Takes no parameters.
   *
   * @param sql - One or more SQL statements separated by `;`.
   */
  exec(sql: string): Promise<void>

  /**
   * The data directory this pool resolved to (`'memory://'` for in-memory).
   * Known only after first use; `undefined` before that.
   */
  readonly dataDir: string | undefined
}

/**
 * Environment variables consumed by the PGlite database provider.
 */
export interface ProcessEnv {
  PGLITE_DATA_DIR?: string
}
