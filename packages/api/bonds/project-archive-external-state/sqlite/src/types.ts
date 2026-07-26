/**
 * Configuration for the SQLite external-state provider.
 *
 * @module
 */

/** How this deployment finds a project's SQLite databases. */
export interface SqliteExternalStateConfig {
  /**
   * The filesystem paths of every SQLite database belonging to `projectId`.
   *
   * **This is a DECLARATION, not a search.** An empty array means the project
   * genuinely owns none — and it is the ONLY way to say that. A path that is
   * listed but missing is an ERROR, never an absence: a path template one
   * directory off would otherwise capture nothing, report success, and let the
   * caller destroy the only copy. Nothing else in a deployment reads this
   * setting, so a wrong path has no other symptom.
   *
   * @param projectId - The project being archived or restored.
   * @returns Its database file paths; `[]` when it owns none.
   */
  databasePaths: (projectId: string) => readonly string[] | Promise<readonly string[]>
}
