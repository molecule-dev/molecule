/**
 * Minimal driver-shape interfaces that mirror the parts of `pg`, `mysql2/promise`,
 * and `better-sqlite3` that this package actually calls. Importing these
 * ambient shapes (rather than the real driver types) lets us:
 *
 * - keep all three drivers as **optional** peer dependencies, so consumers
 *   only install the engines they actually use;
 * - inject hand-rolled mocks in unit tests without pulling the real
 *   drivers into Vitest's transform pipeline.
 *
 * The shapes are deliberately narrow — anything not used by the client
 * implementations is omitted.
 *
 * @module
 */

/* ------------------------------------------------------------------ */
/* pg                                                                  */
/* ------------------------------------------------------------------ */

/** Subset of `pg.QueryResult` consumed by {@link PgPoolLike.query}. */
export interface PgQueryResult<T = Record<string, unknown>> {
  rows: T[]
  rowCount: number | null
  fields?: Array<{ name: string; dataTypeID?: number }>
}

/** Subset of `pg.PoolClient` returned by {@link PgPoolLike.connect}. */
export interface PgPoolClientLike {
  query<T = Record<string, unknown>>(text: string, values?: unknown[]): Promise<PgQueryResult<T>>
  release(err?: Error | boolean): void
}

/** Subset of `pg.Pool` we use. */
export interface PgPoolLike {
  query<T = Record<string, unknown>>(text: string, values?: unknown[]): Promise<PgQueryResult<T>>
  connect(): Promise<PgPoolClientLike>
  end(): Promise<void>
}

/** Constructor signature compatible with `new pg.Pool(config)`. */
export type PgPoolFactory = (config: { connectionString: string; max?: number }) => PgPoolLike

/* ------------------------------------------------------------------ */
/* mysql2/promise                                                      */
/* ------------------------------------------------------------------ */

/** A single row returned by mysql2 for `SELECT`. */
export type MysqlRow = Record<string, unknown>

/** Field-info subset (mysql2 calls these "fields"). */
export interface MysqlField {
  name: string
  type?: number
  columnType?: number
}

/** mysql2 OkPacket-like shape for INSERT/UPDATE/DELETE. */
export interface MysqlOkPacket {
  affectedRows: number
  insertId?: number
  changedRows?: number
}

/** mysql2 query result tuple — `[rows, fields]`. */
export type MysqlQueryResult =
  | [MysqlRow[], MysqlField[]]
  | [MysqlOkPacket, MysqlField[] | undefined]

/** Subset of `mysql2/promise.Pool` we use. */
export interface MysqlPoolLike {
  query(sql: string, values?: unknown[]): Promise<MysqlQueryResult>
  end(): Promise<void>
}

/** Constructor signature compatible with `mysql2/promise.createPool(config)`. */
export type MysqlPoolFactory = (config: {
  uri: string
  connectionLimit?: number
  multipleStatements?: false
}) => MysqlPoolLike

/* ------------------------------------------------------------------ */
/* better-sqlite3                                                      */
/* ------------------------------------------------------------------ */

/** Subset of a prepared `better-sqlite3` statement we use. */
export interface SqliteStatementLike {
  all(...params: unknown[]): unknown[]
  run(...params: unknown[]): { changes: number; lastInsertRowid: number | bigint }
  raw(toggle: boolean): SqliteStatementLike
  columns(): Array<{ name: string; type: string | null }>
  reader: boolean
}

/** Subset of `better-sqlite3.Database` we use. */
export interface SqliteDbLike {
  prepare(sql: string): SqliteStatementLike
  pragma(source: string, options?: { simple?: boolean }): unknown
  close(): void
  readonly: boolean
}

/** Constructor signature compatible with `new BetterSqlite3(file, options)`. */
export type SqliteDbFactory = (
  file: string,
  options?: { readonly?: boolean; fileMustExist?: boolean; timeout?: number },
) => SqliteDbLike
