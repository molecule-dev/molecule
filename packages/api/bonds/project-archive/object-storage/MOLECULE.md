# @molecule/api-project-archive-object-storage

Object-storage project-archive provider for molecule.dev.

Implements the `@molecule/api-project-archive` contract by packing a
project's `ArchivePart`s into a STANDARD gzipped POSIX ustar tarball and
persisting it through the bonded `@molecule/api-uploads` provider — S3, R2,
B2, MinIO, or the local filesystem bond, whichever the app wired. No storage
SDK is imported here and the package ships zero external runtime
dependencies: the tar writer/reader is a single module of `node:zlib` +
`node:crypto`.

The artifact is a real `.tar.gz`. `tar -xzf project.tar.gz` yields
`manifest.json` plus `parts/<path>` for every archived part (relative paths
and modes preserved) — no molecule.dev tooling required to get the data back
out. That is the no-lock-in promise.

## Quick Start

```typescript
import { setProvider } from '@molecule/api-project-archive'
import { provider } from '@molecule/api-project-archive-object-storage'
import { setProvider as setUploads } from '@molecule/api-uploads'
import { provider as s3 } from '@molecule/api-uploads-s3'

setUploads(s3)      // storage bond FIRST — this provider composes it
setProvider(provider)
```

```typescript
import {
  type ArchivePart,
  DOTENV_FILE_PREFIX,
  NODE_PROJECT_EXCLUDES,
} from '@molecule/api-project-archive'
import { filterArchivableParts } from '@molecule/api-project-archive-object-storage'

// ONE generic channel. Source files, a pg_dump and a git bundle are all parts;
// only the caller's path/kind/meta tell them apart, and this provider never
// interprets any of it. Adding a SECOND database is one more part.
const walked: ArchivePart[] = await readWorkspaceFiles(dir)

// BOTH halves come back. `dropped` is the only record of what the walk gave
// up — check it BEFORE anything releases the live project.
const { kept, dropped } = filterArchivableParts(walked, [
  ...NODE_PROJECT_EXCLUDES, // reproducible bulk
  DOTENV_FILE_PREFIX,       // secrets — dropped here, else archive() THROWS
])
logger.info(`archive: dropped ${dropped.length} file(s)`, dropped.map((f) => f.path))

const source: ArchivePart[] = kept.map((file) => ({
  path: `source/${file.path}`,
  content: file.content,
  mode: file.mode,
  kind: 'source',
}))

const previousStorageId = project.archiveStorageId // whatever we persisted last time

const result = await archiveProvider.archive({
  projectId,
  parts: [
    ...source,
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
  excluded: NODE_PROJECT_EXCLUDES, // provenance only — it filters NOTHING
  minParts: 1,                     // an empty part set THROWS
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

```typescript
import { createProjectArchiveProvider } from '@molecule/api-project-archive-object-storage'

// The Node/JS policy is only this BOND's default. Any ecosystem configures its
// own — per provider, or per call with ArchiveInput.policy.
const pythonArchive = createProjectArchiveProvider({
  policy: { refuseSegments: ['.venv', '__pycache__'] },
})
const rustArchive = createProjectArchiveProvider({
  policy: { refuseSegments: ['target'] },
})
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

#### `ArtifactVerificationInput`

Input to {@link verifyArtifactBytes}.

```typescript
interface ArtifactVerificationInput {
  /** The artifact bytes as they came back OUT of storage. */
  artifact: Uint8Array

  /** sha256 of the artifact as it was computed BEFORE the upload. */
  sha256: string

  /** Number of parts handed to `archive()`. */
  parts: number

  /** Storage id the bytes were read from. Used in error messages only. */
  storageId: string

  /** Reject the artifact before decompressing it when it exceeds this. */
  maxArtifactBytes?: number

  /** Reject the decompressed payload when it exceeds this. */
  maxUncompressedBytes?: number
}
```

#### `NormalizedPartPath`

A part path decomposed by the canonical model.

```typescript
interface NormalizedPartPath {
  /** The canonical path: {@link NormalizedPartPath.segments} joined with `'/'`. */
  path: string

  /**
   * The canonical segments: separator-folded, empty segments removed, each one
   * trimmed of leading/trailing whitespace.
   *
   * This is the array EVERY rule matches against — the policy refusal, the
   * advisory filter, and path safety alike.
   */
  segments: string[]

  /**
   * True when normalising CHANGED the input — it contained a `'\'`, a repeated
   * or trailing separator, or a whitespace-padded segment.
   *
   * A provider REFUSES such a path rather than storing the normalised form; see
   * `assertSafePartPath` (`./tar.js`).
   */
  changed: boolean

  /**
   * The raw segments, before empties were dropped and whitespace trimmed.
   *
   * Only path VALIDATION uses these, so it can name the precise defect (an
   * empty segment, a `'.'` segment, a `'..'` traversal) instead of reporting
   * every malformed path as "not canonical".
   */
  rawSegments: string[]
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
   * What `archive()` REFUSES outright, for every call this provider serves.
   * Defaults to `NODE_PROJECT_POLICY` (refuses `node_modules` and the `.env*`
   * family).
   *
   * That default is a BOND default, NOT a contract-level truth: Node/JS is
   * simply the ecosystem molecule.dev scaffolds. A Python deployment configures
   * `{ refuseSegments: ['.venv', '__pycache__'] }`, a Rust one
   * `{ refuseSegments: ['target'] }`, and `ArchiveInput.policy` overrides
   * whatever is set here for a single call.
   *
   * Resolution is PER FIELD, never whole-object: the two recipes above supply
   * only `refuseSegments`, and replacing the whole object silently discarded
   * `refuseFilePrefixes` — archiving a `.env` in plaintext with `verified: true`.
   * Opting into another ecosystem's bulk list is not a statement about secrets.
   *
   * Consequently `{}` means "use the defaults", NOT "refuse nothing" — an empty
   * object reads as *empty/default* and must not silently be the most permissive
   * setting available. To refuse nothing, say so explicitly with
   * `{ refuseSegments: [], refuseFilePrefixes: [] }`; `??` falls through on
   * `undefined` only, so those explicit empties win. Turning a credential guard
   * off should be visible in code review.
   */
  policy?: ArchivePolicy

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

#### `TarEntry`

A single entry in a tar archive.

```typescript
interface TarEntry {
  /**
   * POSIX-relative path inside the archive. Must not be absolute, must not
   * contain a `..`, `.` or empty segment, and must not collide with another
   * entry after Unicode/case normalisation — {@link createTar} and
   * {@link parseTar} both reject such paths.
   */
  path: string

  /**
   * The entry's bytes. Always empty for a directory entry.
   */
  content: Uint8Array

  /**
   * Unix mode bits, always masked to `0o777` (setuid/setgid/sticky are
   * stripped). Defaults to `0o644` for files and `0o755` for directories when
   * writing; always populated when reading.
   */
  mode?: number

  /**
   * Modification time in seconds since the epoch. Defaults to `0` when writing,
   * which keeps the artifact byte-reproducible for identical input.
   */
  mtime?: number

  /**
   * Entry kind. Defaults to `'file'` when writing; always populated when
   * reading.
   */
  type?: 'file' | 'directory'
}
```

#### `TarLimits`

Size caps applied while reading untrusted bytes.

These exist because the artifact is downloaded from object storage: a
hostile or corrupt `.tar.gz` must not be able to exhaust the process's
memory before anything has had a chance to validate it.

```typescript
interface TarLimits {
  /**
   * Maximum number of UNCOMPRESSED bytes to materialise, in bytes. Enforced by
   * {@link gunzipBytes} while inflating and by {@link parseTar} both on the
   * archive it is handed and while accumulating entry data.
   *
   * Defaults to 2 GiB (`2 * 1024 * 1024 * 1024`).
   */
  maxUncompressedBytes?: number
}
```

### Functions

#### `assertSafeEntryPath(path)`

Rejects paths that would let an extracted archive escape its destination
directory (the "tar slip" vulnerability), plus paths tar cannot represent.

Enforced when WRITING as well as when READING: an archive this package
produces can never contain an unsafe path in the first place, and an archive
it did not produce can never hand one back.

```typescript
function assertSafeEntryPath(path: string): void
```

- `path` — The archive-internal entry path to validate (no trailing slash — {@link createTar} and {@link parseTar} strip a directory entry's trailing slash before validating).

#### `assertSafePartPath(path)`

Rejects a caller-supplied, UNPREFIXED {@link ArchivePart} path that would be
unsafe to archive or to restore.

**Call this on the RAW path, before any `parts/` prefix is applied.** A
prefix is precisely what disguises a hostile path: `'parts/' + '/etc/passwd'`
is `'parts//etc/passwd'`, which is neither absolute nor traversing and would
sail past a guard that only ever sees the prefixed form. It is the same
validation {@link assertSafeEntryPath} applies to archive-internal paths, run
one step earlier.

Every part is the same to this guard: a source file, a database dump and a
git bundle are all checked identically, because nothing about a part's
`kind` makes an absolute or traversing path safe.

```typescript
function assertSafePartPath(path: string): void
```

- `path` — The caller's relative part path, exactly as supplied.

#### `createProjectArchiveProvider(config)`

Creates an object-storage-backed project archive provider.

```typescript
function createProjectArchiveProvider(config?: ProjectArchiveObjectStorageConfig): ObjectStorageProjectArchiveProvider
```

- `config` — Provider configuration.

**Returns:** A `ProjectArchiveProvider` that persists artifacts through the configured (or bonded) uploads provider, with `archive()` narrowed to {@link ObjectStorageArchiveResult} so the orphan-cleanup report is readable without a cast.

#### `createTar(entries)`

Serializes entries into an uncompressed POSIX ustar archive.

Entries are written in the order given, each as a 512-byte header followed by
its content padded up to a 512-byte boundary, and the stream is terminated by
two zero blocks (1024 bytes) as the format requires. `mtime` defaults to 0, so
identical input produces a byte-identical archive. Modes are masked to
`0o777`, so no artifact this package writes can carry setuid/setgid/sticky.

```typescript
function createTar(entries: readonly TarEntry[]): Uint8Array<ArrayBufferLike>
```

- `entries` — The entries to write.

**Returns:** The tar bytes (always a multiple of 512).

#### `describePath(path)`

Renders a path for an error message: control characters (including NUL,
CR and LF) are escaped and the result is truncated.

Paths are metadata, not archive content — echoing one is what makes an error
actionable. Escaping is what keeps a hostile archive from injecting newlines
or terminal escapes into a log line, and truncation keeps a 4 KB crafted
path out of the message.

Exported because every module that names a path from a DOWNLOADED artifact
owes the same hygiene: the provider reports colliding parts, unindexed parts
and stowaway members by path, and all of those strings came out of a bucket.
An ordinary path passes through unchanged, so it is safe to wrap every such
message in it.

```typescript
function describePath(path: string): string
```

- `path` — The raw path.

**Returns:** A safe, bounded rendering of the path.

#### `filterArchivableParts(parts, excludes, options)`

Splits a raw workspace walk into the parts an archive should carry and the
parts it should not, so a caller can filter in one call instead of
reimplementing the rules (and getting them subtly wrong).

Returns BOTH halves — {@link PartFilterResult.kept} and
{@link PartFilterResult.dropped} — and never a bare array. This package runs
immediately before a caller DELETES a user's only copy, so a filter that
quietly returns less than it was given is the most expensive bug it can have,
and it had it: filtering
`['src/build/compiler.ts', 'src/tmp/scratch.ts', 'app/coverage/report.ts',
'src/main.ts']` through `NODE_PROJECT_EXCLUDES` kept only `src/main.ts` and
dropped three legitimate source files, with nothing in the return value to say
so. LOG or assert on `dropped` before releasing anything, and summarise it
onto `ArchiveInput.excluded` as provenance.

Three rules decide it, applied per exclude entry — all of them against the
CANONICAL segments of the one path model (`./path-model.js`), which is why
`api\node_modules\pkg\index.js` is dropped here just as it is refused by the
policy. When the filter split on `'/'` alone, it was not:

- **anchored directory match** — the entry is matched as a LEADING path, so
  `'build'` drops `build/bundle.js` and `build` itself, but keeps
  `src/build/compiler.ts`. A monorepo that genuinely wants every
  `packages/<name>/dist` dropped passes those DEEPER PATHS EXPLICITLY
  (`'packages/api/dist'`, `'packages/app/dist'`), which this rule honours as a
  leading path. The default is SAFE — it keeps real source — and being more
  aggressive than that is an explicit caller choice, never something a preset
  does behind the caller's back. (An entry naming a path EXACTLY still drops
  that path: `['dist']` drops a part whose whole path is `dist`, because the
  caller named it. What the rule never does is match a basename at depth.)
- **any-segment directory match**, for entries in `options.anySegment`
  (default `NODE_ANY_SEGMENT_EXCLUDES` = `node_modules`) and nothing else —
  `api/node_modules/x` and `packages/web/node_modules/x` are dropped at any
  depth, because a nested `node_modules` is real in every workspace, always
  reproducible from the lockfile, and never a source directory anyone named on
  purpose. Anchoring it would miss most of the ~1.5 GB the exclusion exists to
  drop. `dist`, `build`, `tmp` and `coverage` do NOT qualify: they are all
  plausible real source directory names, so matching them at depth trades a
  bounded saving (some bytes) against an unbounded loss (a user's source).
  The set is an OPTION rather than a hard-coded constant so a Python walk can
  ask for the same treatment (`{ anySegment: ['__pycache__'] }`) instead of
  inheriting Node's and getting nothing for its own.
- **dot-entry family match** — a part whose BASENAME equals a DOT entry, or
  starts with `'<dot-entry>.'`, is dropped wherever it sits. This is what
  still drops `src/.DS_Store` and the `.env.local` / `.env.production` family.
  It applies ONLY to entries that themselves start with `'.'`: a non-dot entry
  matches a directory and never a filename, so `src/tmp.ts`, `src/build.rs`,
  `src/dist.config.js`, `tmp.md`, `buildings/x.ts`, `distance.ts`,
  `lib/build.gradle` and a git ref named `.git/refs/heads/dist` all SURVIVE.
  Applied to every entry, this rule silently deleted all of those — the same
  "filter eats real source" defect as the any-segment default, one layer down,
  and in `.git` it corrupted history that no snapshot can regenerate.

Matching is CASE-SENSITIVE, like the POSIX paths these archives are built
from. (`ArchivePolicy.refuseFilePrefixes` is the deliberate exception — see
`matchesSecretSegment` — because a missed secret is unrecoverable while a
missed bulk directory only costs bytes.)

`archive()` independently REFUSES whatever the effective {@link ArchivePolicy}
names, rather than trusting this helper was used — this exists to make doing
the right thing easy, not to be the only guard. Note the division of labour
the contract draws: reproducible bulk is FILTERED here (reported on `dropped`,
because it is merely wasteful) while secrets are REFUSED by the policy
(loudly, because archiving one is not recoverable) — which is why
`NODE_PROJECT_EXCLUDES` contains no `.env` entry. Add `DOTENV_FILE_PREFIX` to
the excludes yourself if you would rather drop secret files during the walk
than have `archive()` throw on them.

```typescript
function filterArchivableParts(parts: readonly T[], excludes?: readonly string[], options?: PartFilterOptions): PartFilterResult<T>
```

- `parts` — The raw part set from a workspace walk.
- `excludes` — Leading paths / any-depth segments / dot-entry families to drop. Normalised by the same path model as the parts, so `'dist/'` and `'.\dist'` mean what they look like they mean instead of silently matching nothing. Defaults to `NODE_PROJECT_EXCLUDES`, which describes a Node/JS project and nothing else.
- `options` — Filter knobs; `anySegment` (default `NODE_ANY_SEGMENT_EXCLUDES`) is the set matched at ANY depth rather than anchored. Pass `[]` to anchor everything.

**Returns:** Both halves of the split: the parts to archive, and every part that was removed.

#### `foldedSegment(segment)`

The comparison form of one segment: Unicode NFC, lower-cased.

Comparison only — never stored. A precomposed `é` and a decomposed `é` are the
same filename to a filesystem, and so are `.env` and `.ENV` on the
case-insensitive filesystems developers author them on.

```typescript
function foldedSegment(segment: string): string
```

- `segment` — The segment to fold.

**Returns:** Its case- and composition-folded form.

#### `gunzipBytes(data, limits)`

Gunzip-decompresses bytes, refusing to expand past `maxUncompressedBytes`.

This is the decompression-bomb guard: a few KB of gzip can inflate to
gigabytes of zeros, so the cap is handed to zlib itself
(`maxOutputLength`) — inflation ABORTS at the cap rather than completing and
then being measured. The gzip trailer's declared uncompressed size is also
checked first, which rejects the obvious bomb before any CPU is spent.

```typescript
function gunzipBytes(data: Uint8Array<ArrayBufferLike>, limits?: TarLimits): Uint8Array<ArrayBufferLike>
```

- `data` — The gzip stream bytes.
- `limits` — Optional size caps; `maxUncompressedBytes` defaults to 2 GiB.

**Returns:** The decompressed bytes.

#### `gzipBytes(data)`

Gzip-compresses bytes.

Synchronous, like the rest of this codec: the whole artifact is buffered in
memory anyway, so there is nothing to stream around.

```typescript
function gzipBytes(data: Uint8Array<ArrayBufferLike>): Uint8Array<ArrayBufferLike>
```

- `data` — The bytes to compress.

**Returns:** The gzip stream bytes.

#### `matchesAnchoredPath(segments, entrySegments)`

Tests whether `entry`, read as a leading path, contains the path.

`'build'` matches `build` and `build/bundle.js`, and NOT `src/build/compiler.ts`
— the anchoring that stopped the filter from deleting real source. A caller
that genuinely wants a deeper subtree gone names it (`'packages/api/dist'`),
and this rule honours it the same way.

```typescript
function matchesAnchoredPath(segments: readonly string[], entrySegments: readonly string[]): boolean
```

- `segments` — The path's canonical segments.
- `entrySegments` — The entry's canonical segments.

**Returns:** True when the entry is a leading path of (or equal to) the path.

#### `matchesAnySegment(segments, entry)`

Tests whether a path's canonical segments contain `entry` at ANY depth,
case-SENSITIVELY.

The rule behind `ArchivePolicy.refuseSegments` and the advisory filter's
any-segment set. Segment-based, never substring-based: `'node_modules'`
matches `api/node_modules/x` but never `node_modules_notes.md`.

```typescript
function matchesAnySegment(segments: readonly string[], entry: string): boolean
```

- `segments` — The path's canonical segments.
- `entry` — The segment to look for.

**Returns:** True when any segment equals the entry.

#### `matchesDotFamily(basename, entry)`

Tests the DOT-ENTRY family rule: a basename equal to the entry, or prefixed
by `'<entry>.'` — and ONLY for an entry that itself starts with `'.'`.

```typescript
function matchesDotFamily(basename: string, entry: string): boolean
```

- `basename` — The path's last canonical segment.
- `entry` — The exclude entry.

**Returns:** True when the entry is dot-shaped and the basename is in its family.

#### `matchesSecretSegment(segment, prefix)`

Tests one canonical segment against one `ArchivePolicy.refuseFilePrefixes`
entry — equal to it, or prefixed by `'<entry>.'` — comparing
CASE-INSENSITIVELY and under NFC.

```typescript
function matchesSecretSegment(segment: string, prefix: string): boolean
```

- `segment` — One canonical segment of the part's path.
- `prefix` — The refused prefix entry to test against.

**Returns:** True when the segment belongs to that prefix's family.

#### `normalizePartPath(path)`

Decomposes a part path with the canonical model: folds `'\'` onto `'/'`,
collapses repeated separators, and trims leading/trailing whitespace from
EACH segment.

Pure and non-throwing — it reports what the canonical form WOULD be and
whether that differs from the input. Deciding what to do about a difference
belongs to `assertSafePartPath` (`./tar.js`), which refuses it.

```typescript
function normalizePartPath(path: string): NormalizedPartPath
```

- `path` — The path to decompose.

**Returns:** The canonical path, its segments, whether normalisation changed the input, and the raw segments for precise validation errors.

#### `parseTar(data, limits)`

Parses an uncompressed POSIX ustar archive.

Nothing in the header is taken on trust:

- every header's stored checksum is RECOMPUTED and compared (unsigned, or
  the historic signed variant) before the header is used,
- every entry path is validated with {@link assertSafeEntryPath} BEFORE the
  entry is returned — so a malicious archive containing `../evil` or
  `/etc/passwd` throws here rather than escaping the caller's extraction
  directory later,
- entries that collide after Unicode/case normalisation are rejected, so a
  restore cannot silently overwrite one file with another,
- modes are masked to `0o777`, so a restored file can never carry setuid,
- the total data size is checked against `maxUncompressedBytes` BEFORE each
  entry's bytes are copied, so a header claiming 8 GiB throws instead of
  allocating, and
- the two-zero-block end-of-archive marker must be present, so an artifact
  truncated at a block boundary fails loudly instead of yielding half a
  project.

```typescript
function parseTar(data: Uint8Array<ArrayBufferLike>, limits?: TarLimits): TarEntry[]
```

- `data` — The tar bytes.
- `limits` — Optional size caps; `maxUncompressedBytes` defaults to 2 GiB.

**Returns:** The entries in archive order, each with a copied `content` buffer.

#### `pathCollisionKey(path)`

Normalises a path into the key used to detect entries that would collide
with one another when restored.

A one-line consumer of the canonical model (`./path-model.js`): the model
folds Windows separators onto `/` and collapses repeated and trailing
separators, then this applies Unicode NFC (so a precomposed `é` and a
decomposed `é` compare equal) and lower-cases (so a case-insensitive
filesystem cannot silently overwrite one entry with another). Re-implementing
the folding here is what produced two disagreeing notions of a separator.

```typescript
function pathCollisionKey(path: string): string
```

- `path` — The path to normalise.

**Returns:** The comparison key.

#### `pathComparisonKey(path)`

The key two paths are compared by when deciding whether they would overwrite
each other on restore.

Built from the canonical model, so `a\b`, `a//b` and `a/b/` all key the same
as `a/b`, then NFC-folded and lower-cased so a case-insensitive or
composition-folding filesystem cannot silently replace one entry with
another.

```typescript
function pathComparisonKey(path: string): string
```

- `path` — The path to key.

**Returns:** The comparison key.

#### `segmentsOf(path)`

Splits a path into raw segments on either separator.

**The only path split in this package.** Everything else consumes
{@link normalizePartPath}. A second splitter is how `'\'` came to mean two
different things in one package and a `.env` reached plaintext storage.

```typescript
function segmentsOf(path: string): string[]
```

- `path` — The path to split.

**Returns:** Its raw segments, in order, including empty ones (a repeated or trailing separator yields an empty segment, which validation rejects).

#### `verifyArtifactBytes(input)`

Validates artifact bytes that have already been read back out of storage.

Never throws: every failure is reported through the returned
{@link ArchiveVerification} so the CALLER decides what an unverified archive
means. `downloaded` is `true` whenever bytes were supplied — this function
validates them; fetching them is the caller's job.

The check that matters is `digestMatched`: the artifact is UNPACKED, the byte
total is compared with `manifest.parts.bytes`, the manifest's per-part index
is reconciled against the payload, and the parts digest is recomputed from
the downloaded parts WITH the labels that index records AND the header the
manifest declares, then compared with `manifest.parts.sha256`. Without it the
other flags only compare the artifact to itself, and a packer that dropped or
corrupted a part's contents passes them all. Because the digest covers the
index and the header, a relabelled part (the `database` dump renamed `repo`, a
`meta.format` rewritten) and a re-owned artifact (`projectId`, `createdAt`,
`metadata`, `excluded` rewritten) both fail here as well — which matters
because the caller ROUTES on those labels at restore and reads that header as
fact. Every part is checked by the same rule — there is no special case for a
database dump, because there is no privileged part.

It does NOT prove the artifact is the one this provider wrote: the digest is
unkeyed and lives inside the artifact, so a wholesale re-forge passes. See
{@link partsDigest} for the caller-side comparison that closes that.

```typescript
function verifyArtifactBytes(input: ArtifactVerificationInput): ArchiveVerification
```

- `input` — The bytes, the pre-upload digest, the expected part count, and the size caps.

**Returns:** The verification report.

### Constants

#### `provider`

Object-storage project archive provider using the default configuration: the
bonded `@molecule/api-uploads` provider (resolved lazily, per call),
`NODE_PROJECT_POLICY` as the refusal policy, post-upload verification enabled,
empty archives rejected, and the default 512 MiB artifact / 2 GiB decompressed
size caps.

The Node/JS policy default is a BOND default — the ecosystem molecule.dev
scaffolds — not a contract-level truth. Use
{@link createProjectArchiveProvider} instead when you need a different policy
(`{ refuseSegments: ['.venv', '__pycache__'] }` for Python,
`{ refuseSegments: ['target'] }` for Rust), different caps, `allowEmpty`, or an
explicitly injected uploads provider — or override per call with
`ArchiveInput.policy`.

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

- **NOTHING IS PRIVILEGED — the artifact is `manifest.json` + one `parts/`
  member per part, and that is the whole layout.** Source files, a `pg_dump`,
  a Redis snapshot and a `git bundle` are packed, digested, verified and
  restored by the SAME code path; this provider never branches on a part's
  `kind`, `meta`, or path shape and never decodes its bytes. Grouping is a
  convention you express in the part path (`source/…`, `database/…`,
  `repos/…`) and nothing here parses it, so a second database or any new
  content type is one more part and needs no change to this package.
- **Every part lives under ONE `parts/` prefix**, chosen so the archive's
  namespace and the caller's are disjoint by construction: a part legitimately
  named `manifest.json` becomes `parts/manifest.json` and can never shadow the
  artifact's own manifest. Per-kind prefixes would reintroduce the
  privileged-channel design this version removed.
- **`kind` and `meta` survive the round trip verbatim, and are the ONLY thing
  that tells a restore what a part is.** They are recorded into
  `manifest.entries` and re-attached on `restore()`. Record what a restore
  will need — dump format, engine version, git remote and head sha — but never
  secrets: the manifest is the most readable thing in an unencrypted artifact.
  A `{ format: 'pg_custom' }` dump aimed at a non-Postgres engine fails when
  YOU run `pg_restore`, not at archive time.
- **EVERYTHING the manifest asserts is inside `manifest.parts.sha256`: the
  part bytes, the `entries` index you route on, AND the header
  (`formatVersion`, `projectId`, `createdAt`, `parts.count`, `parts.bytes`,
  `excluded`, `metadata`).** Anything outside it would be an unauthenticated
  instruction — anyone with bucket write access could swap which part is
  labelled `database`, or rewrite WHOSE project the artifact is, and every
  check still passed. All of it now fails `digestMatched` and makes
  `restore()` and `status()` THROW. A manifest carrying an UNDECLARED key
  (`entries[0].restoreHint`) is refused outright, because a fixed-field digest
  cannot cover it. (An artifact written before the index and header were
  folded in fails the digest rather than being read with an unauthenticated
  one — re-archive it.)
- **The digest CANNOT detect a wholesale re-forge, and does not pretend to.**
  It is unkeyed and stored inside the artifact it covers, so an attacker with
  bucket write access can replace the whole artifact and recompute a
  consistent digest; every check here then passes, because every input came
  from them. The mitigation lives outside the artifact and costs one column:
  persist `result.manifest.parts.sha256` alongside `result.storageId`, and
  compare it with `restore().manifest.parts.sha256` before trusting the parts.
- **The policy is CONFIGURABLE, and its Node/JS default is a BOND default —
  not a contract-level truth.** `archive()` refuses whatever the effective
  `ArchivePolicy` names, resolved as `ArchiveInput.policy` →
  `createProjectArchiveProvider({ policy })` → `NODE_PROJECT_POLICY`. The
  fallback is Node/JS only because that is the ecosystem molecule.dev
  scaffolds: a Python deployment passes
  `{ refuseSegments: ['.venv', '__pycache__'] }`, a Rust one
  `{ refuseSegments: ['target'] }`, and `{}` refuses nothing. Refusal THROWS
  naming the offending path — it never silently drops a part, because that
  would make the manifest describe a tree you never intended to archive.
- **The two policy rules are matched differently on purpose.**
  `refuseSegments` compares each segment CASE-SENSITIVELY (POSIX paths are,
  and `Build/` may be a real source directory a false refusal would throw
  over). `refuseFilePrefixes` compares EVERY path segment
  CASE-INSENSITIVELY, so `.ENV`, `.Env`, `.eNv.production` AND a `.env`
  DIRECTORY (`.env/prod.key`, `config/.env/staging`) are all refused. The
  asymmetry is about cost: a missed bulk directory only wastes bytes, while a
  missed secret writes a live credential into plaintext object storage and
  rotating it is the only remedy left.
- **The storage id is MINTED by the uploads bond and returned verbatim —
  nothing is derived from `projectId`.** Both shipped uploads bonds
  (`@molecule/api-uploads-s3`, `-filesystem`) do `const id = uuid()` and IGNORE
  the supplied filename, so a derived key pointed at nothing: `remove()`
  deleted nothing, `status()` returned `null`, and a verification failure named
  an id that held no object. **PERSIST `result.storageId`** (e.g. on the
  project's row) — `restore()`, `status()`, and `remove()` all take that id,
  and there is no lookup by project.
- **Every `archive()` mints a NEW id, so re-archiving can never overwrite the
  previous artifact.** That is deliberate: the old archive stays intact and
  restorable while the replacement is being verified. Order the swap
  accordingly — archive → check `verified` → persist the new id → `remove()`
  the OLD id. Deleting first is how the only good copy gets destroyed by a bad
  replacement.
- **`verified === true` is the ONLY green light to release the live project.**
  `archive()` re-reads the artifact back OUT of storage at the minted id,
  re-hashes the downloaded bytes against the pre-upload sha256, re-parses
  `manifest.json` from those downloaded bytes, re-counts the `parts/` members,
  AND unpacks them to recompute the parts digest + byte total against
  `manifest.parts.sha256`/`bytes` and reconcile the manifest's per-part index
  (`digestMatched` — the only flag that proves the PACKER preserved the bytes;
  without it the other checks compare the artifact to itself). All five must
  pass. A successful `upload()` proves nothing about what the bucket holds.
- **A verification failure does NOT throw.** It returns `verified: false` with
  `verification.error` populated (and the individual `downloaded` /
  `checksumMatched` / `manifestParsed` / `entriesMatched` / `digestMatched`
  flags), because only the caller can decide whether to retry, alert, or keep
  the project alive. Code that ignores the returned `verified` flag because "it
  didn't throw" is the exact bug this design exists to prevent.
- **A failed verification also CLEANS UP after itself.** Nothing would ever
  reference that object again (you were told not to persist the id of an
  unverified archive), so it is deleted best-effort and `orphanCleanup`
  (`{ attempted, deleted, error? }`) reports what happened; a delete failure is
  logged and reported, never allowed to mask `verification.error`. An archive
  left unverified by CONFIGURATION — `verifyOnArchive: false`, or an uploads
  bond with no `getFile()` — is never deleted: it is the only copy you asked
  for.
- **An artifact may contain only `manifest.json` and `parts/<path>` FILE
  members.** Anything else is REFUSED by name, on every read path
  (`archive()`'s verification, `restore()`, `status()`). Nothing counts,
  digests, verifies or restores a member outside those two namespaces, so
  ignoring one would let an artifact carry content that no check here has ever
  looked at. DIRECTORY members are refused wherever they sit, `parts/` included
  — this provider writes none, so one is evidence of a re-pack, and a
  `parts/<dir>` member used to pass the prefix check and then be skipped by the
  part collector while `tar -xzf` still created it.
- **`archive()` DOES throw on an empty part set.** An empty archive verifies
  perfectly and proves nothing, so a workspace walk that silently returned `[]`
  would otherwise read as a good backup. `ArchiveInput.minParts` (default `1`)
  is the floor and `requiredPaths` is the stronger guard — name the parts a
  restore cannot do without (`source/package.json`, the lockfile,
  `database/main.dump`). Only a provider built with
  `createProjectArchiveProvider({ allowEmpty: true })` may accept zero.
  Unsafe/colliding paths, a policy refusal, an exceeded size cap, and a failed
  upload throw too: none of those are archives, so there is nothing for the
  caller to weigh.
- **`restore()` VALIDATES before it hands anything back.** Part count against
  `manifest.parts.count`, total bytes against `manifest.parts.bytes`, the
  manifest's per-part index against the payload (every part indexed, every
  indexed length correct), and then the recomputed parts digest — over the
  parts AND the labels the index carries — against `manifest.parts.sha256`;
  any mismatch THROWS. A truncated, re-packed, or RELABELLED artifact fails
  loudly instead of yielding half a project or a part routed as something it
  is not. Do not catch that and write whatever came back anyway.
- **Path safety is enforced on the RAW, unprefixed path, on both sides.**
  `archive()` validates the caller's `path` BEFORE prepending `parts/`, and
  `restore()` re-validates after stripping it — checking the prefixed form is
  worthless, because `parts/` + `/etc/passwd` is neither absolute nor
  traversing. Absolute POSIX paths, a backslash ANYWHERE, drive-qualified paths
  (`C:\x`), any `..` segment, NUL bytes, repeated/trailing separators,
  whitespace-padded segments, and empty/`.`-only paths are rejected, as are two
  parts that collide after normalisation (they would overwrite each other on
  restore). Modes are masked to `0o777` on write AND on read, so
  setuid/setgid/sticky never survive a round trip.
- **The archive is NOT encrypted at rest by this package.** It is a plain
  `.tar.gz` sitting in object storage, readable by anyone with bucket access.
  Secrets therefore never go in it — as a part, in `metadata`, or in a part's
  `meta`. That is why `NODE_PROJECT_POLICY` REFUSES the `.env` family rather
  than merely excluding it. Keep secrets in the platform's encrypted vault and
  re-inject them on restore. (Bucket-level SSE, if the deployment has it, is
  the deployment's guarantee, not this package's.)
- **Size caps are on by default: `maxArtifactBytes` (512 MiB) and
  `maxUncompressedBytes` (2 GiB).** `maxArtifactBytes` bounds the artifact this
  provider builds and every artifact it reads from storage — enforced WHILE the
  download streams (the read aborts and the stream is destroyed on the chunk
  that would cross the cap, so the payload is never fully buffered) and again
  BEFORE decompression, so a gzip bomb is rejected unread.
  `maxUncompressedBytes` is passed through the codec (inflate + entry
  accumulation) and also bounds the part bytes handed to `archive()`.
  Exceeding either throws an error naming the cap. Raise them in
  `createProjectArchiveProvider({ … })` only for a deployment that genuinely
  needs it.
- **Everything is buffered in memory** (tar → gzip → upload, and the reverse on
  restore), which is what the caps above bound. That is fine for source and a
  dump — single-digit MB — and NOT fine for a `node_modules`-sized tree.
- **The caller filters, the policy refuses; `excluded` is provenance only.**
  Passing `NODE_PROJECT_EXCLUDES` as `excluded` filters NOTHING — it is
  recorded in the manifest so a future reader knows what was left out. Use
  `filterArchivableParts(parts, excludes)` on the walk instead, or you will
  archive a 1.5 GB tree that is reproducible from the lockfile.
- **`filterArchivableParts` returns BOTH halves and NEVER drops silently.**
  `{ kept, dropped }` — log or assert on `dropped` before anything releases the
  live project; it is the only record of what the walk gave up. An exclude is
  matched as a LEADING path (`'build'` drops `build/bundle.js`, and KEEPS
  `src/build/compiler.ts`), at every segment only for the `anySegment` option
  (default `NODE_ANY_SEGMENT_EXCLUDES` from `@molecule/api-project-archive`:
  `node_modules`, which is real at any depth and always regenerable — pass
  `{ anySegment: ['__pycache__'] }` to give another ecosystem the same rule),
  plus the `'<entry>.'` DOT-ENTRY family rule that still catches
  `src/.DS_Store` and the `.env.local` family anywhere. A monorepo that wants
  every `packages/<name>/dist` dropped passes those deeper paths EXPLICITLY
  (`'packages/api/dist'`) — the default is safe, and being more aggressive is
  your call, not a preset's. An empty-string exclude entry is refused
  outright: it would degenerate the family rule to `'.'` and drop every
  dotfile, `.git` included.
- **The family rule applies ONLY to DOT entries; a plain directory name never
  matches a filename.** `'.env'` catches `.env.local` (that is the point), but
  `'tmp'`, `'build'`, `'dist'` and `'coverage'` match a DIRECTORY and nothing
  else — so `src/tmp.ts`, `src/build.rs`, `src/dist.config.js`, `tmp.md`,
  `buildings/x.ts`, `distance.ts`, `lib/build.gradle` and a git ref named
  `.git/refs/heads/dist` all survive. Applied to every entry it silently ate
  all of those, `.git` history included, in a helper that runs immediately
  before the live project is deleted.
- **ONE path model decides what a path's segments are** (`path-model.js`:
  `normalizePartPath`), and path safety, the policy refusal, the excludes
  filter and collision detection all read ITS segments. `'\'` is a separator
  everywhere, each segment is whitespace-trimmed, repeated separators collapse,
  and NFC is used for comparison only. **A part path that is not already
  canonical is REJECTED, not rewritten** — `config\.env`, `a//b`, `a/b/`,
  `.env ` and ` .env` all throw — so the path you send is the path the manifest
  records. When those rules disagreed about `'\'`, `config\.env` archived and
  verified: a live dotenv credential in storage that is not encrypted at rest.
- **`.git` is archivable and is deliberately absent from
  `NODE_PROJECT_EXCLUDES`.** History is user work and is not reproducible from
  a snapshot. For a large repo, archive a `git bundle` part instead of the
  `.git` directory — either way, keep the history, and scrub credentials out
  of remote URLs first.
- **Bond `@molecule/api-uploads` FIRST**, or inject one via
  `createProjectArchiveProvider({ uploads })`. The bonded provider is resolved
  lazily per call, so importing this package before the bond is wired is safe.
  A bond without `getFile()` can neither verify nor restore — `archive()` then
  returns `verified: false` (never `true`), exactly like
  `verifyOnArchive: false`, which is an escape hatch and not a speed knob.
- **This provider NEVER deletes or releases the live project.** `remove()`
  deletes ONE archive artifact, addressed by its storage id. Releasing the
  project is the caller's job.
- `restore()` returns BYTES; it does not touch the filesystem, provision a
  sandbox, or restore a database. Writing the parts (and applying `mode`) is
  the caller's job.
