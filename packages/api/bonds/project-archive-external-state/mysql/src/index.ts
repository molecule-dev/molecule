/**
 * Capture and restore a project's MySQL databases for
 * `@molecule/api-project-archive`.
 *
 * It dumps to a file and loads the file back. That is the whole package —
 * `mysqldump` on the way out, `mysql` on the way in.
 *
 * @example
 * ```typescript
 * import { execFile } from 'node:child_process'
 * import { mkdtemp, rm } from 'node:fs/promises'
 * import { tmpdir } from 'node:os'
 * import { join } from 'node:path'
 * import { promisify } from 'node:util'
 *
 * import type { ArchivePart, ProjectExternalStateRecord } from '@molecule/api-project-archive'
 * import {
 *   getExternalStateProviders,
 *   requireProvider,
 *   setExternalStateProvider,
 *   setProvider,
 * } from '@molecule/api-project-archive'
 * import { createMysqlExternalStateProvider } from '@molecule/api-project-archive-external-state-mysql'
 * import { provider as objectStorageArchive } from '@molecule/api-project-archive-object-storage'
 * import { setProvider as setUploads } from '@molecule/api-uploads'
 * import { provider as filesystemUploads } from '@molecule/api-uploads-filesystem'
 *
 * // YOUR deployment provisioned one database per project, so it DECLARES it. Nothing is discovered.
 * // The password comes from MYSQL_PWD in the environment (or the URL) — never argv.
 * const databaseNameOf = (projectId: string) => `app_${projectId}`
 * const databaseUrlOf = (projectId: string) =>
 *   `mysql://archiver@db.example.com:3306/${databaseNameOf(projectId)}`
 *
 * // Startup: uploads bond, archive bond, then this bond. `[]` is the ONLY way to say "owns none".
 * setUploads(filesystemUploads)
 * setProvider(objectStorageArchive)
 * setExternalStateProvider(
 *   createMysqlExternalStateProvider({ databaseUrls: (projectId) => [databaseUrlOf(projectId)] }),
 * )
 *
 * // Archive a DORMANT project's external state (archive its source tree too — see the core).
 * const projectId = 'proj_123'
 * const parts: ArchivePart[] = []
 * const records: ProjectExternalStateRecord[] = []
 * const workDir = await mkdtemp(join(tmpdir(), 'archive-'))
 * try {
 *   for (const stateProvider of getExternalStateProviders().values()) {
 *     const captured = await stateProvider.capture({ projectId, workDir }) // throws = STOP
 *     parts.push(...captured.parts)
 *     records.push(...captured.records)
 *   }
 * } finally {
 *   await rm(workDir, { recursive: true, force: true })
 * }
 * const index = new TextEncoder().encode(JSON.stringify(records)) // restore routes by record.kind
 * parts.push({ path: 'external-state/records.json', content: index, kind: 'external-state' })
 *
 * const result = await requireProvider().archive({
 *   projectId,
 *   parts,
 *   requiredPaths: records.flatMap((record) => (record.part ? [record.part] : [])),
 * })
 * const archiveIdByProject = new Map<string, string>() // your projects table in a real app
 * if (result.verified) {
 *   archiveIdByProject.set(projectId, result.storageId) // persist FIRST — no lookup by project
 *   // Only now may the live database go.
 *   await promisify(execFile)('mysqladmin', [
 *     '--host=db.example.com',
 *     '--user=archiver',
 *     '--force',
 *     'drop',
 *     databaseNameOf(projectId),
 *   ])
 * }
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
 * **Restore routes records back by `kind`** (`'mysql'`) and matches each record
 * to a URL by DATABASE NAME: a record whose database `databaseUrls` no longer lists
 * THROWS.
 *
 * @module
 */

export * from './browser-guard.js'
export * from './dump.js'
export * from './provider.js'
export * from './types.js'
