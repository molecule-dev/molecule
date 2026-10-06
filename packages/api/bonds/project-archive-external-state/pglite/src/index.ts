/**
 * Capture and restore a project's PGlite databases for
 * `@molecule/api-project-archive`.
 *
 * It dumps each data directory with PGlite's own `dumpDataDir` and loads it
 * back with the `loadDataDir` option, so a restore reproduces the database
 * exactly — the same files, not a replay of SQL.
 *
 * @example
 * ```typescript
 * import { setExternalStateProvider } from '@molecule/api-project-archive'
 * import { createPgliteExternalStateProvider } from '@molecule/api-project-archive-external-state-pglite'
 *
 * setExternalStateProvider(
 *   createPgliteExternalStateProvider({
 *     // The same dataDir each project's pool was created with.
 *     dataDirs: (projectId) => [`/var/lib/app/${projectId}/pglite`],
 *   }),
 * )
 * ```
 *
 * @example
 * ```typescript
 * // A project whose database lives in memory: declare it. The archive then
 * // records it as having nothing durable instead of silently leaving it out.
 * createPgliteExternalStateProvider({
 *   dataDirs: (projectId) => (isEphemeral(projectId) ? ['memory://'] : []),
 * })
 * ```
 *
 * @remarks
 * **Bond the SAME copy of `@molecule/api-database-pglite` your app uses** (it
 * is a peer dependency for that reason). Capture and restore go through that
 * package's instance registry: when the app's pool has a folder open, capture
 * JOINS that instance and waits for its single connection, so a dump never runs
 * mid-transaction and a second PGlite is never opened on the same folder (two
 * instances on one folder overwrite each other's files). Never point another
 * PROCESS at a folder while it is being captured or restored — PGlite does not
 * lock its data directory.
 *
 * **Verified before the caller may destroy anything.** Capture counts every
 * table's rows under the connection lock, dumps, then loads the dump into a
 * scratch in-memory instance and checks the counts match. The record carries
 * the dump's SHA-256 and byte size; restore refuses bytes that do not match
 * them, refuses to unpack more than `maxDataDirBytes` (default 2 GiB), and
 * checks the restored database's row counts against the recorded ones.
 *
 * **Restore only into an empty or absent folder.** A folder that already holds
 * anything is refused, so a live database is never overwritten. If a restore
 * fails, the folder is put back the way it was found (removed, or emptied).
 * End the app's pools on that folder before restoring.
 *
 * **Absence is DECLARED, never inferred.** Only an empty `dataDirs` result says
 * a project owns no database. A declared folder with no PGlite data directory
 * in it (no `PG_VERSION`) is an ERROR — opening PGlite there would create a
 * fresh empty database and capture that. `'memory://'` is the explicit way to
 * say "nothing durable"; `idb://` and other schemes are refused.
 *
 * **If the data directory lives inside the project's source tree and is
 * committed, you do not need this package** — whatever archives the source
 * tree already carries it.
 *
 * @module
 */

export * from './browser-guard.js'
export * from './datadir.js'
export * from './provider.js'
export * from './types.js'
