/**
 * Project archive core interface for molecule.dev.
 *
 * Defines the `ProjectArchiveProvider` contract — cold-storage `archive`,
 * `restore`, `status`, and `remove` for a DORMANT project — along with the
 * generic content channel (`ArchivePart`), the refusal rules
 * (`ArchivePolicy`), the artifact shape (`ArchiveManifest`, `ArchiveResult`,
 * `ArchiveVerification`), the never-drop-silently filter contract
 * (`PartFilterResult`, `PartFilterOptions`), the opt-in Node/JS presets
 * (`NODE_PROJECT_EXCLUDES`, `NODE_ANY_SEGMENT_EXCLUDES`, `NODE_PROJECT_POLICY`,
 * `DOTENV_FILE_PREFIX`), and the accessor
 * (`setProvider`/`getProvider`/`hasProvider`/`requireProvider`).
 * Interface-only: bond a storage provider package to get an implementation.
 *
 * @remarks
 * - **Wire it at startup with `setProvider(...)` — or the equivalent
 *   `bond('project-archive', provider)`.** This core routes through the shared
 *   `@molecule/api-bond` registry, so either call registers the same provider and
 *   `validateBonds()` reports it as missing when unwired.
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
 *   shipping an unrestorable artifact. Unsafe or duplicate paths, a part the
 *   effective `ArchivePolicy` refuses, an exceeded size cap, and a failed
 *   upload throw too; those are never archives, so there is nothing for the
 *   caller to weigh. (A provider caps the stored artifact BEFORE decompressing
 *   anything it downloads, caps the decompressed payload separately as the
 *   decompression-bomb guard, and never embeds archive bytes in an error
 *   message.)
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
 * - **The artifact is NOT encrypted at rest by this package.** It is a plain
 *   compressed blob sitting in object storage, readable by anyone with bucket
 *   access. **So secrets never go in it** — not as a part, and not in
 *   `metadata`/`meta` (the manifest is the most readable thing in the
 *   artifact). Put secrets in the platform's encrypted vault and re-inject them
 *   on restore. `NODE_PROJECT_POLICY` REFUSES dotenv files (`.env` and the
 *   `.env.*` family, via `DOTENV_FILE_PREFIX`) for exactly this reason, and
 *   that refusal throws rather than silently dropping the part. Adding `.env`
 *   back "so restore is complete" writes production credentials into a
 *   plaintext blob — never do it. (Bucket-level SSE, if the deployment has it,
 *   is the deployment's guarantee, not this package's.)
 * - **`ArchivePolicy.refuseFilePrefixes` is CASE-INSENSITIVE and applies to
 *   EVERY path segment; `ArchivePolicy.refuseSegments` is case-SENSITIVE.** The
 *   asymmetry is deliberate, and both halves of it closed a real leak. A
 *   case-sensitive secret compare refused `.env` but archived `.ENV`, `.Env`
 *   and `.eNv.production` — the same file to every dotenv loader and to the
 *   case-insensitive filesystems (macOS, Windows) developers author them on. A
 *   basename-only compare archived a `.env` DIRECTORY (`.env/prod.key`,
 *   `config/.env/staging`), whose basename matches nothing. `refuseSegments`
 *   stays case-sensitive because Linux paths are: `Build/` and `build/` are
 *   genuinely different directories, refusing the wrong one THROWS and blocks a
 *   legitimate archive, and a miss there merely wastes bytes — whereas a missed
 *   secret is unrecoverable the moment the artifact is written. List a variant
 *   explicitly (`['node_modules', 'Node_Modules']`) if you want it refused.
 * - **The presets are ECOSYSTEM-SPECIFIC OPT-INS, not universal defaults.**
 *   `NODE_PROJECT_EXCLUDES` (advisory bulk the caller filters out) and
 *   `NODE_PROJECT_POLICY` (what a provider refuses) describe a Node/JS project
 *   and nothing else. Other ecosystems pass their own — a Python consumer
 *   `{ refuseSegments: ['.venv', '__pycache__'] }`, a Rust consumer
 *   `{ refuseSegments: ['target'] }` — per provider (configuration) or per call
 *   (`ArchiveInput.policy`). The object-storage bond defaults its policy to
 *   `NODE_PROJECT_POLICY` ONLY because Node/JS is the ecosystem molecule.dev
 *   scaffolds: that is a BOND default, NOT a contract-level truth. Never
 *   hard-code one ecosystem's bulk directories into the contract — that is the
 *   bug this version fixed.
 * - **`.git` is deliberately ARCHIVABLE and is absent from
 *   `NODE_PROJECT_EXCLUDES`.** Reproducibility is the test for excluding
 *   something, and history fails it: commits, branches and stashes cannot be
 *   regenerated from a source snapshot, so dropping `.git` silently destroys
 *   user work the archive exists to preserve. It is also small — single-digit
 *   MB against 1.5 GB of dependencies. (If a repo is large, archive a `git
 *   bundle` part instead of the `.git` directory; either way, keep the
 *   history. And scrub credentials out of remote URLs first — the artifact is
 *   plaintext.)
 * - **Archiving is for DORMANT projects.** Do NOT archive a project a user is
 *   actively editing — the artifact is a point-in-time snapshot, and writes that
 *   land after the parts are read are silently lost. Pick projects that have been
 *   idle long enough that a snapshot is the whole truth.
 * - **The caller filters, the provider refuses.** `ArchiveInput.excluded` is
 *   provenance recorded into the manifest — passing `NODE_PROJECT_EXCLUDES`
 *   there does NOT remove anything from `parts`. Apply the excludes while
 *   walking the workspace (treat `'.env.*'`-style secret names as a basename
 *   rule, not a literal filename). The policy is the loud backstop for the two
 *   cases where forgetting is catastrophic, not a substitute for the filter:
 *   excluding reproducible bulk is what makes the artifact small enough to be
 *   worth writing at all.
 * - **A filter NEVER silently returns less than it was given: it hands back
 *   `PartFilterResult` — `{ kept, dropped }`, both halves.** This package runs
 *   immediately before a caller DELETES a user's only copy, so an unreported
 *   drop is the most expensive bug it can have. Log or assert on `dropped`
 *   before releasing anything, and summarise it onto `ArchiveInput.excluded`.
 * - **Advisory excludes are ANCHORED at the FIRST path segment — except the
 *   `PartFilterOptions.anySegment` set, which defaults to
 *   `NODE_ANY_SEGMENT_EXCLUDES` (`node_modules`) and is matched at any depth.**
 *   So `'build'` drops `build/bundle.js` and leaves `src/build/compiler.ts`
 *   alone. Matching at any segment silently deleted real source: given
 *   `['src/build/compiler.ts', 'src/tmp/scratch.ts', 'app/coverage/report.ts',
 *   'src/main.ts']` and `NODE_PROJECT_EXCLUDES`, the filter kept only
 *   `src/main.ts` and dropped three legitimate source files, because `build`,
 *   `tmp` and `coverage` happened to appear deeper in the path. `node_modules`
 *   is the DEFAULT exception because a nested copy is real, is always bulk, and
 *   is never a source directory someone named on purpose — and it is a default,
 *   not a privilege: a Python walk passes `{ anySegment: ['__pycache__'] }`. A
 *   monorepo that wants every `packages/<name>/dist` gone passes those deeper
 *   paths EXPLICITLY (`'packages/api/dist'`, `'packages/app/dist'`) — the
 *   default is SAFE, and being more aggressive is the caller's explicit choice.
 *   An empty-string entry in an excludes list is REJECTED with a clear error,
 *   because `''` would degenerate the dot-entry family rule to `'.'` and
 *   silently drop every dotfile, `.git` included.
 * - **The `'<entry>.'` family rule applies ONLY to DOT entries.** `'.env'`
 *   catches `.env.local` and `'.DS_Store'` catches `.DS_Store`, wherever they
 *   sit — that is what the rule is for. A NON-dot entry (`tmp`, `build`,
 *   `dist`, `coverage`) matches a DIRECTORY segment only: never a filename and
 *   never a filename prefix, so `src/tmp.ts`, `src/build.rs`,
 *   `src/dist.config.js`, `tmp.md`, `buildings/x.ts`, `distance.ts` and a git
 *   ref named `.git/refs/heads/dist` all survive. Applied to non-dot entries it
 *   was the same silently-deletes-real-source defect one layer down.
 * - **`restore()` VALIDATES the payload against the manifest and throws on
 *   mismatch.** It re-checks the part count against `manifest.parts.count`, the
 *   recomputed parts digest against `manifest.parts.sha256`, and the total bytes
 *   against `manifest.parts.bytes`. A partial or tampered artifact fails loudly —
 *   it never yields half a project. Do not catch that error and write whatever
 *   came back anyway.
 * - **`manifest.parts.sha256` covers EVERYTHING the manifest asserts** — the
 *   part bytes, the per-part index you route on, and the header
 *   (`formatVersion`, `projectId`, `createdAt`, `parts.count`, `parts.bytes`,
 *   `excluded`, `metadata`) — and a manifest carrying any UNDECLARED key is
 *   refused outright. Anything outside the digest is an unauthenticated
 *   instruction to your restore path. **But the digest is UNKEYED and lives
 *   inside the artifact, so it cannot detect a WHOLESALE RE-FORGE** — an
 *   attacker with bucket write access replaces the artifact and recomputes a
 *   consistent digest. If that is in your threat model, persist
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
 *   what a segment is for path safety, the policy refusal, the excludes filter
 *   and collision detection alike. When those disagreed, `config\.env` archived
 *   and verified: a live credential in plaintext object storage. Modes are
 *   masked to `0o777`, so setuid/setgid/sticky bits never survive a round trip.
 *
 * @example
 * ```typescript
 * import {
 *   type ArchivePart,
 *   NODE_PROJECT_EXCLUDES,
 *   NODE_PROJECT_POLICY,
 *   requireProvider,
 *   setProvider,
 * } from '@molecule/api-project-archive'
 * import {
 *   filterArchivableParts,
 *   provider as objectStorageArchive,
 * } from '@molecule/api-project-archive-object-storage'
 *
 * // Wire at startup (equivalently: bond('project-archive', objectStorageArchive)).
 * setProvider(objectStorageArchive)
 *
 * // …later, reaping a project that has been dormant for 30 days.
 * const archiveStore = requireProvider()
 * const previousStorageId = project.archiveStorageId // whatever we persisted last time
 *
 * // ONE generic channel. Source, a database dump and a git bundle are all parts —
 * // the archive stores their bytes verbatim and never interprets `kind`/`meta`.
 * // The CALLER filters: NODE_PROJECT_EXCLUDES drops reproducible bulk (it does
 * // NOT drop .git — history is user work and is not reproducible). Excludes are
 * // anchored at the FIRST path segment except the `anySegment` set (default
 * // NODE_ANY_SEGMENT_EXCLUDES), so `src/build/compiler.ts` and `src/build.rs`
 * // both survive while `build/bundle.js` does not.
 * const walked: ArchivePart[] = await readWorkspaceFiles(dir)
 *
 * // Both halves, always: `dropped` is the only record of what the walk gave up,
 * // and this runs just before the live project is deleted. Never ignore it.
 * const { kept, dropped } = filterArchivableParts(walked, NODE_PROJECT_EXCLUDES)
 * logger.debug('archive walk filtered reproducible bulk', {
 *   projectId,
 *   kept: kept.length,
 *   dropped: dropped.map((file) => file.path),
 * })
 *
 * const source: ArchivePart[] = kept.map(
 *   (file) => ({ path: `source/${file.path}`, content: file.content, mode: file.mode, kind: 'source' }),
 * )
 *
 * const parts: ArchivePart[] = [
 *   ...source,
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
 *   parts,
 *   // Provenance only — recording what the walk dropped. It filters nothing.
 *   excluded: NODE_PROJECT_EXCLUDES,
 *   // Guards against a silently-empty or partial walk: archive() THROWS rather
 *   // than returning a verified archive of nothing.
 *   minParts: 1,
 *   requiredPaths: ['source/package.json', 'source/package-lock.json', 'database/main.dump'],
 *   // Node/JS opt-in preset: refuses node_modules and dotenv files (the artifact
 *   // is NOT encrypted at rest). A Python project would pass
 *   // { refuseSegments: ['.venv', '__pycache__'] }; a Rust one { refuseSegments: ['target'] }.
 *   policy: NODE_PROJECT_POLICY,
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
 * await writeSecretsFromVault(sandbox, projectId) // dotenv files were REFUSED, never archived
 * await runInstallFromLockfile(sandbox)           // node_modules was never archived
 * ```
 *
 * @module
 */

export * from './browser-guard.js'
export * from './provider.js'
export * from './types.js'
