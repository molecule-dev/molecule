/**
 * Type definitions for the Cloudflare D1 database provider.
 *
 * @module
 */

/**
 * The subset of Cloudflare's `D1PreparedStatement` this bond uses.
 *
 * Declared structurally rather than imported from `@cloudflare/workers-types`
 * so the package carries no dependency on the Workers type package — a consumer
 * that already has those types passes its real binding and it type-checks, and
 * a consumer that does not can still build.
 */
export interface D1PreparedStatementLike {
  /** Binds ordinal parameters, returning a bound statement. */
  bind(...values: unknown[]): D1PreparedStatementLike
  /** Runs the statement and returns all result rows plus metadata. */
  all<T = Record<string, unknown>>(): Promise<{
    results: T[]
    meta?: { changes?: number; last_row_id?: number | string }
  }>
  /** Runs the statement for its side effects. */
  run(): Promise<{
    results?: unknown[]
    meta?: { changes?: number; last_row_id?: number | string }
  }>
}

/**
 * The subset of Cloudflare's `D1Database` binding this bond uses.
 */
export interface D1DatabaseLike {
  /** Prepares a SQL statement. */
  prepare(query: string): D1PreparedStatementLike
  /** Runs a set of prepared statements as one batch. */
  batch?<T = Record<string, unknown>>(
    statements: D1PreparedStatementLike[],
  ): Promise<{ results: T[] }[]>
}

/**
 * Configuration for the D1 provider.
 */
export interface D1Config {
  /**
   * The D1 binding from the Worker's `env` (for example `env.DB`).
   *
   * REQUIRED and passed in explicitly: a Worker's bindings arrive per-invocation
   * on `env` and are not readable from the module scope or from `process.env`,
   * so there is nothing for this bond to discover. Being told is the only
   * correct option, and a discovery mechanism here could only ever guess wrong.
   */
  database: D1DatabaseLike
}
