/**
 * Object-storage project-archive provider for molecule.dev.
 *
 * Implements the `@molecule/api-project-archive` contract by packing a
 * project's source files (and an optional database dump) into a STANDARD
 * gzipped POSIX ustar tarball and persisting it through the bonded
 * `@molecule/api-uploads` provider — S3, R2, B2, MinIO, or the local filesystem
 * bond, whichever the app wired. No storage SDK is imported here and the
 * package ships zero external runtime dependencies: the tar writer/reader is a
 * single module of `node:zlib` + `node:crypto`.
 *
 * The artifact is a real `.tar.gz`. `tar -xzf project.tar.gz` yields
 * `manifest.json`, `source/<path>` for every archived file (relative paths and
 * modes preserved), and `database.dump` when one was supplied — no molecule.dev
 * tooling required to get the data back out. That is the no-lock-in promise.
 *
 * @example
 * ```typescript
 * import { setProvider } from '@molecule/api-project-archive'
 * import { provider } from '@molecule/api-project-archive-object-storage'
 * import { setProvider as setUploads } from '@molecule/api-uploads'
 * import { provider as s3 } from '@molecule/api-uploads-s3'
 *
 * setUploads(s3)      // storage bond FIRST — this provider composes it
 * setProvider(provider)
 * ```
 *
 * @example
 * ```typescript
 * // Archive, then release the live project ONLY when verified — and delete the
 * // PREVIOUS artifact only after the new one has proven itself.
 * const previousStorageId = project.archiveStorageId // whatever we persisted last time
 *
 * const result = await archiveProvider.archive({
 *   projectId,
 *   files,                            // caller already filtered node_modules/.git/dist/.env*
 *   excluded: DEFAULT_ARCHIVE_EXCLUDES, // provenance only — it does NOT filter
 *   minEntries: 1,                    // an empty file set THROWS
 *   requiredPaths: ['package.json', 'package-lock.json'],
 *   databaseDump: await pgDump(projectId),
 *   databaseFormat: 'pg_custom',
 * })
 *
 * if (!result.verified) {
 *   logger.error('archive not verified — keeping the live project', result.verification)
 *   return // never release, and never delete the previous artifact, on this
 * }
 *
 * // 1. PERSIST the minted id first — there is no way to find the artifact without it.
 * await db.projects.update(projectId, { archiveStorageId: result.storageId })
 * // 2. Now the live project may be released…
 * await releaseSandbox(projectId)
 * // 3. …and only now is the OLD artifact safe to delete.
 * if (previousStorageId && previousStorageId !== result.storageId) {
 *   await archiveProvider.remove(previousStorageId)
 * }
 *
 * // Later: bring it back. restore() REQUIRES the persisted storage id.
 * const { files: restored, databaseDump } = await archiveProvider.restore({
 *   projectId,
 *   storageId: project.archiveStorageId,
 * })
 * ```
 *
 * @remarks
 * - **The storage id is MINTED by the uploads bond and returned verbatim —
 *   nothing is derived from `projectId`.** Both shipped uploads bonds
 *   (`@molecule/api-uploads-s3`, `-filesystem`) do `const id = uuid()` and IGNORE
 *   the supplied filename, so a derived key pointed at nothing: `remove()`
 *   deleted nothing, `status()` returned `null`, and a verification failure named
 *   an id that held no object. **PERSIST `result.storageId`** (e.g. on the
 *   project's row) — `restore()`, `status()`, and `remove()` all take that id,
 *   and there is no lookup by project.
 * - **Every `archive()` mints a NEW id, so re-archiving can never overwrite the
 *   previous artifact.** That is deliberate: the old archive stays intact and
 *   restorable while the replacement is being verified. Order the swap
 *   accordingly — archive → check `verified` → persist the new id → `remove()`
 *   the OLD id. Deleting first is how the only good copy gets destroyed by a bad
 *   replacement.
 * - **`verified === true` is the ONLY green light to release the live project.**
 *   `archive()` re-reads the artifact back OUT of storage at the minted id,
 *   re-hashes the downloaded bytes against the pre-upload sha256, re-parses
 *   `manifest.json` from those downloaded bytes, re-counts the `source/` members,
 *   AND unpacks them to recompute the source digest + byte total against
 *   `manifest.source.sha256`/`bytes` (`digestMatched` — the only flag that proves
 *   the PACKER preserved the files; without it the other checks compare the
 *   artifact to itself). All five must pass. A successful `upload()` proves
 *   nothing about what the bucket holds.
 * - **A verification failure does NOT throw.** It returns `verified: false` with
 *   `verification.error` populated (and the individual `downloaded` /
 *   `checksumMatched` / `manifestParsed` / `entriesMatched` / `digestMatched`
 *   flags), because only the caller can decide whether to retry, alert, or keep
 *   the project alive. Code that ignores the returned `verified` flag because "it
 *   didn't throw" is the exact bug this design exists to prevent.
 * - **`archive()` DOES throw on an empty file set.** An empty archive verifies
 *   perfectly and proves nothing, so a workspace walk that silently returned `[]`
 *   would otherwise read as a good backup. `ArchiveInput.minEntries` (default
 *   `1`) is the floor and `requiredPaths` is the stronger guard — name the files
 *   a restore cannot do without (`package.json`, the lockfile). Only a provider
 *   built with `createProjectArchiveProvider({ allowEmpty: true })` may accept
 *   zero. Unsafe/colliding paths, an exceeded size cap, and a failed upload throw
 *   too: none of those are archives, so there is nothing for the caller to weigh.
 * - **`restore()` VALIDATES before it hands anything back.** File count against
 *   `manifest.source.entries`, recomputed source digest against
 *   `manifest.source.sha256`, total bytes against `manifest.source.bytes`, and
 *   the dump's size + digest against `manifest.database` — any mismatch THROWS.
 *   A truncated or re-packed artifact fails loudly instead of yielding half a
 *   project. Do not catch that and write whatever came back anyway.
 * - **Path safety is enforced on the RAW, unprefixed path, on both sides.**
 *   `archive()` validates the caller's `path` BEFORE prepending `source/`, and
 *   `restore()` re-validates after stripping it — checking the prefixed form is
 *   worthless, because `source/` + `/etc/passwd` is neither absolute nor
 *   traversing. Absolute POSIX paths, a leading backslash, drive-qualified paths
 *   (`C:\x`), any `..` segment, NUL bytes, and empty/`.`-only paths are rejected,
 *   as are two paths that collide after normalisation (they would overwrite each
 *   other on restore). Modes are masked to `0o777` on write AND on read, so
 *   setuid/setgid/sticky never survive a round trip.
 * - **The archive is NOT encrypted at rest by this package.** It is a plain
 *   `.tar.gz` sitting in object storage, readable by anyone with bucket access.
 *   Secrets therefore never go in it — `.env` and the `.env.*` family are in
 *   `DEFAULT_ARCHIVE_EXCLUDES` for that reason, not to save bytes. Keep secrets
 *   in the platform's encrypted vault and re-inject them on restore. (Bucket-level
 *   SSE, if the deployment has it, is the deployment's guarantee, not this
 *   package's.)
 * - **Size caps are on by default: `maxArtifactBytes` (512 MiB) and
 *   `maxUncompressedBytes` (2 GiB).** `maxArtifactBytes` bounds the artifact this
 *   provider builds and every artifact it buffers from storage — enforced BEFORE
 *   decompression, so a gzip bomb is rejected unread. `maxUncompressedBytes` is
 *   passed through the codec (inflate + entry accumulation) and also bounds the
 *   source bytes handed to `archive()`. Exceeding either throws an error naming
 *   the cap. Raise them in `createProjectArchiveProvider({ … })` only for a
 *   deployment that genuinely needs it.
 * - **Everything is buffered in memory** (tar → gzip → upload, and the reverse on
 *   restore), which is what the caps above bound. That is fine for source —
 *   single-digit MB — and NOT fine for a `node_modules`-sized tree.
 * - **The caller filters the file list; `excluded` is provenance only.** Passing
 *   `DEFAULT_ARCHIVE_EXCLUDES` does NOT filter anything — it is recorded in the
 *   manifest so a future reader knows what was left out. Hand `files` that
 *   already exclude `node_modules`, `.git`, `dist`, `.env*`, … or you will
 *   archive a 1.5 GB tree that is reproducible from the lockfile (and leak
 *   secrets while doing it).
 * - **Bond `@molecule/api-uploads` FIRST**, or inject one via
 *   `createProjectArchiveProvider({ uploads })`. The bonded provider is resolved
 *   lazily per call, so importing this package before the bond is wired is safe.
 *   A bond without `getFile()` can neither verify nor restore — `archive()` then
 *   returns `verified: false` (never `true`), exactly like
 *   `verifyOnArchive: false`, which is an escape hatch and not a speed knob.
 * - **This provider NEVER deletes or releases the live project.** `remove()`
 *   deletes ONE archive artifact, addressed by its storage id. Releasing the
 *   project is the caller's job.
 * - `restore()` returns BYTES; it does not touch the filesystem, provision a
 *   sandbox, or restore a database. Writing the files (and applying `mode`) is
 *   the caller's job.
 *
 * @module
 */

export * from './browser-guard.js'
export * from './provider.js'
export * from './tar.js'
