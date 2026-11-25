/**
 * The errors upload providers report: an aborted upload, and a file refused for its type.
 *
 * @module
 */

import { t } from '@molecule/api-i18n'

import type { FileInfo } from './types.js'

/**
 * Thrown by conforming upload providers to reject a file's `uploadPromise` when
 * `abortUpload()` is called on it — signals a deliberate cancellation, distinguishable
 * from both a successful upload and a real transport/storage failure.
 *
 * @remarks
 * An abort is neither a success nor a failure. Every bundled provider (filesystem,
 * S3) guarantees, for a file whose `uploadPromise` is still pending when
 * `abortUpload()` is called:
 *
 * - `uploadPromise` REJECTS with `UploadAbortedError` — it never resolves (a
 *   resolved `uploadPromise` after an abort would tell the caller the file exists
 *   in storage when it does not, which can leave a DB row pointing at a deleted
 *   file).
 * - The `upload()` call's `onError` callback is NEVER invoked for the abort itself
 *   — an intentional cancel is not a transport/storage failure and must not be
 *   reported as one.
 *
 * This holds regardless of which provider is bonded — swapping providers must not
 * change what a consumer observes on abort. Consumers awaiting a file's
 * `uploadPromise` should check `error instanceof UploadAbortedError` (or
 * `error.name === 'UploadAbortedError'` once an error has crossed a serialization
 * boundary, e.g. an HTTP response) and treat it as an expected cancellation, not a
 * failure to surface to the end user.
 *
 * @example
 * ```ts
 * const file = provider.upload(fieldname, stream, info, onError)
 * // ...later, e.g. the client disconnects...
 * provider.abortUpload(file)
 * try {
 *   await file.uploadPromise
 * } catch (error) {
 *   if (error instanceof UploadAbortedError) {
 *     return // expected — don't alert, don't persist a DB row for this file
 *   }
 *   throw error // a real failure
 * }
 * ```
 */
export class UploadAbortedError extends Error {
  constructor() {
    super(
      t('uploads.error.aborted', undefined, {
        defaultValue: 'Upload was aborted.',
      }),
    )
    this.name = 'UploadAbortedError'
  }
}

/**
 * The declared types a browser runs when it opens the file (HTML, SVG, JavaScript, XML), named
 * outright. Every provider refuses to store them unless the route was created with
 * `receiveUploads({ allowActiveTypes: true })`. The declared type is the client's claim, so this is
 * the second layer: the first is serving every file with {@link sendUpload}.
 *
 * This is not the whole rule: a browser also runs every other `+xml` type (`application/atom+xml`)
 * and every script type (`text/jscript`). To ask whether a type is one a browser runs, call
 * {@link isBlockedUploadType}; never test membership here.
 */
export const BLOCKED_UPLOAD_TYPES: ReadonlySet<string> = new Set([
  'text/html',
  'application/xhtml+xml',
  'application/javascript',
  'text/javascript',
  'application/x-javascript',
  'image/svg+xml',
  'text/xml',
  'application/xml',
])

/** What the subtype of every further script type holds, whatever its main type (`text/jscript`). */
const SCRIPT_SUBTYPE = /javascript|ecmascript|jscript|livescript/

/**
 * What a provider passes to `upload()`'s `onError` to refuse a file, rather than to report that
 * storing it failed. `receiveUploads()` answers it as the client's error, with `status` and
 * `{ error, errorKey }` as JSON, the way it answers a file that is too large; any other error is
 * the server's, a 500.
 */
export class UploadRefusedError extends Error {
  /** The HTTP status the refusal is answered with (4xx). */
  readonly status: number
  /** The translation key of the message. */
  readonly errorKey: string
  /** The values the message interpolates. */
  readonly values?: Record<string, string | number>

  /**
   * A refusal, its message translated now.
   *
   * @param errorKey - The translation key of the message.
   * @param values - The values it interpolates.
   * @param defaultValue - The English message, `{{name}}` for each value.
   * @param status - The HTTP status (default 415, a type the server will not store).
   */
  constructor(
    errorKey: string,
    values: Record<string, string | number> | undefined,
    defaultValue: string,
    status = 415,
  ) {
    super(t(errorKey, values, { defaultValue }))
    this.name = 'UploadRefusedError'
    this.status = status
    this.errorKey = errorKey
    this.values = values
  }
}

/**
 * A declared type as {@link BLOCKED_UPLOAD_TYPES} lists it: without parameters, in lower case.
 *
 * @param mimeType - The type as declared (`Text/HTML; charset=utf-8`).
 * @returns The bare type (`text/html`).
 */
export const baseUploadType = (mimeType: string): string =>
  mimeType.split(';')[0].trim().toLowerCase()

/**
 * Whether a declared type is one a browser runs when it opens the file, by rule rather than by name:
 * a type in {@link BLOCKED_UPLOAD_TYPES}, any `+xml` type, or any type whose subtype names a script
 * (`text/jscript`, `application/ecmascript`). Browsers decide by these rules, so a list of names
 * always lagged behind. Parameters and case do not matter.
 *
 * @param mimeType - The type as declared (`Application/Atom+XML; charset=utf-8`).
 * @returns True when no provider stores the type unless the route allows it.
 */
export const isBlockedUploadType = (mimeType: string): boolean => {
  const base = baseUploadType(mimeType)
  if (BLOCKED_UPLOAD_TYPES.has(base)) return true
  const subtype = base.slice(base.indexOf('/') + 1)
  return subtype.endsWith('+xml') || SCRIPT_SUBTYPE.test(subtype)
}

/**
 * What a provider's `upload()` calls before it stores a file: the refusal for a type a browser runs
 * ({@link isBlockedUploadType}, also when declared with a charset or in capitals), or null when the
 * type may be stored or the route allows it (`info.allowActiveTypes`).
 *
 * @param info - The file's info, as `upload()` received it.
 * @returns The error to pass to `onError`, or null when the file may be stored.
 */
export function blockedTypeRefusal(
  info: Pick<FileInfo, 'mimeType' | 'allowActiveTypes'>,
): UploadRefusedError | null {
  if (info.allowActiveTypes === true) return null
  const type = baseUploadType(info.mimeType)
  if (!isBlockedUploadType(type)) return null
  return new UploadRefusedError(
    'uploads.error.fileTypeBlocked',
    { type },
    `Files of type ${type} cannot be uploaded.`,
  )
}
