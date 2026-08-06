/**
 * Configuration for the Cloudflare D1 external-state provider.
 *
 * @module
 */

/** How this deployment finds a project's D1 databases. */
export interface D1ExternalStateConfig {
  /**
   * The D1 database NAMES belonging to `projectId`, as `wrangler` knows them.
   *
   * **This is a DECLARATION, not a search.** An empty array means the project
   * genuinely owns none — and it is the ONLY way to say that. Asking Cloudflare
   * "which databases does this project have?" cannot distinguish "none" from
   * "this API token cannot see them", and the caller DESTROYS the project on a
   * successful capture, so an inferred absence deletes live data. A name that is
   * listed but does not exist is an ERROR, never an absence.
   *
   * @param projectId - The project being archived or restored.
   * @returns Its D1 database names; `[]` when it owns none.
   */
  databaseNames: (projectId: string) => readonly string[] | Promise<readonly string[]>

  /**
   * The `wrangler` executable. Defaults to `wrangler`.
   *
   * Capture needs D1's own tooling for the same reason `pg_dump` cannot dump
   * MySQL: the export has to come from the engine that owns the data.
   */
  wranglerPath?: string

  /**
   * Extra arguments appended to every `wrangler` invocation — typically
   * `['--config', 'wrangler.toml']` or an account selector.
   *
   * Credentials are NOT passed here. `wrangler` reads `CLOUDFLARE_API_TOKEN` /
   * `CLOUDFLARE_ACCOUNT_ID` from the environment, and a token in argv is visible
   * in `ps` to every user on the host.
   */
  wranglerArgs?: readonly string[]

  /**
   * Operate on the deployed (remote) database rather than the local emulator.
   * Defaults to `true`.
   *
   * The default is deliberate: `wrangler d1 export` without `--remote` dumps the
   * LOCAL miniflare database, which in production is empty. Defaulting to local
   * would produce a clean, successful, zero-row capture — and then the caller
   * would destroy the real one.
   */
  remote?: boolean
}
