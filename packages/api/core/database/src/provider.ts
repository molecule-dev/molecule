/**
 * Database pool bond accessor and convenience functions for raw SQL queries.
 *
 * Bond packages (e.g. `@molecule/api-database-postgresql`) call `setPool()` during setup.
 * Application code uses `query()` for raw SQL, or the DataStore functions from
 * `store-provider.ts` for database-agnostic CRUD.
 *
 * @module
 */

import { bond, isBonded, require as bondRequire } from '@molecule/api-bond'
import { t } from '@molecule/api-i18n'

import type { DatabaseConnection, DatabasePool, QueryResult } from './types.js'

const BOND_TYPE = 'database'

/**
 * Registers a database connection pool as the active singleton. Called by
 * bond packages during application startup.
 *
 * @param pool - The database pool implementation to bond.
 */
export const setPool = (pool: DatabasePool): void => {
  bond(BOND_TYPE, pool)
}

/**
 * Retrieves the bonded database pool, throwing if none is configured.
 *
 * @returns The bonded database pool.
 * @throws {Error} If no database pool has been bonded.
 */
export const getPool = (): DatabasePool => {
  try {
    return bondRequire<DatabasePool>(BOND_TYPE)
  } catch {
    throw new Error(
      t('database.error.noProvider', undefined, {
        defaultValue: 'Database pool not configured. Call setPool() first.',
      }),
    )
  }
}

/**
 * Checks whether a database pool is currently bonded.
 *
 * @returns `true` if a database pool is bonded.
 */
export const hasPool = (): boolean => {
  return isBonded(BOND_TYPE)
}

/**
 * Executes a parameterized SQL query using the bonded pool.
 *
 * @param text - SQL query text with placeholders (`$1`, `$2`, etc.).
 * @param values - Parameter values corresponding to the placeholders.
 * @returns The query result containing `rows`, `rowCount`, and optional `fields`.
 * @throws {Error} If no database pool has been bonded.
 */
export const query = async <T = Record<string, unknown>>(
  text: string,
  values?: unknown[],
): Promise<QueryResult<T>> => {
  return getPool().query<T>(text, values)
}

/**
 * Acquires a dedicated connection from the bonded pool. The connection must
 * be released after use by calling `connection.release()`.
 *
 * @returns A database connection that must be released after use.
 * @throws {Error} If no database pool has been bonded.
 */
export const connect = async (): Promise<DatabaseConnection> => {
  return getPool().connect()
}

/**
 * Closes all connections in the bonded pool. Call during graceful shutdown.
 *
 * @returns A promise that resolves when all connections have been closed.
 * @throws {Error} If no database pool has been bonded.
 */
export const end = async (): Promise<void> => {
  return getPool().end()
}
