/**
 * Capture and restore a project's SQLite databases for
 * `@molecule/api-project-archive`.
 *
 * It dumps to a file and loads the file back. That is the whole package —
 * `sqlite3 <db> .dump` on the way out, replayed on the way in.
 *
 * @example
 * ```typescript
 * import { mkdtemp, rm } from 'node:fs/promises'
 * import { tmpdir } from 'node:os'
 * import { join } from 'node:path'
 *
 * import type { ArchivePart, ProjectExternalStateRecord } from '@molecule/api-project-archive'
 * import {
 *   getExternalStateProviders,
 *   requireProvider,
 *   setExternalStateProvider,
 *   setProvider,
 * } from '@molecule/api-project-archive'
 * import { createSqliteExternalStateProvider } from '@molecule/api-project-archive-external-state-sqlite'
 * import { provider as objectStorageArchive } from '@molecule/api-project-archive-object-storage'
 * import { setProvider as setUploads } from '@molecule/api-uploads'
 * import { provider as filesystemUploads } from '@molecule/api-uploads-filesystem'
 *
 * // Where YOUR deployment keeps each project's database — a declaration, never a search.
 * const databasePathOf = (projectId: string) => join(process.cwd(), 'databases', `${projectId}.db`)
 *
 * // Startup: uploads bond, archive bond, then this bond. `[]` is the ONLY way to say "owns none".
 * setUploads(filesystemUploads)
 * setProvider(objectStorageArchive)
 * setExternalStateProvider(
 *   createSqliteExternalStateProvider({ databasePaths: (projectId) => [databasePathOf(projectId)] }),
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
 *   await rm(databasePathOf(projectId)) // only now may the live database go
 * }
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
 * **Restore routes records back by `kind`** (`'sqlite'`): read
 * `external-state/records.json` out of the restored parts, write each recorded
 * part to disk, then call `getExternalStateProvider(record.kind)?.restore({ projectId,
 * records, partPath })` — and FAIL if that returns `null`. `restore` replays the SQL
 * with `sqlite3 <path>` into the path `databasePaths` names (a record whose path
 * `databasePaths` no longer lists THROWS). It is a replay, not a merge — restore
 * into a fresh file.
 *
 * @module
 */

export * from './browser-guard.js'
export * from './dump.js'
export * from './provider.js'
export * from './types.js'
