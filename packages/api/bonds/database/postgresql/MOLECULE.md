# @molecule/api-database-postgresql

The PostgreSQL client.

## Type
`provider`

## Installation
```bash
npm install @molecule/api-database-postgresql pg
npm install -D @types/pg
```

## API

### Functions

#### `createPool(config)`

Creates a new pool with custom configuration.

Use this when you need a pool with different settings than the default.

```typescript
function createPool(config?: DatabaseConfig): DatabasePool
```

- `config` — Database connection configuration (host, port, user, password, SSL, pool size).

**Returns:** A new `DatabasePool` backed by a fresh pg connection pool.

#### `createStore(pool)`

Creates a DataStore backed by a PostgreSQL DatabasePool.

```typescript
function createStore(pool: DatabasePool): DataStore
```

- `pool` — The PostgreSQL `DatabasePool` to use for queries.

**Returns:** A `DataStore` that translates CRUD operations to SQL queries.

### Constants

#### `pool`

The PostgreSQL connection pool instance.

Example usage:
```ts
import * as Database from '@molecule/api-database-postgresql'

const queryDB = async () => {
  const result = await Database.pool.query(`SELECT * FROM "table"`)

  // ...

  return result?.rows
}
```

```typescript
const pool: DatabasePool
```

#### `store`

Lazily-initialized default `DataStore` backed by the default pool.

```typescript
const store: DataStore
```

### Namespaces

#### `setup`

## Core Interface
Implements `@molecule/api-database` interface.

## Injection Notes

### Requirements

Peer dependencies:
- `@molecule/api-database` ^1.0.0

### Environment Variables

- `DATABASE_URL` *(required)* — default: `postgres://localhost:5432/myapp`

### Runtime Dependencies

- `pg`
