# @molecule/api-database-remote

`@molecule/api-database-remote` — connect to USER-supplied databases
(Postgres / MySQL / SQLite) for inspection, schema browsing, and ad-hoc
query execution.

This is **distinct** from `@molecule/api-database` (the app's own
abstract DataStore). That package is the singleton bond category for the
application's primary persistence; this package is a separate driver
pool keyed by a user-supplied connection string, intended for the
`database-admin` flagship app and similar features where end-users
register external databases to browse.

Why the split:
- The app's DataStore is wired once at startup with a single fixed
  connection. A user-facing database explorer must support N parallel
  connections, each opened lazily, each with its own readonly /
  timeout / pool-size policy.
- The DataStore exposes high-level CRUD (`findOne`, `findMany`, …);
  this utility exposes the low-level surface a UI needs
  (`listSchemas`, `listTables`, `describeTable`, raw `runQuery`).

Security:
- `runQuery(sql, params)` requires parameterized SQL — never interpolate
  user input into the SQL string.
- `readonly: true` adds a defence-in-depth keyword sniff (rejects
  `INSERT` / `UPDATE` / `DELETE` / DDL). Production deployments should
  ALSO connect with a read-only DB role.
- Per-query `timeoutMs` and `maxRows` caps protect against runaway
  queries; defaults are 30s / 1000 rows.

Drivers (`pg`, `mysql2`, `better-sqlite3`) are declared as **optional**
peer dependencies and lazy-loaded — only install the engines you need.

Locale bonds are intentionally not used — error messages on the thrown
{@link RemoteDbError} are developer-facing English (handler-error
pattern). Map `error.code` to translated user-facing strings in the
calling handler.

## Quick Start

```ts
import { connectRemote } from '@molecule/api-database-remote'

const db = await connectRemote({
  url: 'postgresql://reader:secret@db.example.com/analytics',
  type: 'postgresql',
  readonly: true,
})

const schemas = await db.listSchemas()
const tables = await db.listTables('public')
const schema = await db.describeTable('public', 'users')

const result = await db.runQuery(
  'SELECT * FROM users WHERE created_at > $1',
  [new Date('2024-01-01')],
  { timeoutMs: 5_000, maxRows: 100 },
)

await db.disconnect()
```

## Type
`utility`

## Installation
```bash
npm install @molecule/api-database-remote
```

## API

### Interfaces

#### `ColumnSchema`

A normalized table-column definition returned by
{@link RemoteDb.describeTable}.

```typescript
interface ColumnSchema {
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
```

#### `ConnectRemoteHooks`

Per-driver factory hooks — pass these to {@link connectRemote} to swap
the real `pg` / `mysql2` / `better-sqlite3` driver for a hand-rolled
mock during testing.

```typescript
interface ConnectRemoteHooks {
  /** Factory for `pg.Pool`. Defaults to `(cfg) => new pg.Pool(cfg)`. */
  pgPoolFactory?: PgPoolFactory
  /** Factory for `mysql2/promise.createPool`. Defaults to the real one. */
  mysqlPoolFactory?: MysqlPoolFactory
  /** Factory for `better-sqlite3`. Defaults to `new BetterSqlite3(...)`. */
  sqliteFactory?: SqliteDbFactory
}
```

#### `ForeignKeySchema`

A normalized foreign-key constraint returned as part of {@link TableSchema}.

```typescript
interface ForeignKeySchema {
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
```

#### `IndexSchema`

A normalized index definition returned as part of {@link TableSchema}.

```typescript
interface IndexSchema {
  /** Index name. */
  name: string
  /** Columns covered by the index, in order. */
  columns: string[]
  /** `true` if the index enforces uniqueness. */
  unique: boolean
}
```

#### `MysqlField`

Field-info subset (mysql2 calls these "fields").

```typescript
interface MysqlField {
  name: string
  type?: number
  columnType?: number
}
```

#### `MysqlOkPacket`

mysql2 OkPacket-like shape for INSERT/UPDATE/DELETE.

```typescript
interface MysqlOkPacket {
  affectedRows: number
  insertId?: number
  changedRows?: number
}
```

#### `MysqlPoolLike`

Subset of `mysql2/promise.Pool` we use.

```typescript
interface MysqlPoolLike {
  query(sql: string, values?: unknown[]): Promise<MysqlQueryResult>
  end(): Promise<void>
}
```

#### `PgPoolClientLike`

Subset of `pg.PoolClient` returned by {@link PgPoolLike.connect}.

```typescript
interface PgPoolClientLike {
  query<T = Record<string, unknown>>(text: string, values?: unknown[]): Promise<PgQueryResult<T>>
  release(err?: Error | boolean): void
}
```

#### `PgPoolLike`

Subset of `pg.Pool` we use.

```typescript
interface PgPoolLike {
  query<T = Record<string, unknown>>(text: string, values?: unknown[]): Promise<PgQueryResult<T>>
  connect(): Promise<PgPoolClientLike>
  end(): Promise<void>
}
```

#### `PgQueryResult`

Subset of `pg.QueryResult` consumed by {@link PgPoolLike.query}.

```typescript
interface PgQueryResult<T = Record<string, unknown>> {
  rows: T[]
  rowCount: number | null
  fields?: Array<{ name: string; dataTypeID?: number }>
}
```

#### `QueryColumn`

Column metadata returned by {@link RemoteDb.runQuery}. The shape is
normalized across all three drivers — only the column name is guaranteed.

```typescript
interface QueryColumn {
  /** Column name as the engine reported it. */
  name: string
  /**
   * Engine-specific data-type hint (Postgres OID name, MySQL type code,
   * SQLite declared type). May be undefined when the driver doesn't expose
   * it for the given query.
   */
  dataType?: string
}
```

#### `QueryResult`

Result of a successful {@link RemoteDb.runQuery} call. Identical shape
regardless of which engine produced it.

```typescript
interface QueryResult {
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
```

#### `RemoteDb`

Connected remote-database handle returned by {@link connectRemote}. All
methods are async; calling any after {@link RemoteDb.disconnect} throws
a {@link RemoteDbError} with `code === 'not-connected'`.

`RemoteDb` is intentionally an opaque interface — driver internals (`pg.Pool`,
`mysql2.Connection`, `better-sqlite3.Database`) are NOT exposed.

```typescript
interface RemoteDb {
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
```

#### `RemoteDbConnection`

Configuration for {@link connectRemote}. Connection strings are passed to
the underlying driver as-is, so they may use any driver-supported URL
scheme (`postgresql://`, `mysql://`, file path / `:memory:` for SQLite).

```typescript
interface RemoteDbConnection {
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
```

#### `RunQueryOptions`

Per-query overrides for {@link RemoteDb.runQuery}.

```typescript
interface RunQueryOptions {
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
```

#### `SchemaInfo`

A schema / database listed by {@link RemoteDb.listSchemas}.

```typescript
interface SchemaInfo {
  /** Schema name (Postgres) / database name (MySQL) / `'main'` (SQLite). */
  name: string
}
```

#### `SqliteDbLike`

Subset of `better-sqlite3.Database` we use.

```typescript
interface SqliteDbLike {
  prepare(sql: string): SqliteStatementLike
  pragma(source: string, options?: { simple?: boolean }): unknown
  close(): void
  readonly: boolean
}
```

#### `SqliteStatementLike`

Subset of a prepared `better-sqlite3` statement we use.

```typescript
interface SqliteStatementLike {
  all(...params: unknown[]): unknown[]
  run(...params: unknown[]): { changes: number; lastInsertRowid: number | bigint }
  raw(toggle: boolean): SqliteStatementLike
  columns(): Array<{ name: string; type: string | null }>
  reader: boolean
}
```

#### `TableInfo`

A table listed by {@link RemoteDb.listTables}.

```typescript
interface TableInfo {
  /** Containing schema / database. */
  schema: string
  /** Table name. */
  name: string
  /** `'table'` for ordinary tables, `'view'` for views. */
  type: 'table' | 'view'
}
```

#### `TableSchema`

Full schema of a single table — the result of {@link RemoteDb.describeTable}.

```typescript
interface TableSchema {
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
```

### Types

#### `MysqlPoolFactory`

Constructor signature compatible with `mysql2/promise.createPool(config)`.

```typescript
type MysqlPoolFactory = (config: {
  uri: string
  connectionLimit?: number
  multipleStatements?: false
}) => MysqlPoolLike
```

#### `MysqlQueryResult`

mysql2 query result tuple — `[rows, fields]`.

```typescript
type MysqlQueryResult =
  | [MysqlRow[], MysqlField[]]
  | [MysqlOkPacket, MysqlField[] | undefined]
```

#### `MysqlRow`

A single row returned by mysql2 for `SELECT`.

```typescript
type MysqlRow = Record<string, unknown>
```

#### `PgPoolFactory`

Constructor signature compatible with `new pg.Pool(config)`.

```typescript
type PgPoolFactory = (config: { connectionString: string; max?: number }) => PgPoolLike
```

#### `RemoteDbErrorCode`

Stable error code surfaced on {@link RemoteDbError}. Map these to
translated user-facing strings in the calling handler — this utility is
intentionally locale-bond-free (handler-error pattern).

```typescript
type RemoteDbErrorCode =
  | 'connection-failed'
  | 'driver-not-installed'
  | 'invalid-config'
  | 'not-connected'
  | 'query-failed'
  | 'readonly-violation'
  | 'table-not-found'
  | 'timeout'
  | 'unsupported-type'
```

#### `RemoteDbType`

Supported remote database engines. The driver is selected from this value;
each maps 1:1 to an optional peer dependency:

| type         | driver           |
|--------------|------------------|
| `postgresql` | `pg`             |
| `mysql`      | `mysql2`         |
| `sqlite`     | `better-sqlite3` |

```typescript
type RemoteDbType = 'postgresql' | 'mysql' | 'sqlite'
```

#### `SqliteDbFactory`

Constructor signature compatible with `new BetterSqlite3(file, options)`.

```typescript
type SqliteDbFactory = (
  file: string,
  options?: { readonly?: boolean; fileMustExist?: boolean; timeout?: number },
) => SqliteDbLike
```

### Classes

#### `RemoteDbError`

Strongly-typed error thrown by {@link connectRemote} and any
{@link RemoteDb} method.

### Functions

#### `collectForeignKeys(rows)`

```typescript
function collectForeignKeys(rows: { constraint_name: string; column_name: string; foreign_schema: string; foreign_table: string; foreign_column: string; }[]): ForeignKeySchema[]
```

- `rows` — *

#### `collectIndexes(rows)`

```typescript
function collectIndexes(rows: { index_name: string; column_name: string; is_unique: boolean; }[]): IndexSchema[]
```

- `rows` — *

#### `connectRemote(connection, hooks)`

Connect to a user-supplied remote database for inspection and query
execution. Distinct from the app's own DataStore — this is a separate
driver pool, keyed by `connection.url`, intended for the `database-admin`
flagship app and similar features where end-users register databases
to browse.

Drivers are loaded lazily — only the engine the caller actually uses
will be `import()`ed, so missing optional peer deps (`pg`, `mysql2`,
`better-sqlite3`) only trip a `driver-not-installed` error when that
engine is selected.

```typescript
function connectRemote(connection: RemoteDbConnection, hooks?: ConnectRemoteHooks): Promise<RemoteDb>
```

- `connection` — Engine type, URL / path, optional read-only flag,
- `hooks` — Optional driver-factory overrides for testing.

**Returns:** A connected {@link RemoteDb}.

#### `createMysqlRemoteDb(pool, defaultDb, readonly)`

Build a {@link RemoteDb} backed by a `mysql2/promise` pool. The pool is
owned by the returned handle — `disconnect()` calls `pool.end()`.

```typescript
function createMysqlRemoteDb(pool: MysqlPoolLike, defaultDb: string, readonly: boolean): RemoteDb
```

- `pool` — Connected mysql2 pool.
- `defaultDb` — Database name parsed from the connection URI; used as
- `readonly` — When `true`, mutating SQL is rejected before the pool

#### `createPgRemoteDb(pool, readonly)`

Build a {@link RemoteDb} backed by a `pg.Pool`.

```typescript
function createPgRemoteDb(pool: PgPoolLike, readonly: boolean): RemoteDb
```

- `pool` — Connected pool. Ownership transfers — the caller must NOT
- `readonly` — When `true`, mutating SQL is rejected before the pool

**Returns:** A connected handle.

#### `createSqliteRemoteDb(db, readonly)`

Build a {@link RemoteDb} backed by a `better-sqlite3` database handle.
Ownership transfers — `disconnect()` calls `db.close()`.

```typescript
function createSqliteRemoteDb(db: SqliteDbLike, readonly: boolean): RemoteDb
```

- `db` — *

#### `defaultMysqlPoolFactory()`

Lazy-import `mysql2/promise.createPool`. Throws
{@link RemoteDbError} `code === 'driver-not-installed'` when the driver
is missing.

```typescript
function defaultMysqlPoolFactory(): Promise<MysqlPoolFactory>
```

#### `defaultPgPoolFactory()`

Construct the default `pg.Pool` factory by lazy-importing `pg`. Throws
{@link RemoteDbError} `code === 'driver-not-installed'` if the driver
is not installed in the host project.

```typescript
function defaultPgPoolFactory(): Promise<PgPoolFactory>
```

#### `defaultSqliteFactory()`

Lazy-import `better-sqlite3`. Throws
{@link RemoteDbError} `code === 'driver-not-installed'` when missing.

```typescript
function defaultSqliteFactory(): Promise<SqliteDbFactory>
```

#### `isMutating(sql)`

Returns `true` if the supplied SQL string mutates state under the
read-only sniff. Whitespace and SQL comments are stripped before the
leading verb is matched.

The sniff is conservative — anything that isn't a recognized read-only
verb (`SELECT`, `WITH`, `EXPLAIN`, `SHOW`, `DESCRIBE`, `DESC`, `PRAGMA`)
starting the query is treated as mutating.

```typescript
function isMutating(sql: string): boolean
```

- `sql` — Raw SQL text supplied to `runQuery`.

**Returns:** `true` if the query is rejected in `readonly` mode.

#### `parseMysqlDatabase(uri)`

Extract the database name from a `mysql://user:pass@host:port/db` URI.
Returns an empty string if the URI has no path.

```typescript
function parseMysqlDatabase(uri: string): string
```

- `uri` — *

#### `quoteIdentifier(name)`

Quote a SQLite identifier (schema, table, index name). PRAGMA statements
do NOT accept bound parameters, so callers must inline names — quoting
is the only defence against injection.

```typescript
function quoteIdentifier(name: string): string
```

- `name` — *

#### `raceWithTimeout(promise, timeoutMs, onTimeout)`

Race a promise against a timeout. The `onTimeout` hook fires once when
the timeout wins so the caller can release driver-level resources.

```typescript
function raceWithTimeout(promise: Promise<T>, timeoutMs: number, onTimeout: () => void): Promise<T>
```

- `promise` — *
- `timeoutMs` — *
- `onTimeout` — *

### Constants

#### `DEFAULT_MAX_ROWS`

Default cap on rows returned by a single {@link RemoteDb.runQuery} call.
Excess rows are dropped and `truncated: true` is set on the result.

```typescript
const DEFAULT_MAX_ROWS: 1000
```

#### `DEFAULT_POOL_SIZE`

Default `pg.Pool` size for remote inspection connections.

```typescript
const DEFAULT_POOL_SIZE: 4
```

#### `DEFAULT_TIMEOUT_MS`

Default per-query timeout in milliseconds — applied when
{@link RunQueryOptions.timeoutMs} is not set.

```typescript
const DEFAULT_TIMEOUT_MS: 30000
```

## Injection Notes

### Requirements

Peer dependencies:
- `better-sqlite3` ^12.0.0
- `mysql2` ^3.0.0
- `pg` ^8.0.0
