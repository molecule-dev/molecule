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

#### `createMigrator(migrationsDir)`

Returns a `runMigrations()` function bound to the given directory.

```typescript
function createMigrator(migrationsDir: string): () => Promise<void>
```

- `migrationsDir` — Absolute path to the directory containing

**Returns:** A no-arg `runMigrations()` that creates the database (if
 *   missing) and applies every migration file in lexical order.

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

#### `deriveSsl(databaseUrl)`

Derive the `ssl` option for a `pg` connection from a database URL, **secure
by default**. The three-way rule (identical everywhere a pg client/pool is
created so the behaviour cannot drift):

1. **Local / explicit no-SSL** (`isLocalUrl`) → `false` (no TLS).
2. **Private-CA managed provider** (`PGSSLROOTCERT` set) → verify against
   that CA bundle (`{ ca, rejectUnauthorized: true }`). Verification stays ON.
3. **Remote, no explicit opt-out** → `true`: negotiate TLS and **verify the
   server certificate against the system CA store**. This is the default and
   closes the MITM hole that a blanket `rejectUnauthorized: false` opened.

Verification is relaxed to `{ rejectUnauthorized: false }` **only** when the
operator explicitly asks — `DATABASE_SSL_REJECT_UNAUTHORIZED=false` or
`sslmode=no-verify` in the URL — and a loud warning is logged once, because
that mode is vulnerable to man-in-the-middle interception of credentials and
data. Operators behind a private CA should set `PGSSLROOTCERT` instead.

```typescript
function deriveSsl(databaseUrl: string): boolean | ConnectionOptions | undefined
```

- `databaseUrl` — The Postgres connection URL.

**Returns:** The `ssl` value for `pg.ClientConfig` / `pg.PoolConfig`.

#### `isLocalUrl(url)`

Returns `true` when the connection URL points at a local / explicitly
no-SSL Postgres, where TLS verification is neither possible nor meaningful.

Recognizes loopback hosts, unix-socket URLs, and an explicit
`sslmode=disable` — the standard libpq opt-out. The latter lets a caller
reach a no-SSL Postgres over a private/non-localhost address (e.g. a sandbox
reaching the host DB via the docker bridge gateway, or the sandbox Postgres
at `172.17.0.1` which doesn't speak SSL) without us having to guess from the
host. Production URLs without it still default to verified SSL.

```typescript
function isLocalUrl(url: string): boolean
```

- `url` — The PostgreSQL connection URL.

**Returns:** `true` if the URL points to a local or explicitly no-SSL database.

### Constants

#### `databasePostgresqlSecretDefinitions`

Secret definitions required by the PostgreSQL database bond.

```typescript
const databasePostgresqlSecretDefinitions: SecretDefinition[]
```

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

## Bond Wiring

Setup function to register this provider with the core interface:

```typescript
import { setPool, setStore } from '@molecule/api-database'
import { pool, store } from '@molecule/api-database-postgresql'

export function setupDatabasePostgresql(): void {
  setPool(pool)
  setStore(store)
}
```

## Injection Notes

### Requirements

Peer dependencies:
- `@molecule/api-bond` ^1.0.0
- `@molecule/api-database` ^1.0.0
- `@molecule/api-secrets` ^1.0.0

### Environment Variables

- `DATABASE_URL` *(required)* — PostgreSQL connection URL — default: `postgres://molecule:molecule@127.0.0.1:5432/myapp`
  - **Provisioned automatically in molecule.dev sandboxes** — manual setup only needed outside the platform.
  - Setup: Postgres connection string; locally, use the Docker Compose default.
  - Example: `postgres://user:pass@localhost:5432/myapp`

### Runtime Dependencies

- `pg`

Bond this as the DataStore (`setStore(store)`); app code then uses the abstract
`@molecule/api-database` functions (findMany/create/…), never raw pg. The connection comes
from the `DATABASE_URL` env var (server-side) — don't hardcode credentials.

- **SSL is verify-by-default** (derived from the URL): a MANAGED database (Supabase, Neon,
  RDS, Heroku) requires SSL and works out of the box; local Postgres needs none. Do NOT
  disable certificate verification to silence a cert error — that opens a MITM on your DB
  traffic. Fix the URL / CA instead (e.g. `?sslmode=require`).
- Tables are created by timestamped `.sql` files in `migrations/` (the runner applies them
  on boot) — never `CREATE TABLE` at runtime; ids are UUID strings (see `@molecule/api-database`).
- **Pool `max` defaults to 10** (not the server's `max_connections`) — tune with
  `DATABASE_POOL_MAX`. A migration file with a genuine error (not an idempotent
  "already exists") now FAILS the boot with every broken file named, instead of
  warn-logging and booting with a partial schema.
- **`like` is case-insensitive (emits `ILIKE`) and does NOT escape the value** — the
  caller's own `%`/`_` are honored as wildcards, identical to the sqlite/mysql bonds. For
  human-typed search input, use `ilike` instead (escapes + auto-wraps `%…%`) — see
  `WhereCondition['operator']` in `@molecule/api-database`.
