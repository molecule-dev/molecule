/**
 * MySQL database provider implementation.
 *
 * @module
 */

import type {
  Pool,
  PoolConnection,
  PoolOptions,
  ResultSetHeader,
  RowDataPacket,
} from 'mysql2/promise'
import mysql from 'mysql2/promise'

import { getLogger } from '@molecule/api-bond'
const logger = getLogger()
import type {
  DatabaseConfig,
  DatabaseConnection,
  DatabasePool,
  DatabaseTransaction,
  QueryResult,
} from '@molecule/api-database'

import { convertPlaceholders } from './utilities.js'

/**
 * Wraps a MySQL `PoolConnection` to match the `DatabaseConnection` interface,
 * converting `$N` placeholders and adapting query results.
 *
 * @param connection - The MySQL pool connection to wrap.
 * @returns A `DatabaseConnection` adapter.
 */
const wrapConnection = (connection: PoolConnection): DatabaseConnection => ({
  async query<T = Record<string, unknown>>(
    text: string,
    values?: unknown[],
  ): Promise<QueryResult<T>> {
    const mysqlQuery = convertPlaceholders(text)
    const [rows, fields] = await connection.query<RowDataPacket[]>(mysqlQuery, values)

    return {
      rows: rows as T[],
      rowCount: Array.isArray(rows)
        ? rows.length
        : ((rows as ResultSetHeader).affectedRows ?? null),
      fields: fields?.map((f) => ({
        name: f.name,
        dataTypeID: f.type,
      })),
    }
  },

  release(): void {
    connection.release()
  },
})

/**
 * Wraps a MySQL `PoolConnection` as a `DatabaseTransaction` with
 * `commit()` and `rollback()` methods that auto-release the connection.
 *
 * @param connection - The MySQL pool connection with an active transaction.
 * @returns A `DatabaseTransaction` adapter.
 */
const wrapTransaction = (connection: PoolConnection): DatabaseTransaction => ({
  async query<T = Record<string, unknown>>(
    text: string,
    values?: unknown[],
  ): Promise<QueryResult<T>> {
    const mysqlQuery = convertPlaceholders(text)
    const [rows, fields] = await connection.query<RowDataPacket[]>(mysqlQuery, values)

    return {
      rows: rows as T[],
      rowCount: Array.isArray(rows)
        ? rows.length
        : ((rows as ResultSetHeader).affectedRows ?? null),
      fields: fields?.map((f) => ({
        name: f.name,
        dataTypeID: f.type,
      })),
    }
  },

  release(): void {
    connection.release()
  },

  async commit(): Promise<void> {
    await connection.commit()
    connection.release()
  },

  async rollback(): Promise<void> {
    await connection.rollback()
    connection.release()
  },
})

/**
 * Wraps a mysql2 `Pool` into a `DatabasePool`-compatible interface
 * with query adaptation, connection management, and transaction support.
 *
 * @param mysqlPool - The mysql2 promise pool to wrap.
 * @returns A `DatabasePool` adapter.
 */
const createMySQLPool = (mysqlPool: Pool): DatabasePool => ({
  async query<T = Record<string, unknown>>(
    text: string,
    values?: unknown[],
  ): Promise<QueryResult<T>> {
    const mysqlQuery = convertPlaceholders(text)
    const [rows, fields] = await mysqlPool.query<RowDataPacket[]>(mysqlQuery, values)

    return {
      rows: rows as T[],
      rowCount: Array.isArray(rows)
        ? rows.length
        : ((rows as ResultSetHeader).affectedRows ?? null),
      fields: fields?.map((f) => ({
        name: f.name,
        dataTypeID: f.type,
      })),
    }
  },

  async connect(): Promise<DatabaseConnection> {
    const connection = await mysqlPool.getConnection()
    return wrapConnection(connection)
  },

  async transaction(): Promise<DatabaseTransaction> {
    const connection = await mysqlPool.getConnection()
    await connection.beginTransaction()
    return wrapTransaction(connection)
  },

  async end(): Promise<void> {
    await mysqlPool.end()
  },

  stats(): { total: number; idle: number; waiting: number } {
    // mysql2 pool doesn't expose stats directly
    // We return what we can
    return {
      total: 0,
      idle: 0,
      waiting: 0,
    }
  },
})

/**
 * Creates a MySQL database pool that implements the `DatabasePool` interface.
 * Reads `MYSQL_URL`, `MYSQL_HOST`, `MYSQL_PORT`, `MYSQL_DATABASE`, `MYSQL_USER`,
 * and `MYSQL_PASSWORD` from env if not provided in config.
 *
 * @param config - Database connection configuration.
 * @returns A `DatabasePool` backed by a MySQL connection pool.
 */
export const createPool = (config?: DatabaseConfig): DatabasePool => {
  const connectionString = config?.connectionString ?? process.env.MYSQL_URL

  const poolConfig: PoolOptions = connectionString
    ? { uri: connectionString }
    : {
        host: config?.host ?? process.env.MYSQL_HOST ?? 'localhost',
        port: config?.port ?? parseInt(process.env.MYSQL_PORT ?? '3306', 10),
        database: config?.database ?? process.env.MYSQL_DATABASE,
        user: config?.user ?? process.env.MYSQL_USER ?? 'root',
        password: config?.password ?? process.env.MYSQL_PASSWORD,
        waitForConnections: true,
        connectionLimit: config?.max ?? 10,
        queueLimit: 0,
        connectTimeout: config?.connectionTimeoutMillis ?? 10000,
      }

  if (config?.ssl) {
    if (typeof config.ssl === 'boolean') {
      poolConfig.ssl = {}
    } else {
      poolConfig.ssl = {
        rejectUnauthorized: config.ssl.rejectUnauthorized,
        ca: config.ssl.ca,
        key: config.ssl.key,
        cert: config.ssl.cert,
      }
    }
  }

  const mysqlPool = mysql.createPool(poolConfig)

  logger.debug('MySQL pool created')

  return createMySQLPool(mysqlPool)
}

/**
 * The default MySQL pool instance, created with env-based configuration.
 */
export const pool: DatabasePool = createPool()
