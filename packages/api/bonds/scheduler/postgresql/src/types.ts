/**
 * Type definitions for the PostgreSQL-coordinated scheduler provider.
 *
 * @module
 */

import type pg from 'pg'

import type { SchedulerTaskRunLock } from '@molecule/api-scheduler'

/**
 * Options for the PostgreSQL-coordinated scheduler provider.
 */
export interface PostgresSchedulerOptions {
  /**
   * Stagger offset in milliseconds between task starts, to avoid a thundering
   * herd on boot. Defaults to 2000. Each task's delay is
   * `(index % enabledTaskCount) * staggerMs`.
   */
  staggerMs?: number
  /**
   * The advisory-lock class id. Advisory locks are per database and share one
   * namespace, so this MUST differ from other advisory-lock users (the
   * migration runner and instance leadership each use their own).
   * Defaults to `8675311`.
   */
  lockClassId?: number

  /** Connection string. Defaults to `process.env.DATABASE_URL`. */
  connectionString?: string

  /**
   * Open and connect a client. Injected by a host that owns its connection
   * settings (and by tests); the default creates a `pg.Client` from the
   * connection string.
   */
  connect?: (connectionString: string) => Promise<pg.Client>

  /**
   * Whether a failing lock lookup skips the run (the default, safe) or lets it
   * proceed uncoordinated. Leave this `false`: a skipped sweep is retried on
   * the next tick, while two concurrent runs can corrupt shared state.
   */
  runUncoordinatedOnLockError?: boolean

  /**
   * A pre-built run lock. Injected by tests (and by a host that already owns a
   * lock connection); when omitted the provider builds a PostgreSQL one.
   */
  lock?: SchedulerTaskRunLock
}
