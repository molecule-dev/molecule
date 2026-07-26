/**
 * Configuration for the MySQL external-state provider.
 *
 * @module
 */

/** How this deployment finds a project's MySQL databases. */
export interface MysqlExternalStateConfig {
  /**
   * The connection URLs of every database belonging to `projectId`.
   *
   * **This is a DECLARATION, not a query.** The deployment provisioned these
   * databases, so it knows what they are; this provider never goes looking. An
   * empty array means the project genuinely owns none — and it is the ONLY way
   * to say that.
   *
   * Why it matters more here than anywhere: MySQL filters `information_schema`
   * BY PRIVILEGE. An account without a grant on a schema sees zero rows, which
   * is byte-for-byte identical to the schema not existing — and a provisioning
   * race produces exactly that state transiently. An earlier version of this
   * package queried `information_schema.SCHEMATA` and read zero rows as "this
   * project owns no database", which, since the caller destroys the project once
   * a capture succeeds, deleted live databases. There is no query that closes
   * this: `TABLES`, `VIEWS`, `ROUTINES` and `mysqldump`'s own `SHOW TABLES` are
   * filtered by the same privilege. Discovery was removed rather than hardened.
   *
   * @param projectId - The project being archived or restored.
   * @returns Its database connection URLs; `[]` when it owns none.
   */
  databaseUrls: (projectId: string) => readonly string[] | Promise<readonly string[]>
}
