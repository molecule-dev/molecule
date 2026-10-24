/**
 * Capture and restore a project's DuckDB databases for
 * `@molecule/api-project-archive`.
 *
 * It byte-copies the configured `.duckdb` files (and their `.wal` siblings)
 * into the archive, and writes them back on restore. That is the whole
 * package.
 *
 * @example
 * ```typescript
 * import { setExternalStateProvider } from '@molecule/api-project-archive'
 * import { createDuckdbExternalStateProvider } from '@molecule/api-project-archive-external-state-duckdb'
 *
 * setExternalStateProvider(
 *   createDuckdbExternalStateProvider({
 *     databasePaths: (projectId) => [`/var/lib/app/${projectId}/app.duckdb`],
 *   }),
 * )
 * ```
 *
 * @remarks
 * **If the database file lives inside the project's source tree and is
 * committed, you do not need this package** — whatever archives the source tree
 * already carries it, and capturing it here duplicates the bytes. It exists for
 * a database kept OUTSIDE the tree, or one the project's `.gitignore` excludes.
 *
 * **A byte copy, not `EXPORT DATABASE`, deliberately.** DuckDB holds a
 * per-process WRITE lock on an open database file, so the archiver cannot open
 * a live read-write database at all — a copy is the only whole-file read
 * available. The `.wal` sibling is captured with the main file and replayed by
 * DuckDB on the next open, so the pair is the database's current state. For the
 * cleanest copy, stop the app (or run `CHECKPOINT`) first.
 *
 * **A configured path with no file is an ERROR, not an absence.** A path
 * template one directory off would otherwise capture nothing and report
 * success, and the caller destroys the project on a successful capture. Only
 * an empty `databasePaths` result declares that a project owns no database.
 *
 * **Never two writers on one file.** DuckDB allows one read-write process per
 * database file; restore only writes files, so it is safe, but the restored
 * file must not be open elsewhere while the app that owns it boots.
 *
 * @module
 */

export * from './browser-guard.js'
export * from './provider.js'
export * from './types.js'
