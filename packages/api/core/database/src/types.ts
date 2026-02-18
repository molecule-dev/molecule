/**
 * Type definitions for database core interface.
 *
 * @module
 */

/**
 * Query result with rows and metadata.
 */
export interface QueryResult<T = Record<string, unknown>> {
  /**
   * Array of rows returned by the query.
   */
  rows: T[]

  /**
   * Number of rows affected (for INSERT, UPDATE, DELETE).
   */
  rowCount: number | null

  /**
   * Column metadata (optional, provider-dependent).
   */
  fields?: Array<{
    name: string
    dataTypeID?: number
  }>
}

/**
 * Database connection interface.
 */
export interface DatabaseConnection {
  /**
   * Executes a parameterized query.
   *
   * @param text - SQL query text with placeholders ($1, $2, etc.)
   * @param values - Parameter values
   */
  query<T = Record<string, unknown>>(text: string, values?: unknown[]): Promise<QueryResult<T>>

  /**
   * Releases the connection back to the pool.
   */
  release(): void
}

/**
 * Database transaction with commit and rollback (extends DatabaseConnection).
 */
export interface DatabaseTransaction extends DatabaseConnection {
  /**
   * Commits the transaction.
   */
  commit(): Promise<void>

  /**
   * Rolls back the transaction.
   */
  rollback(): Promise<void>
}

/**
 * Database pool interface.
 *
 * All database providers must implement this interface.
 */
export interface DatabasePool {
  /**
   * Executes a parameterized query using a pool connection.
   *
   * @param text - SQL query text with placeholders ($1, $2, etc.)
   * @param values - Parameter values
   */
  query<T = Record<string, unknown>>(text: string, values?: unknown[]): Promise<QueryResult<T>>

  /**
   * Acquires a connection from the pool.
   */
  connect(): Promise<DatabaseConnection>

  /**
   * Begins a transaction.
   */
  transaction?(): Promise<DatabaseTransaction>

  /**
   * Closes all connections in the pool.
   */
  end(): Promise<void>

  /**
   * Returns pool statistics (optional).
   */
  stats?(): {
    total: number
    idle: number
    waiting: number
  }
}

/**
 * Database provider interface.
 */
export interface DatabaseProvider {
  /**
   * The connection pool.
   */
  pool: DatabasePool

  /**
   * Creates a new pool with the given configuration.
   */
  createPool?(config: DatabaseConfig): DatabasePool
}

/**
 * Database connection options (host, port, credentials, pool size, timeouts, SSL).
 */
export interface DatabaseConfig {
  /**
   * Database host.
   */
  host?: string

  /**
   * Database port.
   */
  port?: number

  /**
   * Database name.
   */
  database?: string

  /**
   * Database user.
   */
  user?: string

  /**
   * Database password.
   */
  password?: string

  /**
   * Connection string (alternative to individual fields).
   */
  connectionString?: string

  /**
   * Maximum number of connections in the pool.
   */
  max?: number

  /**
   * Minimum number of connections in the pool.
   */
  min?: number

  /**
   * Connection timeout in milliseconds.
   */
  connectionTimeoutMillis?: number

  /**
   * Idle timeout in milliseconds.
   */
  idleTimeoutMillis?: number

  /**
   * Enable SSL.
   */
  ssl?:
    | boolean
    | {
        rejectUnauthorized?: boolean
        ca?: string
        key?: string
        cert?: string
      }
}
