# @molecule/api-project-archive-object-storage

Object-storage project-archive provider for molecule.dev.

Implements the `@molecule/api-project-archive` contract by packing a
project's source files (and an optional database dump) into a STANDARD
gzipped POSIX ustar tarball and persisting it through the bonded
`@molecule/api-uploads` provider — S3, R2, B2, MinIO, or the local filesystem
bond, whichever the app wired. No storage SDK is imported here and the
package ships zero external runtime dependencies: the tar writer/reader is a
single module of `node:zlib` + `node:crypto`.

The artifact is a real `.tar.gz`. `tar -xzf project.tar.gz` yields
`manifest.json`, `source/<path>` for every archived file (relative paths and
modes preserved), and `database.dump` when one was supplied — no molecule.dev
tooling required to get the data back out. That is the no-lock-in promise.

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
// Archive, then release the live project ONLY when verified — and delete the
// PREVIOUS artifact only after the new one has proven itself.
const previousStorageId = project.archiveStorageId // whatever we persisted last time

const result = await archiveProvider.archive({
  projectId,
  files,                            // caller already filtered node_modules/.git/dist/.env*
  excluded: DEFAULT_ARCHIVE_EXCLUDES, // provenance only — it does NOT filter
  minEntries: 1,                    // an empty file set THROWS
  requiredPaths: ['package.json', 'package-lock.json'],
  databaseDump: await pgDump(projectId),
  databaseFormat: 'pg_custom',
})

if (!result.verified) {
  logger.error('archive not verified — keeping the live project', result.verification)
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

// Later: bring it back. restore() REQUIRES the persisted storage id.
const { files: restored, databaseDump } = await archiveProvider.restore({
  projectId,
  storageId: project.archiveStorageId,
})
```

## Type
`provider`

## Installation
```bash
npm install @molecule/api-project-archive-object-storage @molecule/api-project-archive @molecule/api-uploads
```

## API

### Interfaces

#### `ArtifactVerificationInput`

Input to {@link verifyArtifactBytes}.

```typescript
interface ArtifactVerificationInput {
  /** The artifact bytes as they came back OUT of storage. */
  artifact: Uint8Array

  /** sha256 of the artifact as it was computed BEFORE the upload. */
  sha256: string

  /** Number of source files handed to `archive()`. */
  entries: number

  /** Storage id the bytes were read from. Used in error messages only. */
  storageId: string

  /** Reject the artifact before decompressing it when it exceeds this. */
  maxArtifactBytes?: number

  /** Reject the decompressed payload when it exceeds this. */
  maxUncompressedBytes?: number
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
   * Whether `archive()` may accept an EMPTY file set. Defaults to `false`, so a
   * workspace walk that silently returned `[]` throws instead of producing an
   * archive of nothing that verifies perfectly. Turn it on only for a caller
   * that legitimately archives empty projects, and then pass
   * `ArchiveInput.minEntries: 0` at the call site to say so explicitly.
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
   * and on the source bytes handed to `archive()`. Defaults to 2 GiB.
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

#### `assertSafeSourcePath(path)`

Rejects a caller-supplied, UNPREFIXED source path that would be unsafe to
archive or to restore.

**Call this on the RAW path, before any `source/` prefix is applied.** A
prefix is precisely what disguises a hostile path: `'source/' + '/etc/passwd'`
is `'source//etc/passwd'`, which is neither absolute nor traversing and would
sail past a guard that only ever sees the prefixed form. It is the same
validation {@link assertSafeEntryPath} applies to archive-internal paths, run
one step earlier.

```typescript
function assertSafeSourcePath(path: string): void
```

- `path` — The caller's relative path, exactly as supplied.

#### `createProjectArchiveProvider(config)`

Creates an object-storage-backed project archive provider.

```typescript
function createProjectArchiveProvider(config?: ProjectArchiveObjectStorageConfig): ProjectArchiveProvider
```

- `config` — Provider configuration.

**Returns:** A `ProjectArchiveProvider` that persists artifacts through the configured (or bonded) uploads provider.

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

Folds Windows separators onto `/`, collapses repeated and trailing
separators, applies Unicode NFC (so a precomposed `é` and a decomposed `é`
compare equal), and lower-cases (so a case-insensitive filesystem cannot
silently overwrite one entry with another).

```typescript
function pathCollisionKey(path: string): string
```

- `path` — The path to normalise.

**Returns:** The comparison key.

#### `verifyArtifactBytes(input)`

Validates artifact bytes that have already been read back out of storage.

Never throws: every failure is reported through the returned
{@link ArchiveVerification} so the CALLER decides what an unverified archive
means. `downloaded` is `true` whenever bytes were supplied — this function
validates them; fetching them is the caller's job.

The check that matters is `digestMatched`: the artifact is UNPACKED and the
source digest and byte total are recomputed from the downloaded entries and
compared with `manifest.source.sha256`/`bytes` (plus the dump's digest against
`manifest.database`). Without it the other flags only compare the artifact to
itself, and a packer that dropped or corrupted file contents passes them all.

```typescript
function verifyArtifactBytes(input: ArtifactVerificationInput): ArchiveVerification
```

- `input` — The bytes, the pre-upload digest, the expected entry count, and the size caps.

**Returns:** The verification report.

### Constants

#### `provider`

Object-storage project archive provider using the default configuration: the
bonded `@molecule/api-uploads` provider (resolved lazily, per call),
post-upload verification enabled, empty archives rejected, and the default
512 MiB artifact / 2 GiB decompressed size caps.

Use {@link createProjectArchiveProvider} instead when you need different caps,
`allowEmpty`, or an explicitly injected uploads provider.

```typescript
const provider: ProjectArchiveProvider
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
- `@molecule/api-project-archive` >=1.0.0
- `@molecule/api-uploads` >=1.0.0

### Runtime Dependencies

- `@molecule/api-project-archive`
- `@molecule/api-uploads`

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
  `manifest.json` from those downloaded bytes, re-counts the `source/` members,
  AND unpacks them to recompute the source digest + byte total against
  `manifest.source.sha256`/`bytes` (`digestMatched` — the only flag that proves
  the PACKER preserved the files; without it the other checks compare the
  artifact to itself). All five must pass. A successful `upload()` proves
  nothing about what the bucket holds.
- **A verification failure does NOT throw.** It returns `verified: false` with
  `verification.error` populated (and the individual `downloaded` /
  `checksumMatched` / `manifestParsed` / `entriesMatched` / `digestMatched`
  flags), because only the caller can decide whether to retry, alert, or keep
  the project alive. Code that ignores the returned `verified` flag because "it
  didn't throw" is the exact bug this design exists to prevent.
- **`archive()` DOES throw on an empty file set.** An empty archive verifies
  perfectly and proves nothing, so a workspace walk that silently returned `[]`
  would otherwise read as a good backup. `ArchiveInput.minEntries` (default
  `1`) is the floor and `requiredPaths` is the stronger guard — name the files
  a restore cannot do without (`package.json`, the lockfile). Only a provider
  built with `createProjectArchiveProvider({ allowEmpty: true })` may accept
  zero. Unsafe/colliding paths, an exceeded size cap, and a failed upload throw
  too: none of those are archives, so there is nothing for the caller to weigh.
- **`restore()` VALIDATES before it hands anything back.** File count against
  `manifest.source.entries`, recomputed source digest against
  `manifest.source.sha256`, total bytes against `manifest.source.bytes`, and
  the dump's size + digest against `manifest.database` — any mismatch THROWS.
  A truncated or re-packed artifact fails loudly instead of yielding half a
  project. Do not catch that and write whatever came back anyway.
- **Path safety is enforced on the RAW, unprefixed path, on both sides.**
  `archive()` validates the caller's `path` BEFORE prepending `source/`, and
  `restore()` re-validates after stripping it — checking the prefixed form is
  worthless, because `source/` + `/etc/passwd` is neither absolute nor
  traversing. Absolute POSIX paths, a leading backslash, drive-qualified paths
  (`C:\x`), any `..` segment, NUL bytes, and empty/`.`-only paths are rejected,
  as are two paths that collide after normalisation (they would overwrite each
  other on restore). Modes are masked to `0o777` on write AND on read, so
  setuid/setgid/sticky never survive a round trip.
- **The archive is NOT encrypted at rest by this package.** It is a plain
  `.tar.gz` sitting in object storage, readable by anyone with bucket access.
  Secrets therefore never go in it — `.env` and the `.env.*` family are in
  `DEFAULT_ARCHIVE_EXCLUDES` for that reason, not to save bytes. Keep secrets
  in the platform's encrypted vault and re-inject them on restore. (Bucket-level
  SSE, if the deployment has it, is the deployment's guarantee, not this
  package's.)
- **Size caps are on by default: `maxArtifactBytes` (512 MiB) and
  `maxUncompressedBytes` (2 GiB).** `maxArtifactBytes` bounds the artifact this
  provider builds and every artifact it buffers from storage — enforced BEFORE
  decompression, so a gzip bomb is rejected unread. `maxUncompressedBytes` is
  passed through the codec (inflate + entry accumulation) and also bounds the
  source bytes handed to `archive()`. Exceeding either throws an error naming
  the cap. Raise them in `createProjectArchiveProvider({ … })` only for a
  deployment that genuinely needs it.
- **Everything is buffered in memory** (tar → gzip → upload, and the reverse on
  restore), which is what the caps above bound. That is fine for source —
  single-digit MB — and NOT fine for a `node_modules`-sized tree.
- **The caller filters the file list; `excluded` is provenance only.** Passing
  `DEFAULT_ARCHIVE_EXCLUDES` does NOT filter anything — it is recorded in the
  manifest so a future reader knows what was left out. Hand `files` that
  already exclude `node_modules`, `.git`, `dist`, `.env*`, … or you will
  archive a 1.5 GB tree that is reproducible from the lockfile (and leak
  secrets while doing it).
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
  sandbox, or restore a database. Writing the files (and applying `mode`) is
  the caller's job.
