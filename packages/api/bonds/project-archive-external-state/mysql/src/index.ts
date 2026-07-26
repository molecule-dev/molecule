/**
 * Capture and restore a project's MySQL databases for
 * `@molecule/api-project-archive`.
 *
 * It dumps to a file and loads the file back. That is the whole package —
 * `mysqldump` on the way out, `mysql` on the way in.
 *
 * ```ts
 * import { setExternalStateProvider } from '@molecule/api-project-archive'
 * import { createMysqlExternalStateProvider } from '@molecule/api-project-archive-external-state-mysql'
 *
 * setExternalStateProvider(
 *   createMysqlExternalStateProvider({
 *     // YOUR deployment provisioned these, so it states them. Nothing is discovered.
 *     databaseUrls: (projectId) => [`mysql://user:pw@db:3306/app_${projectId}`],
 *   }),
 * )
 * ```
 *
 * @remarks
 * **It never asks the server what a project owns — `databaseUrls` says.** MySQL
 * filters `information_schema` BY PRIVILEGE, so an account missing one grant
 * sees zero rows, identical to the schema not existing — and a provisioning race
 * produces exactly that transiently. Since the caller DESTROYS the project after
 * a successful capture, discovering databases that way deletes live data. No
 * query fixes it (`TABLES`, `VIEWS`, `ROUTINES` and `mysqldump`'s own
 * `SHOW TABLES` share the privilege), so discovery was removed rather than
 * hardened.
 *
 * **The dump includes routines, triggers and events**, none of which
 * `mysqldump` includes by default — their absence is silent, and a restored
 * database would simply be missing its stored logic.
 *
 * **`mysqldump` and `mysql` must be on PATH.** The password travels in
 * `MYSQL_PWD`, never in argv, which any process on the host can read.
 *
 * **`restore` replays the dump into an existing database.** It does not create
 * or drop it; provision the database first.
 *
 * @module
 */

export * from './browser-guard.js'
export * from './dump.js'
export * from './provider.js'
export * from './types.js'
