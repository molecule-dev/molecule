/**
 * The artifact layer: what a `.tar.gz` archive artifact IS, and how it is
 * digested, parsed, authenticated and verified.
 *
 * The layout is the whole schema — `manifest.json` plus one `parts/<path>`
 * member per part — and every read path shares the code here, so an artifact
 * cannot be fully validated on one path and merely parsed on another.
 *
 * Two invariants live here:
 *
 * 1. **The digest covers EVERYTHING the manifest asserts**, not just the part
 *    bytes: the per-part index the caller ROUTES on and the manifest HEADER
 *    `status()` reports as FACT are inside {@link partsDigest}, each section
 *    length-framed behind its own marker. A manifest carrying any UNDECLARED
 *    key is refused outright, because a fixed-field digest cannot authenticate
 *    what it does not enumerate.
 * 2. **An artifact may contain NOTHING but those two namespaces.** A stowaway
 *    member is refused by name rather than ignored, because nothing here counts,
 *    digests, verifies or restores it — while `tar -xzf` still materialises it.
 *
 * INTERNAL: nothing here is re-exported from the package barrel. The public
 * surface is the provider — see `./provider.js`.
 *
 * @module
 */

import { createHash } from 'node:crypto'

import {
  ARCHIVE_FORMAT_VERSION,
  type ArchiveManifest,
  type ArchiveVerification,
} from '@molecule/api-project-archive'

import {
  assertSafePartPath,
  describePath,
  gunzipBytes,
  parseTar,
  pathCollisionKey,
  type TarEntry,
  type TarLimits,
} from './tar.js'

/** Archive member holding the JSON-encoded {@link ArchiveManifest}. */
export const MANIFEST_ENTRY = 'manifest.json'

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
 * (`source/src/a.ts`, `database/main.dump`), and nothing here parses it.
 */
export const PART_PREFIX = 'parts/'

/** Mode applied to a part that does not carry one. */
const DEFAULT_PART_MODE = 0o644

/**
 * Permission bits kept on an archived (and restored) part. setuid/setgid/sticky
 * (`0o7000`) are masked off on BOTH sides, so a restored file can never carry
 * setuid even if the source tree did.
 */
const MODE_MASK = 0o777

/** Default cap on a downloaded artifact, enforced BEFORE decompression. */
export const DEFAULT_MAX_ARTIFACT_BYTES = 512 * 1024 * 1024

/** Default cap on the DECOMPRESSED payload — the decompression-bomb guard. */
export const DEFAULT_MAX_UNCOMPRESSED_BYTES = 2 * 1024 * 1024 * 1024

/**
 * Oldest artifact layout this provider can read.
 *
 * Formats `1` and `2` are not readable as the current layout. Format `1` stored
 * its content as a privileged `source/` + `database.dump` pair rather than the
 * generic {@link PART_PREFIX} channel. Format `2` carried an `excluded` field in
 * the manifest header — inside the digest's header section — so a v2 manifest
 * neither parses (the field set is CLOSED) nor digests as a v3 one. Both are
 * refused with an explanation rather than silently misread. Raise this only when
 * a layout genuinely stops being readable; being merely OLDER is not a reason to
 * refuse an artifact.
 */
const MIN_READABLE_FORMAT_VERSION = 3

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
  'metadata',
]

/** Every key the manifest's `parts` aggregate may carry. */
const MANIFEST_PARTS_KEYS: readonly string[] = ['count', 'bytes', 'sha256']

/** Every key one {@link ArchiveManifest.entries} row may carry. */
const MANIFEST_ENTRY_KEYS: readonly string[] = ['path', 'bytes', 'kind', 'meta']

/**
 * The manifest fields the parts digest covers besides the parts and the index —
 * everything the manifest ASSERTS about the artifact as a whole.
 *
 * Every one of these is acted upon: `status()` reports `projectId` and
 * `createdAt` as FACT, `formatVersion` decides whether the layout is readable
 * at all, and `metadata` is the provenance a human reads when deciding what an
 * artifact is. Leaving them outside the digest let anyone with bucket write
 * access rewrite whose project an artifact was, while `restore()` and
 * {@link verifyArtifactBytes} both still passed.
 */
export interface DigestedManifestHeader {
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
  /** {@link ArchiveManifest.metadata}, when present. */
  metadata?: Record<string, string>
}

/** A part with its mode resolved and masked — the digest's input shape. */
export interface NormalizedPart {
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
 * Hex sha256 digest of a byte buffer.
 *
 * @param data - The bytes to digest.
 * @returns The lowercase hex digest.
 */
export function sha256Hex(data: Uint8Array): string {
  return createHash('sha256').update(data).digest('hex')
}

/**
 * Extracts a human-readable message from an unknown thrown value.
 *
 * @param error - The caught value.
 * @returns Its message, or its string form.
 */
export function messageOf(error: unknown): string {
  return error instanceof Error ? error.message : String(error)
}

/**
 * Resolves and masks a part's mode.
 *
 * @param mode - The caller-supplied mode, if any.
 * @returns The mode with setuid/setgid/sticky stripped, defaulting to `0o644`.
 */
export function normalizeMode(mode: number | undefined): number {
  return (mode ?? DEFAULT_PART_MODE) & MODE_MASK
}

/**
 * Orders parts by path, so the digest is independent of input order.
 *
 * @param parts - The parts to order.
 * @returns A new, sorted array.
 */
export function sortByPath<T extends { path: string }>(parts: readonly T[]): T[] {
  return [...parts].sort((a, b) => (a.path < b.path ? -1 : a.path > b.path ? 1 : 0))
}

/**
 * Sums the content bytes of a part set.
 *
 * @param parts - The parts to measure.
 * @returns The total number of content bytes.
 */
export function totalBytes(parts: readonly { content: Uint8Array }[]): number {
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
export function entriesIndexOf(parts: readonly NormalizedPart[]): ArchiveManifest['entries'] {
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
export function headerOf(manifest: ArchiveManifest): DigestedManifestHeader {
  const header: DigestedManifestHeader = {
    formatVersion: manifest.formatVersion,
    projectId: manifest.projectId,
    createdAt: manifest.createdAt,
    count: manifest.parts.count,
    bytes: manifest.parts.bytes,
  }
  if (manifest.metadata !== undefined) header.metadata = { ...manifest.metadata }
  return header
}

/**
 * Digests EVERYTHING the manifest asserts, in three framed sections: every
 * part's path, masked octal mode, byte length and content (sorted by path,
 * NUL-separated); then the canonically serialised per-part index (path, kind,
 * meta, bytes — also sorted by path); then the canonically serialised manifest
 * header (`formatVersion`, `projectId`, `createdAt`, `parts.count`,
 * `parts.bytes`, `metadata`).
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
 *   tamper an adversarial review demonstrated against an earlier build:
 *   rewriting `manifest.projectId` to `'attacker-project'` (or `createdAt`,
 *   `metadata`) left `digestMatched: true`, `restore()` succeeded, and
 *   `status()` reported the forged owner as FACT — while
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
 * (which covered the parts alone, then the parts + index, then a header that
 * still carried `excluded`). An artifact written by an earlier build fails
 * `digestMatched` and `restore()` rather than being read with an
 * unauthenticated index or header. That is the intended direction — it fails
 * loudly, and a re-archive from the live project produces a current artifact.
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
export function partsDigest(
  parts: readonly NormalizedPart[],
  header: DigestedManifestHeader,
): string {
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
      `Project archive "${storageId}" uses format version ${manifest.formatVersion}, which this ` +
        `provider cannot read (the oldest readable layout is version ` +
        `${MIN_READABLE_FORMAT_VERSION}): version 1 laid its content out as privileged ` +
        `"source"/"database" channels rather than the generic "${PART_PREFIX}" one, and version 2 ` +
        `carried an "excluded" manifest field that no longer exists and that its digest covered. ` +
        `Restore it with the provider version that wrote it, or extract it by hand — it is a ` +
        `plain tar.gz.`,
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
 * count only sees `parts/`), nothing digests it, and nothing restores it — so
 * silently ignoring one lets an artifact carry bytes that no check in this
 * package has ever looked at, waiting for whatever else opens the tarball. It is
 * named in the error because an artifact that is not exactly `manifest.json` +
 * `parts/<path>` was written or re-packed by something other than this provider.
 *
 * Directory members are refused at ANY path, `parts/` included: this provider
 * writes none, so their presence is itself the evidence of a re-pack. A
 * `parts/<dir>` member used to slip through on the prefix check and then be
 * skipped by {@link collectParts} — the exact "carries bytes no check has looked
 * at" shape this function exists to refuse, hiding behind the one prefix that
 * looked legitimate.
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
export function validateArtifact(
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
        `or re-wrote its header (projectId/createdAt/metadata) — refusing to trust it either way.`,
    )
  }

  return { manifest, parts: reconciled }
}

/**
 * Builds the "nothing was proven" verification report.
 *
 * @param error - Why nothing was proven.
 * @returns An all-false {@link ArchiveVerification}.
 */
export function unverified(error: string): ArchiveVerification {
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
 * corrupted a part's contents passes them all. A relabelled part and a re-owned
 * artifact fail here too, because {@link partsDigest} covers the index and the
 * header — see there for what it does NOT cover (a wholesale re-forge) and the
 * caller-side comparison that closes it. Every part is checked by the same
 * rule: there is no privileged part.
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
