/**
 * Type definitions for MySQL database provider.
 *
 * @module
 */

// Re-export core interface types
export type {
  DatabaseConfig,
  DatabaseConnection,
  DatabasePool,
  DatabaseTransaction,
  QueryResult,
} from '@molecule/api-database'

// Re-export mysql2 types for advanced usage
export type {
  Pool,
  PoolConnection,
  PoolOptions,
  ResultSetHeader,
  RowDataPacket,
} from 'mysql2/promise'

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace NodeJS {
    /**
     * Process Env interface.
     */
    export interface ProcessEnv {
      /**
       * MySQL connection URL.
       */
      MYSQL_URL?: string
      /**
       * MySQL host.
       */
      MYSQL_HOST?: string
      /**
       * MySQL port.
       */
      MYSQL_PORT?: string
      /**
       * MySQL database name.
       */
      MYSQL_DATABASE?: string
      /**
       * MySQL user.
       */
      MYSQL_USER?: string
      /**
       * MySQL password.
       */
      MYSQL_PASSWORD?: string
    }
  }
}
