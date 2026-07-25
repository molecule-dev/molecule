/**
 * Project archive core interface for molecule.dev.
 *
 * Defines the `ProjectArchiveProvider` contract — cold-storage `archive`,
 * `restore`, `status`, and `remove` for a DORMANT project's source tree plus an
 * optional database dump — along with the artifact shape (`ArchiveManifest`,
 * `ArchiveResult`, `ArchiveVerification`), the `DEFAULT_ARCHIVE_EXCLUDES` list,
 * and the accessor (`setProvider`/`getProvider`/`hasProvider`/`requireProvider`).
 * Interface-only: bond a storage provider package to get an implementation.
 *
 * @remarks
 * - **Wire it at startup with `setProvider(...)` — or the equivalent
 *   `bond('project-archive', provider)`.** This core routes through the shared
 *   `@molecule/api-bond` registry, so either call registers the same provider and
 *   `validateBonds()` reports it as missing when unwired.
 * - **`verified: true` is the ONLY signal that may precede releasing the live
 *   project. Nothing else counts — not "it didn't throw", not a successful
 *   upload, not a non-empty `storageId`.** `verified` is true only after the
 *   provider re-read the artifact back OUT of storage at the minted id,
 *   re-hashed the downloaded bytes against the pre-upload sha256, parsed the
 *   manifest from those downloaded bytes, matched the entry count, AND unpacked
 *   the artifact to recompute the source digest and byte total against
 *   `manifest.source.sha256`/`bytes` (`verification.digestMatched` — the one
 *   flag that proves the packer actually preserved the files). A verification
 *   failure does NOT throw: it comes back as `verified: false` +
 *   `verification.error`, so code that ignores the return value and reaps the
 *   sandbox anyway destroys the only copy. Check the flag.
 * - **`archive()` THROWS on an empty file set — it will never hand back a
 *   verified empty archive.** A workspace walk that silently returned `[]`
 *   would otherwise verify perfectly (an empty tar round-trips fine) and the
 *   caller would delete a real project. `ArchiveInput.minEntries` (default `1`)
 *   is the floor, and `ArchiveInput.requiredPaths` is the stronger guard — list
 *   the files a restore cannot do without (`package.json`, the lockfile) and a
 *   partial walk throws instead of shipping an unrestorable artifact. Unsafe or
 *   duplicate paths and a failed upload throw too; those are never archives, so
 *   there is nothing for the caller to weigh.
 * - **Every `archive()` mints a NEW `storageId`; re-archiving NEVER overwrites
 *   the previous artifact.** The id comes from the uploads bond, which assigns
 *   its own (both shipped bonds mint a UUID and ignore the supplied filename) —
 *   it is never derived from `projectId`, so there is no key to collide on.
 *   Consequence: **remove the OLD archive only AFTER the NEW one comes back
 *   `verified: true`.** Deleting first, or overwriting in place, is how a good
 *   artifact gets destroyed by a bad replacement.
 * - **The caller MUST persist `result.storageId` (e.g. onto the project's
 *   database row). Without it the archive cannot be located, restored, or
 *   deleted — it is an orphan object burning storage.** There is NO lookup by
 *   project: `restore()` REQUIRES `storageId`, and `status(storageId)` /
 *   `remove(storageId)` take the storage id, NOT a project id. `projectId` on
 *   `RestoreInput` is only the destination label; the artifact's own owner is
 *   `manifest.projectId`.
 * - **The archive is NOT encrypted at rest by this package.** It is a plain
 *   `.tar.gz` sitting in object storage, readable by anyone with bucket access.
 *   **So secrets never go in it:** `.env` and the `.env.*` family are in
 *   `DEFAULT_ARCHIVE_EXCLUDES` for that reason, not to save bytes. Put secrets
 *   in the platform's encrypted vault and re-inject them on restore. Adding
 *   `.env` back "so restore is complete" writes production credentials into a
 *   plaintext blob — never do it. (Bucket-level SSE, if the deployment has it,
 *   is the deployment's guarantee, not this package's.)
 * - **Archiving is for DORMANT projects.** Do NOT archive a project a user is
 *   actively editing — the artifact is a point-in-time snapshot, and writes that
 *   land after the source is read are silently lost. Pick projects that have been
 *   idle long enough that a snapshot is the whole truth.
 * - **The artifact deliberately EXCLUDES `node_modules`, `dist`, and `.vite`
 *   (see `DEFAULT_ARCHIVE_EXCLUDES`) because they are reproducible from the
 *   lockfile — that exclusion is the entire cost saving** (1.5 GB of a 1.9 GB
 *   workspace measured; real source is single-digit MB). Archiving them back in
 *   "to be safe" throws away the reason to archive at all. Restore re-installs
 *   from the lockfile instead — so the lockfile itself MUST be in `files`.
 * - **`restore()` VALIDATES the payload against the manifest and throws on
 *   mismatch.** It re-checks the file count against `manifest.source.entries`,
 *   the recomputed source digest against `manifest.source.sha256`, the total
 *   bytes against `manifest.source.bytes`, and the dump's digest against
 *   `manifest.database.sha256`. A partial or tampered artifact fails loudly —
 *   it never yields half a project. Do not catch that error and write whatever
 *   came back anyway.
 * - **`restore()` returns bytes; it does NOT recreate a sandbox or a database.**
 *   It hands back `files` and `databaseDump` — the CALLER re-provisions the
 *   sandbox/container and the database, writes the files, applies the dump, and
 *   re-injects secrets from the vault. Nothing is running when `restore()`
 *   resolves.
 * - **The database dump is opaque bytes.** The provider stores and returns it
 *   without inspecting it, so pairing a `'pg_custom'` dump with a non-Postgres
 *   target will fail at RESTORE time (when the caller runs `pg_restore`), not at
 *   archive time. Record the true `databaseFormat` and re-provision a matching
 *   engine.
 * - **The caller filters the files, not the provider.** `ArchiveInput.excluded`
 *   is provenance recorded into the manifest — passing
 *   `DEFAULT_ARCHIVE_EXCLUDES` there does NOT remove anything from `files`. Apply
 *   the excludes while walking the workspace, and treat `'.env.*'` as a glob
 *   (every `.env.`-prefixed dotfile), not as a literal filename.
 * - **`ArchiveSourceFile.path` is POSIX-relative** — no leading slash, no `..`
 *   segments, no drive letter or backslash prefix, no NUL bytes, not empty or
 *   `.`-only, and no two entries that collide after normalisation. Both sides
 *   enforce this on the raw, unprefixed path; a restore that wrote an absolute
 *   or escaping path would write outside the new workspace. Modes are masked to
 *   `0o777`, so setuid/setgid/sticky bits never survive a round trip.
 *
 * @example
 * ```typescript
 * import {
 *   DEFAULT_ARCHIVE_EXCLUDES,
 *   setProvider,
 *   requireProvider,
 * } from '@molecule/api-project-archive'
 * import { provider as objectStorageArchive } from '@molecule/api-project-archive-object-storage'
 *
 * // Wire at startup (equivalently: bond('project-archive', objectStorageArchive)).
 * setProvider(objectStorageArchive)
 *
 * // …later, reaping a project that has been dormant for 30 days.
 * const archiveStore = requireProvider()
 * const previousStorageId = project.archiveStorageId // whatever we persisted last time
 *
 * const result = await archiveStore.archive({
 *   projectId,
 *   // The CALLER filters — DEFAULT_ARCHIVE_EXCLUDES is only recorded for provenance.
 *   // It drops node_modules/dist (reproducible) AND .env/.env.* (secrets: the
 *   // artifact is NOT encrypted at rest — those live in the vault).
 *   files: await readWorkspaceFiles(workspaceDir, DEFAULT_ARCHIVE_EXCLUDES),
 *   excluded: DEFAULT_ARCHIVE_EXCLUDES,
 *   // Guards against a silently-empty or partial walk: archive() THROWS rather
 *   // than returning a verified archive of nothing.
 *   minEntries: 1,
 *   requiredPaths: ['package.json', 'package-lock.json'],
 *   databaseDump: await pgDumpCustom(projectId), // pg_dump -Fc bytes
 *   databaseFormat: 'pg_custom',
 *   appDir: 'app',
 *   metadata: { reason: 'dormant-30d' },
 * })
 *
 * if (!result.verified) {
 *   // Not an archive. Keep the live project AND the previous artifact; retry later.
 *   logger.error('project archive unverified — NOT releasing sandbox', {
 *     projectId,
 *     verification: result.verification, // downloaded/checksumMatched/manifestParsed/entriesMatched/digestMatched
 *   })
 *   return
 * }
 *
 * // Verified: re-read from storage, sha256 matched, manifest parsed, entries
 * // matched, and the unpacked source digest matched the manifest.
 * // 1. PERSIST the minted storageId FIRST — without it the artifact is an
 * //    unreachable orphan (there is no lookup by projectId).
 * await db.projects.update(projectId, { archiveStorageId: result.storageId })
 *
 * // 2. Only now is it safe to release the live project…
 * await releaseSandboxAndDropDatabase(projectId)
 *
 * // 3. …and only now to delete the OLD archive: every archive() minted a NEW
 * //    storageId, so the previous artifact was never overwritten and stayed
 * //    intact as the fallback while the new one was being verified.
 * if (previousStorageId && previousStorageId !== result.storageId) {
 *   await archiveStore.remove(previousStorageId) // remove() takes a STORAGE ID
 * }
 *
 * // Waking it back up: restore() REQUIRES the persisted storageId, validates the
 * // payload against the manifest (throws on any mismatch), and returns BYTES —
 * // the caller re-provisions.
 * const storageId = project.archiveStorageId
 * const summary = await archiveStore.status(storageId) // status() takes a STORAGE ID too
 * const restored = await archiveStore.restore({ projectId, storageId })
 *
 * const sandbox = await provisionSandbox(projectId)
 * await writeFiles(sandbox, restored.files)
 * if (restored.databaseDump) {
 *   await pgRestore(await provisionDatabase(projectId), restored.databaseDump)
 * }
 * await writeSecretsFromVault(sandbox, projectId) // .env was never in the artifact
 * await runInstallFromLockfile(sandbox)           // node_modules was never archived
 * ```
 *
 * @module
 */

export * from './browser-guard.js'
export * from './provider.js'
export * from './types.js'
