/**
 * Postgres migration runner factory — re-exported from the PostgreSQL
 * bond.
 *
 * The `createMigrator` implementation lives in
 * `@molecule/api-database-postgresql` because it is Postgres-specific
 * bootstrapping plumbing (`CREATE DATABASE`, the `pg_database` catalog
 * probe, raw `pg.Client` connections). This bond-setup package must not
 * import the concrete `pg` driver directly — it reaches Postgres only
 * through the `@molecule/api-database-postgresql` bond it already
 * peer-depends on. App `scripts/migrate.ts` files keep importing
 * `createMigrator` from here unchanged.
 *
 * @module
 */

export { createMigrator } from '@molecule/api-database-postgresql'
