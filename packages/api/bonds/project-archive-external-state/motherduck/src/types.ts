/**
 * Configuration for the MotherDuck external-state provider.
 *
 * @module
 */

/** How this deployment finds a project's MotherDuck databases, and how to reach them. */
export interface MotherduckExternalStateConfig {
  /**
   * The names of every MotherDuck database belonging to `projectId`.
   *
   * **This is a DECLARATION, not a search.** An empty array means the project
   * genuinely owns none — and it is the ONLY way to say that. A name that is
   * listed but absent from the account is an ERROR at capture time (the export
   * fails), never an absence: a wrong name would otherwise capture nothing,
   * report success, and let the caller destroy the only copy. Names may be
   * written with or without the `md:` prefix.
   *
   * @param projectId - The project being archived or restored.
   * @returns Its MotherDuck database names; `[]` when it owns none.
   */
  databases: (projectId: string) => readonly string[] | Promise<readonly string[]>

  /**
   * The MotherDuck token. Read lazily at capture/restore time. Defaults to the
   * `MOTHERDUCK_TOKEN` env var.
   */
  token?: string

  /** Which env var holds the token (default `MOTHERDUCK_TOKEN`). */
  tokenEnv?: string

  /**
   * Extra DuckDB settings for the `md:` connections this provider opens
   * (`connection_timeout`, `session_name`, …). `motherduck_token` is set by
   * this package.
   */
  config?: Record<string, string>
}
