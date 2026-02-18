# @molecule/api-database

Database core interface for molecule.dev.

Defines the standard interface for database providers, including both
raw connection pools and the database-agnostic DataStore abstraction.

## Type
`core`

## Installation
```bash
npm install @molecule/api-database
```

## Usage

```typescript
import { setStore, findById, findMany, create, updateById, deleteById } from '@molecule/api-database'
import { store } from '@molecule/api-database-postgresql'

// Wire the DataStore at app startup
setStore(store)

// CRUD operations — database-agnostic
const user = await findById<User>('users', userId)

const activeUsers = await findMany<User>('users', {
  where: [
    { field: 'status', operator: '=', value: 'active' },
  ],
  orderBy: [{ field: 'createdAt', direction: 'desc' }],
  limit: 50,
})

await create('users', { id, username, email })
await updateById('users', id, { name: 'New Name' })
await deleteById('users', id)
```

## API

### Interfaces

#### `DatabaseConfig`

Database connection options (host, port, credentials, pool size, timeouts, SSL).

```typescript
interface DatabaseConfig {
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
```

#### `DatabaseConnection`

Database connection interface.

```typescript
interface DatabaseConnection {
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
```

#### `DatabasePool`

Database pool interface.

All database providers must implement this interface.

```typescript
interface DatabasePool {
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
```

#### `DatabaseProvider`

Database provider interface.

```typescript
interface DatabaseProvider {
  /**
   * The connection pool.
   */
  pool: DatabasePool

  /**
   * Creates a new pool with the given configuration.
   */
  createPool?(config: DatabaseConfig): DatabasePool
}
```

#### `DatabaseTransaction`

Database transaction with commit and rollback (extends DatabaseConnection).

```typescript
interface DatabaseTransaction extends DatabaseConnection {
  /**
   * Commits the transaction.
   */
  commit(): Promise<void>

  /**
   * Rolls back the transaction.
   */
  rollback(): Promise<void>
}
```

#### `DataStore`

Abstract data store interface.

Provides database-agnostic CRUD methods. Each database bond
implements these using its native query language.

```typescript
interface DataStore {
  /**
   * Find a single record by its primary key.
   */
  findById<T = Record<string, unknown>>(table: string, id: string | number): Promise<T | null>

  /**
   * Find a single record matching conditions.
   */
  findOne<T = Record<string, unknown>>(table: string, where: WhereCondition[]): Promise<T | null>

  /**
   * Find many records with filtering, sorting, and pagination.
   */
  findMany<T = Record<string, unknown>>(table: string, options?: FindManyOptions): Promise<T[]>

  /**
   * Count records matching conditions.
   */
  count(table: string, where?: WhereCondition[]): Promise<number>

  /**
   * Insert a new record. Returns the inserted row.
   */
  create<T = Record<string, unknown>>(
    table: string,
    data: Record<string, unknown>,
  ): Promise<MutationResult<T>>

  /**
   * Update a record by primary key. Returns the updated row.
   */
  updateById<T = Record<string, unknown>>(
    table: string,
    id: string | number,
    data: Record<string, unknown>,
  ): Promise<MutationResult<T>>

  /**
   * Update records matching conditions.
   */
  updateMany(
    table: string,
    where: WhereCondition[],
    data: Record<string, unknown>,
  ): Promise<MutationResult>

  /**
   * Delete a record by primary key.
   */
  deleteById(table: string, id: string | number): Promise<MutationResult>

  /**
   * Delete records matching conditions.
   */
  deleteMany(table: string, where: WhereCondition[]): Promise<MutationResult>
}
```

#### `FindManyOptions`

Options for findMany queries.

```typescript
interface FindManyOptions {
  where?: WhereCondition[]
  orderBy?: OrderBy[]
  limit?: number
  offset?: number
  select?: string[]
}
```

#### `MutationResult`

Result of a mutation operation.

```typescript
interface MutationResult<T = Record<string, unknown>> {
  /** The affected/returned row, if any. */
  data: T | null
  /** Number of rows affected. */
  affected: number
}
```

#### `OrderBy`

Column sort order (field name and ascending/descending direction).

```typescript
interface OrderBy {
  field: string
  direction: 'asc' | 'desc'
}
```

#### `QueryResult`

Query result with rows and metadata.

```typescript
interface QueryResult<T = Record<string, unknown>> {
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
```

#### `WhereCondition`

Filter condition for queries.

```typescript
interface WhereCondition {
  field: string
  operator:
    | '='
    | '!='
    | '>'
    | '<'
    | '>='
    | '<='
    | 'in'
    | 'not_in'
    | 'like'
    | 'is_null'
    | 'is_not_null'
  value?: unknown
}
```

### Functions

#### `connect()`

Acquires a dedicated connection from the bonded pool. The connection must
be released after use by calling `connection.release()`.

```typescript
function connect(): Promise<DatabaseConnection>
```

**Returns:** A database connection that must be released after use.

#### `count(table, where)`

Counts records matching the given filter conditions, or all records
if no conditions are specified.

```typescript
function count(table: string, where?: WhereCondition[]): Promise<number>
```

- `table` — The database table name.
- `where` — Optional filter conditions.

**Returns:** The number of matching records.

#### `create(table, data)`

Inserts a new record into the table. Returns the inserted row and
the number of affected rows (always 1 on success).

```typescript
function create(table: string, data: Record<string, unknown>): Promise<MutationResult<T>>
```

- `table` — The database table name.
- `data` — The column values to insert as key-value pairs.

**Returns:** A `MutationResult` with the inserted row and affected count.

#### `deleteById(table, id)`

Deletes a record identified by its primary key.

```typescript
function deleteById(table: string, id: string | number): Promise<MutationResult<Record<string, unknown>>>
```

- `table` — The database table name.
- `id` — The primary key value of the record to delete.

**Returns:** A `MutationResult` with the affected count (1 if deleted, 0 if not found).

#### `deleteMany(table, where)`

Deletes all records matching the given filter conditions.

```typescript
function deleteMany(table: string, where: WhereCondition[]): Promise<MutationResult<Record<string, unknown>>>
```

- `table` — The database table name.
- `where` — Filter conditions to select records to delete.

**Returns:** A `MutationResult` with the number of deleted rows.

#### `end()`

Closes all connections in the bonded pool. Call during graceful shutdown.

```typescript
function end(): Promise<void>
```

**Returns:** A promise that resolves when all connections have been closed.

#### `findById(table, id)`

Finds a single record by its primary key (`id` column).

```typescript
function findById(table: string, id: string | number): Promise<T | null>
```

- `table` — The database table name.
- `id` — The primary key value to look up.

**Returns:** The matching record cast to `T`, or `null` if not found.

#### `findMany(table, options)`

Finds multiple records with optional filtering, sorting, pagination,
and column selection.

```typescript
function findMany(table: string, options?: FindManyOptions): Promise<T[]>
```

- `table` — The database table name.
- `options` — Query options including `where`, `orderBy`, `limit`, `offset`, and `select`.

**Returns:** Array of matching records cast to `T`.

#### `findOne(table, where)`

Finds a single record matching the given filter conditions. Returns the
first match if multiple rows satisfy the conditions.

```typescript
function findOne(table: string, where: WhereCondition[]): Promise<T | null>
```

- `table` — The database table name.
- `where` — Array of filter conditions to match against.

**Returns:** The matching record cast to `T`, or `null` if none found.

#### `getPool()`

Retrieves the bonded database pool, throwing if none is configured.

```typescript
function getPool(): DatabasePool
```

**Returns:** The bonded database pool.

#### `getStore()`

Retrieves the bonded DataStore, throwing if none is configured.

```typescript
function getStore(): DataStore
```

**Returns:** The bonded DataStore implementation.

#### `hasPool()`

Checks whether a database pool is currently bonded.

```typescript
function hasPool(): boolean
```

**Returns:** `true` if a database pool is bonded.

#### `hasStore()`

Checks whether a DataStore is currently bonded.

```typescript
function hasStore(): boolean
```

**Returns:** `true` if a DataStore is bonded.

#### `query(text, values)`

Executes a parameterized SQL query using the bonded pool.

```typescript
function query(text: string, values?: unknown[]): Promise<QueryResult<T>>
```

- `text` — SQL query text with placeholders (`$1`, `$2`, etc.).
- `values` — Parameter values corresponding to the placeholders.

**Returns:** The query result containing `rows`, `rowCount`, and optional `fields`.

#### `setPool(pool)`

Registers a database connection pool as the active singleton. Called by
bond packages during application startup.

```typescript
function setPool(pool: DatabasePool): void
```

- `pool` — The database pool implementation to bond.

#### `setStore(store)`

Registers a DataStore implementation as the active singleton. Called by
bond packages during application startup.

```typescript
function setStore(store: DataStore): void
```

- `store` — The DataStore implementation to bond.

#### `updateById(table, id, data)`

Updates a record identified by its primary key. Returns the updated row
and the number of affected rows.

```typescript
function updateById(table: string, id: string | number, data: Record<string, unknown>): Promise<MutationResult<T>>
```

- `table` — The database table name.
- `id` — The primary key value of the record to update.
- `data` — The column values to update as key-value pairs.

**Returns:** A `MutationResult` with the updated row and affected count.

#### `updateMany(table, where, data)`

Updates all records matching the given filter conditions.

```typescript
function updateMany(table: string, where: WhereCondition[], data: Record<string, unknown>): Promise<MutationResult<Record<string, unknown>>>
```

- `table` — The database table name.
- `where` — Filter conditions to select records to update.
- `data` — The column values to update as key-value pairs.

**Returns:** A `MutationResult` with the affected count.

## Available Providers

| Provider | Package |
|----------|---------|
| MySQL | `@molecule/api-database-mysql` |
| PostgreSQL | `@molecule/api-database-postgresql` |

## Injection Notes

### Requirements

Peer dependencies:
- `@molecule/api-bond` ^1.0.0
- `@molecule/api-i18n` ^1.0.0

## Translations

Translation strings are provided by `@molecule/api-locales-database`.
