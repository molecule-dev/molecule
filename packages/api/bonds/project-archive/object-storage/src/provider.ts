/**
 * Object-storage implementation of `ProjectArchiveProvider`.
 *
 * Packs a project's {@link ArchivePart}s into a standard gzipped POSIX ustar
 * artifact and persists it through the bonded `@molecule/api-uploads` provider —
 * S3, R2, B2, MinIO, or the filesystem bond, whichever the app wired. No storage
 * SDK is imported here, and the package has zero external runtime dependencies.
 *
 * This module owns the storage side and the archive() guards; the artifact
 * layout, manifest and verification live in `./artifact.js`, and the path model
 * and codec in `./tar.js`. The package's behaviour is documented on the barrel
 * (`./index.js`) and the contract on `@molecule/api-project-archive`.
 *
 * Everything here obeys one governing rule, because this package runs
 * immediately before a caller DELETES a user's only copy: **never silently
 * return less than you were given.** In particular it does NOT decide which
 * files to archive — EVERY part it is handed is archived, with no exceptions
 * and no exclude list. Selection is the caller's job and belongs to git:
 * `.gitignore` already declares what is disposable, so a `.env` is simply never
 * handed over. This package briefly refused dotenv paths itself; that was
 * removed because it is exactly the kind of surprising, unwritten rule a user
 * would have to learn — git does not refuse to commit a `.env`, and a user who
 * force-adds one has already published it to their own remote. Predictable
 * beats clever.
 *
 * @module
 */

import { Readable } from 'node:stream'

import { logger } from '@molecule/api-logger'
import {
  ARCHIVE_FORMAT_VERSION,
  type ArchiveInput,
  type ArchiveManifest,
  type ArchivePart,
  type ArchiveResult,
  type ArchiveStatus,
  type ArchiveVerification,
  type ProjectArchiveProvider,
  type RestoreInput,
  type RestoreResult,
} from '@molecule/api-project-archive'
import { getProvider as getUploadsProvider, type UploadProvider } from '@molecule/api-uploads'

import {
  DEFAULT_MAX_ARTIFACT_BYTES,
  DEFAULT_MAX_UNCOMPRESSED_BYTES,
  type DigestedManifestHeader,
  entriesIndexOf,
  MANIFEST_ENTRY,
  messageOf,
  type NormalizedPart,
  normalizeMode,
  PART_PREFIX,
  partsDigest,
  sha256Hex,
  sortByPath,
  totalBytes,
  unverified,
  validateArtifact,
  verifyArtifactBytes,
} from './artifact.js'
import { assertSafePartPath, createTar, gzipBytes, pathCollisionKey, type TarEntry } from './tar.js'

/** Form fieldname reported to the uploads provider. */
const UPLOAD_FIELDNAME = 'archive'

/** MIME type reported to the uploads provider. */
const ARTIFACT_MIME_TYPE = 'application/gzip'

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
   * Validates the caller's part set and normalizes it into the digest's input
   * shape: modes resolved and masked, sorted by path.
   *
   * Every path is checked RAW — before the `parts/` prefix is applied — because
   * the prefixed form of `/etc/passwd` (`parts//etc/passwd`) is neither absolute
   * nor traversing and would sail through. Nothing here decides WHICH parts to
   * archive: every part handed over is archived, except a dotenv one, which is
   * refused outright.
   *
   * @param input - The caller's archive input.
   * @returns The normalized, sorted parts.
   * @throws {Error} If the part set is empty (and `allowEmpty` is not set),
   *   smaller than `minParts`, missing a `requiredPaths` entry, larger than
   *   `maxUncompressedBytes`, a dotenv file, or contains an unsafe or colliding
   *   path.
   */
  const normalizeParts = (input: ArchiveInput): NormalizedPart[] => {
    const parts = sortByPath(input.parts)
    const minParts = input.minParts ?? (allowEmpty ? 0 : 1)

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
        // nearly reached storage that is not encrypted at rest. Run the dotenv
        // refusal on it first so the error names the credential; the path is
        // refused either way, and nothing is uploaded either way.
        throw new Error(
          `Refusing to archive project "${input.projectId}": unsafe part path — ${messageOf(error)}`,
          { cause: error },
        )
      }

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
          `the maxUncompressedBytes cap of ${maxUncompressedBytes} bytes. Archive fewer parts ` +
          `(git already knows which files are disposable) or raise the cap.`,
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
     * `kind` and `meta` the CALLER chose, recorded verbatim and never
     * interpreted here. The returned `storageId` is the id the uploads bond
     * MINTED and the caller must PERSIST; it is never derived from `projectId`,
     * so every call produces a NEW artifact and can never overwrite the previous
     * one.
     *
     * Guard failures THROW — those are never archives, so there is nothing for
     * the caller to weigh. A VERIFICATION failure is different: it comes back as
     * `verified: false` with `verification.error` populated, and the
     * just-uploaded object is deleted best-effort with `orphanCleanup` reporting
     * what happened. An archive left unverified by CONFIGURATION
     * (`verifyOnArchive: false`, or an uploads bond with no `getFile()`) is
     * never deleted: it is the only copy the caller asked for.
     *
     * @param input - The project id, the parts, and the
     *   `minParts`/`requiredPaths` guards.
     * @returns The archive result, including the minted storage id, the
     *   verification report, and what became of the object when verification
     *   failed.
     * @throws {Error} If the part set fails its guards, a part path is unsafe or
     *   duplicated, a part is a dotenv file, a size cap is exceeded, or the
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
     * Validation is not optional (`validateArtifact`): count, byte total,
     * per-part index and the recomputed digest must all match the payload, or
     * this THROWS — a partial or tampered artifact never yields half a project.
     * Nothing is re-provisioned; the returned parts carry the `kind`/`meta` the
     * caller recorded, which is how a restore routes them.
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
     * VALIDATED first, by the same `validateArtifact` pass `restore()` runs.
     * Reporting a manifest it never authenticated made this method a channel for
     * exactly the forgery its promise claims to resolve: a rewritten `projectId`
     * or `createdAt` sailed through here while `restore()` refused the same
     * bytes. Both THROW now.
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
 * post-upload verification enabled, empty archives rejected, and the default
 * 512 MiB artifact / 2 GiB decompressed size caps.
 *
 * Use {@link createProjectArchiveProvider} instead when you need different caps,
 * `allowEmpty`, or an explicitly injected uploads provider. There is nothing to
 * configure about WHICH files are archived — that is the caller's decision, made
 * before the parts are handed over.
 *
 * Typed as {@link ObjectStorageProjectArchiveProvider} — the
 * `ProjectArchiveProvider` contract with `archive()` narrowed to the result that
 * also reports {@link ArchiveOrphanCleanup} — so it stays assignable wherever
 * the contract is expected (`setProvider(provider)`,
 * `bond('project-archive', provider)`) while a caller holding this bond directly
 * can still read what became of an artifact that failed verification.
 */
export const provider: ObjectStorageProjectArchiveProvider = createProjectArchiveProvider()
