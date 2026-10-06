/**
 * Configuration for the PGlite external-state provider.
 *
 * @module
 */

/** How this deployment finds a project's PGlite databases. */
export interface PgliteExternalStateConfig {
  /**
   * The data directory of every PGlite database belonging to `projectId` —
   * the same strings handed to `createPool({ dataDir })` in
   * `@molecule/api-database-pglite`.
   *
   * **This is a DECLARATION, not a search.** An empty array means the project
   * genuinely owns none — and it is the ONLY way to say that. Each entry is
   * either:
   *
   * - a filesystem path (relative paths resolve against the working directory,
   *   exactly as the database bond resolves them). It must already hold a
   *   PGlite data directory at capture time; a missing or empty folder is an
   *   ERROR, never an absence, because a path template one directory off would
   *   otherwise capture nothing and let the caller destroy the only copy.
   * - `'memory://'` — the project's database lives in memory and has nothing
   *   durable to capture. Capture records that explicitly (a record with no
   *   part) so the archive says so, instead of the database silently not
   *   appearing.
   *
   * Any other scheme (`idb://…`) is refused: it cannot be reached from a server.
   *
   * @param projectId - The project being archived or restored.
   * @returns Its data directories; `[]` when it owns none.
   */
  dataDirs: (projectId: string) => readonly string[] | Promise<readonly string[]>

  /**
   * How long (ms) to wait for the database's single connection before giving
   * up, when the app's own pool is busy with it. Capture takes the same lock
   * the app's pool uses, so a dump never runs in the middle of a transaction.
   * Defaults to 30 000.
   */
  acquireTimeoutMillis?: number

  /**
   * Largest uncompressed data directory (bytes) a restore will unpack. Guards
   * against a decompression bomb in a tampered archive. Defaults to 2 GiB.
   */
  maxDataDirBytes?: number
}
