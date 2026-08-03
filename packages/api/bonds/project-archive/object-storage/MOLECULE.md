# @molecule/api-project-archive-object-storage

Object-storage project-archive provider for molecule.dev.

Implements the `@molecule/api-project-archive` contract by packing a
project's `ArchivePart`s into a STANDARD gzipped POSIX ustar tarball and
persisting it through the bonded `@molecule/api-uploads` provider — S3, R2,
B2, MinIO, or the local filesystem bond, whichever the app wired. No storage
SDK is imported here and the package ships zero external runtime
dependencies: the tar writer/reader is a single module of `node:zlib` +
`node:crypto`.

The job is exactly this: **store some bytes durably, prove they came back,
give them back.**

The artifact is a real `.tar.gz`. `tar -xzf project.tar.gz` yields
`manifest.json` plus `parts/<path>` for every archived part (relative paths
and modes preserved) — no molecule.dev tooling required to get the data back
out. That is the no-lock-in promise.

The CONTRACT — what `verified` means, why the storage id must be persisted,
what `restore()` guarantees — is documented once, on
`@molecule/api-project-archive`. What follows is what this BOND adds.

## Quick Start

```typescript
import { setProvider } from '@molecule/api-project-archive'
import { provider } from '@molecule/api-project-archive-object-storage'
import { setProvider as setUploads } from '@molecule/api-uploads'
import { provider as s3 } from '@molecule/api-uploads-s3'

setUploads(s3) // storage bond FIRST — this provider composes it
setProvider(provider)
```

```typescript
import type { ArchivePart } from '@molecule/api-project-archive'
import { provider as archiveProvider } from '@molecule/api-project-archive-object-storage'

// WHICH files to archive is the CALLER's decision, and git already answers
// it: .gitignore declares what is disposable, `git clean -Xdf` removes it,
// and `git ls-files` lists what survives. This package has no filter.
await exec('git', ['clean', '-Xdf'], { cwd: dir })
const tracked = await exec('git', ['ls-files', '--cached', '--others', '--exclude-standard'], {
  cwd: dir,
})

// ONE generic channel. Source files, a pg_dump and a git bundle are all parts;
// only the caller's path/kind/meta tell them apart, and this provider never
// interprets any of it. Adding a SECOND database is one more part.
const source: ArchivePart[] = await Promise.all(
  tracked
    .split('\n')
    .filter(Boolean)
    .map(async (file) => ({
      path: `source/${file}`,
      content: await readFile(join(dir, file)),
      kind: 'source',
    })),
)

const previousStorageId = project.archiveStorageId // whatever we persisted last time

const result = await archiveProvider.archive({
  projectId,
  parts: [
    ...source, // a .env part here would THROW — see @remarks
    {
      path: 'database/main.dump',
      content: await pgDumpCustom(projectId),
      kind: 'database',
      meta: { engine: 'postgresql', format: 'pg_custom', database: 'main' },
    },
    {
      path: 'repos/api.bundle',
      content: await gitBundle(dir),
      kind: 'repo',
      meta: { remote: 'origin', headSha: await gitHeadSha(dir) },
    },
  ],
  minParts: 1, // an empty part set THROWS
  requiredPaths: ['source/package.json', 'database/main.dump'],
  metadata: { reason: 'dormant-30d' },
})

if (!result.verified) {
  // The failed artifact was already deleted best-effort; orphanCleanup says so.
  logger.error('archive not verified — keeping the live project', {
    verification: result.verification,
    orphanCleanup: result.orphanCleanup,
  })
  return // never release, and never delete the previous artifact, on this
}

// 1. PERSIST the minted id first — there is no way to find the artifact without it.
await db.projects.update(projectId, { archiveStorageId: result.storageId })
// 2. Now the live project may be released…
await releaseSandbox(projectId)
// 3. …and only now is the OLD artifact safe to delete.
if (previousStorageId && previousStorageId !== result.storageId) {
  await archiveProvider.remove(previousStorageId)
}

// Later: bring it back. restore() REQUIRES the persisted storage id and hands
// back BYTES — the caller routes each part by the kind/meta it recorded.
const { parts } = await archiveProvider.restore({
  projectId,
  storageId: project.archiveStorageId,
})
for (const part of parts) {
  if (part.kind === 'database') await pgRestore(db, part.content, part.meta?.format)
  else if (part.kind === 'repo') await gitCloneFromBundle(sandbox, part.content)
  else await writeFile(sandbox, part.path.replace(/^source\//, ''), part.content, part.mode)
}
```

## Type

`provider`

## Installation

```bash
npm install @molecule/api-project-archive-object-storage @molecule/api-logger @molecule/api-project-archive @molecule/api-uploads
```

## API

### Interfaces

#### `ArchiveOrphanCleanup`

What happened to the just-uploaded object after a verification this provider
ATTEMPTED came back false.

A failed verification used to leave the artifact in the bucket forever:
nothing references it (the caller was told not to persist the id of an
unverified archive), nothing will ever read it, and nothing will ever delete
it — a silent, unbounded leak, one object per failed archive. The cleanup is
BEST-EFFORT and never masks the verification failure: `verification.error`
still says why the archive failed, and this says what became of the bytes.

```typescript
interface ArchiveOrphanCleanup {
  /**
   * Whether a delete was attempted at all.
   *
   * True only when this provider ATTEMPTED a verification and it failed. It is
   * deliberately false when verification was SKIPPED (`verifyOnArchive: false`)
   * or IMPOSSIBLE (the bonded uploads provider has no `getFile()`): those
   * artifacts are unverified by configuration, not by failure, and they are the
   * only copy the caller asked for — deleting them would destroy exactly what
   * the call was for.
   */
  attempted: boolean

  /** Whether the object was actually deleted. */
  deleted: boolean

  /**
   * Why the delete failed, when it was attempted and did not succeed.
   *
   * The object is now an orphan in the bucket; the storage id it names is in
   * {@link ArchiveResult.storageId}, so a caller can retry `remove()` later.
   */
  error?: string
}
```

#### `ObjectStorageArchiveResult`

{@link ArchiveResult} plus this bond's report on the orphan cleanup.

A superset of the contract's result, so it is still an `ArchiveResult`
everywhere the contract is used — the extra field only tells a caller what
happened to the bytes of an archive that did not verify.

```typescript
interface ObjectStorageArchiveResult extends ArchiveResult {
  /** What became of the uploaded object when verification failed. */
  orphanCleanup: ArchiveOrphanCleanup
}
```

#### `ObjectStorageProjectArchiveProvider`

The `ProjectArchiveProvider` contract with `archive()` narrowed to this
bond's richer {@link ObjectStorageArchiveResult}.

Assignable to `ProjectArchiveProvider` in every position (the result is a
superset), so `setProvider(provider)` and `bond('project-archive', provider)`
are unaffected — this type exists only so a caller holding the concrete bond
can read `orphanCleanup` without a cast.

```typescript
interface ObjectStorageProjectArchiveProvider extends ProjectArchiveProvider {
  archive(input: ArchiveInput): Promise<ObjectStorageArchiveResult>
}
```

#### `ProjectArchiveObjectStorageConfig`

Configuration for {@link createProjectArchiveProvider}.

```typescript
interface ProjectArchiveObjectStorageConfig {
  /**
   * The object-storage provider used for persistence. Defaults to the bonded
   * `@molecule/api-uploads` provider, resolved LAZILY on every call — so this
   * package can be imported (and its `provider` constructed) before
   * `setProvider()`/`bond('uploads', …)` runs at startup.
   */
  uploads?: UploadProvider

  /**
   * Whether `archive()` re-reads the artifact out of storage and validates it.
   * Defaults to `true`. Setting this to `false` means `archive()` can NEVER
   * return `verified: true` — it is an escape hatch for storage backends with no
   * `getFile()`, not a performance tweak, and the caller must then treat the
   * archive as unverified.
   */
  verifyOnArchive?: boolean

  /**
   * Whether `archive()` may accept an EMPTY part set. Defaults to `false`, so a
   * workspace walk that silently returned `[]` throws instead of producing an
   * archive of nothing that verifies perfectly.
   *
   * Turning it on lowers the DEFAULT floor for this provider from `1` to `0`,
   * so an empty set is then accepted whether or not the call passes
   * `minParts: 0`. Passing it anyway is the recommended habit — it says at the
   * call site that an empty archive is expected there — but it is not enforced,
   * because the provider-level opt-in is already the explicit act. A call that
   * wants the floor back raises it per call (`minParts: 1`).
   */
  allowEmpty?: boolean

  /**
   * Maximum artifact size in bytes, enforced on the artifact this provider
   * BUILDS (before upload) and on every DOWNLOADED artifact BEFORE it is
   * decompressed. Defaults to 512 MiB.
   */
  maxArtifactBytes?: number

  /**
   * Maximum DECOMPRESSED size in bytes — the decompression-bomb guard. Enforced
   * through the tar/gzip codec while inflating and while accumulating entries,
   * and on the part bytes handed to `archive()`. Defaults to 2 GiB.
   */
  maxUncompressedBytes?: number
}
```

### Functions

#### `createProjectArchiveProvider(config)`

Creates an object-storage-backed project archive provider.

```typescript
function createProjectArchiveProvider(
  config?: ProjectArchiveObjectStorageConfig,
): ObjectStorageProjectArchiveProvider
```

- `config` — Provider configuration.

**Returns:** A `ProjectArchiveProvider` that persists artifacts through the configured (or bonded) uploads provider, with `archive()` narrowed to {@link ObjectStorageArchiveResult} so the orphan-cleanup report is readable without a cast.

### Constants

#### `provider`

Object-storage project archive provider using the default configuration: the
bonded `@molecule/api-uploads` provider (resolved lazily, per call),
post-upload verification enabled, empty archives rejected, and the default
512 MiB artifact / 2 GiB decompressed size caps.

Use {@link createProjectArchiveProvider} instead when you need different caps,
`allowEmpty`, or an explicitly injected uploads provider. There is nothing to
configure about WHICH files are archived — that is the caller's decision, made
before the parts are handed over.

Typed as {@link ObjectStorageProjectArchiveProvider} — the
`ProjectArchiveProvider` contract with `archive()` narrowed to the result that
also reports {@link ArchiveOrphanCleanup} — so it stays assignable wherever
the contract is expected (`setProvider(provider)`,
`bond('project-archive', provider)`) while a caller holding this bond directly
can still read what became of an artifact that failed verification.

```typescript
const provider: ObjectStorageProjectArchiveProvider
```

## Core Interface

Implements `@molecule/api-project-archive` interface.

## Bond Wiring

Setup function to register this provider with the core interface:

```typescript
import { setProvider } from '@molecule/api-project-archive'
import { provider } from '@molecule/api-project-archive-object-storage'

export function setupProjectArchiveObjectStorage(): void {
  setProvider(provider)
}
```

## Injection Notes

### Requirements

Peer dependencies:

- `@molecule/api-logger` >=1.0.0
- `@molecule/api-project-archive` >=1.0.0
- `@molecule/api-uploads` >=1.0.0

### Runtime Dependencies

- `@molecule/api-logger`
- `@molecule/api-project-archive`
- `@molecule/api-uploads`

- **Deciding WHICH files to archive is the CALLER's job, and this package
  deliberately does not do it.** Use git: a project workspace is a repo,
  `.gitignore` already declares what is disposable, `git clean -Xdf` removes
  it, and `git ls-files --cached --others --exclude-standard` lists what
  survives. Twenty years of solved, universally-understood semantics that your
  users already write. There is no exclude list, no policy object, no
  per-ecosystem preset and no filter helper here — every part you hand
  `archive()` is archived. The layer that used to do this shipped two
  silent-data-loss bugs: a directory exclude applied to filenames deleted
  `src/build/compiler.ts`, `src/tmp.ts`, `src/build.rs` and
  `src/dist.config.js` (real source, no signal), and `'\'` being a separator
  to one rule and an ordinary character to another let `config\.env` reach
  plaintext storage. Neither would have existed if we had used gitignore.
- **ONE non-configurable refusal survived that: a part whose path has ANY
  segment equal to `.env`, or starting with `.env.` (compared
  CASE-INSENSITIVELY), makes `archive()` THROW.** It takes no options and has
  no opt-out because it is a SECURITY property rather than a filtering
  convenience: the artifact is NOT encrypted at rest, so a dotenv part writes
  live credentials into plaintext object storage and rotation is the only
  remedy left — and whether your `.gitignore` happens to exclude `.env` is
  your choice, which is not a sound basis for a credential outcome. Both
  widenings are load-bearing, not thoroughness: a basename-only compare
  archived `.env/prod.key` and `config/.env/staging`, and a case-sensitive one
  archived `.ENV`, `.Env` and `.eNv.production`. Keep secrets in the
  platform's encrypted vault and re-inject them on restore — including out of
  `metadata`/`meta`, which the manifest carries in the clear, and out of a
  `.git/config` remote URL.
- **The archive is NOT encrypted at rest by this package.** It is a plain
  `.tar.gz` sitting in object storage, readable by anyone with bucket access.
  (Bucket-level SSE, if the deployment has it, is the deployment's guarantee,
  not this package's.)
- **The layout is `manifest.json` + one `parts/<path>` member per part, and
  that is all of it.** Every part lives under the ONE `parts/` prefix, so the
  archive's namespace and the caller's are disjoint by construction: a part
  legitimately named `manifest.json` becomes `parts/manifest.json` and can
  never shadow the artifact's own manifest. Source files, a `pg_dump`, a Redis
  snapshot and a `git bundle` are packed, digested, verified and restored by
  the SAME code path — nothing here branches on a part's `kind`, `meta`, or
  path shape, or decodes its bytes, so a second database or any new content
  type is one more part and needs no change to this package.
- **An artifact may contain NOTHING but those two namespaces, and no DIRECTORY
  members at all.** Anything else is REFUSED by name on every read path
  (`archive()`'s verification, `restore()`, `status()`), because nothing
  counts, digests, verifies or restores it — while `tar -xzf` still creates
  it. A `parts/<dir>` member used to pass the prefix check and then be skipped
  by the part collector, which is exactly that hole behind the one prefix that
  looked legitimate.
- **A failed verification CLEANS UP after itself.** Nothing would ever
  reference that object again (you were told not to persist the id of an
  unverified archive), so it is deleted best-effort and `orphanCleanup`
  (`{ attempted, deleted, error? }`) reports what happened; a delete failure is
  logged and reported, never allowed to mask `verification.error`. An archive
  left unverified by CONFIGURATION — `verifyOnArchive: false`, or an uploads
  bond with no `getFile()` — is never deleted: it is the only copy you asked
  for.
- **ONE path model decides what a path's segments are** (`tar.js`:
  `normalizePartPath`), and path safety, the dotenv refusal and collision
  detection all read ITS segments. `'\'` is a separator everywhere, each
  segment is whitespace-trimmed, repeated separators collapse, and NFC is used
  for comparison only. **A part path that is not already canonical is
  REJECTED, not rewritten** — `config\.env`, `a//b`, `a/b/`, `.env ` and
  ` .env` all throw — so the path you send is the path the manifest records.
  When those rules disagreed about `'\'`, `config\.env` archived and verified:
  a live dotenv credential in storage that is not encrypted at rest. Safety is
  enforced on the RAW path at archive and on the STRIPPED path at restore;
  checking the prefixed form is worthless, because `parts/` + `/etc/passwd` is
  neither absolute nor traversing.
- **Size caps are on by default: `maxArtifactBytes` (512 MiB) and
  `maxUncompressedBytes` (2 GiB), and everything is buffered in memory.**
  `maxArtifactBytes` bounds the artifact this provider builds and every one it
  reads back — enforced WHILE the download streams (the read aborts and the
  stream is destroyed on the chunk that would cross it) and again BEFORE
  decompression, so a gzip bomb is rejected unread. `maxUncompressedBytes`
  goes through the codec and also bounds the part bytes handed to `archive()`.
  Both are fine for source plus a dump — single-digit MB — and NOT fine for a
  `node_modules`-sized tree, which is exactly what `git clean -Xdf` removes
  before you walk.
- **`.git` is archivable, and history is user work that is not reproducible
  from a snapshot.** For a large repo, archive a `git bundle` part instead of
  the `.git` directory — either way, keep the history, and scrub credentials
  out of remote URLs first.
- **Bond `@molecule/api-uploads` FIRST**, or inject one via
  `createProjectArchiveProvider({ uploads })`. The bonded provider is resolved
  lazily per call, so importing this package before the bond is wired is safe.
  A bond without `getFile()` can neither verify nor restore — `archive()` then
  returns `verified: false` (never `true`), exactly like
  `verifyOnArchive: false`, which is an escape hatch and not a speed knob.
- **This bond earns `verified: true` the hard way**, running all five contract
  steps against the bytes storage handed BACK: re-read at the minted id,
  re-hash, re-parse the manifest, re-count the `parts/` members, and UNPACK to
  recompute the parts digest + byte total. A successful `upload()` proves
  nothing about what the bucket holds. What the digest covers, what it cannot
  (a wholesale re-forge), and the one-column caller-side mitigation are on
  `partsDigest` (`artifact.js`).
