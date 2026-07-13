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
// Side-effect import: registers this bond's secret definitions so the
// runtime registry is populated even when provider.js is imported directly
// (not through the package barrel).
import './secrets.js'

import type {
  DatabaseConfig,
  DatabaseConnection,
  DatabasePool,
  DatabaseTransaction,
  QueryResult,
} from '@molecule/api-database'
import { configNotConfiguredError } from '@molecule/api-secrets'

import type { MysqlFieldMeta } from './utilities.js'
import { coerceMysqlParam, convertPlaceholders, normalizeMysqlRows } from './utilities.js'

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
    const { text: mysqlQuery, values: params } = convertPlaceholders(text, values)
    const [rows, fields] = await connection.query<RowDataPacket[]>(
      mysqlQuery,
      params.map(coerceMysqlParam),
    )

    return {
      rows: normalizeMysqlRows<T>(rows as Record<string, unknown>[], fields as MysqlFieldMeta[]),
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
    const { text: mysqlQuery, values: params } = convertPlaceholders(text, values)
    const [rows, fields] = await connection.query<RowDataPacket[]>(
      mysqlQuery,
      params.map(coerceMysqlParam),
    )

    return {
      rows: normalizeMysqlRows<T>(rows as Record<string, unknown>[], fields as MysqlFieldMeta[]),
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
    const { text: mysqlQuery, values: params } = convertPlaceholders(text, values)
    const [rows, fields] = await mysqlPool.query<RowDataPacket[]>(
      mysqlQuery,
      params.map(coerceMysqlParam),
    )

    return {
      rows: normalizeMysqlRows<T>(rows as Record<string, unknown>[], fields as MysqlFieldMeta[]),
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

  // `stats` is intentionally OMITTED (the `DatabasePool.stats` method is optional)
  // rather than fabricated: mysql2's pool exposes NO public stats API, and a prior
  // version returned hardcoded `{ total: 0, idle: 0, waiting: 0 }` — a health/
  // monitoring page reading those zeros could not tell "MySQL bond, stats
  // unsupported" from "pool down, zero connections" (the postgres bond DOES
  // return real counts). Callers already use the optional-call form
  // (`pool.stats?.()`, e.g. `molecule-dev/api/src/db/pool-monitor.ts`), which
  // correctly reads `undefined` as "unavailable" instead of a misleading healthy
  // zero. Reaching into mysql2's private `_allConnections`/`_freeConnections`
  // internals (unexported, no public types) to fake real numbers would be a
  // second undocumented-internals coupling on top of the first misleading one.
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
  const database = config?.database ?? process.env.MYSQL_DATABASE

  // Fail fast with an actionable message instead of silently defaulting to
  // host=localhost/user=root/no-password: without this, an unconfigured app's
  // first query failed with a raw driver ECONNREFUSED/ER_ACCESS_DENIED instead
  // of naming the missing env var. Only fires when NOTHING identifies a target
  // database — no connection string/MYSQL_URL, no database name/MYSQL_DATABASE,
  // AND no explicit config object at all. An explicit config (even partial,
  // e.g. a discrete-var setup passing just `host`+`user`) is the caller's
  // deliberate choice and is never second-guessed here.
  const hasExplicitConfig = config != null && Object.keys(config).length > 0
  if (!connectionString && !database && !hasExplicitConfig) {
    throw configNotConfiguredError('MYSQL_URL', 'the MySQL database connection')
  }

  const poolConfig: PoolOptions = connectionString
    ? { uri: connectionString }
    : {
        host: config?.host ?? process.env.MYSQL_HOST ?? 'localhost',
        port: config?.port ?? parseInt(process.env.MYSQL_PORT ?? '3306', 10),
        database,
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
 * Lazily-initialized default pool. Created on first property access so that
 * the `MYSQL_URL` / `MYSQL_*` env vars have been populated by the secrets
 * layer's `resolveAll()` first — the same pattern as the postgresql and
 * sqlite bonds. The previous EAGER `createPool()` at module load froze the
 * connection config at import time, so a `MYSQL_URL` resolved later was
 * silently ignored and the app connected to `localhost:3306` as `root`.
 */
let _pool: DatabasePool | null = null

/**
 * Returns the lazily-initialized default pool, creating it from env-based
 * configuration on first access.
 * @returns The singleton `DatabasePool` instance.
 */
function getPoolInstance(): DatabasePool {
  if (!_pool) {
    _pool = createPool()
  }
  return _pool
}

/**
 * The default MySQL pool instance, created with env-based configuration on
 * first use.
 */
export const pool: DatabasePool = new Proxy({} as DatabasePool, {
  get(_, prop, receiver) {
    return Reflect.get(getPoolInstance(), prop, receiver)
  },
  // set trap: methods run with `this` bound to the proxy — without it, instance-state writes land on the dummy target and are lost (see api-push-notifications-web-push)
  set(_, prop, value) {
    return Reflect.set(getPoolInstance(), prop, value)
  },
})
