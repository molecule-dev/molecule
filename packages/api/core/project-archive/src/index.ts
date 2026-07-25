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
 * import {
 *   type ArchivePart,
 *   requireProvider,
 *   setProvider,
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
 * // WHICH files to archive is OUR call, and git already answers it: drop
 * // everything .gitignore calls disposable, then list what is left. No exclude
 * // list lives in the archive package.
 * await exec('git', ['clean', '-Xdf'], { cwd: dir })
 * const tracked = await exec('git', ['ls-files', '--cached', '--others', '--exclude-standard'], { cwd: dir })
 *
 * // ONE generic channel. Source, a database dump and a git bundle are all parts —
 * // the archive stores their bytes verbatim and never interprets `kind`/`meta`.
 * // (`git ls-files` does not list history: archive a bundle for that.)
 * const parts: ArchivePart[] = [
 *   ...(await Promise.all(
 *     tracked.split('\n').filter(Boolean).map(async (file) => ({
 *       path: `source/${file}`,
 *       content: await readFile(join(dir, file)),
 *       kind: 'source',
 *     })),
 *   )),
 *   {
 *     path: 'database/main.dump',
 *     content: await pgDumpCustom(projectId), // pg_dump -Fc bytes
 *     kind: 'database',
 *     meta: { engine: 'postgresql', format: 'pg_custom', database: 'main' },
 *   },
 *   {
 *     path: 'repos/api.bundle',
 *     content: await gitBundle(dir), // git bundle create - --all
 *     kind: 'repo',
 *     meta: { remote: 'origin', headSha: await gitHeadSha(dir) },
 *   },
 * ]
 *
 * const result = await archiveStore.archive({
 *   projectId,
 *   parts, // every one of these is archived — a dotenv part would THROW
 *   // Guards against a silently-empty or partial walk: archive() THROWS rather
 *   // than returning a verified archive of nothing.
 *   minParts: 1,
 *   requiredPaths: ['source/package.json', 'source/package-lock.json', 'database/main.dump'],
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
 * // Verified: re-read from storage, sha256 matched, manifest parsed, parts
 * // counted, and the unpacked parts digest matched the manifest.
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
 * // the caller re-provisions and routes each part by the kind/meta it recorded.
 * const storageId = project.archiveStorageId
 * const summary = await archiveStore.status(storageId) // status() takes a STORAGE ID too
 * const restored = await archiveStore.restore({ projectId, storageId })
 *
 * const sandbox = await provisionSandbox(projectId)
 * for (const part of restored.parts) {
 *   if (part.kind === 'database') {
 *     // The archive never interpreted this — meta.format is OUR label.
 *     await pgRestore(await provisionDatabase(projectId), part.content, part.meta?.format)
 *   } else if (part.kind === 'repo') {
 *     await gitCloneFromBundle(sandbox, part.content)
 *   } else {
 *     await writeFile(sandbox, part.path.replace(/^source\//, ''), part.content, part.mode)
 *   }
 * }
 * await writeSecretsFromVault(sandbox, projectId) // dotenv parts are REFUSED, never archived
 * await runInstallFromLockfile(sandbox)           // node_modules was .gitignored, never walked
 * ```
 *
 * @module
 */

export * from './browser-guard.js'
export * from './provider.js'
export * from './types.js'
