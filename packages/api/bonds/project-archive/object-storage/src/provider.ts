/**
 * Object-storage implementation of `ProjectArchiveProvider`.
 *
 * Packs a project's source (and optional database dump) into a standard
 * gzipped POSIX ustar artifact and persists it through the bonded
 * `@molecule/api-uploads` provider — S3, R2, B2, MinIO, or the filesystem bond,
 * whichever the app wired. No storage SDK is imported here, and the package has
 * zero external runtime dependencies.
 *
 * Two behaviours in this module are load-bearing:
 *
 * 1. **The storage id is MINTED by the uploads bond and returned verbatim.**
 *    Nothing is derived from `projectId`: both shipped uploads bonds assign a
 *    UUID and ignore the supplied filename, so a derived key located nothing.
 *    Every `archive()` therefore mints a NEW id and can never overwrite the
 *    previous artifact — the caller persists the id and removes the old artifact
 *    only after the new one verifies.
 * 2. **The post-upload READ-BACK actually unpacks what storage returned.** The
 *    artifact is downloaded again, re-hashed against the pre-upload digest, its
 *    manifest re-parsed out of the downloaded bytes, its `source/` members
 *    re-counted, AND unpacked so the source digest and byte total can be
 *    recomputed from those downloaded entries and compared to
 *    `manifest.source.sha256`/`bytes`. `verified` is true only when all five
 *    pass. An unverified archive is not an archive — the caller must never
 *    release the live project on anything but `verified === true`.
 *
 * @module
 */

import { createHash } from 'node:crypto'
import { Readable } from 'node:stream'

import {
  ARCHIVE_FORMAT_VERSION,
  type ArchiveInput,
  type ArchiveManifest,
  type ArchiveResult,
  type ArchiveStatus,
  type ArchiveVerification,
  DEFAULT_ARCHIVE_EXCLUDES,
  type ProjectArchiveProvider,
  type RestoreInput,
  type RestoreResult,
} from '@molecule/api-project-archive'
import { getProvider as getUploadsProvider, type UploadProvider } from '@molecule/api-uploads'

import {
  assertSafeSourcePath,
  createTar,
  gunzipBytes,
  gzipBytes,
  parseTar,
  pathCollisionKey,
  type TarEntry,
  type TarLimits,
} from './tar.js'

/** Archive member holding the JSON-encoded {@link ArchiveManifest}. */
const MANIFEST_ENTRY = 'manifest.json'

/** Archive member prefix under which every source file is stored. */
const SOURCE_PREFIX = 'source/'

/** Archive member holding the database dump bytes, when one was supplied. */
const DATABASE_ENTRY = 'database.dump'

/** Form fieldname reported to the uploads provider. */
const UPLOAD_FIELDNAME = 'archive'

/** MIME type reported to the uploads provider. */
const ARTIFACT_MIME_TYPE = 'application/gzip'

/** Mode applied to source files that do not carry one. */
const DEFAULT_FILE_MODE = 0o644

/** Mode applied to the database dump member. */
const DATABASE_DUMP_MODE = 0o600

/**
 * Permission bits kept on an archived (and restored) file. setuid/setgid/sticky
 * (`0o7000`) are masked off on BOTH sides, so a restored file can never carry
 * setuid even if the source tree did.
 */
const MODE_MASK = 0o777

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

/**
 * Input to {@link verifyArtifactBytes}.
 */
export interface ArtifactVerificationInput {
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

/** A source file with its mode resolved and masked — the digest's input shape. */
interface NormalizedSourceFile {
  /** POSIX-relative path, exactly as the caller supplied it. */
  path: string
  /** The file's bytes. */
  content: Uint8Array
  /** Permission bits, already masked to {@link MODE_MASK}. */
  mode: number
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
 * Resolves and masks a source file's mode.
 *
 * @param mode - The caller-supplied mode, if any.
 * @returns The mode with setuid/setgid/sticky stripped, defaulting to `0o644`.
 */
function normalizeMode(mode: number | undefined): number {
  return (mode ?? DEFAULT_FILE_MODE) & MODE_MASK
}

/**
 * Orders source files by path, so the digest is independent of input order.
 *
 * @param files - The files to order.
 * @returns A new, sorted array.
 */
function sortByPath<T extends { path: string }>(files: readonly T[]): T[] {
  return [...files].sort((a, b) => (a.path < b.path ? -1 : a.path > b.path ? 1 : 0))
}

/**
 * Sums the content bytes of a file set.
 *
 * @param files - The files to measure.
 * @returns The total number of content bytes.
 */
function totalBytes(files: readonly { content: Uint8Array }[]): number {
  return files.reduce((total, file) => total + file.content.byteLength, 0)
}

/**
 * Digests the source file set: for every file, sorted by path, its path,
 * masked octal mode, byte length, and content, NUL-separated.
 *
 * This is a digest of the FILES, not of the tar — it stays stable if the
 * artifact layout ever changes, it is order-independent because the input is
 * sorted first, and it is what both verification and `restore()` recompute from
 * the DOWNLOADED entries to prove the packer preserved every byte.
 *
 * @param files - The normalized source files.
 * @returns The lowercase hex digest.
 */
function sourceDigest(files: readonly NormalizedSourceFile[]): string {
  const hash = createHash('sha256')
  for (const file of sortByPath(files)) {
    hash.update(file.path, 'utf8')
    hash.update('\0')
    hash.update(file.mode.toString(8))
    hash.update('\0')
    hash.update(String(file.content.byteLength))
    hash.update('\0')
    hash.update(file.content)
    hash.update('\0')
  }
  return hash.digest('hex')
}

/**
 * Collects a readable stream into a single byte buffer, refusing to buffer more
 * than `maxBytes`.
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
    const buffer = typeof chunk === 'string' ? Buffer.from(chunk, 'utf8') : Buffer.from(chunk)
    size += buffer.byteLength
    if (size > maxBytes) {
      throw new Error(
        `Project archive "${storageId}" exceeds the maxArtifactBytes cap of ${maxBytes} bytes ` +
          `(read ${size} bytes and the object had not ended). Raise maxArtifactBytes if this ` +
          `artifact is legitimately that large.`,
      )
    }
    chunks.push(buffer)
  }
  return new Uint8Array(Buffer.concat(chunks))
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
    typeof manifest.formatVersion !== 'number' ||
    typeof manifest.projectId !== 'string' ||
    typeof manifest.source !== 'object' ||
    manifest.source === null ||
    typeof manifest.source.entries !== 'number' ||
    typeof manifest.source.bytes !== 'number' ||
    typeof manifest.source.sha256 !== 'string'
  ) {
    throw new Error(`Project archive "${storageId}" has a malformed ${MANIFEST_ENTRY}.`)
  }

  if (manifest.formatVersion > ARCHIVE_FORMAT_VERSION) {
    throw new Error(
      `Project archive "${storageId}" uses format version ${manifest.formatVersion}, but this ` +
        `provider understands at most version ${ARCHIVE_FORMAT_VERSION}. Upgrade @molecule/api-project-archive-object-storage.`,
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
 * Collects the `source/` members of a parsed artifact back into source files.
 *
 * The prefix is stripped FIRST and the resulting caller-facing path is then
 * re-validated with `assertSafeSourcePath` — validating the prefixed path would
 * be meaningless, since `source/` + `/etc/passwd` is neither absolute nor
 * traversing. Modes are masked, so setuid never survives a round trip.
 *
 * @param entries - The artifact's tar entries.
 * @param storageId - Storage id, for error messages.
 * @returns The source files, sorted by path.
 * @throws {Error} If a stripped path is unsafe, or two entries collide after
 *   normalisation (they would overwrite each other on restore).
 */
function collectSourceFiles(
  entries: readonly TarEntry[],
  storageId: string,
): NormalizedSourceFile[] {
  const files: NormalizedSourceFile[] = []
  const seen = new Map<string, string>()

  for (const entry of entries) {
    if (entry.type === 'directory') continue
    if (!entry.path.startsWith(SOURCE_PREFIX)) continue

    const path = entry.path.slice(SOURCE_PREFIX.length)
    try {
      assertSafeSourcePath(path)
    } catch (error) {
      throw new Error(
        `Project archive "${storageId}" contains an unsafe source path: ${messageOf(error)}`,
        { cause: error },
      )
    }

    const key = pathCollisionKey(path)
    const collision = seen.get(key)
    if (collision !== undefined) {
      throw new Error(
        `Project archive "${storageId}" contains colliding source paths "${collision}" and ` +
          `"${path}": they normalise to the same file and would overwrite each other on restore.`,
      )
    }
    seen.set(key, path)

    files.push({ path, content: entry.content, mode: normalizeMode(entry.mode) })
  }

  return sortByPath(files)
}

/**
 * Decompresses and parses an artifact under the configured size caps.
 *
 * @param artifact - The artifact bytes.
 * @param storageId - Storage id, for error messages.
 * @param maxArtifactBytes - Cap enforced BEFORE decompression.
 * @param maxUncompressedBytes - Cap enforced through the codec and re-checked
 *   on the inflated payload.
 * @returns The artifact's tar entries.
 * @throws {Error} If a cap is exceeded or the artifact is corrupt.
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

  return parseTar(inflated, limits)
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
 * The check that matters is `digestMatched`: the artifact is UNPACKED and the
 * source digest and byte total are recomputed from the downloaded entries and
 * compared with `manifest.source.sha256`/`bytes` (plus the dump's digest against
 * `manifest.database`). Without it the other flags only compare the artifact to
 * itself, and a packer that dropped or corrupted file contents passes them all.
 *
 * @param input - The bytes, the pre-upload digest, the expected entry count, and
 *   the size caps.
 * @returns The verification report.
 */
export function verifyArtifactBytes(input: ArtifactVerificationInput): ArchiveVerification {
  const {
    artifact,
    sha256,
    entries: expectedEntries,
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

    const files = collectSourceFiles(tarEntries, storageId)
    if (files.length !== manifest.source.entries || files.length !== expectedEntries) {
      verification.error =
        `Source entry count mismatch in "${storageId}": archived ${expectedEntries}, ` +
        `manifest declares ${manifest.source.entries}, artifact contains ${files.length}.`
      return verification
    }
    verification.entriesMatched = true

    const actualBytes = totalBytes(files)
    if (actualBytes !== manifest.source.bytes) {
      verification.error =
        `Source byte total mismatch in "${storageId}": manifest declares ` +
        `${manifest.source.bytes} bytes, the unpacked artifact holds ${actualBytes}. The ` +
        `artifact does not contain what it claims to.`
      return verification
    }

    const actualDigest = sourceDigest(files)
    if (actualDigest !== manifest.source.sha256) {
      verification.error =
        `Source digest mismatch in "${storageId}": manifest declares ` +
        `${manifest.source.sha256}, the unpacked artifact digests to ${actualDigest}. The ` +
        `artifact was re-packed or the packer corrupted it — its bytes are NOT the project.`
      return verification
    }

    const dump = tarEntries.find(
      (entry) => entry.type !== 'directory' && entry.path === DATABASE_ENTRY,
    )
    if (manifest.database) {
      if (!dump) {
        verification.error =
          `Project archive "${storageId}" declares a database dump in its manifest but ` +
          `contains no ${DATABASE_ENTRY} member.`
        return verification
      }
      const dumpDigest = sha256Hex(dump.content)
      if (
        dump.content.byteLength !== manifest.database.bytes ||
        dumpDigest !== manifest.database.sha256
      ) {
        verification.error =
          `Database dump mismatch in "${storageId}": manifest declares ` +
          `${manifest.database.bytes} bytes / ${manifest.database.sha256}, the artifact holds ` +
          `${dump.content.byteLength} bytes / ${dumpDigest}.`
        return verification
      }
    } else if (dump) {
      verification.error =
        `Project archive "${storageId}" contains a ${DATABASE_ENTRY} member its manifest does ` +
        `not describe.`
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
 * Creates an object-storage-backed project archive provider.
 *
 * @param config - Provider configuration.
 * @returns A `ProjectArchiveProvider` that persists artifacts through the
 *   configured (or bonded) uploads provider.
 */
export function createProjectArchiveProvider(
  config: ProjectArchiveObjectStorageConfig = {},
): ProjectArchiveProvider {
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
   * Validates the caller's file set and normalizes it into the digest's input
   * shape: modes resolved and masked, sorted by path.
   *
   * Every path is checked RAW — before the `source/` prefix is applied — because
   * the prefixed form of `/etc/passwd` (`source//etc/passwd`) is neither
   * absolute nor traversing and would sail through.
   *
   * @param input - The caller's archive input.
   * @returns The normalized, sorted source files.
   * @throws {Error} If the file set is empty (and `allowEmpty` is not set),
   *   smaller than `minEntries`, missing a `requiredPaths` entry, larger than
   *   `maxUncompressedBytes`, or contains an unsafe or colliding path.
   */
  const normalizeFiles = (input: ArchiveInput): NormalizedSourceFile[] => {
    const files = sortByPath(input.files)
    const minEntries = input.minEntries ?? (allowEmpty ? 0 : 1)

    if (!Number.isInteger(minEntries) || minEntries < 0) {
      throw new Error(
        `Refusing to archive project "${input.projectId}": minEntries must be a non-negative ` +
          `integer, received ${String(input.minEntries)}.`,
      )
    }
    if (minEntries === 0 && !allowEmpty) {
      throw new Error(
        `Refusing to archive project "${input.projectId}": minEntries: 0 asks for an archive of ` +
          `nothing, which requires createProjectArchiveProvider({ allowEmpty: true }).`,
      )
    }
    if (files.length === 0 && !allowEmpty) {
      throw new Error(
        `Refusing to archive project "${input.projectId}": the file set is EMPTY. An empty ` +
          `archive round-trips and verifies perfectly while proving nothing, so a workspace ` +
          `walk that silently returned [] would look like a good backup. Fix the walk, or ` +
          `configure the provider with allowEmpty: true if an empty project is expected.`,
      )
    }
    if (files.length < minEntries) {
      throw new Error(
        `Refusing to archive project "${input.projectId}": the file set holds ${files.length} ` +
          `file(s), fewer than the required minimum of ${minEntries}. A partial workspace walk ` +
          `is not an archive.`,
      )
    }

    const normalized: NormalizedSourceFile[] = []
    const seen = new Map<string, string>()
    for (const file of files) {
      try {
        assertSafeSourcePath(file.path)
      } catch (error) {
        throw new Error(
          `Refusing to archive project "${input.projectId}": unsafe source path — ${messageOf(error)}`,
          { cause: error },
        )
      }

      const key = pathCollisionKey(file.path)
      const collision = seen.get(key)
      if (collision !== undefined) {
        throw new Error(
          `Refusing to archive project "${input.projectId}": source paths "${collision}" and ` +
            `"${file.path}" collide — they normalise to the same file and one would overwrite ` +
            `the other on restore.`,
        )
      }
      seen.set(key, file.path)

      normalized.push({ path: file.path, content: file.content, mode: normalizeMode(file.mode) })
    }

    const present = new Set(normalized.map((file) => file.path))
    const missing = (input.requiredPaths ?? []).filter((path) => !present.has(path))
    if (missing.length > 0) {
      throw new Error(
        `Refusing to archive project "${input.projectId}": required path(s) missing from the ` +
          `file set: ${missing.join(', ')}. A source tree without them is not restorable.`,
      )
    }

    const sourceBytes = totalBytes(normalized)
    const dumpBytes = input.databaseDump ? input.databaseDump.byteLength : 0
    if (sourceBytes + dumpBytes > maxUncompressedBytes) {
      throw new Error(
        `Refusing to archive project "${input.projectId}": ${sourceBytes + dumpBytes} bytes of ` +
          `source and database dump exceed the maxUncompressedBytes cap of ` +
          `${maxUncompressedBytes} bytes. Filter the file set (node_modules, dist, .vite) or ` +
          `raise the cap.`,
      )
    }

    return normalized
  }

  return {
    /**
     * Packs, uploads, and then RE-READS and validates a project archive.
     *
     * The artifact is a gzipped POSIX ustar tarball containing `manifest.json`,
     * one `source/<path>` member per supplied file (mode preserved, masked to
     * `0o777`), and `database.dump` when a dump was supplied — extractable with
     * `tar -xzf`.
     *
     * The returned `storageId` is the id the uploads bond MINTED. It is never
     * derived from `projectId`, so every call produces a NEW artifact and can
     * never overwrite the previous one: keep the old id, and delete the old
     * artifact only AFTER this result comes back `verified: true`. PERSIST the
     * new id — `restore()`, `status()`, and `remove()` all need it, and there is
     * no lookup by project.
     *
     * Throws when the file set is empty (or violates `minEntries` /
     * `requiredPaths`), when a source path is unsafe or collides with another,
     * when a size cap is exceeded, or when the UPLOAD itself fails. Those are
     * never archives, so there is nothing for the caller to weigh. A
     * VERIFICATION failure is different: it is reported as `verified: false`
     * with `verification.error` populated, never as a throw, and the live
     * project is never touched — releasing it is the caller's job and only ever
     * valid when `verified === true`.
     *
     * @param input - The project id, source files, optional database dump, and
     *   the `minEntries`/`requiredPaths` guards.
     * @returns The archive result, including the minted storage id and the
     *   verification report.
     * @throws {Error} If the file set fails its guards, a source path is unsafe
     *   or duplicated, a size cap is exceeded, or the upload fails.
     */
    async archive(input: ArchiveInput): Promise<ArchiveResult> {
      const uploads = resolveUploads()
      const files = normalizeFiles(input)
      const databaseDump = input.databaseDump ?? null

      const manifest: ArchiveManifest = {
        formatVersion: ARCHIVE_FORMAT_VERSION,
        projectId: input.projectId,
        createdAt: new Date().toISOString(),
        source: {
          entries: files.length,
          bytes: totalBytes(files),
          sha256: sourceDigest(files),
          excluded: input.excluded ?? DEFAULT_ARCHIVE_EXCLUDES,
        },
      }
      if (input.appDir !== undefined) manifest.appDir = input.appDir
      if (input.metadata !== undefined) manifest.metadata = { ...input.metadata }
      if (databaseDump) {
        manifest.database = {
          bytes: databaseDump.byteLength,
          sha256: sha256Hex(databaseDump),
          format: input.databaseFormat ?? 'pg_custom',
        }
      }

      // Manifest first so a consumer can read it without streaming the whole artifact.
      const entries: TarEntry[] = [
        {
          path: MANIFEST_ENTRY,
          content: new Uint8Array(Buffer.from(JSON.stringify(manifest, null, 2), 'utf8')),
        },
      ]
      for (const file of files) {
        entries.push({
          path: `${SOURCE_PREFIX}${file.path}`,
          content: file.content,
          mode: file.mode,
        })
      }
      if (databaseDump) {
        entries.push({ path: DATABASE_ENTRY, content: databaseDump, mode: DATABASE_DUMP_MODE })
      }

      const artifact = gzipBytes(createTar(entries))
      if (artifact.byteLength > maxArtifactBytes) {
        throw new Error(
          `Refusing to upload the project archive for "${input.projectId}": the artifact is ` +
            `${artifact.byteLength} bytes, over the maxArtifactBytes cap of ${maxArtifactBytes} ` +
            `bytes.`,
        )
      }
      const artifactSha256 = sha256Hex(artifact)

      const storageId = await uploadArtifact(uploads, input.projectId, artifact)

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
              entries: files.length,
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

      return {
        projectId: input.projectId,
        storageId,
        manifest,
        bytes: artifact.byteLength,
        verified:
          verification.downloaded &&
          verification.checksumMatched &&
          verification.manifestParsed &&
          verification.entriesMatched &&
          verification.digestMatched,
        verification,
      }
    },

    /**
     * Downloads the archive at `input.storageId`, VALIDATES it against its own
     * manifest, and unpacks it back into source files plus the database dump.
     *
     * `storageId` is required — the id `archive()` minted and the caller
     * persisted. There is no key to derive. `input.projectId` is only the
     * destination label echoed onto the result; the artifact's own owner is
     * `manifest.projectId`, so restoring one project's archive into another is
     * an explicit, visible act rather than a silent one.
     *
     * Validation is not optional: the file count, the recomputed source digest,
     * the total source bytes, and (when the manifest declares one) the dump's
     * size and digest must all match the manifest, or this THROWS. A partial or
     * tampered artifact never yields half a project.
     *
     * @param input - The destination project id and the archive's storage id.
     * @returns The manifest, source files (relative paths preserved, modes
     *   masked to `0o777`), and the database dump, or `null` when the archive
     *   carried none.
     * @throws {Error} If `storageId` is missing, no archive exists there, the
     *   uploads provider cannot read, a size cap is exceeded, the artifact is
     *   corrupt, an entry path is unsafe, or the payload does not match the
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

      const entries = unpackArtifact(artifact, storageId, maxArtifactBytes, maxUncompressedBytes)
      const manifest = manifestFrom(entries, storageId)
      const files = collectSourceFiles(entries, storageId)

      if (files.length !== manifest.source.entries) {
        throw new Error(
          `Project archive "${storageId}" is incomplete: its manifest declares ` +
            `${manifest.source.entries} source file(s), the artifact holds ${files.length}. ` +
            `Refusing to restore half a project.`,
        )
      }

      const restoredBytes = totalBytes(files)
      if (restoredBytes !== manifest.source.bytes) {
        throw new Error(
          `Project archive "${storageId}" is truncated or tampered: its manifest declares ` +
            `${manifest.source.bytes} source byte(s), the artifact holds ${restoredBytes}.`,
        )
      }

      const restoredDigest = sourceDigest(files)
      if (restoredDigest !== manifest.source.sha256) {
        throw new Error(
          `Project archive "${storageId}" failed its source digest check: the manifest declares ` +
            `${manifest.source.sha256}, the unpacked files digest to ${restoredDigest}. The ` +
            `artifact was re-packed or corrupted — refusing to restore it.`,
        )
      }

      const dump = entries.find(
        (entry) => entry.type !== 'directory' && entry.path === DATABASE_ENTRY,
      )
      if (manifest.database) {
        if (!dump) {
          throw new Error(
            `Project archive "${storageId}" declares a database dump in its manifest but ` +
              `contains no ${DATABASE_ENTRY} member. Refusing to restore a project without its ` +
              `database.`,
          )
        }
        const dumpDigest = sha256Hex(dump.content)
        if (dump.content.byteLength !== manifest.database.bytes) {
          throw new Error(
            `Project archive "${storageId}" has a truncated database dump: the manifest declares ` +
              `${manifest.database.bytes} bytes, the artifact holds ${dump.content.byteLength}.`,
          )
        }
        if (dumpDigest !== manifest.database.sha256) {
          throw new Error(
            `Project archive "${storageId}" failed its database dump digest check: the manifest ` +
              `declares ${manifest.database.sha256}, the artifact holds ${dumpDigest}.`,
          )
        }
      } else if (dump) {
        throw new Error(
          `Project archive "${storageId}" contains a ${DATABASE_ENTRY} member its manifest does ` +
            `not describe. Refusing to restore an unaccounted-for database dump.`,
        )
      }

      return {
        projectId: input.projectId,
        manifest,
        files: files.map((file) => ({ path: file.path, content: file.content, mode: file.mode })),
        databaseDump: dump ? dump.content : null,
      }
    },

    /**
     * Reports on ONE archive artifact, addressed by the storage id `archive()`
     * minted. There is no lookup by project — a project can have any number of
     * artifacts, and only the caller knows which ids it kept.
     *
     * The reported `projectId` is read out of the stored manifest, so it names
     * the project the artifact actually belongs to.
     *
     * @param storageId - The artifact's storage id.
     * @returns The archive status, or `null` when nothing is stored there.
     * @throws {Error} If the uploads provider cannot read, a size cap is
     *   exceeded, or the stored artifact is corrupt (a corrupt archive is NOT
     *   reported as "absent").
     */
    async status(storageId: string): Promise<ArchiveStatus | null> {
      const uploads = resolveUploads()

      const artifact = await downloadArtifact(uploads, storageId, maxArtifactBytes)
      if (!artifact) return null

      const entries = unpackArtifact(artifact, storageId, maxArtifactBytes, maxUncompressedBytes)
      const manifest = manifestFrom(entries, storageId)

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
 * post-upload verification enabled, empty archives rejected, and the default
 * 512 MiB artifact / 2 GiB decompressed size caps.
 *
 * Use {@link createProjectArchiveProvider} instead when you need different caps,
 * `allowEmpty`, or an explicitly injected uploads provider.
 */
export const provider: ProjectArchiveProvider = createProjectArchiveProvider()
