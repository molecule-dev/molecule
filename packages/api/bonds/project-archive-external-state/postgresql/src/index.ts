/**
 * Capture and restore a project's PostgreSQL databases for
 * `@molecule/api-project-archive`.
 *
 * It dumps to a file and loads the file back. That is the whole package —
 * `pg_dump --format=custom` on the way out, `pg_restore` on the way in.
 *
 * ```ts
 * import { setExternalStateProvider } from '@molecule/api-project-archive'
 * import { createPostgresqlExternalStateProvider } from '@molecule/api-project-archive-external-state-postgresql'
 *
 * setExternalStateProvider(
 *   createPostgresqlExternalStateProvider({
 *     // YOUR deployment provisioned these, so it states them. Nothing is discovered.
 *     databaseUrls: (projectId) => [`postgres://user:pw@db:5432/app_${projectId}`],
 *   }),
 * )
 * ```
 *
 * @remarks
 * **It never asks the server what a project owns — `databaseUrls` says.** An
 * earlier version tried to discover databases by querying the server, and there
 * is no way to do that safely: `information_schema` views omit rows the account
 * cannot see, so a missing grant is indistinguishable from "this project has no
 * database". Since the caller DESTROYS the project after a successful capture,
 * that inference deletes live data. Discovery was removed rather than hardened.
 * An empty array is the only way to declare a project owns nothing, and a
 * resolver returning anything that is not an array of URLs is an error.
 *
 * **`pg_dump` and `pg_restore` must be on PATH**, and their version must match
 * the server's — a client older than the server refuses the dump. Neither is
 * bundled; a missing binary throws at capture time naming the tool.
 *
 * **Credentials travel in the environment, never in argv**, which any process on
 * the host can read. Pass them in the connection URL; this package moves them to
 * `PG*` variables for the child.
 *
 * **`restore` runs `--clean --if-exists`**: it DROPS the objects it is about to
 * load. It is a restore into a database you expect to be replaced, not a merge.
 *
 * @module
 */

export * from './browser-guard.js'
export * from './dump.js'
export * from './provider.js'
export * from './types.js'
