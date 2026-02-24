# @molecule/api-database-mysql

MySQL database provider for molecule.dev.

## Type
`provider`

## Installation
```bash
npm install @molecule/api-database-mysql mysql2
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
    host?: string;
    /**
     * Database port.
     */
    port?: number;
    /**
     * Database name.
     */
    database?: string;
    /**
     * Database user.
     */
    user?: string;
    /**
     * Database password.
     */
    password?: string;
    /**
     * Connection string (alternative to individual fields).
     */
    connectionString?: string;
    /**
     * Maximum number of connections in the pool.
     */
    max?: number;
    /**
     * Minimum number of connections in the pool.
     */
    min?: number;
    /**
     * Connection timeout in milliseconds.
     */
    connectionTimeoutMillis?: number;
    /**
     * Idle timeout in milliseconds.
     */
    idleTimeoutMillis?: number;
    /**
     * Enable SSL.
     */
    ssl?: boolean | {
        rejectUnauthorized?: boolean;
        ca?: string;
        key?: string;
        cert?: string;
    };
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
    query<T = Record<string, unknown>>(text: string, values?: unknown[]): Promise<QueryResult<T>>;
    /**
     * Releases the connection back to the pool.
     */
    release(): void;
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
    query<T = Record<string, unknown>>(text: string, values?: unknown[]): Promise<QueryResult<T>>;
    /**
     * Acquires a connection from the pool.
     */
    connect(): Promise<DatabaseConnection>;
    /**
     * Begins a transaction.
     */
    transaction?(): Promise<DatabaseTransaction>;
    /**
     * Closes all connections in the pool.
     */
    end(): Promise<void>;
    /**
     * Returns pool statistics (optional).
     */
    stats?(): {
        total: number;
        idle: number;
        waiting: number;
    };
}
```

#### `DatabaseTransaction`

Database transaction with commit and rollback (extends DatabaseConnection).

```typescript
interface DatabaseTransaction extends DatabaseConnection {
    /**
     * Commits the transaction.
     */
    commit(): Promise<void>;
    /**
     * Rolls back the transaction.
     */
    rollback(): Promise<void>;
}
```

#### `Pool`

```typescript
interface Pool extends Connection {
  getConnection(): Promise<PoolConnection>;

  releaseConnection(connection: PoolConnection): void;

  on(event: 'connection', listener: (connection: PoolConnection) => any): this;
  on(event: 'acquire', listener: (connection: PoolConnection) => any): this;
  on(event: 'release', listener: (connection: PoolConnection) => any): this;
  on(event: 'enqueue', listener: () => any): this;

  end(): Promise<void>;

  pool: CorePool;
}
```

#### `PoolConnection`

```typescript
interface PoolConnection extends Connection {
  release(): void;
  connection: Connection;
  [Symbol.asyncDispose](): Promise<void>;
}
```

#### `PoolOptions`

```typescript
interface PoolOptions extends ConnectionOptions {
  /**
   * Determines the pool's action when no connections are available and the limit has been reached. If true, the pool will queue
   * the connection request and call it when one becomes available. If false, the pool will immediately call back with an error.
   * (Default: true)
   */
  waitForConnections?: boolean;

  /**
   * The maximum number of connections to create at once. (Default: 10)
   */
  connectionLimit?: number;

  /**
   * The maximum number of idle connections. (Default: same as `connectionLimit`)
   */
  maxIdle?: number;

  /**
   * The idle connections timeout, in milliseconds. (Default: 60000)
   */
  idleTimeout?: number;

  /**
   * The maximum number of connection requests the pool will queue before returning an error from getConnection. If set to 0, there
   * is no limit to the number of queued connection requests. (Default: 0)
   */
  queueLimit?: number;
}
```

#### `QueryResult`

Query result with rows and metadata.

```typescript
interface QueryResult<T = Record<string, unknown>> {
    /**
     * Array of rows returned by the query.
     */
    rows: T[];
    /**
     * Number of rows affected (for INSERT, UPDATE, DELETE).
     */
    rowCount: number | null;
    /**
     * Column metadata (optional, provider-dependent).
     */
    fields?: Array<{
        name: string;
        dataTypeID?: number;
    }>;
}
```

#### `ResultSetHeader`

```typescript
declare interface ResultSetHeader {
  constructor: {
    name: 'ResultSetHeader';
  };
  affectedRows: number;
  fieldCount: number;
  info: string;
  insertId: number;
  serverStatus: number;
  warningStatus: number;
  /**
   * @deprecated
   * `changedRows` is deprecated and might be removed in the future major release. Please use `affectedRows` property instead.
   */
  changedRows: number;
}
```

#### `RowDataPacket`

```typescript
declare interface RowDataPacket {
  constructor: {
    name: 'RowDataPacket';
  };
  [column: string]: any;
  [column: number]: any;
}
```

### Functions

#### `createPool(config)`

Creates a MySQL database pool that implements the `DatabasePool` interface.
Reads `MYSQL_URL`, `MYSQL_HOST`, `MYSQL_PORT`, `MYSQL_DATABASE`, `MYSQL_USER`,
and `MYSQL_PASSWORD` from env if not provided in config.

```typescript
function createPool(config?: DatabaseConfig): DatabasePool
```

- `config` — Database connection configuration.

**Returns:** A `DatabasePool` backed by a MySQL connection pool.

### Constants

#### `pool`

The default MySQL pool instance, created with env-based configuration.

```typescript
const pool: DatabasePool
```

## Core Interface
Implements `@molecule/api-database` interface.

## Injection Notes

### Requirements

Peer dependencies:
- `@molecule/api-bond` ^1.0.0
- `@molecule/api-database` ^1.0.0

### Environment Variables

- `MYSQL_URL` *(required)*

### Runtime Dependencies

- `mysql2`
