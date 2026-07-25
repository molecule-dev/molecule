/**
 * Object-storage project-archive provider for molecule.dev.
 *
 * Implements the `@molecule/api-project-archive` contract by packing a
 * project's `ArchivePart`s into a STANDARD gzipped POSIX ustar tarball and
 * persisting it through the bonded `@molecule/api-uploads` provider — S3, R2,
 * B2, MinIO, or the local filesystem bond, whichever the app wired. No storage
 * SDK is imported here and the package ships zero external runtime
 * dependencies: the tar writer/reader is a single module of `node:zlib` +
 * `node:crypto`.
 *
 * The artifact is a real `.tar.gz`. `tar -xzf project.tar.gz` yields
 * `manifest.json` plus `parts/<path>` for every archived part (relative paths
 * and modes preserved) — no molecule.dev tooling required to get the data back
 * out. That is the no-lock-in promise.
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
 * import {
 *   type ArchivePart,
 *   DOTENV_FILE_PREFIX,
 *   NODE_PROJECT_EXCLUDES,
 * } from '@molecule/api-project-archive'
 * import { filterArchivableParts } from '@molecule/api-project-archive-object-storage'
 *
 * // ONE generic channel. Source files, a pg_dump and a git bundle are all parts;
 * // only the caller's path/kind/meta tell them apart, and this provider never
 * // interprets any of it. Adding a SECOND database is one more part.
 * const walked: ArchivePart[] = await readWorkspaceFiles(dir)
 *
 * // BOTH halves come back. `dropped` is the only record of what the walk gave
 * // up — check it BEFORE anything releases the live project.
 * const { kept, dropped } = filterArchivableParts(walked, [
 *   ...NODE_PROJECT_EXCLUDES, // reproducible bulk
 *   DOTENV_FILE_PREFIX,       // secrets — dropped here, else archive() THROWS
 * ])
 * logger.info(`archive: dropped ${dropped.length} file(s)`, dropped.map((f) => f.path))
 *
 * const source: ArchivePart[] = kept.map((file) => ({
 *   path: `source/${file.path}`,
 *   content: file.content,
 *   mode: file.mode,
 *   kind: 'source',
 * }))
 *
 * const previousStorageId = project.archiveStorageId // whatever we persisted last time
 *
 * const result = await archiveProvider.archive({
 *   projectId,
 *   parts: [
 *     ...source,
 *     {
 *       path: 'database/main.dump',
 *       content: await pgDumpCustom(projectId),
 *       kind: 'database',
 *       meta: { engine: 'postgresql', format: 'pg_custom', database: 'main' },
 *     },
 *     {
 *       path: 'repos/api.bundle',
 *       content: await gitBundle(dir),
 *       kind: 'repo',
 *       meta: { remote: 'origin', headSha: await gitHeadSha(dir) },
 *     },
 *   ],
 *   excluded: NODE_PROJECT_EXCLUDES, // provenance only — it filters NOTHING
 *   minParts: 1,                     // an empty part set THROWS
 *   requiredPaths: ['source/package.json', 'database/main.dump'],
 *   metadata: { reason: 'dormant-30d' },
 * })
 *
 * if (!result.verified) {
 *   // The failed artifact was already deleted best-effort; orphanCleanup says so.
 *   logger.error('archive not verified — keeping the live project', {
 *     verification: result.verification,
 *     orphanCleanup: result.orphanCleanup,
 *   })
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
 * // Later: bring it back. restore() REQUIRES the persisted storage id and hands
 * // back BYTES — the caller routes each part by the kind/meta it recorded.
 * const { parts } = await archiveProvider.restore({
 *   projectId,
 *   storageId: project.archiveStorageId,
 * })
 * for (const part of parts) {
 *   if (part.kind === 'database') await pgRestore(db, part.content, part.meta?.format)
 *   else if (part.kind === 'repo') await gitCloneFromBundle(sandbox, part.content)
 *   else await writeFile(sandbox, part.path.replace(/^source\//, ''), part.content, part.mode)
 * }
 * ```
 *
 * @example
 * ```typescript
 * import { createProjectArchiveProvider } from '@molecule/api-project-archive-object-storage'
 *
 * // The Node/JS policy is only this BOND's default. Any ecosystem configures its
 * // own — per provider, or per call with ArchiveInput.policy.
 * const pythonArchive = createProjectArchiveProvider({
 *   policy: { refuseSegments: ['.venv', '__pycache__'] },
 * })
 * const rustArchive = createProjectArchiveProvider({
 *   policy: { refuseSegments: ['target'] },
 * })
 * ```
 *
 * @remarks
 * - **NOTHING IS PRIVILEGED — the artifact is `manifest.json` + one `parts/`
 *   member per part, and that is the whole layout.** Source files, a `pg_dump`,
 *   a Redis snapshot and a `git bundle` are packed, digested, verified and
 *   restored by the SAME code path; this provider never branches on a part's
 *   `kind`, `meta`, or path shape and never decodes its bytes. Grouping is a
 *   convention you express in the part path (`source/…`, `database/…`,
 *   `repos/…`) and nothing here parses it, so a second database or any new
 *   content type is one more part and needs no change to this package.
 * - **Every part lives under ONE `parts/` prefix**, chosen so the archive's
 *   namespace and the caller's are disjoint by construction: a part legitimately
 *   named `manifest.json` becomes `parts/manifest.json` and can never shadow the
 *   artifact's own manifest. Per-kind prefixes would reintroduce the
 *   privileged-channel design this version removed.
 * - **`kind` and `meta` survive the round trip verbatim, and are the ONLY thing
 *   that tells a restore what a part is.** They are recorded into
 *   `manifest.entries` and re-attached on `restore()`. Record what a restore
 *   will need — dump format, engine version, git remote and head sha — but never
 *   secrets: the manifest is the most readable thing in an unencrypted artifact.
 *   A `{ format: 'pg_custom' }` dump aimed at a non-Postgres engine fails when
 *   YOU run `pg_restore`, not at archive time.
 * - **EVERYTHING the manifest asserts is inside `manifest.parts.sha256`: the
 *   part bytes, the `entries` index you route on, AND the header
 *   (`formatVersion`, `projectId`, `createdAt`, `parts.count`, `parts.bytes`,
 *   `excluded`, `metadata`).** Anything outside it would be an unauthenticated
 *   instruction — anyone with bucket write access could swap which part is
 *   labelled `database`, or rewrite WHOSE project the artifact is, and every
 *   check still passed. All of it now fails `digestMatched` and makes
 *   `restore()` and `status()` THROW. A manifest carrying an UNDECLARED key
 *   (`entries[0].restoreHint`) is refused outright, because a fixed-field digest
 *   cannot cover it. (An artifact written before the index and header were
 *   folded in fails the digest rather than being read with an unauthenticated
 *   one — re-archive it.)
 * - **The digest CANNOT detect a wholesale re-forge, and does not pretend to.**
 *   It is unkeyed and stored inside the artifact it covers, so an attacker with
 *   bucket write access can replace the whole artifact and recompute a
 *   consistent digest; every check here then passes, because every input came
 *   from them. The mitigation lives outside the artifact and costs one column:
 *   persist `result.manifest.parts.sha256` alongside `result.storageId`, and
 *   compare it with `restore().manifest.parts.sha256` before trusting the parts.
 * - **The policy is CONFIGURABLE, and its Node/JS default is a BOND default —
 *   not a contract-level truth.** `archive()` refuses whatever the effective
 *   `ArchivePolicy` names, resolved as `ArchiveInput.policy` →
 *   `createProjectArchiveProvider({ policy })` → `NODE_PROJECT_POLICY`. The
 *   fallback is Node/JS only because that is the ecosystem molecule.dev
 *   scaffolds: a Python deployment passes
 *   `{ refuseSegments: ['.venv', '__pycache__'] }`, a Rust one
 *   `{ refuseSegments: ['target'] }`, and `{}` refuses nothing. Refusal THROWS
 *   naming the offending path — it never silently drops a part, because that
 *   would make the manifest describe a tree you never intended to archive.
 * - **The two policy rules are matched differently on purpose.**
 *   `refuseSegments` compares each segment CASE-SENSITIVELY (POSIX paths are,
 *   and `Build/` may be a real source directory a false refusal would throw
 *   over). `refuseFilePrefixes` compares EVERY path segment
 *   CASE-INSENSITIVELY, so `.ENV`, `.Env`, `.eNv.production` AND a `.env`
 *   DIRECTORY (`.env/prod.key`, `config/.env/staging`) are all refused. The
 *   asymmetry is about cost: a missed bulk directory only wastes bytes, while a
 *   missed secret writes a live credential into plaintext object storage and
 *   rotating it is the only remedy left.
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
 *   `manifest.json` from those downloaded bytes, re-counts the `parts/` members,
 *   AND unpacks them to recompute the parts digest + byte total against
 *   `manifest.parts.sha256`/`bytes` and reconcile the manifest's per-part index
 *   (`digestMatched` — the only flag that proves the PACKER preserved the bytes;
 *   without it the other checks compare the artifact to itself). All five must
 *   pass. A successful `upload()` proves nothing about what the bucket holds.
 * - **A verification failure does NOT throw.** It returns `verified: false` with
 *   `verification.error` populated (and the individual `downloaded` /
 *   `checksumMatched` / `manifestParsed` / `entriesMatched` / `digestMatched`
 *   flags), because only the caller can decide whether to retry, alert, or keep
 *   the project alive. Code that ignores the returned `verified` flag because "it
 *   didn't throw" is the exact bug this design exists to prevent.
 * - **A failed verification also CLEANS UP after itself.** Nothing would ever
 *   reference that object again (you were told not to persist the id of an
 *   unverified archive), so it is deleted best-effort and `orphanCleanup`
 *   (`{ attempted, deleted, error? }`) reports what happened; a delete failure is
 *   logged and reported, never allowed to mask `verification.error`. An archive
 *   left unverified by CONFIGURATION — `verifyOnArchive: false`, or an uploads
 *   bond with no `getFile()` — is never deleted: it is the only copy you asked
 *   for.
 * - **An artifact may contain only `manifest.json` and `parts/<path>` FILE
 *   members.** Anything else is REFUSED by name, on every read path
 *   (`archive()`'s verification, `restore()`, `status()`). Nothing counts,
 *   digests, verifies or restores a member outside those two namespaces, so
 *   ignoring one would let an artifact carry content that no check here has ever
 *   looked at. DIRECTORY members are refused wherever they sit, `parts/` included
 *   — this provider writes none, so one is evidence of a re-pack, and a
 *   `parts/<dir>` member used to pass the prefix check and then be skipped by the
 *   part collector while `tar -xzf` still created it.
 * - **`archive()` DOES throw on an empty part set.** An empty archive verifies
 *   perfectly and proves nothing, so a workspace walk that silently returned `[]`
 *   would otherwise read as a good backup. `ArchiveInput.minParts` (default `1`)
 *   is the floor and `requiredPaths` is the stronger guard — name the parts a
 *   restore cannot do without (`source/package.json`, the lockfile,
 *   `database/main.dump`). Only a provider built with
 *   `createProjectArchiveProvider({ allowEmpty: true })` may accept zero.
 *   Unsafe/colliding paths, a policy refusal, an exceeded size cap, and a failed
 *   upload throw too: none of those are archives, so there is nothing for the
 *   caller to weigh.
 * - **`restore()` VALIDATES before it hands anything back.** Part count against
 *   `manifest.parts.count`, total bytes against `manifest.parts.bytes`, the
 *   manifest's per-part index against the payload (every part indexed, every
 *   indexed length correct), and then the recomputed parts digest — over the
 *   parts AND the labels the index carries — against `manifest.parts.sha256`;
 *   any mismatch THROWS. A truncated, re-packed, or RELABELLED artifact fails
 *   loudly instead of yielding half a project or a part routed as something it
 *   is not. Do not catch that and write whatever came back anyway.
 * - **Path safety is enforced on the RAW, unprefixed path, on both sides.**
 *   `archive()` validates the caller's `path` BEFORE prepending `parts/`, and
 *   `restore()` re-validates after stripping it — checking the prefixed form is
 *   worthless, because `parts/` + `/etc/passwd` is neither absolute nor
 *   traversing. Absolute POSIX paths, a backslash ANYWHERE, drive-qualified paths
 *   (`C:\x`), any `..` segment, NUL bytes, repeated/trailing separators,
 *   whitespace-padded segments, and empty/`.`-only paths are rejected, as are two
 *   parts that collide after normalisation (they would overwrite each other on
 *   restore). Modes are masked to `0o777` on write AND on read, so
 *   setuid/setgid/sticky never survive a round trip.
 * - **The archive is NOT encrypted at rest by this package.** It is a plain
 *   `.tar.gz` sitting in object storage, readable by anyone with bucket access.
 *   Secrets therefore never go in it — as a part, in `metadata`, or in a part's
 *   `meta`. That is why `NODE_PROJECT_POLICY` REFUSES the `.env` family rather
 *   than merely excluding it. Keep secrets in the platform's encrypted vault and
 *   re-inject them on restore. (Bucket-level SSE, if the deployment has it, is
 *   the deployment's guarantee, not this package's.)
 * - **Size caps are on by default: `maxArtifactBytes` (512 MiB) and
 *   `maxUncompressedBytes` (2 GiB).** `maxArtifactBytes` bounds the artifact this
 *   provider builds and every artifact it reads from storage — enforced WHILE the
 *   download streams (the read aborts and the stream is destroyed on the chunk
 *   that would cross the cap, so the payload is never fully buffered) and again
 *   BEFORE decompression, so a gzip bomb is rejected unread.
 *   `maxUncompressedBytes` is passed through the codec (inflate + entry
 *   accumulation) and also bounds the part bytes handed to `archive()`.
 *   Exceeding either throws an error naming the cap. Raise them in
 *   `createProjectArchiveProvider({ … })` only for a deployment that genuinely
 *   needs it.
 * - **Everything is buffered in memory** (tar → gzip → upload, and the reverse on
 *   restore), which is what the caps above bound. That is fine for source and a
 *   dump — single-digit MB — and NOT fine for a `node_modules`-sized tree.
 * - **The caller filters, the policy refuses; `excluded` is provenance only.**
 *   Passing `NODE_PROJECT_EXCLUDES` as `excluded` filters NOTHING — it is
 *   recorded in the manifest so a future reader knows what was left out. Use
 *   `filterArchivableParts(parts, excludes)` on the walk instead, or you will
 *   archive a 1.5 GB tree that is reproducible from the lockfile.
 * - **`filterArchivableParts` returns BOTH halves and NEVER drops silently.**
 *   `{ kept, dropped }` — log or assert on `dropped` before anything releases the
 *   live project; it is the only record of what the walk gave up. An exclude is
 *   matched as a LEADING path (`'build'` drops `build/bundle.js`, and KEEPS
 *   `src/build/compiler.ts`), at every segment only for the `anySegment` option
 *   (default `NODE_ANY_SEGMENT_EXCLUDES` from `@molecule/api-project-archive`:
 *   `node_modules`, which is real at any depth and always regenerable — pass
 *   `{ anySegment: ['__pycache__'] }` to give another ecosystem the same rule),
 *   plus the `'<entry>.'` DOT-ENTRY family rule that still catches
 *   `src/.DS_Store` and the `.env.local` family anywhere. A monorepo that wants
 *   every `packages/<name>/dist` dropped passes those deeper paths EXPLICITLY
 *   (`'packages/api/dist'`) — the default is safe, and being more aggressive is
 *   your call, not a preset's. An empty-string exclude entry is refused
 *   outright: it would degenerate the family rule to `'.'` and drop every
 *   dotfile, `.git` included.
 * - **The family rule applies ONLY to DOT entries; a plain directory name never
 *   matches a filename.** `'.env'` catches `.env.local` (that is the point), but
 *   `'tmp'`, `'build'`, `'dist'` and `'coverage'` match a DIRECTORY and nothing
 *   else — so `src/tmp.ts`, `src/build.rs`, `src/dist.config.js`, `tmp.md`,
 *   `buildings/x.ts`, `distance.ts`, `lib/build.gradle` and a git ref named
 *   `.git/refs/heads/dist` all survive. Applied to every entry it silently ate
 *   all of those, `.git` history included, in a helper that runs immediately
 *   before the live project is deleted.
 * - **ONE path model decides what a path's segments are** (`path-model.js`:
 *   `normalizePartPath`), and path safety, the policy refusal, the excludes
 *   filter and collision detection all read ITS segments. `'\'` is a separator
 *   everywhere, each segment is whitespace-trimmed, repeated separators collapse,
 *   and NFC is used for comparison only. **A part path that is not already
 *   canonical is REJECTED, not rewritten** — `config\.env`, `a//b`, `a/b/`,
 *   `.env ` and ` .env` all throw — so the path you send is the path the manifest
 *   records. When those rules disagreed about `'\'`, `config\.env` archived and
 *   verified: a live dotenv credential in storage that is not encrypted at rest.
 * - **`.git` is archivable and is deliberately absent from
 *   `NODE_PROJECT_EXCLUDES`.** History is user work and is not reproducible from
 *   a snapshot. For a large repo, archive a `git bundle` part instead of the
 *   `.git` directory — either way, keep the history, and scrub credentials out
 *   of remote URLs first.
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
 *   sandbox, or restore a database. Writing the parts (and applying `mode`) is
 *   the caller's job.
 *
 * @module
 */

export * from './browser-guard.js'
export * from './path-model.js'
export * from './provider.js'
export * from './tar.js'
