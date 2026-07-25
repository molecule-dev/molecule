/**
 * Object-storage implementation of `ProjectArchiveProvider`.
 *
 * Packs a project's {@link ArchivePart}s into a standard gzipped POSIX ustar
 * artifact and persists it through the bonded `@molecule/api-uploads` provider —
 * S3, R2, B2, MinIO, or the filesystem bond, whichever the app wired. No storage
 * SDK is imported here, and the package has zero external runtime dependencies.
 *
 * Everything here obeys one governing rule, because this package runs
 * immediately before a caller DELETES a user's only copy: **never silently
 * return less than you were given.** These behaviours are load-bearing:
 *
 * 1. **Nothing is privileged.** Source files, a `pg_dump`, a `git bundle` and a
 *    search index are all parts, packed identically under one `parts/` prefix
 *    and digested by one rule. This module never branches on a part's `kind`,
 *    `meta`, or path shape, and never decodes a part's bytes — which is why a
 *    second database, a Redis snapshot or any future content type needs no
 *    change here at all.
 * 2. **The storage id is MINTED by the uploads bond and returned verbatim.**
 *    Nothing is derived from `projectId`: both shipped uploads bonds assign a
 *    UUID and ignore the supplied filename, so a derived key located nothing.
 *    Every `archive()` therefore mints a NEW id and can never overwrite the
 *    previous artifact — the caller persists the id and removes the old artifact
 *    only after the new one verifies.
 * 3. **The post-upload READ-BACK actually unpacks what storage returned.** The
 *    artifact is downloaded again, re-hashed against the pre-upload digest, its
 *    manifest re-parsed out of the downloaded bytes, its `parts/` members
 *    re-counted, AND unpacked so the parts digest and byte total can be
 *    recomputed from those downloaded entries and compared to
 *    `manifest.parts.sha256`/`bytes`. `verified` is true only when all five
 *    pass. An unverified archive is not an archive — the caller must never
 *    release the live project on anything but `verified === true`.
 * 4. **The parts digest covers EVERYTHING the manifest asserts, not just the
 *    bytes.** `manifest.entries` (path, kind, meta, bytes) AND the header
 *    (`formatVersion`, `projectId`, `createdAt`, `parts.count`, `parts.bytes`,
 *    `excluded`, `metadata`) are folded into `manifest.parts.sha256` — see
 *    {@link partsDigest} — and a manifest carrying any UNDECLARED key is
 *    refused. The caller ROUTES on `kind` at restore (`'database'` →
 *    `pg_restore`, `'repo'` → `git clone`) and `status()` reports `projectId` as
 *    FACT, so anything outside the digest is an unauthenticated instruction:
 *    anyone with bucket write access could swap which part is labelled
 *    `database`, or rewrite whose project the artifact is, and it still passed
 *    every check. What the digest CANNOT do — being unkeyed and stored inside
 *    the artifact — is detect a wholesale re-forge; {@link partsDigest} says so
 *    plainly and names the caller-side mitigation.
 * 5. **{@link filterArchivableParts} hands back BOTH halves and anchors its
 *    match.** It returns `PartFilterResult` (`kept` + `dropped`) so a caller can
 *    see what the walk gave up before releasing the project; it matches an
 *    exclude at the FIRST path segment (except the caller's `anySegment` set,
 *    default `NODE_ANY_SEGMENT_EXCLUDES`) so `src/build/compiler.ts` is not
 *    mistaken for build output; and the `'<entry>.'` family rule applies only to
 *    DOT entries, so `src/build.rs` and `.git/refs/heads/dist` are not either.
 * 6. **A failed verification does not leave litter, and an artifact may not
 *    carry stowaways.** When a verification this provider ATTEMPTED fails, the
 *    just-uploaded object is deleted best-effort and the outcome is reported on
 *    {@link ObjectStorageArchiveResult.orphanCleanup}; and any artifact member
 *    outside `manifest.json` / `parts/` — plus every DIRECTORY member, `parts/`
 *    included — is REFUSED rather than ignored, since nothing counts, digests,
 *    or restores it.
 * 7. **ONE path model decides what a path's segments are** (`./path-model.js`),
 *    and path safety, the policy refusal, the excludes filter and collision
 *    detection all read ITS segments. A part path that is not already canonical
 *    under it is REJECTED, never rewritten. Three disagreeing notions of a
 *    separator are how `config\.env` was archived with `verified: true`.
 *
 * @module
 */

import { createHash } from 'node:crypto'
import { Readable } from 'node:stream'

import { logger } from '@molecule/api-logger'
import {
  ARCHIVE_FORMAT_VERSION,
  type ArchiveInput,
  type ArchiveManifest,
  type ArchivePart,
  type ArchivePolicy,
  type ArchiveResult,
  type ArchiveStatus,
  type ArchiveVerification,
  NODE_ANY_SEGMENT_EXCLUDES,
  NODE_PROJECT_EXCLUDES,
  NODE_PROJECT_POLICY,
  type PartFilterOptions,
  type PartFilterResult,
  type ProjectArchiveProvider,
  type RestoreInput,
  type RestoreResult,
} from '@molecule/api-project-archive'
import { getProvider as getUploadsProvider, type UploadProvider } from '@molecule/api-uploads'

import {
  matchesAnchoredPath,
  matchesAnySegment,
  matchesDotFamily,
  matchesSecretSegment,
  normalizePartPath,
} from './path-model.js'
import {
  assertSafePartPath,
  createTar,
  describePath,
  gunzipBytes,
  gzipBytes,
  parseTar,
  pathCollisionKey,
  type TarEntry,
  type TarLimits,
} from './tar.js'

/** Archive member holding the JSON-encoded {@link ArchiveManifest}. */
const MANIFEST_ENTRY = 'manifest.json'

/**
 * Archive member prefix under which EVERY caller part is stored.
 *
 * One prefix for all parts, chosen so the archive's own namespace and the
 * caller's namespace are disjoint BY CONSTRUCTION: a caller part legitimately
 * named `manifest.json` becomes `parts/manifest.json` and can therefore never
 * shadow, collide with, or be mistaken for the archive's own
 * {@link MANIFEST_ENTRY}. Per-kind prefixes (`source/`, `database/`) would
 * reintroduce exactly the privileged-channel design this version removed —
 * grouping is a CONVENTION the caller expresses inside its own part paths
 * (`source/src/a.ts`, `database/main.dump`), and this provider never parses it.
 */
const PART_PREFIX = 'parts/'

/** Form fieldname reported to the uploads provider. */
const UPLOAD_FIELDNAME = 'archive'

/** MIME type reported to the uploads provider. */
const ARTIFACT_MIME_TYPE = 'application/gzip'

/** Mode applied to a part that does not carry one. */
const DEFAULT_PART_MODE = 0o644

/**
 * Permission bits kept on an archived (and restored) part. setuid/setgid/sticky
 * (`0o7000`) are masked off on BOTH sides, so a restored file can never carry
 * setuid even if the source tree did.
 */
const MODE_MASK = 0o777

/**
 * Oldest artifact layout this provider can read.
 *
 * Format `1` stored its content as a privileged `source/` + `database.dump`
 * pair, which is not readable as the generic {@link PART_PREFIX} channel — so it
 * is refused with an explanation rather than silently parsed as an archive of
 * zero parts. Raise this only when a layout genuinely stops being readable;
 * being merely OLDER is not a reason to refuse an artifact.
 */
const MIN_READABLE_FORMAT_VERSION = 2

/**
 * Domain separator introducing the per-part INDEX section of the parts digest
 * (see {@link partsDigest}).
 *
 * A fixed marker plus the index's byte length frames the section, so no
 * arrangement of part CONTENT can be crafted to look like the start of the
 * index and shift what the digest actually covers.
 */
const INDEX_DIGEST_MARKER = '\0manifest-entries\0'

/**
 * Domain separator introducing the manifest HEADER section of the parts digest
 * (see {@link partsDigest}).
 *
 * Framed the same way as the index, so the three sections — payload, index,
 * header — cannot be made to impersonate one another.
 */
const HEADER_DIGEST_MARKER = '\0manifest-header\0'

/**
 * Every key an {@link ArchiveManifest} may carry. A manifest with any other key
 * is REFUSED, because the digest covers a FIXED field list and anything outside
 * it would be an unauthenticated instruction reaching the caller on
 * `RestoreResult.manifest`.
 */
const MANIFEST_KEYS: readonly string[] = [
  'formatVersion',
  'projectId',
  'createdAt',
  'parts',
  'entries',
  'excluded',
  'metadata',
]

/** Every key the manifest's `parts` aggregate may carry. */
const MANIFEST_PARTS_KEYS: readonly string[] = ['count', 'bytes', 'sha256']

/** Every key one {@link ArchiveManifest.entries} row may carry. */
const MANIFEST_ENTRY_KEYS: readonly string[] = ['path', 'bytes', 'kind', 'meta']

/** Default cap on a downloaded artifact, enforced BEFORE decompression. */
const DEFAULT_MAX_ARTIFACT_BYTES = 512 * 1024 * 1024

/** Default cap on the DECOMPRESSED payload — the decompression-bomb guard. */
const DEFAULT_MAX_UNCOMPRESSED_BYTES = 2 * 1024 * 1024 * 1024

/**
 * Configuration for {@link createProjectArchiveProvider}.
 */
export interface ProjectArchiveObjectStorageConfig {
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

/**
 * Input to {@link verifyArtifactBytes}.
 */
export interface ArtifactVerificationInput {
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

/**
 * What happened to the just-uploaded object after a verification this provider
 * ATTEMPTED came back false.
 *
 * A failed verification used to leave the artifact in the bucket forever:
 * nothing references it (the caller was told not to persist the id of an
 * unverified archive), nothing will ever read it, and nothing will ever delete
 * it — a silent, unbounded leak, one object per failed archive. The cleanup is
 * BEST-EFFORT and never masks the verification failure: `verification.error`
 * still says why the archive failed, and this says what became of the bytes.
 */
export interface ArchiveOrphanCleanup {
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

/**
 * {@link ArchiveResult} plus this bond's report on the orphan cleanup.
 *
 * A superset of the contract's result, so it is still an `ArchiveResult`
 * everywhere the contract is used — the extra field only tells a caller what
 * happened to the bytes of an archive that did not verify.
 */
export interface ObjectStorageArchiveResult extends ArchiveResult {
  /** What became of the uploaded object when verification failed. */
  orphanCleanup: ArchiveOrphanCleanup
}

/**
 * The `ProjectArchiveProvider` contract with `archive()` narrowed to this
 * bond's richer {@link ObjectStorageArchiveResult}.
 *
 * Assignable to `ProjectArchiveProvider` in every position (the result is a
 * superset), so `setProvider(provider)` and `bond('project-archive', provider)`
 * are unaffected — this type exists only so a caller holding the concrete bond
 * can read `orphanCleanup` without a cast.
 */
export interface ObjectStorageProjectArchiveProvider extends ProjectArchiveProvider {
  archive(input: ArchiveInput): Promise<ObjectStorageArchiveResult>
}

/**
 * The manifest fields the parts digest covers besides the parts and the index —
 * everything the manifest ASSERTS about the artifact as a whole.
 *
 * Every one of these is acted upon: `status()` reports `projectId` and
 * `createdAt` as FACT, `formatVersion` decides whether the layout is readable
 * at all, and `metadata`/`excluded` are the provenance a human reads when
 * deciding what an artifact is. Leaving them outside the digest let anyone with
 * bucket write access rewrite whose project an artifact was, while `restore()`
 * and `verifyArtifactBytes()` both still passed.
 */
interface DigestedManifestHeader {
  /** {@link ArchiveManifest.formatVersion}. */
  formatVersion: number
  /** {@link ArchiveManifest.projectId} — the artifact's own owner. */
  projectId: string
  /** {@link ArchiveManifest.createdAt}. */
  createdAt: string
  /** `manifest.parts.count`. */
  count: number
  /** `manifest.parts.bytes`. */
  bytes: number
  /** {@link ArchiveManifest.excluded}, when present. */
  excluded?: readonly string[]
  /** {@link ArchiveManifest.metadata}, when present. */
  metadata?: Record<string, string>
}

/** A part with its mode resolved and masked — the digest's input shape. */
interface NormalizedPart {
  /** POSIX-relative path, exactly as the caller supplied it. */
  path: string
  /** The part's bytes. */
  content: Uint8Array
  /** Permission bits, already masked to {@link MODE_MASK}. */
  mode: number
  /** The caller's opaque label, recorded verbatim and never interpreted. */
  kind?: string
  /** The caller's metadata, recorded verbatim and never interpreted. */
  meta?: Record<string, string>
}

/**
 * Hex sha256 digest of a byte buffer.
 *
 * @param data - The bytes to digest.
 * @returns The lowercase hex digest.
 */
function sha256Hex(data: Uint8Array): string {
  return createHash('sha256').update(data).digest('hex')
}

/**
 * Extracts a human-readable message from an unknown thrown value.
 *
 * @param error - The caught value.
 * @returns Its message, or its string form.
 */
function messageOf(error: unknown): string {
  return error instanceof Error ? error.message : String(error)
}

/**
 * Resolves and masks a part's mode.
 *
 * @param mode - The caller-supplied mode, if any.
 * @returns The mode with setuid/setgid/sticky stripped, defaulting to `0o644`.
 */
function normalizeMode(mode: number | undefined): number {
  return (mode ?? DEFAULT_PART_MODE) & MODE_MASK
}

/**
 * Orders parts by path, so the digest is independent of input order.
 *
 * @param parts - The parts to order.
 * @returns A new, sorted array.
 */
function sortByPath<T extends { path: string }>(parts: readonly T[]): T[] {
  return [...parts].sort((a, b) => (a.path < b.path ? -1 : a.path > b.path ? 1 : 0))
}

/**
 * Sums the content bytes of a part set.
 *
 * @param parts - The parts to measure.
 * @returns The total number of content bytes.
 */
function totalBytes(parts: readonly { content: Uint8Array }[]): number {
  return parts.reduce((total, part) => total + part.content.byteLength, 0)
}

/**
 * Builds the manifest's per-part index from the normalized parts: path, byte
 * length, and the caller's `kind`/`meta` verbatim, sorted by path.
 *
 * The single source of the index, used BOTH to write `manifest.entries` and to
 * feed {@link partsDigest}. Deriving them separately is how a digest and the
 * index it is supposed to authenticate drift apart.
 *
 * @param parts - The normalized parts.
 * @returns The index rows, sorted by path, with nothing invented for a part
 *   that carried no `kind`/`meta`.
 */
function entriesIndexOf(parts: readonly NormalizedPart[]): ArchiveManifest['entries'] {
  return sortByPath(parts).map((part) => {
    const entry: ArchiveManifest['entries'][number] = {
      path: part.path,
      bytes: part.content.byteLength,
    }
    if (part.kind !== undefined) entry.kind = part.kind
    if (part.meta !== undefined) entry.meta = { ...part.meta }
    return entry
  })
}

/**
 * Canonically serialises the per-part index so it can be digested.
 *
 * Positional arrays rather than objects, and `meta` as key-sorted pairs, so the
 * encoding depends only on the VALUES — never on JavaScript's property order or
 * on how the manifest happened to be serialised. `undefined` is normalised to
 * `null` for the same reason.
 *
 * @param entries - The index rows, already sorted by path.
 * @returns The canonical JSON encoding.
 */
function canonicalIndex(entries: ArchiveManifest['entries']): string {
  return JSON.stringify(
    entries.map((entry) => {
      const meta = entry.meta
      return [
        entry.path,
        entry.bytes,
        entry.kind ?? null,
        meta
          ? Object.keys(meta)
              .sort()
              .map((key) => [key, meta[key]])
          : null,
      ]
    }),
  )
}

/**
 * Canonically serialises the manifest HEADER so it can be digested, by the same
 * rules as {@link canonicalIndex}: positional arrays, key-sorted `metadata`,
 * `undefined` normalised to `null`.
 *
 * @param header - The header fields.
 * @returns The canonical JSON encoding.
 */
function canonicalHeader(header: DigestedManifestHeader): string {
  const metadata = header.metadata
  return JSON.stringify([
    header.formatVersion,
    header.projectId,
    header.createdAt,
    header.count,
    header.bytes,
    header.excluded ? [...header.excluded] : null,
    metadata
      ? Object.keys(metadata)
          .sort()
          .map((key) => [key, metadata[key]])
      : null,
  ])
}

/**
 * Reads the digested header fields back out of a parsed manifest.
 *
 * The single place the read side decides what the header IS, so verification
 * and `restore()` cannot drift into digesting different fields.
 *
 * @param manifest - The manifest parsed out of an artifact.
 * @returns Its header fields, copied.
 */
function headerOf(manifest: ArchiveManifest): DigestedManifestHeader {
  const header: DigestedManifestHeader = {
    formatVersion: manifest.formatVersion,
    projectId: manifest.projectId,
    createdAt: manifest.createdAt,
    count: manifest.parts.count,
    bytes: manifest.parts.bytes,
  }
  if (manifest.excluded !== undefined) header.excluded = [...manifest.excluded]
  if (manifest.metadata !== undefined) header.metadata = { ...manifest.metadata }
  return header
}

/**
 * Digests EVERYTHING the manifest asserts, in three framed sections: every
 * part's path, masked octal mode, byte length and content (sorted by path,
 * NUL-separated); then the canonically serialised per-part index (path, kind,
 * meta, bytes — also sorted by path); then the canonically serialised manifest
 * header (`formatVersion`, `projectId`, `createdAt`, `parts.count`,
 * `parts.bytes`, `excluded`, `metadata`).
 *
 * This is a digest of the PARTS and of what the manifest SAYS — never of the
 * tar — so it stays stable if the artifact layout ever changes, it is
 * order-independent because the parts and the index are sorted first, and it is
 * what verification and `restore()` recompute from the DOWNLOADED artifact.
 *
 * @remarks
 * The rule is: **if the manifest asserts it, the digest covers it**, because
 * everything the manifest asserts is acted upon by somebody.
 *
 * - The INDEX section exists because the labels are INSTRUCTIONS, not
 *   decoration. `manifest.entries` was outside the digest, so an attacker with
 *   bucket write access could rewrite a part's `kind` from `'repo'` to
 *   `'database'`, or its `meta.format` from `pg_custom` to `sql`, and the
 *   artifact still passed `digestMatched` and still restored — while the CALLER
 *   routes on exactly those labels (`kind === 'database'` → `pg_restore`).
 * - The HEADER section exists for the same reason one layer up, and closes a
 *   tamper an adversarial review demonstrated against the previous build:
 *   rewriting `manifest.projectId` to `'attacker-project'` (or `createdAt`,
 *   `metadata`, `excluded`) left `digestMatched: true`, `restore()` succeeded,
 *   and `status()` reported the forged owner as FACT — while
 *   `ArchiveStatus.projectId` is documented as naming "the project the artifact
 *   actually belongs to rather than which one the caller assumed".
 * - Anything a manifest could carry that is NOT in this list is refused at
 *   parse time ({@link parseManifest}), because a field outside a fixed-list
 *   digest is unauthenticated by construction. An injected
 *   `entries[0].restoreHint = 'run: rm -rf /'` passed the digest and reached the
 *   caller on `RestoreResult.manifest` before that check existed.
 *
 * **What this digest CANNOT do, stated plainly: it does not detect a WHOLESALE
 * RE-FORGE.** It is UNKEYED and stored inside the very artifact it covers, so
 * an attacker with bucket write access can replace the artifact with one of
 * their own and recompute a perfectly consistent digest over it — every check
 * in this package then passes, because every input to every check came from the
 * attacker. No unkeyed digest stored beside its data can close that, and
 * nothing here should be read as if it did. The mitigation lives OUTSIDE the
 * artifact and costs one column: **persist `result.manifest.parts.sha256` next
 * to `result.storageId`**, then compare it with `restore().manifest.parts.sha256`
 * (or `status()`'s) before trusting the parts. A re-forge changes the digest;
 * your row still holds the original.
 *
 * One compatibility note: this digest is not the one an earlier build computed
 * (which covered the parts alone, then the parts + index). An artifact written
 * by an earlier build fails `digestMatched` and `restore()` rather than being
 * read with an unauthenticated index or header. That is the intended direction
 * — it fails loudly, and a re-archive from the live project produces a current
 * artifact.
 *
 * Each section is introduced by a fixed marker and its own byte length, so no
 * arrangement of part content can impersonate the index, and no index can
 * impersonate the header.
 *
 * @param parts - The normalized parts, carrying the `kind`/`meta` the manifest
 *   records for them.
 * @param header - The manifest header fields the artifact declares.
 * @returns The lowercase hex digest.
 */
function partsDigest(parts: readonly NormalizedPart[], header: DigestedManifestHeader): string {
  const sorted = sortByPath(parts)
  const hash = createHash('sha256')

  for (const part of sorted) {
    hash.update(part.path, 'utf8')
    hash.update('\0')
    hash.update(part.mode.toString(8))
    hash.update('\0')
    hash.update(String(part.content.byteLength))
    hash.update('\0')
    hash.update(part.content)
    hash.update('\0')
  }

  const index = canonicalIndex(entriesIndexOf(sorted))
  hash.update(INDEX_DIGEST_MARKER, 'utf8')
  hash.update(String(Buffer.byteLength(index, 'utf8')))
  hash.update('\0')
  hash.update(index, 'utf8')

  const headerJson = canonicalHeader(header)
  hash.update(HEADER_DIGEST_MARKER, 'utf8')
  hash.update(String(Buffer.byteLength(headerJson, 'utf8')))
  hash.update('\0')
  hash.update(headerJson, 'utf8')

  return hash.digest('hex')
}

/**
 * Collects a readable stream into a single byte buffer, enforcing `maxBytes`
 * WHILE the stream is being read.
 *
 * The cap is checked against the running total BEFORE the chunk that would
 * cross it is retained, and the source stream is then DESTROYED — so the full
 * payload never exists in this process and a remote object stops downloading at
 * the threshold instead of after it. Checking `byteLength` on the assembled
 * buffer would be a cap that only reports what already happened: by then the
 * chunk array, its concatenation, and everything downstream have already been
 * materialised, which is the memory the cap exists to bound.
 *
 * Chunks are collected by reference and concatenated exactly once, for the same
 * reason — copying each chunk on the way in doubled peak RSS for no benefit. A
 * Node stream hands ownership of each chunk to its consumer and never reuses a
 * buffer between reads, so holding one is safe, and `Buffer.concat` makes the
 * single copy this function returns.
 *
 * @param stream - The stream to drain.
 * @param maxBytes - Hard cap on the accumulated bytes.
 * @param storageId - Storage id, for the error message.
 * @returns The concatenated bytes.
 * @throws {Error} If the stream yields more than `maxBytes` bytes.
 */
async function readStream(
  stream: NodeJS.ReadableStream,
  maxBytes: number,
  storageId: string,
): Promise<Uint8Array> {
  const chunks: Buffer[] = []
  let size = 0

  for await (const chunk of stream) {
    const buffer = typeof chunk === 'string' ? Buffer.from(chunk, 'utf8') : chunk
    if (size + buffer.byteLength > maxBytes) {
      // Stop the transfer at the threshold rather than draining the rest of the
      // object into memory just to reject it. `for await` also destroys the
      // stream on an abrupt exit, but only for iterables that honour
      // `return()` — doing it explicitly is what makes the abort provable.
      const destroyable = stream as { destroy?: (error?: Error) => void }
      destroyable.destroy?.()
      throw new Error(
        `Project archive "${storageId}" exceeds the maxArtifactBytes cap of ${maxBytes} bytes: ` +
          `the read was ABORTED after ${size} byte(s), when the next chunk of ` +
          `${buffer.byteLength} byte(s) would have crossed the cap, so the artifact was never ` +
          `fully buffered. Raise maxArtifactBytes if this artifact is legitimately that large.`,
      )
    }
    size += buffer.byteLength
    chunks.push(buffer)
  }

  return new Uint8Array(Buffer.concat(chunks, size))
}

/**
 * Streams the artifact to the bonded uploads provider and waits for the write
 * to settle.
 *
 * The `filename` handed to the provider is ADVISORY metadata only — the shipped
 * bonds mint their own UUID key and ignore it. The id this function returns is
 * the one the artifact actually lives at.
 *
 * @param uploads - The uploads provider.
 * @param projectId - The project being archived, used for the advisory filename.
 * @param artifact - The artifact bytes.
 * @returns The id the uploads provider minted for the stored object.
 * @throws {Error} If the upload stream errors, the upload promise rejects, or
 *   the provider returned no id.
 */
async function uploadArtifact(
  uploads: UploadProvider,
  projectId: string,
  artifact: Uint8Array,
): Promise<string> {
  // An array rather than a `let`: TypeScript's control-flow analysis assumes a
  // callback has not run, and would narrow a nullable `let` to `null` here.
  const streamErrors: Error[] = []
  const stream = Readable.from([Buffer.from(artifact)])

  const file = uploads.upload(
    UPLOAD_FIELDNAME,
    stream,
    { filename: `${projectId}.tar.gz`, encoding: 'binary', mimeType: ARTIFACT_MIME_TYPE },
    (error) => {
      streamErrors.push(error)
    },
  )

  if (file.uploadPromise) {
    try {
      await file.uploadPromise
    } catch (error) {
      throw new Error(
        `Failed to upload the project archive for "${projectId}": ${messageOf(error)}`,
        { cause: error },
      )
    }
  }

  if (streamErrors.length > 0) {
    throw new Error(
      `Failed to upload the project archive for "${projectId}": ${streamErrors[0].message}`,
      { cause: streamErrors[0] },
    )
  }

  if (!file.id) {
    throw new Error(
      `The bonded uploads provider returned no id for the project archive of "${projectId}", ` +
        `so the artifact cannot be located, verified, restored, or deleted.`,
    )
  }

  return file.id
}

/**
 * Refuses an object read out of an artifact that carries a key the contract
 * does not declare.
 *
 * The digest covers a FIXED list of manifest fields, so an undeclared key is
 * unauthenticated by construction while still being handed to the caller. This
 * is the check that turns "the digest covers everything the manifest asserts"
 * from nearly true into true.
 *
 * @param value - The parsed object to inspect.
 * @param allowed - The keys the contract declares for it.
 * @param what - How to name the object in the error message.
 * @param storageId - Storage id, for the error message.
 * @throws {Error} If the object carries any other key.
 */
function assertNoUndeclaredKeys(
  value: object,
  allowed: readonly string[],
  what: string,
  storageId: string,
): void {
  const undeclared = Object.keys(value).filter((key) => !allowed.includes(key))
  if (undeclared.length === 0) return

  throw new Error(
    `Project archive "${storageId}" has a malformed ${what}: it carries the undeclared key(s) ` +
      `${undeclared.map((key) => `"${describePath(key)}"`).join(', ')}. A manifest carries exactly ` +
      `${allowed.map((key) => `"${key}"`).join(', ')} — anything else sits OUTSIDE ` +
      `manifest.parts.sha256 (which digests a fixed field list) yet still reaches the caller on ` +
      `RestoreResult.manifest, which makes it an unauthenticated instruction to the restore path.`,
  )
}

/**
 * Parses and sanity-checks a manifest read out of an artifact.
 *
 * @param content - The raw `manifest.json` bytes.
 * @param storageId - Storage id, for error messages.
 * @returns The parsed manifest.
 * @throws {Error} If the JSON is invalid, the shape is wrong, or the artifact
 *   was written by a newer, incompatible archive format.
 */
function parseManifest(content: Uint8Array, storageId: string): ArchiveManifest {
  let parsed: unknown
  try {
    parsed = JSON.parse(Buffer.from(content).toString('utf8'))
  } catch (error) {
    // V8 quotes the offending input in its JSON.parse message, so propagating the
    // caught error verbatim would spill manifest bytes into every log that records
    // it. Scrub the message but KEEP the error as `cause`, so the chain (and the
    // stack) survives for debugging without leaking payload — dropping the cause
    // entirely would trade one real problem for another.
    if (error instanceof Error) {
      error.message =
        'Manifest JSON is malformed (parser message withheld: it quotes archive bytes)'
    }
    throw new Error(
      `Project archive "${storageId}" has an unreadable ${MANIFEST_ENTRY}: it is not valid JSON.`,
      { cause: error },
    )
  }

  const manifest = parsed as ArchiveManifest
  if (
    typeof manifest !== 'object' ||
    manifest === null ||
    Array.isArray(manifest) ||
    typeof manifest.formatVersion !== 'number' ||
    typeof manifest.projectId !== 'string' ||
    typeof manifest.createdAt !== 'string' ||
    typeof manifest.parts !== 'object' ||
    manifest.parts === null ||
    typeof manifest.parts.count !== 'number' ||
    typeof manifest.parts.bytes !== 'number' ||
    typeof manifest.parts.sha256 !== 'string' ||
    !Array.isArray(manifest.entries) ||
    (manifest.excluded !== undefined &&
      (!Array.isArray(manifest.excluded) ||
        manifest.excluded.some((value) => typeof value !== 'string'))) ||
    (manifest.metadata !== undefined &&
      (typeof manifest.metadata !== 'object' ||
        manifest.metadata === null ||
        Object.values(manifest.metadata).some((value) => typeof value !== 'string')))
  ) {
    throw new Error(`Project archive "${storageId}" has a malformed ${MANIFEST_ENTRY}.`)
  }

  // A CLOSED field set, at every level. The digest covers a fixed list of
  // fields, so a key outside that list cannot be authenticated by it — yet it
  // still reaches the caller on `RestoreResult.manifest`, where an
  // `entries[0].restoreHint` nobody digested is indistinguishable from one the
  // archiver wrote. Refusing the key is what makes "the digest covers
  // everything the manifest asserts" true rather than nearly true.
  assertNoUndeclaredKeys(manifest, MANIFEST_KEYS, MANIFEST_ENTRY, storageId)
  assertNoUndeclaredKeys(
    manifest.parts,
    MANIFEST_PARTS_KEYS,
    `${MANIFEST_ENTRY} "parts"`,
    storageId,
  )

  // The index rows are ROUTING LABELS the caller branches on at restore
  // (`kind === 'database'` → pg_restore), so a row that is not the shape it
  // claims is refused here rather than handed on as a lie about its own type.
  const badRow = manifest.entries.findIndex(
    (entry) =>
      typeof entry !== 'object' ||
      entry === null ||
      Array.isArray(entry) ||
      typeof entry.path !== 'string' ||
      typeof entry.bytes !== 'number' ||
      (entry.kind !== undefined && typeof entry.kind !== 'string') ||
      (entry.meta !== undefined &&
        (typeof entry.meta !== 'object' ||
          entry.meta === null ||
          Object.values(entry.meta).some((value) => typeof value !== 'string'))),
  )
  if (badRow !== -1) {
    throw new Error(
      `Project archive "${storageId}" has a malformed ${MANIFEST_ENTRY}: index row ${badRow} is ` +
        `not { path: string, bytes: number, kind?: string, meta?: Record<string, string> }.`,
    )
  }

  manifest.entries.forEach((entry, row) => {
    assertNoUndeclaredKeys(
      entry,
      MANIFEST_ENTRY_KEYS,
      `${MANIFEST_ENTRY} index row ${row}`,
      storageId,
    )
  })

  if (manifest.formatVersion > ARCHIVE_FORMAT_VERSION) {
    throw new Error(
      `Project archive "${storageId}" uses format version ${manifest.formatVersion}, but this ` +
        `provider understands at most version ${ARCHIVE_FORMAT_VERSION}. Upgrade @molecule/api-project-archive-object-storage.`,
    )
  }

  if (manifest.formatVersion < MIN_READABLE_FORMAT_VERSION) {
    throw new Error(
      `Project archive "${storageId}" uses format version ${manifest.formatVersion}, which laid ` +
        `its content out as privileged "source"/"database" channels rather than the generic ` +
        `"${PART_PREFIX}" one, so it cannot be read as parts (the oldest readable layout is ` +
        `version ${MIN_READABLE_FORMAT_VERSION}). Restore it with the provider version that ` +
        `wrote it, or extract it by hand — it is a plain tar.gz.`,
    )
  }

  return manifest
}

/**
 * Finds the manifest entry in a parsed artifact.
 *
 * @param entries - The artifact's tar entries.
 * @param storageId - Storage id, for error messages.
 * @returns The parsed manifest.
 * @throws {Error} If the artifact has no manifest entry, or it is malformed.
 */
function manifestFrom(entries: readonly TarEntry[], storageId: string): ArchiveManifest {
  const entry = entries.find((candidate) => candidate.path === MANIFEST_ENTRY)
  if (!entry) {
    throw new Error(`Project archive "${storageId}" is missing its ${MANIFEST_ENTRY} entry.`)
  }
  return parseManifest(entry.content, storageId)
}

/**
 * Collects the `parts/` members of a parsed artifact back into parts.
 *
 * The prefix is stripped FIRST and the resulting caller-facing path is then
 * re-validated with `assertSafePartPath` — validating the prefixed path would
 * be meaningless, since `parts/` + `/etc/passwd` is neither absolute nor
 * traversing. Modes are masked, so setuid never survives a round trip.
 *
 * @param entries - The artifact's tar entries.
 * @param storageId - Storage id, for error messages.
 * @returns The parts, sorted by path (without `kind`/`meta`, which live in the
 *   manifest and are re-attached by {@link reconcileParts}).
 * @throws {Error} If a stripped path is unsafe, or two entries collide after
 *   normalisation (they would overwrite each other on restore).
 */
function collectParts(entries: readonly TarEntry[], storageId: string): NormalizedPart[] {
  const parts: NormalizedPart[] = []
  const seen = new Map<string, string>()

  for (const entry of entries) {
    if (entry.type === 'directory') continue
    if (!entry.path.startsWith(PART_PREFIX)) continue

    const path = entry.path.slice(PART_PREFIX.length)
    try {
      assertSafePartPath(path)
    } catch (error) {
      throw new Error(
        `Project archive "${storageId}" contains an unsafe part path: ${messageOf(error)}`,
        { cause: error },
      )
    }

    const key = pathCollisionKey(path)
    const collision = seen.get(key)
    if (collision !== undefined) {
      throw new Error(
        `Project archive "${storageId}" contains colliding part paths ` +
          `"${describePath(collision)}" and "${describePath(path)}": they normalise to the same ` +
          `file and would overwrite each other on restore.`,
      )
    }
    seen.set(key, path)

    parts.push({ path, content: entry.content, mode: normalizeMode(entry.mode) })
  }

  return sortByPath(parts)
}

/**
 * Matches the parts unpacked from an artifact against the manifest's per-part
 * index, re-attaching each part's `kind`/`meta` and proving the index describes
 * exactly what the artifact holds.
 *
 * Without this the manifest's `entries` would be decoration: a part could come
 * back with no index row (so a restore could not route it), or the index could
 * describe a part the artifact does not contain.
 *
 * @param parts - The parts collected out of the artifact.
 * @param manifest - The artifact's manifest.
 * @param storageId - Storage id, for error messages.
 * @returns The parts with their recorded `kind`/`meta` re-attached.
 * @throws {Error} If the index and the payload disagree on count, on a path, or
 *   on a part's byte length, or if the index lists a duplicate path.
 */
function reconcileParts(
  parts: readonly NormalizedPart[],
  manifest: ArchiveManifest,
  storageId: string,
): NormalizedPart[] {
  if (manifest.entries.length !== manifest.parts.count) {
    throw new Error(
      `Project archive "${storageId}" has an inconsistent ${MANIFEST_ENTRY}: it declares ` +
        `${manifest.parts.count} part(s) but indexes ${manifest.entries.length}.`,
    )
  }

  const index = new Map<string, ArchiveManifest['entries'][number]>()
  for (const entry of manifest.entries) {
    if (index.has(entry.path)) {
      throw new Error(
        `Project archive "${storageId}" indexes the part path "${describePath(entry.path)}" ` +
          `twice in its ${MANIFEST_ENTRY}.`,
      )
    }
    index.set(entry.path, entry)
  }

  return parts.map((part) => {
    const entry = index.get(part.path)
    if (!entry) {
      throw new Error(
        `Project archive "${storageId}" contains a part at "${describePath(part.path)}" that its ` +
          `${MANIFEST_ENTRY} does not index, so nothing records what it is.`,
      )
    }
    if (entry.bytes !== part.content.byteLength) {
      throw new Error(
        `Project archive "${storageId}" declares ${entry.bytes} byte(s) for the part at ` +
          `"${describePath(part.path)}", the artifact holds ${part.content.byteLength}.`,
      )
    }

    const reconciled: NormalizedPart = { path: part.path, content: part.content, mode: part.mode }
    if (entry.kind !== undefined) reconciled.kind = entry.kind
    if (entry.meta !== undefined) reconciled.meta = { ...entry.meta }
    return reconciled
  })
}

/**
 * Refuses an artifact carrying any member outside the two namespaces an
 * artifact may use: the archive's own {@link MANIFEST_ENTRY} and the
 * {@link PART_PREFIX} the caller's parts live under.
 *
 * A stowaway member is UNAUTHENTICATED content. Nothing counts it (the part
 * count only sees `parts/`), nothing digests it (`manifest.parts.sha256` covers
 * the parts and the index), and nothing restores it — so silently ignoring one
 * lets an artifact carry bytes that no check in this package has ever looked at,
 * waiting for whatever else opens the tarball. Naming the offending member is
 * the point: an artifact that is not exactly `manifest.json` + `parts/<path>`
 * was written or re-packed by something other than this provider, and the
 * operator needs to know which member said so.
 *
 * Directory members are refused too — at ANY path, including under
 * `parts/` and including a bare `parts`: this provider writes no directory
 * members at all, so their presence is itself the evidence that the artifact
 * was re-packed elsewhere. A `parts/<dir>` member used to slip through on the
 * prefix check and then be skipped by {@link collectParts}, so nothing counted,
 * digested or restored it while `tar -xzf` still materialised it — the exact
 * "carries bytes no check has looked at" shape this function exists to refuse,
 * hiding behind the one prefix that looked legitimate.
 *
 * @param entries - The artifact's tar entries.
 * @param storageId - Storage id, for the error message.
 * @throws {Error} If any member is outside the two namespaces, or is a
 *   directory.
 */
function assertNoStowawayMembers(entries: readonly TarEntry[], storageId: string): void {
  for (const entry of entries) {
    if (entry.type === 'directory') {
      throw new Error(
        `Project archive "${storageId}" contains the DIRECTORY member ` +
          `"${describePath(entry.path)}". This provider writes no directory members at all, so ` +
          `one is evidence the artifact was re-packed elsewhere — and nothing counts, digests, ` +
          `verifies or restores it, while an extractor still creates it. It is REFUSED rather ` +
          `than silently ignored, wherever it sits, "${PART_PREFIX}" included.`,
      )
    }
    if (entry.path === MANIFEST_ENTRY) continue
    if (entry.path.startsWith(PART_PREFIX)) continue

    throw new Error(
      `Project archive "${storageId}" contains the member "${describePath(entry.path)}", which is ` +
        `outside the only two namespaces an artifact may use ("${MANIFEST_ENTRY}" and ` +
        `"${PART_PREFIX}"). Nothing counts, digests, verifies, or restores such a member, so it ` +
        `is REFUSED rather than silently ignored — this artifact was written or re-packed by ` +
        `something other than this provider.`,
    )
  }
}

/**
 * Decompresses and parses an artifact under the configured size caps, then
 * refuses it if it carries any stowaway member.
 *
 * The single entry point every read path shares (`archive()`'s verification,
 * `restore()`, and `status()`), so the caps and the namespace rule cannot be
 * enforced on one path and forgotten on another.
 *
 * @param artifact - The artifact bytes.
 * @param storageId - Storage id, for error messages.
 * @param maxArtifactBytes - Cap enforced BEFORE decompression.
 * @param maxUncompressedBytes - Cap enforced through the codec and re-checked
 *   on the inflated payload.
 * @returns The artifact's tar entries.
 * @throws {Error} If a cap is exceeded, the artifact is corrupt, or it carries a
 *   member outside `manifest.json` / `parts/`.
 */
function unpackArtifact(
  artifact: Uint8Array,
  storageId: string,
  maxArtifactBytes: number,
  maxUncompressedBytes: number,
): TarEntry[] {
  if (artifact.byteLength > maxArtifactBytes) {
    throw new Error(
      `Project archive "${storageId}" is ${artifact.byteLength} bytes, over the maxArtifactBytes ` +
        `cap of ${maxArtifactBytes} bytes. It was NOT decompressed.`,
    )
  }

  const limits: TarLimits = { maxUncompressedBytes }
  const inflated = gunzipBytes(artifact, limits)

  if (inflated.byteLength > maxUncompressedBytes) {
    throw new Error(
      `Project archive "${storageId}" decompresses to ${inflated.byteLength} bytes, over the ` +
        `maxUncompressedBytes cap of ${maxUncompressedBytes} bytes.`,
    )
  }

  const entries = parseTar(inflated, limits)
  assertNoStowawayMembers(entries, storageId)
  return entries
}

/**
 * Unpacks a DOWNLOADED artifact and proves it is what its manifest says it is:
 * the namespace rule, the part count, the byte total, the per-part index, and
 * the digest over the parts + index + header.
 *
 * The ONE authentication pass every read path that returns manifest data shares
 * (`restore()` and `status()`), so an artifact cannot be validated on one path
 * and merely parsed on another. `status()` used to only parse — which made the
 * method documented as reporting "the project the artifact ACTUALLY belongs to"
 * a channel for a forged `projectId`, since a rewritten header sailed through
 * while `restore()` refused it.
 *
 * `archive()`'s post-upload check does NOT call this: it must report per-step
 * flags and must never throw (see {@link verifyArtifactBytes}), so it runs the
 * same checks in the same order and records them instead.
 *
 * @param artifact - The downloaded artifact bytes.
 * @param storageId - Storage id, for error messages.
 * @param maxArtifactBytes - Cap enforced BEFORE decompression.
 * @param maxUncompressedBytes - Cap enforced through the codec.
 * @returns The validated manifest and the parts with their labels re-attached.
 * @throws {Error} If a cap is exceeded, the artifact is corrupt, it carries a
 *   member outside `manifest.json` / `parts/`, a part path is unsafe, or the
 *   payload does not match the manifest (count, bytes, index, or digest).
 */
function validateArtifact(
  artifact: Uint8Array,
  storageId: string,
  maxArtifactBytes: number,
  maxUncompressedBytes: number,
): { manifest: ArchiveManifest; parts: NormalizedPart[] } {
  const tarEntries = unpackArtifact(artifact, storageId, maxArtifactBytes, maxUncompressedBytes)
  const manifest = manifestFrom(tarEntries, storageId)
  const parts = collectParts(tarEntries, storageId)

  if (parts.length !== manifest.parts.count) {
    throw new Error(
      `Project archive "${storageId}" is incomplete: its manifest declares ` +
        `${manifest.parts.count} part(s), the artifact holds ${parts.length}. ` +
        `Refusing to restore half a project.`,
    )
  }

  const restoredBytes = totalBytes(parts)
  if (restoredBytes !== manifest.parts.bytes) {
    throw new Error(
      `Project archive "${storageId}" is truncated or tampered: its manifest declares ` +
        `${manifest.parts.bytes} part byte(s), the artifact holds ${restoredBytes}.`,
    )
  }

  // Reconcile first, then digest the LABELLED parts: the digest covers the
  // manifest's per-part index (path, kind, meta, bytes) and header as well as
  // the part bytes, so a relabelled or re-owned artifact — the one thing a
  // "bytes are intact" check cannot see, and the thing the caller ROUTES on —
  // is refused here rather than handed back with a forged instruction.
  const reconciled = reconcileParts(parts, manifest, storageId)

  const restoredDigest = partsDigest(reconciled, headerOf(manifest))
  if (restoredDigest !== manifest.parts.sha256) {
    throw new Error(
      `Project archive "${storageId}" failed its parts digest check: the manifest declares ` +
        `${manifest.parts.sha256}, the unpacked parts digest to ${restoredDigest}. Either the ` +
        `artifact was re-packed or corrupted, or its manifest RELABELLED a part (kind/meta/bytes) ` +
        `or re-wrote its header (projectId/createdAt/metadata/excluded) — refusing to trust it ` +
        `either way.`,
    )
  }

  return { manifest, parts: reconciled }
}

/**
 * Downloads an artifact and returns its bytes, or `null` when the object does
 * not exist.
 *
 * @param uploads - The uploads provider.
 * @param storageId - The object's storage id.
 * @param maxArtifactBytes - Cap on the bytes buffered from storage.
 * @returns The artifact bytes, or null.
 * @throws {Error} If the uploads provider cannot read, or the object is larger
 *   than `maxArtifactBytes`.
 */
async function downloadArtifact(
  uploads: UploadProvider,
  storageId: string,
  maxArtifactBytes: number,
): Promise<Uint8Array | null> {
  if (!uploads.getFile) {
    throw new Error(
      `The bonded uploads provider does not implement getFile(), so project archive ` +
        `"${storageId}" cannot be read back. Bond an uploads provider that supports reads ` +
        `(e.g. @molecule/api-uploads-s3 or @molecule/api-uploads-filesystem).`,
    )
  }
  const stream = await uploads.getFile(storageId)
  if (!stream) return null
  return readStream(stream, maxArtifactBytes, storageId)
}

/**
 * Deletes the artifact an attempted verification just rejected, best-effort.
 *
 * Called ONLY after a verification this provider attempted came back false, and
 * never for an archive that is unverified by configuration — see
 * {@link ArchiveOrphanCleanup.attempted}. It must never mask the verification
 * failure, which is the thing the caller has to act on, so a failed delete is
 * logged and REPORTED rather than thrown: the archive already failed, and
 * turning a leak into an exception would only hide why.
 *
 * @param uploads - The uploads provider.
 * @param storageId - The id the failed artifact was uploaded to.
 * @param projectId - The project being archived, for the log line.
 * @returns What became of the object.
 */
async function deleteOrphanArtifact(
  uploads: UploadProvider,
  storageId: string,
  projectId: string,
): Promise<ArchiveOrphanCleanup> {
  try {
    await uploads.deleteFile(storageId)
    logger.debug(
      'project-archive: deleted the unverified archive artifact rather than leaving it orphaned',
      { projectId, storageId },
    )
    return { attempted: true, deleted: true }
  } catch (error) {
    // Not a swallow: logged WITH the error and reported on the returned result.
    // Degraded rather than broken — the archive had already failed to verify;
    // the consequence here is one leaked object the caller can `remove()`.
    logger.warn(
      'project-archive: could not delete the unverified archive artifact — it is now an orphan ' +
        'in the bucket and must be removed by its storage id',
      { projectId, storageId, error },
    )
    return { attempted: true, deleted: false, error: messageOf(error) }
  }
}

/**
 * Builds the "nothing was proven" verification report.
 *
 * @param error - Why nothing was proven.
 * @returns An all-false {@link ArchiveVerification}.
 */
function unverified(error: string): ArchiveVerification {
  return {
    downloaded: false,
    checksumMatched: false,
    manifestParsed: false,
    entriesMatched: false,
    digestMatched: false,
    error,
  }
}

/**
 * Validates artifact bytes that have already been read back out of storage.
 *
 * Never throws: every failure is reported through the returned
 * {@link ArchiveVerification} so the CALLER decides what an unverified archive
 * means. `downloaded` is `true` whenever bytes were supplied — this function
 * validates them; fetching them is the caller's job.
 *
 * The check that matters is `digestMatched`: the artifact is UNPACKED, the byte
 * total is compared with `manifest.parts.bytes`, the manifest's per-part index
 * is reconciled against the payload, and the parts digest is recomputed from
 * the downloaded parts WITH the labels that index records AND the header the
 * manifest declares, then compared with `manifest.parts.sha256`. Without it the
 * other flags only compare the artifact to itself, and a packer that dropped or
 * corrupted a part's contents passes them all. Because the digest covers the
 * index and the header, a relabelled part (the `database` dump renamed `repo`, a
 * `meta.format` rewritten) and a re-owned artifact (`projectId`, `createdAt`,
 * `metadata`, `excluded` rewritten) both fail here as well — which matters
 * because the caller ROUTES on those labels at restore and reads that header as
 * fact. Every part is checked by the same rule — there is no special case for a
 * database dump, because there is no privileged part.
 *
 * It does NOT prove the artifact is the one this provider wrote: the digest is
 * unkeyed and lives inside the artifact, so a wholesale re-forge passes. See
 * {@link partsDigest} for the caller-side comparison that closes that.
 *
 * @param input - The bytes, the pre-upload digest, the expected part count, and
 *   the size caps.
 * @returns The verification report.
 */
export function verifyArtifactBytes(input: ArtifactVerificationInput): ArchiveVerification {
  const {
    artifact,
    sha256,
    parts: expectedParts,
    storageId,
    maxArtifactBytes = DEFAULT_MAX_ARTIFACT_BYTES,
    maxUncompressedBytes = DEFAULT_MAX_UNCOMPRESSED_BYTES,
  } = input

  const verification: ArchiveVerification = {
    downloaded: true,
    checksumMatched: false,
    manifestParsed: false,
    entriesMatched: false,
    digestMatched: false,
  }

  try {
    const downloadedSha256 = sha256Hex(artifact)
    if (downloadedSha256 !== sha256) {
      verification.error =
        `Checksum mismatch reading back "${storageId}": uploaded sha256 ${sha256}, ` +
        `storage returned ${downloadedSha256} (${artifact.byteLength} bytes). The stored ` +
        `artifact is corrupt.`
      return verification
    }
    verification.checksumMatched = true

    // Unpack the DOWNLOADED bytes — never the in-memory artifact — so a
    // storage-side truncation or rewrite is what actually gets validated.
    const tarEntries = unpackArtifact(artifact, storageId, maxArtifactBytes, maxUncompressedBytes)
    const manifest = manifestFrom(tarEntries, storageId)
    verification.manifestParsed = true

    const parts = collectParts(tarEntries, storageId)
    if (parts.length !== manifest.parts.count || parts.length !== expectedParts) {
      verification.error =
        `Part count mismatch in "${storageId}": archived ${expectedParts}, ` +
        `manifest declares ${manifest.parts.count}, artifact contains ${parts.length}.`
      return verification
    }
    verification.entriesMatched = true

    const actualBytes = totalBytes(parts)
    if (actualBytes !== manifest.parts.bytes) {
      verification.error =
        `Part byte total mismatch in "${storageId}": manifest declares ` +
        `${manifest.parts.bytes} bytes, the unpacked artifact holds ${actualBytes}. The ` +
        `artifact does not contain what it claims to.`
      return verification
    }

    // Reconcile BEFORE digesting, for two reasons. It proves the manifest's
    // per-part index describes exactly these parts (so a restore can route
    // every one of them), and it re-attaches the kind/meta the index records —
    // which the digest COVERS, so it cannot be recomputed without them.
    const labelled = reconcileParts(parts, manifest, storageId)

    const actualDigest = partsDigest(labelled, headerOf(manifest))
    if (actualDigest !== manifest.parts.sha256) {
      verification.error =
        `Parts digest mismatch in "${storageId}": manifest declares ` +
        `${manifest.parts.sha256}, the unpacked artifact digests to ${actualDigest}. Either the ` +
        `parts were re-packed or corrupted, or the manifest RELABELLED one (its kind/meta/bytes) ` +
        `— the digest covers the part bytes AND the index the caller routes on, so this artifact ` +
        `is NOT the project as archived.`
      return verification
    }

    verification.digestMatched = true
  } catch (error) {
    // Not a swallow: the error is reported to the caller on `verification.error`,
    // and it forces `verified: false`. Verification failures must not throw —
    // the caller decides whether to retry, alert, or keep the live project.
    verification.error = `Verification of "${storageId}" failed: ${messageOf(error)}`
  }

  return verification
}

/**
 * One exclude entry, decomposed by the canonical path model so the filter
 * compares segments to segments rather than string to string.
 */
interface ExcludeEntry {
  /** Its canonical segments — what the anchored rule matches against. */
  segments: string[]

  /**
   * Its single canonical segment, or `null` when the entry names a deeper path.
   *
   * The any-segment and dot-family rules are about ONE name (`node_modules`,
   * `.env`), so a multi-segment entry (`packages/api/dist`) is only ever
   * matched as an anchored leading path — naming a deeper path must not
   * suddenly make its last segment match everywhere.
   */
  name: string | null
}

/**
 * Tests one part path's canonical segments against one exclude entry, applying
 * the three rules {@link filterArchivableParts} documents.
 *
 * @param segments - The part path's canonical segments.
 * @param basename - The part path's last canonical segment.
 * @param entry - The decomposed exclude entry.
 * @param anySegment - Canonical entry names matched at ANY depth rather than
 *   anchored.
 * @returns True when the entry excludes that path.
 */
function matchesExclude(
  segments: readonly string[],
  basename: string,
  entry: ExcludeEntry,
  anySegment: ReadonlySet<string>,
): boolean {
  // Anchored directory match: the entry as a LEADING path. 'build' drops
  // 'build/bundle.js' but NOT 'src/build/compiler.ts', and a caller's explicit
  // deeper path ('packages/api/dist') is honoured the same way.
  if (matchesAnchoredPath(segments, entry.segments)) return true

  if (entry.name === null) return false

  // Any-segment directory match — only for the caller's opt-in set (defaulting
  // to the Node preset), never for an entry that could be real source.
  if (anySegment.has(entry.name) && matchesAnySegment(segments, entry.name)) return true

  // Dot-entry family match: '.env' also catches '.env.local'. A NON-dot entry
  // never reaches a basename at all — see matchesDotFamily for the source files
  // and git refs that rule deleted when it did.
  return matchesDotFamily(basename, entry.name)
}

/**
 * Splits a raw workspace walk into the parts an archive should carry and the
 * parts it should not, so a caller can filter in one call instead of
 * reimplementing the rules (and getting them subtly wrong).
 *
 * Returns BOTH halves — {@link PartFilterResult.kept} and
 * {@link PartFilterResult.dropped} — and never a bare array. This package runs
 * immediately before a caller DELETES a user's only copy, so a filter that
 * quietly returns less than it was given is the most expensive bug it can have,
 * and it had it: filtering
 * `['src/build/compiler.ts', 'src/tmp/scratch.ts', 'app/coverage/report.ts',
 * 'src/main.ts']` through `NODE_PROJECT_EXCLUDES` kept only `src/main.ts` and
 * dropped three legitimate source files, with nothing in the return value to say
 * so. LOG or assert on `dropped` before releasing anything, and summarise it
 * onto `ArchiveInput.excluded` as provenance.
 *
 * Three rules decide it, applied per exclude entry — all of them against the
 * CANONICAL segments of the one path model (`./path-model.js`), which is why
 * `api\node_modules\pkg\index.js` is dropped here just as it is refused by the
 * policy. When the filter split on `'/'` alone, it was not:
 *
 * - **anchored directory match** — the entry is matched as a LEADING path, so
 *   `'build'` drops `build/bundle.js` and `build` itself, but keeps
 *   `src/build/compiler.ts`. A monorepo that genuinely wants every
 *   `packages/<name>/dist` dropped passes those DEEPER PATHS EXPLICITLY
 *   (`'packages/api/dist'`, `'packages/app/dist'`), which this rule honours as a
 *   leading path. The default is SAFE — it keeps real source — and being more
 *   aggressive than that is an explicit caller choice, never something a preset
 *   does behind the caller's back. (An entry naming a path EXACTLY still drops
 *   that path: `['dist']` drops a part whose whole path is `dist`, because the
 *   caller named it. What the rule never does is match a basename at depth.)
 * - **any-segment directory match**, for entries in `options.anySegment`
 *   (default `NODE_ANY_SEGMENT_EXCLUDES` = `node_modules`) and nothing else —
 *   `api/node_modules/x` and `packages/web/node_modules/x` are dropped at any
 *   depth, because a nested `node_modules` is real in every workspace, always
 *   reproducible from the lockfile, and never a source directory anyone named on
 *   purpose. Anchoring it would miss most of the ~1.5 GB the exclusion exists to
 *   drop. `dist`, `build`, `tmp` and `coverage` do NOT qualify: they are all
 *   plausible real source directory names, so matching them at depth trades a
 *   bounded saving (some bytes) against an unbounded loss (a user's source).
 *   The set is an OPTION rather than a hard-coded constant so a Python walk can
 *   ask for the same treatment (`{ anySegment: ['__pycache__'] }`) instead of
 *   inheriting Node's and getting nothing for its own.
 * - **dot-entry family match** — a part whose BASENAME equals a DOT entry, or
 *   starts with `'<dot-entry>.'`, is dropped wherever it sits. This is what
 *   still drops `src/.DS_Store` and the `.env.local` / `.env.production` family.
 *   It applies ONLY to entries that themselves start with `'.'`: a non-dot entry
 *   matches a directory and never a filename, so `src/tmp.ts`, `src/build.rs`,
 *   `src/dist.config.js`, `tmp.md`, `buildings/x.ts`, `distance.ts`,
 *   `lib/build.gradle` and a git ref named `.git/refs/heads/dist` all SURVIVE.
 *   Applied to every entry, this rule silently deleted all of those — the same
 *   "filter eats real source" defect as the any-segment default, one layer down,
 *   and in `.git` it corrupted history that no snapshot can regenerate.
 *
 * Matching is CASE-SENSITIVE, like the POSIX paths these archives are built
 * from. (`ArchivePolicy.refuseFilePrefixes` is the deliberate exception — see
 * `matchesSecretSegment` — because a missed secret is unrecoverable while a
 * missed bulk directory only costs bytes.)
 *
 * `archive()` independently REFUSES whatever the effective {@link ArchivePolicy}
 * names, rather than trusting this helper was used — this exists to make doing
 * the right thing easy, not to be the only guard. Note the division of labour
 * the contract draws: reproducible bulk is FILTERED here (reported on `dropped`,
 * because it is merely wasteful) while secrets are REFUSED by the policy
 * (loudly, because archiving one is not recoverable) — which is why
 * `NODE_PROJECT_EXCLUDES` contains no `.env` entry. Add `DOTENV_FILE_PREFIX` to
 * the excludes yourself if you would rather drop secret files during the walk
 * than have `archive()` throw on them.
 *
 * @param parts - The raw part set from a workspace walk.
 * @param excludes - Leading paths / any-depth segments / dot-entry families to
 *   drop. Normalised by the same path model as the parts, so `'dist/'` and
 *   `'.\dist'` mean what they look like they mean instead of silently matching
 *   nothing. Defaults to `NODE_PROJECT_EXCLUDES`, which describes a Node/JS
 *   project and nothing else.
 * @param options - Filter knobs; `anySegment` (default
 *   `NODE_ANY_SEGMENT_EXCLUDES`) is the set matched at ANY depth rather than
 *   anchored. Pass `[]` to anchor everything.
 * @returns Both halves of the split: the parts to archive, and every part that
 *   was removed.
 * @throws {Error} If `excludes` contains an empty string — or an entry that
 *   NORMALIZES to nothing, such as `'/'` or `'  '` — which would degenerate the
 *   dot-entry family rule to `'.'` and drop every dotfile, including `.git`, the
 *   one thing this package deliberately refuses to lose; or an entry carrying a
 *   `'.'`/`'..'` segment (`'./dist'`), which can only ever match nothing while
 *   reading like it filters.
 */
export function filterArchivableParts<T extends { path: string }>(
  parts: readonly T[],
  excludes: readonly string[] = NODE_PROJECT_EXCLUDES,
  options: PartFilterOptions = {},
): PartFilterResult<T> {
  const normalizedExcludes = excludes.map((entry) => normalizePartPath(entry).path)
  // The DEFAULT any-depth set is intersected with what the caller actually listed,
  // so it only ever upgrades the match DEPTH of a name they already chose to
  // exclude. Defaulting to the Node preset outright would force `node_modules` on
  // a Python caller who passed `['.venv']` — re-privileging one ecosystem, which
  // is the thing this whole generalisation removed. An EXPLICIT `anySegment` is
  // unioned in, because naming it is an unambiguous request.
  const anyNames =
    options.anySegment === undefined
      ? NODE_ANY_SEGMENT_EXCLUDES.map((entry) => normalizePartPath(entry).path).filter((entry) =>
          normalizedExcludes.includes(entry),
        )
      : options.anySegment.map((entry) => normalizePartPath(entry).path)
  const anySegment = new Set(anyNames)
  // UNION, not just `excludes`. `anySegment` names an entry's MATCH DEPTH, but the
  // entry list is what gets iterated — so a name supplied only via `anySegment`
  // was silently a no-op, and the documented Python/Rust recipes
  // (`{ anySegment: ['__pycache__'] }`) dropped nothing at all. Any-depth matching
  // was therefore a privilege Node had (because `node_modules` is also in
  // NODE_PROJECT_EXCLUDES) and every other ecosystem was denied.
  const unique = [...new Set([...excludes, ...anyNames])]

  const entries: ExcludeEntry[] = unique.map((raw) => {
    const normalized = normalizePartPath(raw)
    if (normalized.segments.length === 0) {
      throw new Error(
        `filterArchivableParts received an EMPTY STRING in its excludes list ` +
          `(${JSON.stringify(excludes)}). It is refused rather than applied: the dot-entry family ` +
          `rule would degenerate to "." and silently drop every dotfile, including .git — history ` +
          `is user work and is not reproducible from a source snapshot. Remove the empty entry, or ` +
          `name the directory you meant.`,
      )
    }
    const relative = normalized.segments.find((segment) => segment === '.' || segment === '..')
    if (relative !== undefined) {
      throw new Error(
        `filterArchivableParts received the exclude entry ${JSON.stringify(raw)}, which contains a ` +
          `"${relative}" segment. Part paths are relative to the workspace root and carry no such ` +
          `segment, so this entry can only ever match NOTHING — and a caller who believes they ` +
          `filtered ships the bulk anyway. Write "${normalized.segments
            .filter((segment) => segment !== '.' && segment !== '..')
            .join('/')}" instead.`,
      )
    }

    return {
      segments: normalized.segments,
      name: normalized.segments.length === 1 ? normalized.segments[0] : null,
    }
  })

  const kept: T[] = []
  const dropped: T[] = []

  for (const part of parts) {
    const { segments } = normalizePartPath(part.path)
    const basename = segments[segments.length - 1] ?? ''
    if (entries.some((entry) => matchesExclude(segments, basename, entry, anySegment))) {
      dropped.push(part)
    } else {
      kept.push(part)
    }
  }

  return { kept, dropped }
}

/**
 * Creates an object-storage-backed project archive provider.
 *
 * @param config - Provider configuration.
 * @returns A `ProjectArchiveProvider` that persists artifacts through the
 *   configured (or bonded) uploads provider, with `archive()` narrowed to
 *   {@link ObjectStorageArchiveResult} so the orphan-cleanup report is readable
 *   without a cast.
 */
export function createProjectArchiveProvider(
  config: ProjectArchiveObjectStorageConfig = {},
): ObjectStorageProjectArchiveProvider {
  const verifyOnArchive = config.verifyOnArchive ?? true
  const allowEmpty = config.allowEmpty ?? false
  const maxArtifactBytes = config.maxArtifactBytes ?? DEFAULT_MAX_ARTIFACT_BYTES
  const maxUncompressedBytes = config.maxUncompressedBytes ?? DEFAULT_MAX_UNCOMPRESSED_BYTES

  /**
   * Resolves the uploads provider. Deliberately called per-operation, never
   * cached at construction: the bond is usually wired after this module is
   * imported.
   *
   * @returns The configured or bonded uploads provider.
   */
  const resolveUploads = (): UploadProvider => config.uploads ?? getUploadsProvider()

  /**
   * Resolves the policy in force for one call: the call's own policy, else the
   * provider's configured policy, else `NODE_PROJECT_POLICY`.
   *
   * The final fallback is a BOND default (Node/JS is what molecule.dev
   * scaffolds), NOT a contract-level truth — which is why both earlier links in
   * the chain exist and why an explicit `{}` refuses nothing.
   *
   * @param input - The caller's archive input.
   * @returns The policy to enforce.
   */
  const resolvePolicy = (input: ArchiveInput): ArchivePolicy => {
    // Resolved PER FIELD, never whole-object. Whole-object replacement meant a
    // caller following this package's OWN ecosystem recipes — which supply only
    // `refuseSegments` — silently lost `refuseFilePrefixes` and archived .env in
    // plaintext with verified:true. Making the policy configurable must not make
    // the credential guard accidentally droppable: opting into a Python bulk list
    // is not a statement about secrets. To refuse nothing, say so explicitly with
    // `refuseFilePrefixes: []`, which is honoured because `??` only falls through
    // on undefined.
    const input_ = input.policy
    const configured = config.policy
    return {
      refuseSegments:
        input_?.refuseSegments ?? configured?.refuseSegments ?? NODE_PROJECT_POLICY.refuseSegments,
      refuseFilePrefixes:
        input_?.refuseFilePrefixes ??
        configured?.refuseFilePrefixes ??
        NODE_PROJECT_POLICY.refuseFilePrefixes,
    }
  }

  /**
   * Applies the effective policy to one part, throwing when it is refused.
   *
   * Refusal THROWS rather than silently dropping the part: dropping it would
   * make the manifest describe a tree the caller never intended to archive.
   *
   * Both rules read the CANONICAL segments of the one path model, so a
   * separator or a padded segment cannot spell its way past them. Reading a
   * `'/'`-only split is exactly how `config\.env`, `.env\prod.key`, `.env ` and
   * ` .env` were archived and reported `verified: true` — live dotenv
   * credentials in storage that is not encrypted at rest. (Those paths are also
   * rejected outright as non-canonical by `assertSafePartPath`; this rule
   * catching them TOO is deliberate belt-and-braces on the one rule whose
   * failure cannot be undone.)
   *
   * The two rules are matched differently ON PURPOSE, and the asymmetry is
   * about what a miss costs (see `matchesSecretSegment`): `refuseSegments`
   * compares each segment CASE-SENSITIVELY, because Linux paths are
   * case-sensitive and a false refusal throws away a real archive;
   * `refuseFilePrefixes` compares EVERY segment CASE-INSENSITIVELY, because a
   * missed secret is a live credential in plaintext object storage.
   *
   * @param path - The part's caller-facing path.
   * @param policy - The effective policy.
   * @param projectId - The project being archived, for the error message.
   * @throws {Error} If any path segment is refused by either rule.
   */
  const enforcePolicy = (path: string, policy: ArchivePolicy, projectId: string): void => {
    // The CANONICAL segments — the same ones path safety, the filter and the
    // collision check read. This rule reading a different split is precisely
    // how `config\.env` was archived and verified: to a `'/'`-only split that
    // path is ONE segment, which matches nothing.
    const { segments } = normalizePartPath(path)

    const refusedSegment = segments.find((segment) =>
      (policy.refuseSegments ?? []).includes(segment),
    )
    if (refusedSegment !== undefined) {
      throw new Error(
        `Refusing to archive project "${projectId}": the part "${path}" is inside ` +
          `"${refusedSegment}", which the effective ArchivePolicy refuses (refuseSegments: ` +
          `${JSON.stringify(policy.refuseSegments ?? [])}). Filter the walk before calling ` +
          `archive() (filterArchivableParts does it), or pass a policy that permits it.`,
      )
    }

    // EVERY segment, not just the basename: a ".env" DIRECTORY (.env/prod.key)
    // holds the same credentials as a ".env" file, and its basename matches
    // nothing.
    for (const segment of segments) {
      const refusedPrefix = (policy.refuseFilePrefixes ?? []).find((prefix) =>
        matchesSecretSegment(segment, prefix),
      )
      if (refusedPrefix !== undefined) {
        throw new Error(
          `Refusing to archive project "${projectId}": the part "${path}" has the segment ` +
            `"${segment}", which matches the refused file prefix "${refusedPrefix}" ` +
            `(refuseFilePrefixes, compared case-insensitively across every path segment). This ` +
            `artifact is NOT encrypted at rest, so archiving a secrets file would write live ` +
            `credentials into object storage in plaintext. Keep secrets in the platform vault ` +
            `and re-inject them on restore.`,
        )
      }
    }
  }

  /**
   * Validates the caller's part set and normalizes it into the digest's input
   * shape: modes resolved and masked, sorted by path.
   *
   * Every path is checked RAW — before the `parts/` prefix is applied — because
   * the prefixed form of `/etc/passwd` (`parts//etc/passwd`) is neither absolute
   * nor traversing and would sail through.
   *
   * @param input - The caller's archive input.
   * @returns The normalized, sorted parts.
   * @throws {Error} If the part set is empty (and `allowEmpty` is not set),
   *   smaller than `minParts`, missing a `requiredPaths` entry, larger than
   *   `maxUncompressedBytes`, refused by the effective policy, or contains an
   *   unsafe or colliding path.
   */
  const normalizeParts = (input: ArchiveInput): NormalizedPart[] => {
    const parts = sortByPath(input.parts)
    const minParts = input.minParts ?? (allowEmpty ? 0 : 1)
    const policy = resolvePolicy(input)

    if (!Number.isInteger(minParts) || minParts < 0) {
      throw new Error(
        `Refusing to archive project "${input.projectId}": minParts must be a non-negative ` +
          `integer, received ${String(input.minParts)}.`,
      )
    }
    if (minParts === 0 && !allowEmpty) {
      throw new Error(
        `Refusing to archive project "${input.projectId}": minParts: 0 asks for an archive of ` +
          `nothing, which requires createProjectArchiveProvider({ allowEmpty: true }).`,
      )
    }
    if (parts.length === 0 && !allowEmpty) {
      throw new Error(
        `Refusing to archive project "${input.projectId}": the part set is EMPTY. An empty ` +
          `archive round-trips and verifies perfectly while proving nothing, so a workspace ` +
          `walk that silently returned [] would look like a good backup. Fix the walk, or ` +
          `configure the provider with allowEmpty: true if an empty project is expected.`,
      )
    }
    if (parts.length < minParts) {
      throw new Error(
        `Refusing to archive project "${input.projectId}": the part set holds ${parts.length} ` +
          `part(s), fewer than the required minimum of ${minParts}. A partial workspace walk ` +
          `is not an archive.`,
      )
    }

    const normalized: NormalizedPart[] = []
    const seen = new Map<string, string>()
    for (const part of parts) {
      try {
        assertSafePartPath(part.path)
      } catch (error) {
        // A non-canonical path can ALSO be a secret (`config\.env`,
        // `.env\prod.key`, `.env `), and which of the two the operator is told
        // about matters: one is a path bug, the other is a credential that
        // nearly reached storage that is not encrypted at rest. Run the policy
        // on it first so the refusal names the credential; the path is refused
        // either way, and nothing is uploaded either way.
        if (typeof part.path === 'string') {
          enforcePolicy(part.path, policy, input.projectId)
        }
        throw new Error(
          `Refusing to archive project "${input.projectId}": unsafe part path — ${messageOf(error)}`,
          { cause: error },
        )
      }

      // Enforced, not advisory. The caller does the filtering, but a caller who
      // forgets would silently ship ~1.5 GB of reproducible bulk per project
      // (destroying the reason this package exists) or write live credentials
      // into object storage in plaintext. Refuse loudly instead of filtering
      // silently, and refuse whatever THIS deployment's policy names rather than
      // one hard-coded ecosystem's directories.
      enforcePolicy(part.path, policy, input.projectId)

      const key = pathCollisionKey(part.path)
      const collision = seen.get(key)
      if (collision !== undefined) {
        throw new Error(
          `Refusing to archive project "${input.projectId}": part paths "${collision}" and ` +
            `"${part.path}" collide — they normalise to the same file and one would overwrite ` +
            `the other on restore.`,
        )
      }
      seen.set(key, part.path)

      const entry: NormalizedPart = {
        path: part.path,
        content: part.content,
        mode: normalizeMode(part.mode),
      }
      if (part.kind !== undefined) entry.kind = part.kind
      if (part.meta !== undefined) entry.meta = { ...part.meta }
      normalized.push(entry)
    }

    const present = new Set(normalized.map((part) => part.path))
    const missing = (input.requiredPaths ?? []).filter((path) => !present.has(path))
    if (missing.length > 0) {
      throw new Error(
        `Refusing to archive project "${input.projectId}": required path(s) missing from the ` +
          `part set: ${missing.join(', ')}. A project without them is not restorable.`,
      )
    }

    const partBytes = totalBytes(normalized)
    if (partBytes > maxUncompressedBytes) {
      throw new Error(
        `Refusing to archive project "${input.projectId}": ${partBytes} bytes of parts exceed ` +
          `the maxUncompressedBytes cap of ${maxUncompressedBytes} bytes. Filter the part set ` +
          `(reproducible bulk such as node_modules, dist, .vite) or raise the cap.`,
      )
    }

    return normalized
  }

  return {
    /**
     * Packs, uploads, and then RE-READS and validates a project archive.
     *
     * The artifact is a gzipped POSIX ustar tarball containing `manifest.json`
     * and one `parts/<path>` member per supplied part (mode preserved, masked to
     * `0o777`) — extractable with `tar -xzf`. Every part is packed the same way:
     * a source file, a `pg_dump` and a `git bundle` differ only by the `path`,
     * `kind` and `meta` the CALLER chose, all of which are recorded verbatim and
     * never interpreted here.
     *
     * The returned `storageId` is the id the uploads bond MINTED. It is never
     * derived from `projectId`, so every call produces a NEW artifact and can
     * never overwrite the previous one: keep the old id, and delete the old
     * artifact only AFTER this result comes back `verified: true`. PERSIST the
     * new id — `restore()`, `status()`, and `remove()` all need it, and there is
     * no lookup by project.
     *
     * Throws when the part set is empty (or violates `minParts` /
     * `requiredPaths`), when a part path is unsafe or collides with another,
     * when the effective `ArchivePolicy` refuses a part, when a size cap is
     * exceeded, or when the UPLOAD itself fails. Those are never archives, so
     * there is nothing for the caller to weigh. A VERIFICATION failure is
     * different: it is reported as `verified: false` with `verification.error`
     * populated, never as a throw, and the live project is never touched —
     * releasing it is the caller's job and only ever valid when
     * `verified === true`.
     *
     * When a verification this provider ATTEMPTED fails, the just-uploaded
     * object is deleted best-effort — nothing would ever reference it again —
     * and `orphanCleanup` says whether that succeeded. An archive that is
     * unverified by CONFIGURATION (`verifyOnArchive: false`, or an uploads bond
     * with no `getFile()`) is never deleted: it is the only copy the caller
     * asked for.
     *
     * @param input - The project id, the parts, and the
     *   `minParts`/`requiredPaths`/`policy` guards.
     * @returns The archive result, including the minted storage id, the
     *   verification report, and what became of the object when verification
     *   failed.
     * @throws {Error} If the part set fails its guards, a part path is unsafe or
     *   duplicated, the policy refuses a part, a size cap is exceeded, or the
     *   upload fails.
     */
    async archive(input: ArchiveInput): Promise<ObjectStorageArchiveResult> {
      const uploads = resolveUploads()
      const parts = normalizeParts(input)

      // The header is built FIRST and then digested with the parts, so the
      // manifest cannot assert anything the digest does not cover — one object
      // feeds both, exactly as `entriesIndexOf` feeds both the index and the
      // digest's index section.
      const header: DigestedManifestHeader = {
        formatVersion: ARCHIVE_FORMAT_VERSION,
        projectId: input.projectId,
        createdAt: new Date().toISOString(),
        count: parts.length,
        bytes: totalBytes(parts),
      }
      if (input.excluded !== undefined) header.excluded = [...input.excluded]
      if (input.metadata !== undefined) header.metadata = { ...input.metadata }

      const manifest: ArchiveManifest = {
        formatVersion: header.formatVersion,
        projectId: header.projectId,
        createdAt: header.createdAt,
        parts: {
          count: header.count,
          bytes: header.bytes,
          sha256: partsDigest(parts, header),
        },
        entries: entriesIndexOf(parts),
      }
      if (header.excluded !== undefined) manifest.excluded = header.excluded
      if (header.metadata !== undefined) manifest.metadata = header.metadata

      // Manifest first so a consumer can read it without streaming the whole artifact.
      const tarEntries: TarEntry[] = [
        {
          path: MANIFEST_ENTRY,
          content: new Uint8Array(Buffer.from(JSON.stringify(manifest, null, 2), 'utf8')),
        },
      ]
      for (const part of parts) {
        tarEntries.push({
          path: `${PART_PREFIX}${part.path}`,
          content: part.content,
          mode: part.mode,
        })
      }

      const artifact = gzipBytes(createTar(tarEntries))
      if (artifact.byteLength > maxArtifactBytes) {
        throw new Error(
          `Refusing to upload the project archive for "${input.projectId}": the artifact is ` +
            `${artifact.byteLength} bytes, over the maxArtifactBytes cap of ${maxArtifactBytes} ` +
            `bytes.`,
        )
      }
      const artifactSha256 = sha256Hex(artifact)

      const storageId = await uploadArtifact(uploads, input.projectId, artifact)

      // Distinguishes "verification FAILED" from "verification was skipped or
      // impossible". Only the first leaves litter worth cleaning up; the other
      // two produce an artifact the caller deliberately asked for and must keep.
      const verificationAttempted = verifyOnArchive && Boolean(uploads.getFile)

      let verification: ArchiveVerification
      if (!verifyOnArchive) {
        verification = unverified(
          'Verification was skipped (verifyOnArchive: false), so this archive is NOT verified. ' +
            'Do not release the live project on this result.',
        )
      } else if (!uploads.getFile) {
        verification = unverified(
          `The bonded uploads provider does not implement getFile(), so the archive at ` +
            `"${storageId}" could not be read back and CANNOT be considered verified.`,
        )
      } else {
        try {
          const stream = await uploads.getFile(storageId)
          if (!stream) {
            verification = unverified(
              `Storage returned no object at "${storageId}" immediately after the upload — the ` +
                `archive is missing.`,
            )
          } else {
            verification = verifyArtifactBytes({
              artifact: await readStream(stream, maxArtifactBytes, storageId),
              sha256: artifactSha256,
              parts: parts.length,
              storageId,
              maxArtifactBytes,
              maxUncompressedBytes,
            })
          }
        } catch (error) {
          // Not a swallow: reported on `verification.error`, which forces
          // `verified: false`. A read-back failure must not throw — the caller
          // decides whether to retry, alert, or keep the live project.
          verification = unverified(`Verification of "${storageId}" failed: ${messageOf(error)}`)
        }
      }

      const verified =
        verification.downloaded &&
        verification.checksumMatched &&
        verification.manifestParsed &&
        verification.entriesMatched &&
        verification.digestMatched

      // An artifact that FAILED an attempted verification is referenced by
      // nothing: the caller was told never to persist the id of an unverified
      // archive, so leaving it in the bucket leaks one object per failure,
      // forever. Delete it best-effort — and never for an archive that is
      // unverified by configuration, which is the caller's only copy.
      const orphanCleanup: ArchiveOrphanCleanup =
        verified || !verificationAttempted
          ? { attempted: false, deleted: false }
          : await deleteOrphanArtifact(uploads, storageId, input.projectId)

      return {
        projectId: input.projectId,
        storageId,
        manifest,
        bytes: artifact.byteLength,
        verified,
        verification,
        orphanCleanup,
      }
    },

    /**
     * Downloads the archive at `input.storageId`, VALIDATES it against its own
     * manifest, and unpacks it back into parts.
     *
     * `storageId` is required — the id `archive()` minted and the caller
     * persisted. There is no key to derive. `input.projectId` is only the
     * destination label echoed onto the result; the artifact's own owner is
     * `manifest.projectId`, so restoring one project's archive into another is
     * an explicit, visible act rather than a silent one.
     *
     * Validation is not optional: the part count, the recomputed parts digest,
     * the total part bytes, and the manifest's per-part index must all match the
     * payload, or this THROWS. A partial or tampered artifact never yields half
     * a project.
     *
     * Nothing is re-provisioned. The returned parts carry the `kind`/`meta` the
     * caller recorded, which is how a restore knows which bytes are a source
     * file, which are a `pg_dump`, and which are a git bundle.
     *
     * @param input - The destination project id and the archive's storage id.
     * @returns The manifest and every part (relative paths preserved, modes
     *   masked to `0o777`, `kind`/`meta` re-attached verbatim).
     * @throws {Error} If `storageId` is missing, no archive exists there, the
     *   uploads provider cannot read, a size cap is exceeded, the artifact is
     *   corrupt, a part path is unsafe, or the payload does not match the
     *   manifest.
     */
    async restore(input: RestoreInput): Promise<RestoreResult> {
      const uploads = resolveUploads()
      const storageId = input.storageId

      if (!storageId) {
        throw new Error(
          `restore() requires the storageId that archive() minted and returned (project ` +
            `"${input.projectId}"). There is no id to derive from a project id — persist the ` +
            `one archive() gave you.`,
        )
      }

      const artifact = await downloadArtifact(uploads, storageId, maxArtifactBytes)
      if (!artifact) {
        throw new Error(
          `No project archive found at "${storageId}" (restoring into project ` +
            `"${input.projectId}").`,
        )
      }

      const { manifest, parts: reconciled } = validateArtifact(
        artifact,
        storageId,
        maxArtifactBytes,
        maxUncompressedBytes,
      )

      return {
        projectId: input.projectId,
        manifest,
        parts: reconciled.map((part) => {
          const restored: ArchivePart = {
            path: part.path,
            content: part.content,
            mode: part.mode,
          }
          if (part.kind !== undefined) restored.kind = part.kind
          if (part.meta !== undefined) restored.meta = part.meta
          return restored
        }),
      }
    },

    /**
     * Reports on ONE archive artifact, addressed by the storage id `archive()`
     * minted. There is no lookup by project — a project can have any number of
     * artifacts, and only the caller knows which ids it kept.
     *
     * The reported `projectId` is read out of the stored manifest, so it names
     * the project the artifact actually belongs to — and the artifact is FULLY
     * VALIDATED first, by the same {@link validateArtifact} pass `restore()`
     * runs. That is not belt-and-braces: this method's whole promise is that it
     * reports whose project an artifact is rather than whose the caller assumed,
     * so reporting a manifest it never authenticated made it a channel for
     * exactly the forgery it claims to resolve. A rewritten `projectId` or
     * `createdAt` now THROWS here instead of being reported as fact.
     *
     * @param storageId - The artifact's storage id.
     * @returns The archive status, or `null` when nothing is stored there.
     * @throws {Error} If the uploads provider cannot read, a size cap is
     *   exceeded, or the stored artifact is corrupt, incomplete, or tampered (a
     *   corrupt archive is NOT reported as "absent").
     */
    async status(storageId: string): Promise<ArchiveStatus | null> {
      const uploads = resolveUploads()

      const artifact = await downloadArtifact(uploads, storageId, maxArtifactBytes)
      if (!artifact) return null

      const { manifest } = validateArtifact(
        artifact,
        storageId,
        maxArtifactBytes,
        maxUncompressedBytes,
      )

      return {
        projectId: manifest.projectId,
        storageId,
        archivedAt: manifest.createdAt,
        bytes: artifact.byteLength,
        manifest,
      }
    },

    /**
     * Permanently deletes ONE archive artifact from object storage, addressed by
     * the storage id `archive()` minted.
     *
     * This deletes the ARCHIVE, never the live project. Because every
     * `archive()` mints a new id, the safe replacement order is: archive → check
     * `verified` → persist the new id → `remove()` the OLD id. Removing first
     * leaves the project with no copy if the new archive fails to verify.
     *
     * @param storageId - The artifact's storage id.
     * @throws {Error} If `storageId` is empty, or the uploads provider fails.
     */
    async remove(storageId: string): Promise<void> {
      if (!storageId) {
        throw new Error(
          `remove() requires the storageId that archive() minted and returned. Refusing to call ` +
            `deleteFile() with an empty id.`,
        )
      }
      await resolveUploads().deleteFile(storageId)
    },
  }
}

/**
 * Object-storage project archive provider using the default configuration: the
 * bonded `@molecule/api-uploads` provider (resolved lazily, per call),
 * `NODE_PROJECT_POLICY` as the refusal policy, post-upload verification enabled,
 * empty archives rejected, and the default 512 MiB artifact / 2 GiB decompressed
 * size caps.
 *
 * The Node/JS policy default is a BOND default — the ecosystem molecule.dev
 * scaffolds — not a contract-level truth. Use
 * {@link createProjectArchiveProvider} instead when you need a different policy
 * (`{ refuseSegments: ['.venv', '__pycache__'] }` for Python,
 * `{ refuseSegments: ['target'] }` for Rust), different caps, `allowEmpty`, or an
 * explicitly injected uploads provider — or override per call with
 * `ArchiveInput.policy`.
 *
 * Typed as {@link ObjectStorageProjectArchiveProvider} — the
 * `ProjectArchiveProvider` contract with `archive()` narrowed to the result that
 * also reports {@link ArchiveOrphanCleanup} — so it stays assignable wherever
 * the contract is expected (`setProvider(provider)`,
 * `bond('project-archive', provider)`) while a caller holding this bond directly
 * can still read what became of an artifact that failed verification.
 */
export const provider: ObjectStorageProjectArchiveProvider = createProjectArchiveProvider()
