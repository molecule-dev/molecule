/**
 * Migration runner factories.
 *
 * `createMigrator` (Postgres) is re-exported from the PostgreSQL bond: it is
 * Postgres-specific bootstrapping plumbing (`CREATE DATABASE`, the
 * `pg_database` catalog probe, raw `pg.Client` connections), and this
 * bond-setup package must not import the concrete `pg` driver directly — it
 * reaches Postgres only through the `@molecule/api-database-postgresql` bond
 * it already peer-depends on. App `scripts/migrate.ts` files keep importing
 * `createMigrator` from here unchanged.
 *
 * `createMigratorPglite` is the same contract for the PGlite bond (the
 * zero-server "browser" profile), loaded lazily because that bond is an
 * optional peer.
 *
 * @module
 */

export { createMigrator } from '@molecule/api-database-postgresql'

/**
 * Returns a `runMigrations()` that applies every `*.sql` file in
 * `migrationsDir`, in lexical order, to `@molecule/api-database-pglite`'s
 * default pool — the pool `setupDatabasePglite()` bonds, so the schema
 * lands in the database the app queries (an in-memory PGlite database exists
 * only inside that one instance). Same files and same "already exists is a
 * warning, anything else fails the boot" contract as `createMigrator`; there
 * is no `CREATE DATABASE` step.
 *
 * Further directories run after it, each in its own lexical order — e.g. a
 * scaffolded app's `__setup__/` (resource-package DDL such as `payments.sql`)
 * after `migrations/`, the order the scaffolded Postgres runner uses. A
 * directory that does not exist counts as empty.
 *
 * @param migrationsDir - Absolute path to the app's `migrations/` directory.
 * @param extraDirs - Absolute paths of further `*.sql` directories to apply after it, in order.
 * @returns A no-arg migration runner.
 */
export function createMigratorPglite(
  migrationsDir: string,
  ...extraDirs: string[]
): () => Promise<void> {
  return async function runMigrations(): Promise<void> {
    const { createMigrator: createPgliteMigrator } = await import('@molecule/api-database-pglite')
    for (const dir of [migrationsDir, ...extraDirs]) {
      await createPgliteMigrator(dir)()
    }
  }
}
