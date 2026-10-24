/**
 * MotherDuck migration runner — the duckdb bond's ledger logic on this pool.
 *
 * @module
 */

// Side-effect import: registers this bond's secret definitions so the
// runtime registry is populated even when migrator.js is imported directly
// (not through the package barrel).
import './secrets.js'

// Subpath import (not the barrel) so importing this bond does NOT fire the
// duckdb bond's own lifecycle registration on its default pool.
import {
  applyMigrations,
  type MigratablePool,
  type MigrationOptions,
} from '@molecule/api-database-duckdb/migrator.js'

import { createPool } from './pool.js'

export type { MigrationOptions } from '@molecule/api-database-duckdb/migrator.js'

/**
 * Apply every migration file in `migrationsDir` to `pool`, in lexical order —
 * the duckdb bond's `applyMigrations`, unchanged (same ledger, same
 * translation, same error contract).
 *
 * @param pool - The MotherDuck pool to migrate.
 * @param migrationsDir - Absolute path to the directory of ordered `*.sql` files.
 * @param options - Ledger namespace for multi-directory apps.
 * @returns Resolves when every file is applied or recorded.
 */
export function runMigrationsOn(
  pool: MigratablePool,
  migrationsDir: string,
  options?: MigrationOptions,
): Promise<void> {
  return applyMigrations(pool, migrationsDir, options)
}

/**
 * Returns a `runMigrations()` bound to a migrations directory and the DEFAULT
 * MotherDuck pool (connection string from `MOTHERDUCK_DATABASE`).
 *
 * @param migrationsDir - Absolute path to the directory of ordered `*.sql`
 *   migration files, resolved from the API package directory.
 * @param options - A stable namespace for a second SQL directory.
 * @returns A no-arg `runMigrations()` that connects to MotherDuck and applies
 *   every migration file in lexical order.
 */
export function createMigrator(
  migrationsDir: string,
  options: MigrationOptions = {},
): () => Promise<void> {
  return async function runMigrations(): Promise<void> {
    const pool = createPool() as MigratablePool
    try {
      await applyMigrations(pool, migrationsDir, options)
    } finally {
      await pool.end()
    }
  }
}
