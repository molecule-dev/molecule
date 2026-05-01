/**
 * Public types for the `@molecule/api-database-remote` utility — connection
 * config, normalized result shapes, and the opaque {@link RemoteDb} handle.
 *
 * Implementation-specific fields from the underlying `pg` / `mysql2` /
 * `better-sqlite3` drivers are NOT exposed; everything is normalized to
 * stable shapes so callers can swap the underlying database type without
 * changing call sites.
 *
 * @module
 */

/**
 * Supported remote database engines. The driver is selected from this value;
 * each maps 1:1 to an optional peer dependency:
 *
 * | type         | driver           |
 * |--------------|------------------|
 * | `postgresql` | `pg`             |
 * | `mysql`      | `mysql2`         |
 * | `sqlite`     | `better-sqlite3` |
 */
export type RemoteDbType = 'postgresql' | 'mysql' | 'sqlite'

/**
 * Configuration for {@link connectRemote}. Connection strings are passed to
 * the underlying driver as-is, so they may use any driver-supported URL
 * scheme (`postgresql://`, `mysql://`, file path / `:memory:` for SQLite).
 */
export interface RemoteDbConnection {
  /**
   * Connection URL (Postgres / MySQL) or filesystem path (SQLite). For
   * SQLite, `:memory:` selects an anonymous in-memory database.
   */
  url: string
  /** Engine selector — picks the underlying driver. */
  type: RemoteDbType
  /**
   * When `true`, mutating SQL (`INSERT` / `UPDATE` / `DELETE` / DDL) is
   * rejected by {@link RemoteDb.runQuery} via a keyword sniff. Defaults to
   * `false`.
   *
   * Note: the keyword sniff is a defence-in-depth check, NOT a substitute
   * for the database engine's own permissions / read-only role. Production
   * deployments should also configure a read-only DB user.
   */
  readonly?: boolean
  /**
   * Maximum number of pooled connections (Postgres / MySQL only). Defaults
   * to `4` to keep the per-user-database fan-out small. Ignored for SQLite
   * (which uses a single in-process handle).
   */
  poolSize?: number
}

/**
 * Per-query overrides for {@link RemoteDb.runQuery}.
 */
export interface RunQueryOptions {
  /**
   * Hard timeout in milliseconds — the query is aborted if it exceeds this.
   * Defaults to `30_000` (30s).
   */
  timeoutMs?: number
  /**
   * Maximum number of rows to return. Excess rows are dropped and
   * {@link QueryResult.truncated} is set to `true`. Defaults to `1_000`.
   */
  maxRows?: number
}

/**
 * Column metadata returned by {@link RemoteDb.runQuery}. The shape is
 * normalized across all three drivers — only the column name is guaranteed.
 */
export interface QueryColumn {
  /** Column name as the engine reported it. */
  name: string
  /**
   * Engine-specific data-type hint (Postgres OID name, MySQL type code,
   * SQLite declared type). May be undefined when the driver doesn't expose
   * it for the given query.
   */
  dataType?: string
}

/**
 * Result of a successful {@link RemoteDb.runQuery} call. Identical shape
 * regardless of which engine produced it.
 */
export interface QueryResult {
  /** Column metadata in the order returned by the engine. */
  columns: QueryColumn[]
  /**
   * Result rows. Each row is a plain object keyed by column name; values
   * are whatever the driver returned (numbers, strings, dates, buffers,
   * etc.). For mutating statements, this is an empty array.
   */
  rows: Array<Record<string, unknown>>
  /**
   * Number of rows actually returned (for `SELECT`) or affected (for
   * `INSERT` / `UPDATE` / `DELETE`).
   */
  rowCount: number
  /** Wall-clock time spent executing the query, in milliseconds. */
  executionTimeMs: number
  /**
   * `true` if the result was capped at {@link RunQueryOptions.maxRows}.
   * Callers should warn the user that more rows exist server-side.
   */
  truncated?: boolean
}

/**
 * A normalized table-column definition returned by
 * {@link RemoteDb.describeTable}.
 */
export interface ColumnSchema {
  /** Column name. */
  name: string
  /** Engine-reported data type (e.g. `integer`, `varchar(255)`, `INTEGER`). */
  dataType: string
  /** `true` if the column allows `NULL`. */
  nullable: boolean
  /** `true` if the column is part of the primary key. */
  primaryKey: boolean
  /** Default-value expression as the engine reported it, if any. */
  defaultValue?: string
}

/**
 * A normalized index definition returned as part of {@link TableSchema}.
 */
export interface IndexSchema {
  /** Index name. */
  name: string
  /** Columns covered by the index, in order. */
  columns: string[]
  /** `true` if the index enforces uniqueness. */
  unique: boolean
}

/**
 * A normalized foreign-key constraint returned as part of {@link TableSchema}.
 */
export interface ForeignKeySchema {
  /** Constraint name (engine-supplied, may be auto-generated). */
  name: string
  /** Local columns participating in the FK. */
  columns: string[]
  /** Schema name of the referenced table (Postgres / MySQL). */
  referencedSchema?: string
  /** Referenced table name. */
  referencedTable: string
  /** Referenced columns, paired positionally with `columns`. */
  referencedColumns: string[]
}

/**
 * Full schema of a single table — the result of {@link RemoteDb.describeTable}.
 */
export interface TableSchema {
  /** Schema (Postgres) / database (MySQL) / `'main'` (SQLite). */
  schema: string
  /** Table name. */
  name: string
  /** Column definitions, in declared order. */
  columns: ColumnSchema[]
  /** Indexes (including the implicit primary-key index). */
  indexes: IndexSchema[]
  /** Foreign-key constraints declared on this table. */
  foreignKeys: ForeignKeySchema[]
}

/**
 * A schema / database listed by {@link RemoteDb.listSchemas}.
 */
export interface SchemaInfo {
  /** Schema name (Postgres) / database name (MySQL) / `'main'` (SQLite). */
  name: string
}

/**
 * A table listed by {@link RemoteDb.listTables}.
 */
export interface TableInfo {
  /** Containing schema / database. */
  schema: string
  /** Table name. */
  name: string
  /** `'table'` for ordinary tables, `'view'` for views. */
  type: 'table' | 'view'
}

/**
 * Connected remote-database handle returned by {@link connectRemote}. All
 * methods are async; calling any after {@link RemoteDb.disconnect} throws
 * a {@link RemoteDbError} with `code === 'not-connected'`.
 *
 * `RemoteDb` is intentionally an opaque interface — driver internals (`pg.Pool`,
 * `mysql2.Connection`, `better-sqlite3.Database`) are NOT exposed.
 */
export interface RemoteDb {
  /** Engine type the connection was opened with. */
  readonly type: RemoteDbType
  /** `true` if the connection was opened with `readonly: true`. */
  readonly readonly: boolean
  /**
   * List user-visible schemas (Postgres) / databases (MySQL). For SQLite,
   * always returns `[{ name: 'main' }]`.
   */
  listSchemas(): Promise<SchemaInfo[]>
  /**
   * List tables and views in a schema. When `schema` is omitted, the
   * default schema is used (`public` for Postgres, the connected database
   * for MySQL, `main` for SQLite).
   */
  listTables(schema?: string): Promise<TableInfo[]>
  /**
   * Inspect a single table's columns, indexes, and foreign keys.
   *
   * @throws {RemoteDbError} `code === 'table-not-found'` if no such table.
   */
  describeTable(schemaName: string, tableName: string): Promise<TableSchema>
  /**
   * Execute a parameterized SQL query. Parameter placeholders are
   * driver-native: `$1, $2, …` for Postgres, `?` for MySQL and SQLite.
   *
   * String interpolation is forbidden — pass user input through `params`
   * to avoid SQL injection.
   *
   * @throws {RemoteDbError} `code === 'readonly-violation'` if the query is
   *   mutating and the connection was opened with `readonly: true`.
   * @throws {RemoteDbError} `code === 'timeout'` if the query exceeds
   *   `opts.timeoutMs`.
   * @throws {RemoteDbError} `code === 'query-failed'` for engine errors.
   */
  runQuery(sql: string, params?: unknown[], opts?: RunQueryOptions): Promise<QueryResult>
  /** Close the connection / pool. Idempotent. */
  disconnect(): Promise<void>
}

/**
 * Stable error code surfaced on {@link RemoteDbError}. Map these to
 * translated user-facing strings in the calling handler — this utility is
 * intentionally locale-bond-free (handler-error pattern).
 */
export type RemoteDbErrorCode =
  | 'connection-failed'
  | 'driver-not-installed'
  | 'invalid-config'
  | 'not-connected'
  | 'query-failed'
  | 'readonly-violation'
  | 'table-not-found'
  | 'timeout'
  | 'unsupported-type'

/**
 * Strongly-typed error thrown by {@link connectRemote} and any
 * {@link RemoteDb} method.
 */
export class RemoteDbError extends Error {
  /** Stable machine-readable error code — switch on this in handlers. */
  readonly code: RemoteDbErrorCode

  constructor(code: RemoteDbErrorCode, message: string, options?: ErrorOptions) {
    super(message, options)
    this.name = 'RemoteDbError'
    this.code = code
  }
}
