/**
 * Capture and restore a project's SQLite databases for
 * `@molecule/api-project-archive`.
 *
 * It dumps to a file and loads the file back. That is the whole package —
 * `sqlite3 <db> .dump` on the way out, replayed on the way in.
 *
 * ```ts
 * import { setExternalStateProvider } from '@molecule/api-project-archive'
 * import { createSqliteExternalStateProvider } from '@molecule/api-project-archive-external-state-sqlite'
 *
 * setExternalStateProvider(
 *   createSqliteExternalStateProvider({
 *     databasePaths: (projectId) => [`/var/lib/app/${projectId}/app.db`],
 *   }),
 * )
 * ```
 *
 * @remarks
 * **If the database file lives inside the project's source tree and is
 * committed, you do not need this package** — whatever archives the source tree
 * already carries it, and capturing it here duplicates the bytes. It exists for a
 * database kept OUTSIDE the tree, or one the project's `.gitignore` excludes.
 *
 * **`.dump` rather than a file copy, deliberately.** It reads inside a
 * transaction, so it is consistent against a live database; copying the file can
 * catch a checkpoint mid-write, or a `-wal`/`-shm` pair that does not match the
 * main file. It also emits portable SQL, so a restore does not depend on the page
 * format of the build that wrote it.
 *
 * **A configured path with no file is an ERROR, not an absence.** A path template
 * one directory off would otherwise capture nothing and report success, and the
 * caller destroys the project on a successful capture. Only an empty
 * `databasePaths` result declares that a project owns no database.
 *
 * **`sqlite3` must be on PATH.**
 *
 * @module
 */

export * from './browser-guard.js'
export * from './dump.js'
export * from './provider.js'
export * from './types.js'
