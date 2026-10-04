/**
 * Type definitions for the mirrored upload provider.
 *
 * @module
 */

import type { FileInfo, UploadedFile, UploadProvider } from '@molecule/api-uploads'

export type { FileInfo, UploadedFile, UploadProvider } from '@molecule/api-uploads'

/**
 * One upload provider that receives a copy of every file.
 */
export interface MirrorTarget {
  /**
   * Stable name of the target, recorded inside every mirror id. Must match
   * `[A-Za-z0-9_-]{1,32}` and be unique within the config. Renaming a target
   * orphans the copies already stored under the old name.
   */
  name: string

  /**
   * The upload provider that stores this copy.
   */
  provider: UploadProvider

  /**
   * Whether an upload fails when this target fails. A failed OPTIONAL target is
   * reported and its copy is left out of the id; the upload still succeeds.
   *
   * @default true
   */
  required?: boolean
}

/**
 * The operation a target failed during.
 */
export type MirrorOperation = 'upload' | 'get' | 'delete' | 'abort'

/**
 * A failure of one target, reported through `onTargetFailure`.
 */
export interface MirrorTargetFailure {
  /**
   * The target's name.
   */
  target: string

  /**
   * What the mirror was doing when the target failed.
   */
  operation: MirrorOperation

  /**
   * The thrown value or reported error. Never contains file contents.
   */
  error: unknown
}

/**
 * Configuration for `createProvider`.
 */
export interface MirrorUploadsConfig {
  /**
   * The providers every file is written to, in read-preference order. At least
   * one; names unique.
   */
  targets: MirrorTarget[]

  /**
   * Called for every target failure that does not fail the whole operation
   * (optional-target upload/delete failures, a read that fell through to the
   * next copy) and for every target failure that does. Must not throw.
   */
  onTargetFailure?: (event: MirrorTargetFailure) => void
}

/**
 * One stored copy of a mirrored file: which target holds it, under which id.
 */
export interface MirrorCopy {
  /**
   * The target's name.
   */
  target: string

  /**
   * The id that target's provider returned for its copy.
   */
  id: string
}

/**
 * A stored copy plus whether the target still has it.
 */
export interface MirrorCopyLocation extends MirrorCopy {
  /**
   * `true`/`false` from the target's `headFile`; `'unknown'` when the target has
   * no `headFile`, is no longer configured, or the lookup failed.
   */
  present: boolean | 'unknown'
}

/**
 * The optional metadata lookup some upload providers (e.g. `@molecule/api-uploads-s3`)
 * expose. Returns `null` when the object does not exist.
 */
export type HeadFileHandler = (id: string) => Promise<unknown>

/**
 * An `UploadProvider` that writes every file to several providers.
 */
export interface MirrorUploadProvider extends UploadProvider {
  /**
   * The configured targets, in read-preference order.
   */
  readonly targets: ReadonlyArray<Pick<MirrorTarget, 'name' | 'required'>>

  /**
   * Streams one file to every target at once (the source is read once).
   *
   * @param fieldname - The form field name.
   * @param stream - The file data.
   * @param info - Filename, encoding and MIME type.
   * @param onError - Called once if a required target fails.
   * @returns The file, whose `id` is a mirror id.
   */
  upload(
    fieldname: string,
    stream: NodeJS.ReadableStream,
    info: FileInfo,
    onError: (error: Error) => void,
  ): UploadedFile

  /**
   * Aborts an in-progress upload on every target.
   *
   * @param file - The file `upload()` returned.
   */
  abortUpload(file: UploadedFile): Promise<void>

  /**
   * Reads a file from the first target (in config order) that has it.
   *
   * A copy whose target is NOT in this mirror's config counts as an error for
   * that copy (not as missing): the read moves on to the next copy, and when
   * no copy served, the error is thrown rather than `null`.
   *
   * @param id - A mirror id, or a raw id stored before mirroring.
   * @returns A stream, or `null` when every target reported the file missing.
   */
  getFile(id: string): Promise<NodeJS.ReadableStream | null>

  /**
   * Deletes every copy of a file. THROWS when a REQUIRED target's delete fails
   * or when the id names a target that is not in this mirror's config; a
   * failed delete on an optional target is reported (`onTargetFailure` +
   * `trackBondFailure`) and the call still resolves — a caller that must
   * know a particular copy went deletes it through a mirror whose target is
   * marked required.
   *
   * @param id - A mirror id, or a raw id stored before mirroring.
   */
  deleteFile(id: string): Promise<void>

  /**
   * Decodes a mirror id into its copies.
   *
   * @param id - Any id.
   * @returns The copies in id order, or `null` when `id` is not a mirror id.
   */
  parseId(id: string): MirrorCopy[] | null

  /**
   * Whether `id` is a well-formed mirror id.
   *
   * @param id - Any id.
   * @returns `true` for a mirror id.
   */
  isMirrorId(id: string): boolean

  /**
   * Reports which targets still hold a copy, using each target's optional `headFile`.
   *
   * @param id - A mirror id, or a raw id (checked on every target).
   * @returns One entry per copy.
   */
  locate(id: string): Promise<MirrorCopyLocation[]>
}
