# @molecule/api-project-archive

Project archive core interface for molecule.dev.

Defines the `ProjectArchiveProvider` contract — cold-storage `archive`,
`restore`, `status`, and `remove` for a DORMANT project — along with the
generic content channel (`ArchivePart`), the refusal rules
(`ArchivePolicy`), the artifact shape (`ArchiveManifest`, `ArchiveResult`,
`ArchiveVerification`), the never-drop-silently filter contract
(`PartFilterResult`, `PartFilterOptions`), the opt-in Node/JS presets
(`NODE_PROJECT_EXCLUDES`, `NODE_ANY_SEGMENT_EXCLUDES`, `NODE_PROJECT_POLICY`,
`DOTENV_FILE_PREFIX`), and the accessor
(`setProvider`/`getProvider`/`hasProvider`/`requireProvider`).
Interface-only: bond a storage provider package to get an implementation.

## Quick Start

```typescript
import {
  type ArchivePart,
  NODE_PROJECT_EXCLUDES,
  NODE_PROJECT_POLICY,
  requireProvider,
  setProvider,
} from '@molecule/api-project-archive'
import {
  filterArchivableParts,
  provider as objectStorageArchive,
} from '@molecule/api-project-archive-object-storage'

// Wire at startup (equivalently: bond('project-archive', objectStorageArchive)).
setProvider(objectStorageArchive)

// …later, reaping a project that has been dormant for 30 days.
const archiveStore = requireProvider()
const previousStorageId = project.archiveStorageId // whatever we persisted last time

// ONE generic channel. Source, a database dump and a git bundle are all parts —
// the archive stores their bytes verbatim and never interprets `kind`/`meta`.
// The CALLER filters: NODE_PROJECT_EXCLUDES drops reproducible bulk (it does
// NOT drop .git — history is user work and is not reproducible). Excludes are
// anchored at the FIRST path segment except the `anySegment` set (default
// NODE_ANY_SEGMENT_EXCLUDES), so `src/build/compiler.ts` and `src/build.rs`
// both survive while `build/bundle.js` does not.
const walked: ArchivePart[] = await readWorkspaceFiles(dir)

// Both halves, always: `dropped` is the only record of what the walk gave up,
// and this runs just before the live project is deleted. Never ignore it.
const { kept, dropped } = filterArchivableParts(walked, NODE_PROJECT_EXCLUDES)
logger.debug('archive walk filtered reproducible bulk', {
  projectId,
  kept: kept.length,
  dropped: dropped.map((file) => file.path),
})

const source: ArchivePart[] = kept.map(
  (file) => ({ path: `source/${file.path}`, content: file.content, mode: file.mode, kind: 'source' }),
)

const parts: ArchivePart[] = [
  ...source,
  {
    path: 'database/main.dump',
    content: await pgDumpCustom(projectId), // pg_dump -Fc bytes
    kind: 'database',
    meta: { engine: 'postgresql', format: 'pg_custom', database: 'main' },
  },
  {
    path: 'repos/api.bundle',
    content: await gitBundle(dir), // git bundle create - --all
    kind: 'repo',
    meta: { remote: 'origin', headSha: await gitHeadSha(dir) },
  },
]

const result = await archiveStore.archive({
  projectId,
  parts,
  // Provenance only — recording what the walk dropped. It filters nothing.
  excluded: NODE_PROJECT_EXCLUDES,
  // Guards against a silently-empty or partial walk: archive() THROWS rather
  // than returning a verified archive of nothing.
  minParts: 1,
  requiredPaths: ['source/package.json', 'source/package-lock.json', 'database/main.dump'],
  // Node/JS opt-in preset: refuses node_modules and dotenv files (the artifact
  // is NOT encrypted at rest). A Python project would pass
  // { refuseSegments: ['.venv', '__pycache__'] }; a Rust one { refuseSegments: ['target'] }.
  policy: NODE_PROJECT_POLICY,
  metadata: { reason: 'dormant-30d' },
})

if (!result.verified) {
  // Not an archive. Keep the live project AND the previous artifact; retry later.
  logger.error('project archive unverified — NOT releasing sandbox', {
    projectId,
    verification: result.verification, // downloaded/checksumMatched/manifestParsed/entriesMatched/digestMatched
  })
  return
}

// Verified: re-read from storage, sha256 matched, manifest parsed, parts
// counted, and the unpacked parts digest matched the manifest.
// 1. PERSIST the minted storageId FIRST — without it the artifact is an
//    unreachable orphan (there is no lookup by projectId).
await db.projects.update(projectId, { archiveStorageId: result.storageId })

// 2. Only now is it safe to release the live project…
await releaseSandboxAndDropDatabase(projectId)

// 3. …and only now to delete the OLD archive: every archive() minted a NEW
//    storageId, so the previous artifact was never overwritten and stayed
//    intact as the fallback while the new one was being verified.
if (previousStorageId && previousStorageId !== result.storageId) {
  await archiveStore.remove(previousStorageId) // remove() takes a STORAGE ID
}

// Waking it back up: restore() REQUIRES the persisted storageId, validates the
// payload against the manifest (throws on any mismatch), and returns BYTES —
// the caller re-provisions and routes each part by the kind/meta it recorded.
const storageId = project.archiveStorageId
const summary = await archiveStore.status(storageId) // status() takes a STORAGE ID too
const restored = await archiveStore.restore({ projectId, storageId })

const sandbox = await provisionSandbox(projectId)
for (const part of restored.parts) {
  if (part.kind === 'database') {
    // The archive never interpreted this — meta.format is OUR label.
    await pgRestore(await provisionDatabase(projectId), part.content, part.meta?.format)
  } else if (part.kind === 'repo') {
    await gitCloneFromBundle(sandbox, part.content)
  } else {
    await writeFile(sandbox, part.path.replace(/^source\//, ''), part.content, part.mode)
  }
}
await writeSecretsFromVault(sandbox, projectId) // dotenv files were REFUSED, never archived
await runInstallFromLockfile(sandbox)           // node_modules was never archived
```

## Type
`core`

## Installation
```bash
npm install @molecule/api-project-archive @molecule/api-bond
```

## API

### Interfaces

#### `ArchiveInput`

Everything a provider needs to build and upload one archive artifact.

```typescript
interface ArchiveInput {
  /** The project these bytes belong to; recorded in the manifest. */
  projectId: string

  /**
   * The archive's entire content, as generic parts.
   *
   * Source files, database dumps, git bundles and search indexes all go here —
   * there is no privileged sibling channel for any of them.
   */
  parts: ArchivePart[]

  /** Free-form metadata recorded verbatim in the manifest. */
  metadata?: Record<string, string>

  /**
   * Minimum parts required; defaults to `1`.
   *
   * An EMPTY part set THROWS rather than producing a verified empty archive: an
   * empty artifact round-trips and verifies perfectly while proving nothing, so
   * a workspace walk that silently returned `[]` would otherwise hand back
   * `verified: true` and the caller would release a real project. Raise it when
   * the caller knows a floor. Only a provider explicitly configured to allow
   * empty archives may accept `0`.
   */
  minParts?: number

  /**
   * Paths that MUST be present, else throw.
   *
   * The strongest available guard against a partial walk: a source tree missing
   * its lockfile or `package.json` is not restorable, and
   * {@link ArchiveInput.minParts} alone cannot detect that. Compared against
   * {@link ArchivePart.path} exactly.
   */
  requiredPaths?: readonly string[]

  /**
   * Recorded in the manifest as provenance only — the caller filters.
   *
   * Passing {@link NODE_PROJECT_EXCLUDES} here does NOT remove anything from
   * {@link ArchiveInput.parts}; apply the excludes while walking and record
   * here what was dropped, so a future reader knows what the artifact is
   * missing and why.
   *
   * A conforming filter helper returns {@link PartFilterResult} — both `kept`
   * and `dropped` — precisely so the second half can be inspected, logged, and
   * summarised here instead of vanishing.
   */
  excluded?: readonly string[]

  /**
   * Overrides the provider's configured policy for this call.
   *
   * Use it when one archive has different rules from the provider's default —
   * e.g. a Python project archived by a provider whose configured default is
   * {@link NODE_PROJECT_POLICY}.
   */
  policy?: ArchivePolicy
}
```

#### `ArchiveManifest`

Self-describing record of what an archive artifact contains.

Stored inside the artifact so a restore can validate the payload without
consulting any external database row. `parts.sha256` is a digest of the PARTS
(path + mode + length + content, sorted by path) AND of everything this
manifest SAYS about them — the per-part index and the header fields below —
not of the container, so it survives a change to the artifact layout and is
what both verification and `restore()` recompute from the DOWNLOADED
artifact. See {@link ArchiveManifest.parts}.

```typescript
interface ArchiveManifest {
  /** The {@link ARCHIVE_FORMAT_VERSION} the artifact was written with. */
  formatVersion: number

  /** The project the artifact belongs to — the artifact's own owner. */
  projectId: string

  /** ISO-8601 timestamp of when the artifact was built. */
  createdAt: string

  /** Aggregate over every part: how many, how many content bytes, and their digest. */
  parts: {
    /** Number of parts in the artifact. */
    count: number
    /** Total content bytes across every part. */
    bytes: number
    /**
     * Digest over the parts (path + mode + length + content, sorted by path),
     * the per-part {@link ArchiveManifest.entries} index, and the manifest
     * HEADER (`formatVersion`, `projectId`, `createdAt`, `parts.count`,
     * `parts.bytes`, `excluded`, `metadata`) — each section length-framed
     * behind its own marker so no arrangement of one can impersonate another.
     *
     * @remarks
     * Everything the manifest asserts is inside it, because everything the
     * manifest asserts is acted upon: the caller ROUTES on `entries[].kind`,
     * and `status()` reports `projectId`/`createdAt` as FACT. A header outside
     * the digest meant an attacker with bucket write access could rewrite whose
     * project an artifact was, and `restore()` and `verifyArtifactBytes()` both
     * still passed.
     *
     * It is UNKEYED and stored beside the bytes it covers, so it detects TAMPER
     * but NOT a wholesale re-forge — see {@link ArchiveVerification.digestMatched}.
     */
    sha256: string
  }

  /**
   * Per-part index: path, bytes, and the caller's kind/meta, verbatim.
   *
   * Recorded exactly as supplied and never interpreted — this is how a restore
   * knows which part is a `pg_custom` dump and which is a git bundle.
   *
   * A row carries these four keys and NOTHING else; a provider refuses a row
   * with an undeclared key rather than passing it on, because a row is an
   * instruction to the restore path and an undigested key would be an
   * unauthenticated one.
   */
  entries: readonly {
    /** The part's POSIX-relative path inside the artifact. */
    path: string
    /** The part's content length in bytes. */
    bytes: number
    /** The caller's opaque {@link ArchivePart.kind} label, if any. */
    kind?: string
    /** The caller's {@link ArchivePart.meta}, recorded verbatim. */
    meta?: Record<string, string>
  }[]

  /** What the caller reported dropping while walking — provenance only. */
  excluded?: readonly string[]

  /** The caller's {@link ArchiveInput.metadata}, recorded verbatim. */
  metadata?: Record<string, string>
}
```

#### `ArchivePart`

A named byte-stream inside an archive.

Nothing is privileged: source files, a database dump, a git bundle and a
search index are all parts, distinguished only by the caller's own
{@link ArchivePart.path} / {@link ArchivePart.kind} / {@link ArchivePart.meta}
labels. The archive stores and returns the bytes verbatim and NEVER
interprets them — pairing a `pg_custom` dump with a non-Postgres target fails
when the CALLER restores it, not when the archive stores it.

Adding a second database, a Redis snapshot, or a per-repo git bundle is
therefore just more parts. It is never a new field on {@link ArchiveInput}.

```typescript
interface ArchivePart {
  /**
   * POSIX-relative path inside the artifact, e.g. `'source/src/a.ts'`,
   * `'database/main.dump'`, `'repos/api.bundle'`. No leading slash, no `'..'`.
   *
   * Grouping is a CONVENTION expressed in this path (`source/…`, `database/…`),
   * not a schema — the provider does not parse it. Validated on BOTH sides
   * (archive and restore), on the RAW caller-facing path before any
   * artifact-internal prefixing and again on the stripped path at restore:
   * absolute POSIX (`/x`), a leading backslash, drive-qualified (`C:\x`), any
   * `..` segment, NUL bytes, and empty or `.`-only paths are rejected. Two
   * parts that collide after normalisation (NFC + case-fold) are rejected as
   * duplicates, since they would overwrite each other on restore.
   *
   * @remarks
   * **ONE canonical path model decides what this string's SEGMENTS are, and
   * every rule that reads a path uses it** — path safety, the
   * {@link ArchivePolicy} refusal, the advisory excludes filter, and collision
   * detection. A conforming provider normalises a path by folding `'\'` onto
   * `'/'`, collapsing repeated separators, and trimming leading/trailing
   * whitespace from EACH segment, compares segments under Unicode NFC, and then
   * applies every rule to those segments. (The MODULE that implements this
   * lives in the bond; this contract only states the rules, because the core is
   * types and data.)
   *
   * **A path whose normalisation would CHANGE it is REJECTED at archive time,
   * never silently rewritten.** The path the caller sent and the path the
   * manifest records must be identical, or the manifest describes something the
   * caller did not send — and the caller is about to delete the original. So
   * `'config\.env'`, `'a//b'`, `'a/b/'`, `'.env '` and `' .env'` all throw
   * rather than being canonicalised into `'config/.env'`, `'a/b'` and `'.env'`.
   *
   * That single model is not pedantry; it is the fix for a measured leak. When
   * path safety folded `'\'` onto `'/'` but the secrets rule split on `'/'`
   * alone, `'config\.env'` was archived and `verified: true` — a live dotenv
   * credential written into plaintext object storage — because `'\'` was a
   * separator to the checks that could not be harmed by it and an ordinary
   * character to the two rules that exist to prevent exactly that.
   */
  path: string

  /** The part's bytes, stored and returned verbatim. */
  content: Uint8Array

  /**
   * Unix mode bits; defaults to `0o644`. Masked to `0o777` on write and on
   * read, so setuid/setgid/sticky (`0o7000`) never survive a round trip.
   */
  mode?: number

  /**
   * Opaque caller label recorded in the manifest, e.g. `'source'` |
   * `'database'` | `'repo'`.
   *
   * Provenance for the caller's own restore logic — the archive never branches
   * on it, and no value is special.
   */
  kind?: string

  /**
   * Free-form metadata recorded verbatim, e.g. `{ format: 'pg_custom' }` or
   * `{ remote: '…', headSha: '…' }`.
   *
   * The archive NEVER interprets these. Record whatever a restore will need to
   * make sense of the bytes (dump format, engine version, remote URL) — but not
   * secrets: the artifact is not encrypted at rest, and the manifest is the
   * most readable thing in it.
   */
  meta?: Record<string, string>
}
```

#### `ArchivePolicy`

What a provider REFUSES outright, rather than trusting the caller filtered.

The caller does the filtering (see {@link ArchiveInput.excluded}); this is the
small, loud backstop for the cases where a forgotten filter is catastrophic
rather than merely wasteful — shipping gigabytes of reproducible dependencies
into cold storage, or writing live credentials into a plaintext artifact. A
refusal THROWS; it never silently drops a part behind the caller's back,
because that would make the manifest describe a tree the caller never
intended to archive.

It is deliberately CONFIGURABLE and ecosystem-neutral. A Node consumer passes
{@link NODE_PROJECT_POLICY}; a Python consumer passes
`{ refuseSegments: ['.venv', '__pycache__'] }`; a Rust consumer passes
`{ refuseSegments: ['target'] }`. No ecosystem's bulk directories are
hard-coded into the contract, so no ecosystem gets protection the others are
denied.

```typescript
interface ArchivePolicy {
  /**
   * Path segments refused, matched per NORMALIZED segment, at ANY depth,
   * CASE-SENSITIVELY.
   *
   * Segment-based, never substring-based: `'node_modules'` refuses
   * `node_modules/x` and `api/node_modules/x`, but never a legitimate file
   * called `node_modules_notes.md`.
   *
   * "Normalized" means the segments of the ONE canonical path model described
   * on {@link ArchivePart.path} — `'\'` folded onto `'/'`, repeated separators
   * collapsed, each segment whitespace-trimmed, compared under NFC. A
   * separator-naive split is how `node_modules\pkg\index.js` slipped past this
   * rule while path safety and collision detection both treated `'\'` as a
   * separator.
   *
   * @remarks
   * Case-SENSITIVE is the correct default here, and it is a deliberate
   * asymmetry with {@link ArchivePolicy.refuseFilePrefixes}, which folds case.
   * Two reasons, both about what a miss costs:
   *
   * 1. **Linux paths are case-sensitive**, and that is where these archives are
   *    built. `Build/` and `build/` are two genuinely different directories, so
   *    folding case would refuse a real source directory a user deliberately
   *    named — and a refusal THROWS, which means an archive that never happens
   *    and a dormant project that is never reclaimed.
   * 2. **A miss here is bounded.** A case-variant bulk directory that slips
   *    through only makes the artifact bigger; nothing is lost and nothing is
   *    exposed. A miss in `refuseFilePrefixes` writes live credentials into
   *    plaintext object storage, which is not recoverable — hence that rule
   *    folds case and this one does not.
   *
   * A caller that wants a case variant refused lists it explicitly, e.g.
   * `['node_modules', 'Node_Modules']`.
   */
  refuseSegments?: readonly string[]

  /**
   * Secret-file prefixes refused when ANY NORMALIZED path segment equals, or is
   * prefixed by `'<prefix>.'`, an entry — compared CASE-INSENSITIVELY.
   *
   * `'.env'` therefore refuses `.env` and the whole `.env.*` family
   * (`.env.local`, `.env.production`), which is the point: the artifact is not
   * encrypted at rest.
   *
   * Post-normalisation, per the ONE model on {@link ArchivePart.path}: with
   * `'\'` folded onto `'/'` and each segment whitespace-trimmed, `config\.env`,
   * `.env\prod.key`, `.env ` and ` .env` are all refused too. (A conforming
   * provider rejects those paths outright for being non-canonical; this rule
   * matching them as well is deliberate belt-and-braces, because the cost of a
   * miss here is a live credential in plaintext storage.)
   *
   * @remarks
   * Two widenings over the obvious implementation, each of which closed a real
   * credential leak — a secrets file that reached plaintext object storage:
   *
   * 1. **CASE-INSENSITIVE**, unlike {@link ArchivePolicy.refuseSegments}.
   *    `.ENV`, `.Env` and `.eNv.production` were NOT refused under a
   *    case-sensitive compare, yet they are the same secrets file to every
   *    dotenv loader and to the case-insensitive filesystems (macOS, Windows)
   *    developers routinely author them on. The asymmetry with `refuseSegments`
   *    is deliberate and is explained there: missing reproducible bulk wastes
   *    bytes, while missing a secret is unrecoverable — the credential is
   *    exposed the moment the artifact is written, and rotating it is the only
   *    remedy left.
   * 2. **EVERY path segment, not just the basename.** A `.env` DIRECTORY holds
   *    exactly the same credentials as a `.env` file, so `.env/prod.key` and
   *    `config/.env/staging` are refused too. A basename-only compare archived
   *    all of them: the basename of `.env/prod.key` is `prod.key`, which
   *    matches nothing.
   */
  refuseFilePrefixes?: readonly string[]
}
```

#### `ArchiveResult`

Result of an `archive()` call, including its verification verdict.

```typescript
interface ArchiveResult {
  /** The project that was archived. */
  projectId: string

  /**
   * The storage id the uploads bond MINTED for this artifact. Never derived
   * from `projectId` — the shipped uploads bonds assign a UUID and ignore the
   * supplied filename. PERSIST IT: without it the archive cannot be located,
   * restored, or deleted.
   */
  storageId: string

  /** The manifest that was written into the artifact. */
  manifest: ArchiveManifest

  /** Size of the stored artifact in bytes. */
  bytes: number

  /** TRUE only when the artifact was re-read from storage and fully validated. */
  verified: boolean

  /** Per-step report behind {@link ArchiveResult.verified}. */
  verification: ArchiveVerification
}
```

#### `ArchiveStatus`

Summary of one archive artifact, located by its storage id.

Keyed by `storageId`, never by project: a project can have any number of
artifacts (every `archive()` mints a new one). `projectId` is read back out
of the stored manifest, so it reports which project the artifact actually
belongs to rather than which one the caller assumed.

```typescript
interface ArchiveStatus {
  /**
   * Read from `manifest.projectId` inside the artifact — not from the lookup
   * key — and only after that manifest was authenticated against the payload.
   */
  projectId: string

  /** The storage id the artifact lives at. */
  storageId: string

  /** When the artifact was built (`manifest.createdAt`). */
  archivedAt: string

  /** Size of the stored artifact in bytes. */
  bytes: number

  /** The artifact's manifest, parsed out of the stored bytes. */
  manifest: ArchiveManifest
}
```

#### `ArchiveVerification`

Per-step outcome of the post-upload read-back check.

Every field must be true for {@link ArchiveResult.verified} to be true; a
false field (with `error` populated) means the artifact is NOT safe to rely
on and the live project must be kept.

```typescript
interface ArchiveVerification {
  /** The artifact was re-read back OUT of storage at the minted storage id. */
  downloaded: boolean

  /** sha256 of the DOWNLOADED artifact bytes equals the pre-upload digest. */
  checksumMatched: boolean

  /** The manifest was parsed out of the DOWNLOADED artifact. */
  manifestParsed: boolean

  /** The downloaded artifact's part count equals `manifest.parts.count`. */
  entriesMatched: boolean

  /**
   * The artifact was UNPACKED and the parts digest recomputed from the
   * downloaded parts matches `manifest.parts.sha256` (and the total part bytes
   * match `manifest.parts.bytes`).
   *
   * This is the only flag that proves the PACKER worked. Without it the other
   * checks compare the artifact to itself — a packer that dropped or corrupted
   * a part's contents still passed every one of them.
   *
   * @remarks
   * **What this flag does NOT prove.** The digest is UNKEYED and is stored
   * inside the very artifact it covers, so it detects TAMPER — any edit that
   * leaves `manifest.parts.sha256` behind, including a relabelled `kind` or a
   * rewritten `projectId` — but it CANNOT detect a WHOLESALE RE-FORGE: an
   * attacker with bucket write access can replace the artifact outright and
   * recompute a perfectly consistent digest over their own content. No unkeyed
   * digest stored beside its data can close that, and this flag must not be
   * read as if it did.
   *
   * The mitigation is a value the attacker cannot rewrite, and it costs one
   * column: **persist `result.manifest.parts.sha256` next to
   * `result.storageId`** when you persist the id, then compare it with
   * `restore().manifest.parts.sha256` (and with `status().manifest.parts.sha256`)
   * before trusting the parts. A re-forge changes the digest; your row still
   * holds the original.
   */
  digestMatched: boolean

  /** Why verification did not complete, when any flag above is false. */
  error?: string
}
```

#### `PartFilterOptions`

Knobs an advisory excludes filter accepts, so no ecosystem's directories get
a privilege another ecosystem cannot ask for.

Everything here has a Node/JS default because Node/JS is what molecule.dev
scaffolds — and every one of those defaults is a NAMED, replaceable preset
(`NODE_*`), never an unlabelled truth baked into the matching rules.

```typescript
interface PartFilterOptions {
  /**
   * Exclude entries matched at EVERY path segment rather than anchored at the
   * first one. Defaults to {@link NODE_ANY_SEGMENT_EXCLUDES}.
   *
   * The any-depth rule is a big hammer — it is what keeps a nested
   * `api/node_modules/…` out of an archive — and it was previously reachable
   * ONLY by the one Node directory hard-coded into the filter. A Python walk
   * passes `{ anySegment: ['__pycache__'] }`, a Rust one
   * `{ anySegment: ['target'] }`; pass `[]` to anchor every entry.
   *
   * Reach for it only where the entry can never be a real source directory a
   * user named on purpose: `dist`, `build`, `tmp` and `coverage` all can be
   * (`src/build/compiler.ts`), which is why anchoring is the default and
   * matching at depth is an explicit opt-in.
   */
  anySegment?: readonly string[]
}
```

#### `PartFilterResult`

What an advisory excludes filter KEPT and what it DROPPED — both halves,
always.

A filter helper over {@link ArchivePart}s returns this pair rather than a
bare array because of the governing rule of this package: it runs immediately
before a caller DELETES a user's only copy, so silently returning less than
it was given is the most expensive bug it can have — and it had it. Filtering
`['src/build/compiler.ts', 'src/tmp/scratch.ts', 'app/coverage/report.ts',
'src/main.ts']` through {@link NODE_PROJECT_EXCLUDES} kept only `src/main.ts`
and dropped three legitimate source files, with nothing in the return value
to say so. Handing back {@link PartFilterResult.dropped} makes the loss
INSPECTABLE: log it, count it, assert on it in a test, or summarise it onto
{@link ArchiveInput.excluded} as provenance.

```typescript
interface PartFilterResult<T> {
  /** The parts that survived the filter — the ones to archive. */
  kept: T[]

  /**
   * The parts the filter removed.
   *
   * Never discard this: it is the only record of what the walk gave up, and it
   * is checked before the live project is released.
   */
  dropped: T[]
}
```

#### `ProjectArchiveProvider`

The contract every project-archive storage bond implements.

```typescript
interface ProjectArchiveProvider {
  archive(input: ArchiveInput): Promise<ArchiveResult>
  restore(input: RestoreInput): Promise<RestoreResult>
  status(storageId: string): Promise<ArchiveStatus | null>
  remove(storageId: string): Promise<void>
}
```

#### `RestoreInput`

Selector for a restore: the storage id `archive()` returned, plus the project
the bytes are being restored INTO.

`storageId` is REQUIRED — there is no derivable key. `projectId` is the
destination label echoed onto {@link RestoreResult}; the archive's own
project id is in `manifest.projectId`, so restoring one project's archive
into a different project is an explicit, visible act.

```typescript
interface RestoreInput {
  /** The project the bytes are being restored INTO. */
  projectId: string

  /** The storage id `archive()` minted and the caller persisted. */
  storageId: string
}
```

#### `RestoreResult`

The archived bytes, handed back to the caller.

Restoring does NOT recreate a sandbox, a database, or a git remote — the
caller re-provisions those and applies these parts, routing each one by the
`kind`/`meta` it recorded at archive time.

```typescript
interface RestoreResult {
  /** The project the parts were restored into (echoed from {@link RestoreInput}). */
  projectId: string

  /** The artifact's manifest, validated against the payload before returning. */
  manifest: ArchiveManifest

  /** Every part in the artifact, paths and modes preserved. */
  parts: ArchivePart[]
}
```

### Functions

#### `getProvider()`

Get the active project archive provider, or null if none is configured.

```typescript
function getProvider(): ProjectArchiveProvider | null
```

**Returns:** The current provider or null.

#### `hasProvider()`

Check whether a project archive provider is configured.

```typescript
function hasProvider(): boolean
```

**Returns:** True if a provider has been set.

#### `requireProvider()`

Get the active project archive provider, throwing if none is configured.

```typescript
function requireProvider(): ProjectArchiveProvider
```

**Returns:** The current provider.

#### `setProvider(provider)`

Set the active project archive provider.

```typescript
function setProvider(provider: ProjectArchiveProvider): void
```

- `provider` — The project archive provider to register.

### Constants

#### `ANY_SEGMENT_EXCLUDES` *(deprecated)*

Deprecated spelling of {@link NODE_ANY_SEGMENT_EXCLUDES}, kept so existing
imports keep resolving to the same array.

```typescript
const ANY_SEGMENT_EXCLUDES: readonly string[]
```

#### `ARCHIVE_FORMAT_VERSION`

Artifact layout version recorded in every {@link ArchiveManifest}.

Bump it when the artifact layout changes incompatibly — a provider must
REFUSE to read an artifact whose `formatVersion` is higher than the one it
understands, rather than silently misreading it.

Version `2` replaced the v1 `source` + `database` pair with the single
generic `parts` channel, so a v1 artifact's layout is not readable as v2.

```typescript
const ARCHIVE_FORMAT_VERSION: 2
```

#### `DOTENV_FILE_PREFIX`

Dotenv basename prefix — the JS spelling of "a secrets file".

Used as an {@link ArchivePolicy.refuseFilePrefixes} entry, so it refuses
`.env` and every `.env.`-prefixed file (`.env.local`, `.env.production`).
Other ecosystems spell the same idea differently (`secrets.yaml`,
`credentials`, `*.pem`) — pass those instead; nothing about `.env` is
universal.

```typescript
const DOTENV_FILE_PREFIX: ".env"
```

#### `NODE_ANY_SEGMENT_EXCLUDES`

The Node/JS preset for "matched at any path depth". Everything else is
anchored at the FIRST path segment.

An advisory exclude entry is matched against the START of a part's path, so
`'build'` drops `build/bundle.js` while `src/build/compiler.ts` survives.
Entries listed HERE are the documented exception, matched at every
normalized segment: a nested `node_modules` (`api/node_modules/…`,
`packages/web/node_modules/…`) is real in every workspace, is always
reproducible from the lockfile, and is never a source directory anyone named
on purpose — anchoring it would miss most of the ~1.5 GB the exclusion exists
to drop.

```typescript
const NODE_ANY_SEGMENT_EXCLUDES: readonly string[]
```

#### `NODE_PROJECT_EXCLUDES`

Reproducible-bulk directories in a Node/JS project. NOT a universal default.

Advisory: the caller filters its own walk and records the list on
{@link ArchiveInput.excluded} as provenance. Every entry here is regenerable,
which is the whole economic point — `node_modules` measured 1.5 GB of a 1.9 GB
workspace while real source is single-digit MB.

```typescript
const NODE_PROJECT_EXCLUDES: readonly string[]
```

#### `NODE_PROJECT_POLICY`

Policy for a Node/JS project: refuses `node_modules` and dotenv files.

Deliberately much narrower than {@link NODE_PROJECT_EXCLUDES}. Only two
things are worth throwing over: `node_modules` (never legitimately part of a
source tree, always regenerable from the lockfile, and forgetting it ships
~1.5 GB per project) and dotenv files (the artifact is NOT encrypted at rest,
so archiving one writes live credentials into object storage in plaintext).
Everything else — `dist`, `build`, `tmp`, `coverage` — stays advisory,
because those are plausible real source directory names.

Note how each half is matched, since the two rules deliberately differ (see
{@link ArchivePolicy}). `node_modules` is refused at any depth,
CASE-SENSITIVELY, because POSIX paths are and a miss only costs bytes.
`.env` is refused CASE-INSENSITIVELY (`.ENV`, `.Env`, `.eNv.production`) and
on EVERY path segment rather than the basename alone (so a `.env/` DIRECTORY
such as `.env/prod.key` is refused too), because a miss there is a live
credential in plaintext storage and cannot be undone. BOTH rules read the
NORMALIZED segments of {@link ArchivePart.path} — the one model — so
`node_modules\pkg\index.js`, `config\.env`, `.env ` and ` .env` cannot walk
past a rule by spelling their separator or padding differently.

```typescript
const NODE_PROJECT_POLICY: ArchivePolicy
```

## Available Providers

| Provider | Package |
|----------|---------|
| Project Archive | `@molecule/api-project-archive-object-storage` |

## Injection Notes

### Requirements

Peer dependencies:
- `@molecule/api-bond` ^1.0.0

### Runtime Dependencies

- `@molecule/api-bond`

- **Wire it at startup with `setProvider(...)` — or the equivalent
  `bond('project-archive', provider)`.** This core routes through the shared
  `@molecule/api-bond` registry, so either call registers the same provider and
  `validateBonds()` reports it as missing when unwired.
- **NOTHING IS PRIVILEGED: an archive is a list of `parts`, and that is the
  whole content channel.** A source file, a `pg_dump`, a Redis snapshot, a
  Meilisearch index and a `git bundle` are all `ArchivePart`s — each just a
  `path` + `content` (+ optional `mode`, `kind`, `meta`). There is no
  `files` field, no `databaseDump` field, and no database format enum, so a
  SECOND database or any new content type is one more part, never a new
  field. Group parts with a path convention you choose (`source/…`,
  `database/…`, `repos/…`) — the provider does not parse it.
- **The archive NEVER interprets `kind` or `meta`.** They are opaque labels
  recorded verbatim into the manifest for the CALLER's restore logic. A
  provider must not branch on them, must not decode a part's bytes, and must
  treat every part identically. Consequence: a `{ format: 'pg_custom' }` dump
  restored into a non-Postgres engine fails when YOU run `pg_restore`, not at
  archive time — record enough in `meta` (dump format, engine version, git
  remote and head sha) that a restore can route each part correctly.
- **`verified: true` is the ONLY signal that may precede releasing the live
  project. Nothing else counts — not "it didn't throw", not a successful
  upload, not a non-empty `storageId`.** `verified` is true only after the
  provider re-read the artifact back OUT of storage at the minted id,
  re-hashed the downloaded bytes against the pre-upload sha256, parsed the
  manifest from those downloaded bytes, matched the part count, AND unpacked
  the artifact to recompute the parts digest and byte total against
  `manifest.parts.sha256`/`bytes` (`verification.digestMatched` — the one
  flag that proves the packer actually preserved the bytes). A verification
  failure does NOT throw: it comes back as `verified: false` +
  `verification.error`, so code that ignores the return value and reaps the
  sandbox anyway destroys the only copy. Check the flag.
- **`archive()` THROWS on an empty part set — it will never hand back a
  verified empty archive.** A workspace walk that silently returned `[]`
  would otherwise verify perfectly (an empty artifact round-trips fine) and
  the caller would delete a real project. `ArchiveInput.minParts` (default
  `1`) is the floor, and `ArchiveInput.requiredPaths` is the stronger guard —
  list the parts a restore cannot do without (`source/package.json`, the
  lockfile, `database/main.dump`) and a partial walk throws instead of
  shipping an unrestorable artifact. Unsafe or duplicate paths, a part the
  effective `ArchivePolicy` refuses, an exceeded size cap, and a failed
  upload throw too; those are never archives, so there is nothing for the
  caller to weigh. (A provider caps the stored artifact BEFORE decompressing
  anything it downloads, caps the decompressed payload separately as the
  decompression-bomb guard, and never embeds archive bytes in an error
  message.)
- **Every `archive()` mints a NEW `storageId`; re-archiving NEVER overwrites
  the previous artifact.** The id comes from the uploads bond, which assigns
  its own (the shipped bonds mint a UUID and ignore the supplied filename) —
  it is never derived from `projectId`, so there is no key to collide on.
  Consequence: **remove the OLD archive only AFTER the NEW one comes back
  `verified: true`.** Deleting first, or overwriting in place, is how a good
  artifact gets destroyed by a bad replacement.
- **The caller MUST persist `result.storageId` (e.g. onto the project's
  database row). Without it the archive cannot be located, restored, or
  deleted — it is an orphan object burning storage.** There is NO lookup by
  project: `restore()` REQUIRES `storageId`, and `status(storageId)` /
  `remove(storageId)` take the storage id, NOT a project id. `projectId` on
  `RestoreInput` is only the destination label; the artifact's own owner is
  `manifest.projectId`.
- **The artifact is NOT encrypted at rest by this package.** It is a plain
  compressed blob sitting in object storage, readable by anyone with bucket
  access. **So secrets never go in it** — not as a part, and not in
  `metadata`/`meta` (the manifest is the most readable thing in the
  artifact). Put secrets in the platform's encrypted vault and re-inject them
  on restore. `NODE_PROJECT_POLICY` REFUSES dotenv files (`.env` and the
  `.env.*` family, via `DOTENV_FILE_PREFIX`) for exactly this reason, and
  that refusal throws rather than silently dropping the part. Adding `.env`
  back "so restore is complete" writes production credentials into a
  plaintext blob — never do it. (Bucket-level SSE, if the deployment has it,
  is the deployment's guarantee, not this package's.)
- **`ArchivePolicy.refuseFilePrefixes` is CASE-INSENSITIVE and applies to
  EVERY path segment; `ArchivePolicy.refuseSegments` is case-SENSITIVE.** The
  asymmetry is deliberate, and both halves of it closed a real leak. A
  case-sensitive secret compare refused `.env` but archived `.ENV`, `.Env`
  and `.eNv.production` — the same file to every dotenv loader and to the
  case-insensitive filesystems (macOS, Windows) developers author them on. A
  basename-only compare archived a `.env` DIRECTORY (`.env/prod.key`,
  `config/.env/staging`), whose basename matches nothing. `refuseSegments`
  stays case-sensitive because Linux paths are: `Build/` and `build/` are
  genuinely different directories, refusing the wrong one THROWS and blocks a
  legitimate archive, and a miss there merely wastes bytes — whereas a missed
  secret is unrecoverable the moment the artifact is written. List a variant
  explicitly (`['node_modules', 'Node_Modules']`) if you want it refused.
- **The presets are ECOSYSTEM-SPECIFIC OPT-INS, not universal defaults.**
  `NODE_PROJECT_EXCLUDES` (advisory bulk the caller filters out) and
  `NODE_PROJECT_POLICY` (what a provider refuses) describe a Node/JS project
  and nothing else. Other ecosystems pass their own — a Python consumer
  `{ refuseSegments: ['.venv', '__pycache__'] }`, a Rust consumer
  `{ refuseSegments: ['target'] }` — per provider (configuration) or per call
  (`ArchiveInput.policy`). The object-storage bond defaults its policy to
  `NODE_PROJECT_POLICY` ONLY because Node/JS is the ecosystem molecule.dev
  scaffolds: that is a BOND default, NOT a contract-level truth. Never
  hard-code one ecosystem's bulk directories into the contract — that is the
  bug this version fixed.
- **`.git` is deliberately ARCHIVABLE and is absent from
  `NODE_PROJECT_EXCLUDES`.** Reproducibility is the test for excluding
  something, and history fails it: commits, branches and stashes cannot be
  regenerated from a source snapshot, so dropping `.git` silently destroys
  user work the archive exists to preserve. It is also small — single-digit
  MB against 1.5 GB of dependencies. (If a repo is large, archive a `git
  bundle` part instead of the `.git` directory; either way, keep the
  history. And scrub credentials out of remote URLs first — the artifact is
  plaintext.)
- **Archiving is for DORMANT projects.** Do NOT archive a project a user is
  actively editing — the artifact is a point-in-time snapshot, and writes that
  land after the parts are read are silently lost. Pick projects that have been
  idle long enough that a snapshot is the whole truth.
- **The caller filters, the provider refuses.** `ArchiveInput.excluded` is
  provenance recorded into the manifest — passing `NODE_PROJECT_EXCLUDES`
  there does NOT remove anything from `parts`. Apply the excludes while
  walking the workspace (treat `'.env.*'`-style secret names as a basename
  rule, not a literal filename). The policy is the loud backstop for the two
  cases where forgetting is catastrophic, not a substitute for the filter:
  excluding reproducible bulk is what makes the artifact small enough to be
  worth writing at all.
- **A filter NEVER silently returns less than it was given: it hands back
  `PartFilterResult` — `{ kept, dropped }`, both halves.** This package runs
  immediately before a caller DELETES a user's only copy, so an unreported
  drop is the most expensive bug it can have. Log or assert on `dropped`
  before releasing anything, and summarise it onto `ArchiveInput.excluded`.
- **Advisory excludes are ANCHORED at the FIRST path segment — except the
  `PartFilterOptions.anySegment` set, which defaults to
  `NODE_ANY_SEGMENT_EXCLUDES` (`node_modules`) and is matched at any depth.**
  So `'build'` drops `build/bundle.js` and leaves `src/build/compiler.ts`
  alone. Matching at any segment silently deleted real source: given
  `['src/build/compiler.ts', 'src/tmp/scratch.ts', 'app/coverage/report.ts',
  'src/main.ts']` and `NODE_PROJECT_EXCLUDES`, the filter kept only
  `src/main.ts` and dropped three legitimate source files, because `build`,
  `tmp` and `coverage` happened to appear deeper in the path. `node_modules`
  is the DEFAULT exception because a nested copy is real, is always bulk, and
  is never a source directory someone named on purpose — and it is a default,
  not a privilege: a Python walk passes `{ anySegment: ['__pycache__'] }`. A
  monorepo that wants every `packages/<name>/dist` gone passes those deeper
  paths EXPLICITLY (`'packages/api/dist'`, `'packages/app/dist'`) — the
  default is SAFE, and being more aggressive is the caller's explicit choice.
  An empty-string entry in an excludes list is REJECTED with a clear error,
  because `''` would degenerate the dot-entry family rule to `'.'` and
  silently drop every dotfile, `.git` included.
- **The `'<entry>.'` family rule applies ONLY to DOT entries.** `'.env'`
  catches `.env.local` and `'.DS_Store'` catches `.DS_Store`, wherever they
  sit — that is what the rule is for. A NON-dot entry (`tmp`, `build`,
  `dist`, `coverage`) matches a DIRECTORY segment only: never a filename and
  never a filename prefix, so `src/tmp.ts`, `src/build.rs`,
  `src/dist.config.js`, `tmp.md`, `buildings/x.ts`, `distance.ts` and a git
  ref named `.git/refs/heads/dist` all survive. Applied to non-dot entries it
  was the same silently-deletes-real-source defect one layer down.
- **`restore()` VALIDATES the payload against the manifest and throws on
  mismatch.** It re-checks the part count against `manifest.parts.count`, the
  recomputed parts digest against `manifest.parts.sha256`, and the total bytes
  against `manifest.parts.bytes`. A partial or tampered artifact fails loudly —
  it never yields half a project. Do not catch that error and write whatever
  came back anyway.
- **`manifest.parts.sha256` covers EVERYTHING the manifest asserts** — the
  part bytes, the per-part index you route on, and the header
  (`formatVersion`, `projectId`, `createdAt`, `parts.count`, `parts.bytes`,
  `excluded`, `metadata`) — and a manifest carrying any UNDECLARED key is
  refused outright. Anything outside the digest is an unauthenticated
  instruction to your restore path. **But the digest is UNKEYED and lives
  inside the artifact, so it cannot detect a WHOLESALE RE-FORGE** — an
  attacker with bucket write access replaces the artifact and recomputes a
  consistent digest. If that is in your threat model, persist
  `result.manifest.parts.sha256` beside `result.storageId` and compare it on
  restore; nothing inside the artifact can do it for you.
- **`restore()` returns bytes; it does NOT recreate a sandbox, a database, or
  a git remote.** It hands back `parts` — the CALLER re-provisions, routes
  each part by the `kind`/`meta` it recorded, writes the source, applies the
  dump, unbundles the repo, and re-injects secrets from the vault. Nothing is
  running when `restore()` resolves.
- **`ArchivePart.path` is POSIX-relative and CANONICAL** — no leading slash,
  no `..` segments, no drive letter, no backslash ANYWHERE, no NUL bytes, no
  repeated or trailing separator, no whitespace-padded segment, not empty or
  `.`-only, and no two parts that collide after normalisation. Both sides
  enforce this: on the caller's RAW path before any artifact-internal
  prefixing, and again on the stripped path at restore. A restore that wrote
  an absolute or escaping path would write outside the new workspace. A path
  that normalisation would CHANGE is REJECTED rather than rewritten, so the
  path you sent is the path the manifest records — and so ONE model decides
  what a segment is for path safety, the policy refusal, the excludes filter
  and collision detection alike. When those disagreed, `config\.env` archived
  and verified: a live credential in plaintext object storage. Modes are
  masked to `0o777`, so setuid/setgid/sticky bits never survive a round trip.
