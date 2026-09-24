/**
 * `@molecule/api-project-archive-external-state-d1` — captures and restores a
 * project's **Cloudflare D1** databases so archiving a Workers project does not
 * silently drop its data.
 *
 * `@molecule/api-project-archive` destroys the original once `result.verified`
 * is true. State whose provider was never written is captured by nobody,
 * verifies clean, and is then permanently deleted — so every state-owning
 * provider bond needs one of these. This is D1's.
 *
 * Capture shells out to `wrangler d1 export`, for the same reason the Postgres
 * bond shells out to `pg_dump`: only the engine that owns the data can produce a
 * consistent snapshot with schema, indexes and constraints intact.
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
 * import { createD1ExternalStateProvider } from '@molecule/api-project-archive-external-state-d1'
 * import { provider as objectStorageArchive } from '@molecule/api-project-archive-object-storage'
 * import { setProvider as setUploads } from '@molecule/api-uploads'
 * import { provider as filesystemUploads } from '@molecule/api-uploads-filesystem'
 *
 * // YOUR deployment created one D1 database per project, so it DECLARES it. Nothing is discovered.
 * // wrangler reads CLOUDFLARE_API_TOKEN / CLOUDFLARE_ACCOUNT_ID from the environment — never argv.
 * const databaseNameOf = (projectId: string) => `mol_${projectId}`
 *
 * // Startup: uploads bond, archive bond, then this bond. `[]` is the ONLY way to say "owns none".
 * setUploads(filesystemUploads)
 * setProvider(objectStorageArchive)
 * setExternalStateProvider(
 *   createD1ExternalStateProvider({ databaseNames: (projectId) => [databaseNameOf(projectId)] }),
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
 *   await promisify(execFile)('wrangler', [
 *     'd1',
 *     'delete',
 *     databaseNameOf(projectId),
 *     '--skip-confirmation',
 *   ])
 * }
 * ```
 *
 * @remarks
 * - **`databaseNames` declares; it must never search.** Asking Cloudflare which
 *   databases a project has cannot distinguish "none" from "this token cannot
 *   see them", and the caller destroys the project on a successful capture. An
 *   empty array is the only way to say "owns nothing"; a listed name that does
 *   not exist is an error.
 * - **`remote` defaults to `true`, deliberately.** `wrangler d1 export` without
 *   `--remote` dumps the LOCAL miniflare database, which in production is empty.
 *   Defaulting to local would yield a clean, successful, zero-row capture — and
 *   then the caller would destroy the real database.
 * - **A zero-byte export is treated as a failure, not an empty database.**
 *   `d1 export` always emits at least schema statements, so zero bytes means the
 *   export did not happen (wrong name, wrong account, silent auth failure).
 * - **Credentials come from the environment, never argv.** `wrangler` reads
 *   `CLOUDFLARE_API_TOKEN` / `CLOUDFLARE_ACCOUNT_ID`; a token in argv is visible
 *   in `ps` to every user on the host. `wranglerArgs` is for `--config` and
 *   similar, not secrets.
 * - **Restore replays with `wrangler d1 execute <name> --file <dump>`** into the
 *   database `databaseNames` names (a recorded name it no longer lists THROWS). It does
 *   not create the database — `wrangler d1 create` it first.
 * - **`wrangler` must be on PATH** (or pass `wranglerPath`); it is not bundled.
 *
 * @module
 */

export * from './provider.js'
export * from './types.js'
