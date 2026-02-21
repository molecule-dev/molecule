# @molecule/api-database-sqlite

SQLite database provider for molecule.dev.

Provides DatabasePool and DataStore implementations backed by
better-sqlite3. Ideal for lightweight services, status pages,
and single-instance deployments.

## Type
`provider`

## Installation
```bash
npm install @molecule/api-database-sqlite better-sqlite3
npm install -D @types/better-sqlite3
```

## Usage

```typescript
import { setPool, setStore } from '@molecule/api-database'
import { pool, store } from '@molecule/api-database-sqlite'

setPool(pool)
setStore(store)
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

#### `convertPlaceholders(text, values)`

Convert PostgreSQL-style positional placeholders ($1, $2, ...) to SQLite-style (?) placeholders.
Also reorders values array to match the placeholder order.

```typescript
function convertPlaceholders(text: string, values?: unknown[]): { text: string; values: unknown[]; }
```

- `text` — SQL query text with $N placeholders.
- `values` — Parameter values ordered by $N index.

**Returns:** The query text with ? placeholders and reordered values.

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
