/**
 * Configuration for the PostgreSQL external-state provider.
 *
 * @module
 */

/** How this deployment finds a project's PostgreSQL databases. */
export interface PostgresqlExternalStateConfig {
  /**
   * The connection URLs of every database belonging to `projectId`.
   *
   * **This is a DECLARATION, not a query.** The deployment provisioned these
   * databases, so it knows what they are; this provider never goes looking. An
   * empty array means the project genuinely owns none — and it is the ONLY way
   * to say that.
   *
   * Why it matters: the caller destroys the project once a capture succeeds. An
   * earlier version of this package tried to discover a project's databases by
   * querying the server, and every way of doing that is indistinguishable from a
   * permissions failure — `information_schema` views omit rows the account cannot
   * see, so a missing grant reads exactly like "this project has no database".
   * Discovery was removed rather than hardened.
   *
   * @param projectId - The project being archived or restored.
   * @returns Its database connection URLs; `[]` when it owns none.
   */
  databaseUrls: (projectId: string) => readonly string[] | Promise<readonly string[]>
}
