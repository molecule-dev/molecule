/**
 * Project archive core interface for molecule.dev.
 *
 * Defines the `ProjectArchiveProvider` contract — cold-storage `archive`,
 * `restore`, `status`, and `remove` for a DORMANT project — along with the
 * generic content channel (`ArchivePart`), the artifact shape
 * (`ArchiveManifest`, `ArchiveResult`, `ArchiveVerification`, `ArchiveStatus`),
 * and the accessor (`setProvider`/`getProvider`/`hasProvider`/`requireProvider`).
 * Interface-only: bond a storage provider package to get an implementation.
 *
 * The job is exactly this: **store some bytes durably, prove they came back,
 * give them back.**
 *
 * @remarks
 * - **An archive captures ONLY the external state whose bond is REGISTERED — and the
 *   caller then destroys the original.** Every state-owning provider the app uses (each
 *   `@molecule/api-database` bond, …) needs its matching
 *   `@molecule/api-project-archive-external-state-*` bond wired with
 *   `setExternalStateProvider(...)` (registered under its own `kind`). Capture from
 *   `getExternalStateProviders()` — ALL of them — before `archive()`, pack their `parts`,
 *   and store their `records` in the artifact: restore routes each record to
 *   `getExternalStateProvider(record.kind)` and must FAIL if that returns `null`. A capture
 *   that throws means STOP — never archive-and-destroy without it. An external-state bond
 *   never DISCOVERS what a project owns; its injected resolver DECLARES it, and only an
 *   empty result means "owns nothing".
 * - **Wire it at startup with `setProvider(...)` — or the equivalent
 *   `bond('project-archive', provider)`.** This core routes through the shared
 *   `@molecule/api-bond` registry, so either call registers the same provider and
 *   `validateBonds()` reports it as missing when unwired.
 * - **Deciding WHICH files to archive is the CALLER's job, and this package
 *   deliberately does not do it.** Use git. A project workspace is a repo,
 *   `.gitignore` already declares what is disposable, `git clean -Xdf` removes
 *   it, and `git ls-files --cached --others --exclude-standard` lists what
 *   survives — twenty years of solved semantics that users already write. There
 *   is no exclude list, no policy object, no per-ecosystem preset and no filter
 *   helper in this package: every part you hand `archive()` is archived. The
 *   layer that used to do this shipped two silent-data-loss bugs — a directory
 *   exclude applied to filenames deleted `src/build/compiler.ts`, `src/tmp.ts`,
 *   `src/build.rs` and `src/dist.config.js` with no signal, and a separator
 *   disagreement let `config\.env` reach plaintext storage. It is gone.
 * - **ONE exception, and it is a security rule rather than a filter: a part
 *   whose path has ANY segment equal to `.env`, or starting with `.env.`
 *   (case-INSENSITIVE), makes `archive()` THROW.** Not configurable, no opt-out,
 *   no options object. The artifact is NOT encrypted at rest, so a dotenv part
 *   writes live credentials into plaintext object storage and rotation is the
 *   only remedy left; whether your `.gitignore` happens to exclude `.env` is
 *   your choice, and a choice is not a sound basis for a credential outcome.
 *   Both widenings are load-bearing: a basename-only compare archived
 *   `.env/prod.key` and `config/.env/staging`, and a case-sensitive one archived
 *   `.ENV`, `.Env` and `.eNv.production`. Keep secrets in the platform's
 *   encrypted vault and re-inject them on restore. (The same applies to
 *   `metadata`/`meta`, which the manifest carries in the clear, and to a
 *   `.git/config` remote URL with an embedded `user:token@host` — scrub those
 *   before archiving.)
 * - **NOTHING IS PRIVILEGED: an archive is a list of `parts`, and that is the
 *   whole content channel.** A source file, a `pg_dump`, a Redis snapshot, a
 *   Meilisearch index and a `git bundle` are all `ArchivePart`s — each just a
 *   `path` + `content` (+ optional `mode`, `kind`, `meta`). There is no
 *   `files` field, no `databaseDump` field, and no database format enum, so a
 *   SECOND database or any new content type is one more part, never a new
 *   field. Group parts with a path convention you choose (`source/…`,
 *   `database/…`, `repos/…`) — the provider does not parse it.
 * - **The archive NEVER interprets `kind` or `meta`.** They are opaque labels
 *   recorded verbatim into the manifest for the CALLER's restore logic. A
 *   provider must not branch on them, must not decode a part's bytes, and must
 *   treat every part identically. Consequence: a `{ format: 'pg_custom' }` dump
 *   restored into a non-Postgres engine fails when YOU run `pg_restore`, not at
 *   archive time — record enough in `meta` (dump format, engine version, git
 *   remote and head sha) that a restore can route each part correctly.
 * - **`verified: true` is the ONLY signal that may precede releasing the live
 *   project. Nothing else counts — not "it didn't throw", not a successful
 *   upload, not a non-empty `storageId`.** `verified` is true only after the
 *   provider re-read the artifact back OUT of storage at the minted id,
 *   re-hashed the downloaded bytes against the pre-upload sha256, parsed the
 *   manifest from those downloaded bytes, matched the part count, AND unpacked
 *   the artifact to recompute the parts digest and byte total against
 *   `manifest.parts.sha256`/`bytes` (`verification.digestMatched` — the one
 *   flag that proves the packer actually preserved the bytes). A verification
 *   failure does NOT throw: it comes back as `verified: false` +
 *   `verification.error`, so code that ignores the return value and reaps the
 *   sandbox anyway destroys the only copy. Check the flag.
 * - **`archive()` THROWS on an empty part set — it will never hand back a
 *   verified empty archive.** A workspace walk that silently returned `[]`
 *   would otherwise verify perfectly (an empty artifact round-trips fine) and
 *   the caller would delete a real project. `ArchiveInput.minParts` (default
 *   `1`) is the floor, and `ArchiveInput.requiredPaths` is the stronger guard —
 *   list the parts a restore cannot do without (`source/package.json`, the
 *   lockfile, `database/main.dump`) and a partial walk throws instead of
 *   shipping an unrestorable artifact. Unsafe or duplicate paths, a dotenv
 *   part, an exceeded size cap, and a failed upload throw too; those are never
 *   archives, so there is nothing for the caller to weigh. (A provider caps the
 *   stored artifact BEFORE decompressing anything it downloads, caps the
 *   decompressed payload separately as the decompression-bomb guard, and never
 *   embeds archive bytes in an error message.)
 * - **Every `archive()` mints a NEW `storageId`; re-archiving NEVER overwrites
 *   the previous artifact.** The id comes from the uploads bond, which assigns
 *   its own (the shipped bonds mint a UUID and ignore the supplied filename) —
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
 * - **Archiving is for DORMANT projects.** Do NOT archive a project a user is
 *   actively editing — the artifact is a point-in-time snapshot, and writes that
 *   land after the parts are read are silently lost. Pick projects that have been
 *   idle long enough that a snapshot is the whole truth.
 * - **`restore()` VALIDATES the payload against the manifest and throws on
 *   mismatch.** It re-checks the part count against `manifest.parts.count`, the
 *   recomputed parts digest against `manifest.parts.sha256`, and the total bytes
 *   against `manifest.parts.bytes`. A partial or tampered artifact fails loudly —
 *   it never yields half a project. Do not catch that error and write whatever
 *   came back anyway.
 * - **`manifest.parts.sha256` covers EVERYTHING the manifest asserts** — the
 *   part bytes, the per-part index you route on, and the header
 *   (`formatVersion`, `projectId`, `createdAt`, `parts.count`, `parts.bytes`,
 *   `metadata`) — and a manifest carrying any UNDECLARED key is refused
 *   outright. Anything outside the digest is an unauthenticated instruction to
 *   your restore path. **But the digest is UNKEYED and lives inside the
 *   artifact, so it cannot detect a WHOLESALE RE-FORGE** — an attacker with
 *   bucket write access replaces the artifact and recomputes a consistent
 *   digest. If that is in your threat model, persist
 *   `result.manifest.parts.sha256` beside `result.storageId` and compare it on
 *   restore; nothing inside the artifact can do it for you.
 * - **`restore()` returns bytes; it does NOT recreate a sandbox, a database, or
 *   a git remote.** It hands back `parts` — the CALLER re-provisions, routes
 *   each part by the `kind`/`meta` it recorded, writes the source, applies the
 *   dump, unbundles the repo, and re-injects secrets from the vault. Nothing is
 *   running when `restore()` resolves.
 * - **`ArchivePart.path` is POSIX-relative and CANONICAL** — no leading slash,
 *   no `..` segments, no drive letter, no backslash ANYWHERE, no NUL bytes, no
 *   repeated or trailing separator, no whitespace-padded segment, not empty or
 *   `.`-only, and no two parts that collide after normalisation. Both sides
 *   enforce this: on the caller's RAW path before any artifact-internal
 *   prefixing, and again on the stripped path at restore. A restore that wrote
 *   an absolute or escaping path would write outside the new workspace. A path
 *   that normalisation would CHANGE is REJECTED rather than rewritten, so the
 *   path you sent is the path the manifest records — and so ONE model decides
 *   what a segment is for path safety, the dotenv refusal and collision
 *   detection alike. When those disagreed, `config\.env` archived and verified:
 *   a live credential in plaintext object storage. Modes are masked to `0o777`,
 *   so setuid/setgid/sticky bits never survive a round trip.
 *
 * @example
 * ```typescript
 * import { execFile } from 'node:child_process'
 * import { mkdtemp, readFile, rm } from 'node:fs/promises'
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
 * import { createSqliteExternalStateProvider } from '@molecule/api-project-archive-external-state-sqlite'
 * import { provider as objectStorageArchive } from '@molecule/api-project-archive-object-storage'
 * import { setProvider as setUploads } from '@molecule/api-uploads'
 * import { provider as filesystemUploads } from '@molecule/api-uploads-filesystem'
 *
 * const projectsRoot = join(process.cwd(), 'projects')
 * const databasePathOf = (id: string) => join(process.cwd(), 'databases', `${id}.db`)
 *
 * // Startup: storage FIRST (FILE_UPLOAD_PATH; `-s3` in production), then the archive, then
 * // ONE external-state bond per state-owning provider. Unregistered state is NOT captured —
 * // and is then deleted with the project. Paths are DECLARED; `[]` = "owns no database".
 * setUploads(filesystemUploads)
 * setProvider(objectStorageArchive)
 * setExternalStateProvider(
 *   createSqliteExternalStateProvider({ databasePaths: (id) => [databasePathOf(id)] }),
 * )
 *
 * const projectId = 'proj_123'
 * const projectDir = join(projectsRoot, projectId)
 * const archiveIdByProject = new Map<string, string>() // your projects table in a real app
 *
 * // 1. Source: git decides what is disposable. Every part handed to archive() is kept.
 * const git = async (...args: string[]) =>
 *   (await promisify(execFile)('git', args, { cwd: projectDir })).stdout
 * await git('clean', '-Xdf')
 * const files = (await git('ls-files', '--cached', '--others', '--exclude-standard'))
 *   .split('\n')
 *   .filter(Boolean)
 * const parts: ArchivePart[] = await Promise.all(
 *   files.map(async (file) => ({
 *     path: `source/${file}`,
 *     content: await readFile(join(projectDir, file)),
 *     kind: 'source',
 *   })),
 * )
 *
 * // 2. State outside the tree: capture from EVERY registered bond. A throw aborts here.
 * const records: ProjectExternalStateRecord[] = []
 * const workDir = await mkdtemp(join(tmpdir(), 'archive-'))
 * try {
 *   for (const stateProvider of getExternalStateProviders().values()) {
 *     const captured = await stateProvider.capture({ projectId, workDir })
 *     parts.push(...captured.parts)
 *     records.push(...captured.records)
 *   }
 * } finally {
 *   await rm(workDir, { recursive: true, force: true })
 * }
 * // The record index is what restore routes by (getExternalStateProvider(record.kind)).
 * const index = new TextEncoder().encode(JSON.stringify(records))
 * parts.push({ path: 'external-state/records.json', content: index, kind: 'external-state' })
 *
 * // 3. Archive, requiring every captured part so a partial walk THROWS.
 * const result = await requireProvider().archive({
 *   projectId,
 *   parts,
 *   requiredPaths: ['source/package.json', ...records.flatMap((r) => (r.part ? [r.part] : []))],
 *   metadata: { reason: 'dormant-30d' },
 * })
 *
 * // 4. `verified: true` is the ONLY signal that allows destroying anything.
 * if (result.verified) {
 *   const previousStorageId = archiveIdByProject.get(projectId)
 *   archiveIdByProject.set(projectId, result.storageId) // persist FIRST — no lookup by project
 *   await rm(projectDir, { recursive: true, force: true })
 *   await rm(databasePathOf(projectId), { force: true })
 *   if (previousStorageId && previousStorageId !== result.storageId) {
 *     await requireProvider().remove(previousStorageId) // old artifact only AFTER the new verified
 *   }
 * }
 * // Not verified: keep the live project AND the previous archive; log result.verification, retry.
 * ```
 *
 * @module
 */

export * from './browser-guard.js'
export * from './provider.js'
export * from './types.js'
