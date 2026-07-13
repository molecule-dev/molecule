/**
 * Shared abort-signaling error for upload providers.
 *
 * @module
 */

import { t } from '@molecule/api-i18n'

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
