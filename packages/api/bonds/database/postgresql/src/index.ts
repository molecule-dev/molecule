/**
 * The PostgreSQL client.
 *
 * @remarks
 * Bond this as the DataStore (`setStore(store)`); app code then uses the abstract
 * `@molecule/api-database` functions (findMany/create/…), never raw pg. The connection comes
 * from the `DATABASE_URL` env var (server-side) — don't hardcode credentials.
 *
 * - **SSL is verify-by-default** (derived from the URL): a MANAGED database (Supabase, Neon,
 *   RDS, Heroku) requires SSL and works out of the box; local Postgres needs none. Do NOT
 *   disable certificate verification to silence a cert error — that opens a MITM on your DB
 *   traffic. Fix the URL / CA instead (e.g. `?sslmode=require`).
 * - Tables are created by timestamped `.sql` files in `migrations/` (the runner applies them
 *   on boot) — never `CREATE TABLE` at runtime; ids are UUID strings (see `@molecule/api-database`).
 * - **Pool `max` defaults to 10** (not the server's `max_connections`) — tune with
 *   `DATABASE_POOL_MAX`. A migration file with a genuine error (not an idempotent
 *   "already exists") now FAILS the boot with every broken file named, instead of
 *   warn-logging and booting with a partial schema.
 * - **`like` is case-insensitive (emits `ILIKE`) and does NOT escape the value** — the
 *   caller's own `%`/`_` are honored as wildcards, identical to the sqlite/mysql bonds. For
 *   human-typed search input, use `ilike` instead (escapes + auto-wraps `%…%`) — see
 *   `WhereCondition['operator']` in `@molecule/api-database`.
 * - **`pool.transaction()` is implemented** (parity with the sqlite/mysql
 *   bonds, so transactional code ports across the bonds unchanged): it acquires
 *   a dedicated client, issues `BEGIN`, and returns a `DatabaseTransaction`
 *   whose `query()` runs on that client and whose `commit()`/`rollback()` run
 *   the matching SQL and release the client back to the pool. Call `commit()`
 *   on success and `rollback()` on a thrown error; either one (or a bare
 *   `release()`) returns the client exactly once, so wrap in try/catch/finally
 *   and never leak it.
 * - **The pool fails fast when `DATABASE_URL` is unset**: first use throws an
 *   actionable "DATABASE_URL is not set" error (via `@molecule/api-secrets`)
 *   instead of silently connecting to the pg driver defaults (localhost:5432,
 *   OS user) and failing later with a raw `ECONNREFUSED`/auth error far from
 *   the cause. An explicit `createPool(config)` is the caller's own choice and
 *   is not second-guessed. (The one-shot migration runner still defaults its
 *   URL but prints the `DATABASE_URL` to check on a connection failure.)
 * - One-off bootstrap SQL (grants, extensions, seed data) goes in `.sql` files
 *   under a `__setup__` directory (run via the exported `setup` namespace);
 *   versioned schema belongs in `migrations` only.
 *
 * @module
 */

import pg from 'pg'

import { getLogger } from '@molecule/api-bond'
import type {
  DatabaseConfig,
  DatabaseConnection,
  DatabasePool,
  DatabaseTransaction,
} from '@molecule/api-database'
import { configNotConfiguredError } from '@molecule/api-secrets'

export * from './browser-guard.js'
export * from './migrator.js'
export * from './secrets.js'
export * as setup from './setup/index.js'
export * from './ssl.js'

import { deriveSsl } from './ssl.js'

/**
 * Wraps a pg `PoolClient` that has already issued `BEGIN` as a
 * `DatabaseTransaction`. Its `query()` runs on the dedicated client (so every
 * statement lands in the same transaction), and `commit()`/`rollback()` issue
 * the matching SQL and then release the client back to the pool. A bare
 * `release()` returns the client without ending the transaction. Releasing is
 * guarded so a double call (e.g. `commit()` followed by a stray `release()`)
 * cannot trip pg's "client already released" error — the client is returned
 * exactly once. Mirrors the mysql bond's `wrapTransaction`.
 *
 * @param client - A pg pool client with an open transaction.
 * @returns A `DatabaseTransaction` bound to that client.
 */
function wrapTransaction(client: pg.PoolClient): DatabaseTransaction {
  let released = false
  const releaseOnce = (): void => {
    if (!released) {
      released = true
      client.release()
    }
  }

  return {
    async query<T = Record<string, unknown>>(text: string, values?: unknown[]) {
      const result = await client.query<T & pg.QueryResultRow>(text, values)
      return {
        rows: result.rows as T[],
        rowCount: result.rowCount,
        fields: result.fields?.map((f) => ({ name: f.name, dataTypeID: f.dataTypeID })),
      }
    },
    release() {
      releaseOnce()
    },
    async commit() {
      try {
        await client.query('COMMIT')
      } finally {
        releaseOnce()
      }
    },
    async rollback() {
      try {
        await client.query('ROLLBACK')
      } finally {
        releaseOnce()
      }
    },
  }
}

/**
 * Wraps a `pg.Pool` instance into a `DatabasePool`-compatible interface,
 * adapting query results and connection management.
 *
 * @param pgPool - The underlying `pg.Pool` to wrap.
 * @returns A `DatabasePool` that delegates to the provided pg pool.
 */
function wrapPool(pgPool: pg.Pool): DatabasePool {
  // Set statement_timeout on each new connection to prevent runaway queries
  pgPool.on('connect', (client: pg.PoolClient) => {
    client
      .query("SET statement_timeout = '30s'; SET idle_in_transaction_session_timeout = '60s';")
      .catch((error: Error) => {
        // Best-effort, but never silent: without these session settings the
        // runaway-query / idle-transaction protection is quietly absent.
        getLogger().warn('Failed to set statement timeouts on new database connection', { error })
      })
  })

  // Handle errors from idle clients in the pool to prevent unhandled exceptions
  // that would crash the process (e.g., network interruption, server restart).
  pgPool.on('error', (err: Error) => {
    getLogger().error('Unexpected error on idle database client', err.message)
  })

  return {
    async query<T = Record<string, unknown>>(text: string, values?: unknown[]) {
      const result = await pgPool.query<T & pg.QueryResultRow>(text, values)
      return {
        rows: result.rows as T[],
        rowCount: result.rowCount,
        fields: result.fields?.map((f) => ({ name: f.name, dataTypeID: f.dataTypeID })),
      }
    },

    async connect(): Promise<DatabaseConnection> {
      const client = await pgPool.connect()
      return {
        async query<T = Record<string, unknown>>(text: string, values?: unknown[]) {
          const result = await client.query<T & pg.QueryResultRow>(text, values)
          return {
            rows: result.rows as T[],
            rowCount: result.rowCount,
            fields: result.fields?.map((f) => ({ name: f.name, dataTypeID: f.dataTypeID })),
          }
        },
        release() {
          client.release()
        },
      }
    },

    async transaction(): Promise<DatabaseTransaction> {
      // Parity with the sqlite/mysql bonds: acquire a dedicated client, open
      // the transaction with BEGIN, and return a DatabaseTransaction whose
      // commit()/rollback() release the client. Release on a failed BEGIN so a
      // client never leaks back to the pool with a half-started transaction.
      const client = await pgPool.connect()
      try {
        await client.query('BEGIN')
      } catch (error) {
        client.release()
        throw error
      }
      return wrapTransaction(client)
    },

    async end() {
      await pgPool.end()
    },

    stats() {
      return {
        total: pgPool.totalCount,
        idle: pgPool.idleCount,
        waiting: pgPool.waitingCount,
      }
    },
  }
}

/**
 * Lazily-initialized default pool. Created on first property access so that
 * process.env.DATABASE_URL has been populated by resolveAll() first.
 */
let _pool: DatabasePool | null = null

/**
 * Returns the lazily-initialized default pool, creating it from
 * `DATABASE_URL` env var on first access.
 * @returns The shared `DatabasePool` instance.
 */
function getPoolInstance(): DatabasePool {
  if (!_pool) {
    const url = process.env.DATABASE_URL
    // Fail fast with an actionable "DATABASE_URL is not set" error instead of
    // falling through to the pg driver defaults (localhost:5432, OS user, no
    // password): an unconfigured/late-resolved URL otherwise surfaces as a raw
    // ECONNREFUSED/auth error on the FIRST query, far from the real cause and
    // never naming the env var to set. Parity with the mysql bond's createPool
    // fail-fast. The explicit-config createPool() path below is the caller's
    // deliberate choice and is never second-guessed here.
    if (!url) {
      throw configNotConfiguredError('DATABASE_URL', 'the PostgreSQL database connection')
    }
    // SSL is verify-by-default via the shared `deriveSsl` helper (see ssl.ts):
    // remote DBs verify the server certificate against the system CA store,
    // relaxing ONLY on explicit operator opt-out. Keep this in lockstep with the
    // migrator + scaffolded scripts by reusing the helper rather than inlining.
    const poolConfig: pg.PoolConfig = {
      connectionString: url,
      ssl: deriveSsl(url),
    }

    // Production-safe defaults: prevent runaway queries and idle transactions.
    // Pool max defaults to 10 (pg's own default; 10-20 covers the fleet). A
    // pool max EQUAL to the server's max_connections (previously 100, "within
    // Postgres's default max_connections") lets ONE app instance consume every
    // slot the server has — Postgres reserves superuser_reserved_connections=3,
    // so non-superuser clients get only 97 to start with — starving a second
    // app instance, the migrator, and even a debugging `psql` session with
    // "remaining connection slots are reserved…", which reads as a server
    // outage rather than a pool-size default. Tune via DATABASE_POOL_MAX.
    poolConfig.max = poolConfig.max ?? parseInt(process.env.DATABASE_POOL_MAX ?? '10', 10)
    poolConfig.connectionTimeoutMillis = poolConfig.connectionTimeoutMillis ?? 10_000
    poolConfig.idleTimeoutMillis = poolConfig.idleTimeoutMillis ?? 30_000

    _pool = wrapPool(new pg.Pool(poolConfig))
  }
  return _pool
}

/**
 * The PostgreSQL connection pool instance.
 *
 * Example usage:
 * ```ts
 * import * as Database from '@molecule/api-database-postgresql'
 *
 * const queryDB = async () => {
 *   const result = await Database.pool.query(`SELECT * FROM "table"`)
 *
 *   // ...
 *
 *   return result?.rows
 * }
 * ```
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

/**
 * Creates a new pool with custom configuration.
 *
 * Use this when you need a pool with different settings than the default.
 *
 * @param config - Database connection configuration (host, port, user, password, SSL, pool size).
 * @returns A new `DatabasePool` backed by a fresh pg connection pool.
 */
export const createPool = (config?: DatabaseConfig): DatabasePool =>
  wrapPool(
    new pg.Pool({
      connectionString: config?.connectionString,
      host: config?.host,
      port: config?.port,
      database: config?.database,
      user: config?.user,
      password: config?.password,
      max: config?.max,
      min: config?.min,
      connectionTimeoutMillis: config?.connectionTimeoutMillis,
      idleTimeoutMillis: config?.idleTimeoutMillis,
      ssl: config?.ssl,
    }),
  )

/**
 * DataStore implementation backed by this pool.
 *
 * @example
 * ```ts
 * import { store } from '@molecule/api-database-postgresql'
 * import { setStore } from '@molecule/api-database'
 *
 * setStore(store)
 * ```
 */
export * from './store.js'

import { createStore } from './store.js'

/**
 * Default DataStore instance backed by the default pool.
 * Lazily initialized via Proxy to defer until after secrets resolution.
 */
let _store: ReturnType<typeof createStore> | null = null
/** Lazily-initialized default `DataStore` backed by the default pool. */
export const store = new Proxy({} as ReturnType<typeof createStore>, {
  get(_, prop, receiver) {
    if (!_store) _store = createStore(getPoolInstance())
    return Reflect.get(_store, prop, receiver)
  },
  // set trap: methods run with `this` bound to the proxy — without it, instance-state writes land on the dummy target and are lost (see api-push-notifications-web-push)
  set(_, prop, value) {
    if (!_store) _store = createStore(getPoolInstance())
    return Reflect.set(_store, prop, value)
  },
})
