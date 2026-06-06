# @molecule/api-database-sqlite

SQLite database provider for molecule.dev.

Provides DatabasePool and DataStore implementations backed by
better-sqlite3. Ideal for lightweight services, status pages,
and single-instance deployments.

## Quick Start

```typescript
import { setPool, setStore } from '@molecule/api-database'
import { pool, store } from '@molecule/api-database-sqlite'

setPool(pool)
setStore(store)
```

## Type
`provider`

## Installation
```bash
npm install @molecule/api-database-sqlite better-sqlite3
npm install -D @types/better-sqlite3
```

## API

### Interfaces

#### `ProcessEnv`

Environment variables consumed by the SQLite database provider.

```typescript
interface ProcessEnv {
  SQLITE_PATH?: string
}
```

#### `SqliteColumnMeta`

Minimal shape of better-sqlite3's `Statement.columns()` entries we use.

```typescript
interface SqliteColumnMeta {
  name: string
  type: string | null
}
```

#### `SqliteConfig`

Configuration for the SQLite database provider.

```typescript
interface SqliteConfig {
  /** Path to the SQLite database file. Defaults to SQLITE_PATH env var or './data/app.db'. */
  path?: string
  /** Enable WAL mode for better concurrent read performance. Defaults to true. */
  walMode?: boolean
  /** Enable foreign key constraints. Defaults to true. */
  foreignKeys?: boolean
}
```

### Functions

#### `coerceSqliteParam(value)`

Coerce a JS value into something better-sqlite3 can bind. better-sqlite3 only
accepts numbers, strings, bigints, buffers, and null — a JS boolean, plain
object, array, `undefined`, or `Date` throws at bind time, which would crash
every `create()`/`update()` that passes a `boolean` or `jsonb` value (e.g.
`users.twoFactorEnabled`, `projects.packages`). Mirrors what the Postgres
driver accepts: booleans → 0/1, objects/arrays → JSON text, Date → ISO string,
`undefined` → null.

```typescript
function coerceSqliteParam(value: unknown): unknown
```

- `value` — The value to bind.

**Returns:** A better-sqlite3-bindable primitive.

#### `convertPlaceholders(text, values)`

Convert PostgreSQL-style positional placeholders ($1, $2, ...) to SQLite-style (?) placeholders.
Also reorders values array to match the placeholder order.

```typescript
function convertPlaceholders(text: string, values?: unknown[]): { text: string; values: unknown[]; }
```

- `text` — SQL query text with $N placeholders.
- `values` — Parameter values ordered by $N index.

**Returns:** The query text with ? placeholders and reordered values.

#### `createMigrator(migrationsDir)`

Returns a `runMigrations()` bound to a migrations directory.

```typescript
function createMigrator(migrationsDir: string): () => Promise<void>
```

- `migrationsDir` — Absolute path to the directory of ordered `*.sql`

**Returns:** A no-arg `runMigrations()` that opens the SQLite file (creating it
 *   and its parent directory if missing) and applies every migration file in
 *   lexical order using multi-statement `exec()`. Reads the file path from the
 *   `SQLITE_PATH` env var (default `./data/app.db`), matching the pool.

#### `createPool(config)`

Creates a SQLite DatabasePool backed by better-sqlite3.

```typescript
function createPool(config?: SqliteConfig): DatabasePool
```

- `config` — SQLite configuration options.

**Returns:** A DatabasePool wrapping a synchronous better-sqlite3 connection.

#### `createStore(pool)`

Creates a DataStore backed by a SQLite DatabasePool.

```typescript
function createStore(pool: DatabasePool): DataStore
```

- `pool` — The SQLite DatabasePool to use for queries.

**Returns:** A DataStore that translates CRUD operations to SQLite-compatible SQL.

#### `normalizeSqliteRows(rows, columns)`

Normalize a SQLite result set back to JS types using the declared column types,
so values round-trip like the Postgres bond instead of leaking SQLite's storage
form: a `BOOLEAN` column's 0/1 → boolean, a `JSON`/`JSONB` column's text →
parsed value. Columns with an unknown/expression type (null) and values that
aren't in storage form pass through untouched. Mutates rows in place for speed.

```typescript
function normalizeSqliteRows(rows: Record<string, unknown>[], columns: SqliteColumnMeta[]): T[]
```

- `rows` — Raw rows from `stmt.all()`.
- `columns` — `stmt.columns()` metadata for the result set.

**Returns:** The normalized rows.

#### `translateDdlToSqlite(sql)`

Translate PostgreSQL-dialect DDL to SQLite-compatible DDL at migration time.

Resource/template setup migrations are authored in PostgreSQL dialect, but a
SQLite project applies them raw via the migrator's `db.exec()`. SQLite
tolerates Postgres *type* names through affinity (`uuid`, `timestamptz`,
`jsonb`, `boolean`), but it rejects Postgres *function/cast/index* SYNTAX,
which raises `near "(": syntax error` and aborts the whole migration. This
rewrites the handful of constructs that actually appear across the resource
library so those migrations apply on SQLite:

- `DEFAULT gen_random_uuid()` → removed. The resource layer always sets
  `id = id || uuid()` on create, so the column never relies on a DB default.
- `now()` / `NOW()` → `current_timestamp` (a SQLite keyword).
- `::type` casts (e.g. `'{}'::jsonb`) → removed (Postgres-only syntax).
- `USING <method>` on an index (`gin`/`btree`/`hash`/`gist`) → removed
  (SQLite indexes have no access method).

These are no-ops on already-SQLite DDL (the executor's own migrations don't use
them), so it is safe to run on every migration file.

```typescript
function translateDdlToSqlite(sql: string): string
```

- `sql` — Raw migration SQL, possibly in Postgres dialect.

**Returns:** SQLite-compatible SQL.

### Constants

#### `pool`

The SQLite connection pool instance.

```typescript
const pool: DatabasePool
```

#### `store`

Default DataStore proxy backed by the lazily-initialized default pool.

```typescript
const store: DataStore
```

## Core Interface
Implements `@molecule/api-database` interface.

## Bond Wiring

Setup function to register this provider with the core interface:

```typescript
import { setPool, setStore } from '@molecule/api-database'
import { pool, store } from '@molecule/api-database-sqlite'

export function setupDatabaseSqlite(): void {
  setPool(pool)
  setStore(store)
}
```

## Injection Notes

### Requirements

Peer dependencies:
- `@molecule/api-bond` ^1.0.0
- `@molecule/api-database` ^1.0.0

### Environment Variables

- `SQLITE_PATH` *(optional)* — default: `./data/app.db`

### Runtime Dependencies

- `better-sqlite3`

Configure via the SQLITE_PATH environment variable (default: ./data/app.db).
WAL mode and foreign key constraints are enabled by default.
