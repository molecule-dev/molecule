/**
 * Capture and restore a project's PostgreSQL databases for
 * `@molecule/api-project-archive`.
 *
 * It dumps to a file and loads the file back. That is the whole package —
 * `pg_dump --format=custom` on the way out, `pg_restore` on the way in.
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
 * import { createPostgresqlExternalStateProvider } from '@molecule/api-project-archive-external-state-postgresql'
 * import { provider as objectStorageArchive } from '@molecule/api-project-archive-object-storage'
 * import { setProvider as setUploads } from '@molecule/api-uploads'
 * import { provider as filesystemUploads } from '@molecule/api-uploads-filesystem'
 *
 * // YOUR deployment provisioned one database per project, so it DECLARES it. Nothing is discovered.
 * // The password comes from PGPASSWORD in the environment (or the URL) — never argv.
 * const databaseNameOf = (projectId: string) => `app_${projectId}`
 * const databaseUrlOf = (projectId: string) =>
 *   `postgres://archiver@db.example.com:5432/${databaseNameOf(projectId)}`
 *
 * // Startup: uploads bond, archive bond, then this bond. `[]` is the ONLY way to say "owns none".
 * setUploads(filesystemUploads)
 * setProvider(objectStorageArchive)
 * setExternalStateProvider(
 *   createPostgresqlExternalStateProvider({ databaseUrls: (projectId) => [databaseUrlOf(projectId)] }),
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
 *   await promisify(execFile)('dropdb', [
 *     '--host=db.example.com',
 *     '--username=archiver',
 *     '--if-exists',
 *     '--',
 *     databaseNameOf(projectId),
 *   ])
 * }
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
 * **Restore routes records back by `kind`** (`'postgresql'`) and matches each
 * record to a URL by DATABASE NAME: a record whose database `databaseUrls` no longer
 * lists THROWS. Create the (empty) database first — `pg_restore` connects to it, it
 * does not create it.
 *
 * @module
 */

export * from './browser-guard.js'
export * from './dump.js'
export * from './provider.js'
export * from './types.js'
