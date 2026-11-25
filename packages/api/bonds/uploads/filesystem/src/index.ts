/**
 * File system upload provider for molecule.dev.
 *
 * Handles file uploads to the local file system.
 *
 * A file's id is a UUID it assigns at upload, the file's name in `FILE_UPLOAD_PATH`, and only such
 * an id names an upload. `getFile(id)` answers `null` for any other id a client sends (a path
 * into or out of the folder such as `exports/report.txt` or `../x`, a NUL, an over-long string, a
 * missing file, a symlink or a directory), so a route's `if (!stream) 404` covers every id; it
 * rejects only when the disk lookup fails. The older `getFileStream(id)` throws for those instead.
 * `deleteFile(id)` does nothing for an id that is not well-formed, or names a symlink or a
 * directory; it rejects only when no file has a well-formed id (`ENOENT`) or the disk fails.
 *
 * A folder it creates holds a `.gitignore` of `*`, so git never tracks what users upload (add
 * nothing to the project's own `.gitignore`). A folder that already existed is left as it is.
 *
 * Note: For your files to remain on disk indefinitely, your server needs a permanent file system.
 * Many "serverless" deployments have transient file systems, meaning that files written to them will not remain.
 *
 * @remarks
 * `abortUpload()` rejects the file's `uploadPromise` with `UploadAbortedError` (from
 * `@molecule/api-uploads`) — it never resolves as success and never calls the
 * `upload()` call's `onError`. This is identical to the `@molecule/api-uploads-s3`
 * bond's abort behavior; see that core package's `AbortHandler` remarks for the
 * full cross-provider contract.
 *
 * - **Blocked MIME types:** uploads declaring `text/html`,
 *   `application/xhtml+xml`, JavaScript types, `image/svg+xml`, or XML (with
 *   any charset) are refused at `upload()` as a stored-XSS defense (the core's
 *   `BLOCKED_UPLOAD_TYPES`, the same for every provider). `receiveUploads()`
 *   answers the client 415 with `errorKey: 'uploads.error.fileTypeBlocked'`:
 *   no route code is needed. A route that stores any file and serves it back
 *   only through `sendUpload()` passes `receiveUploads({ allowActiveTypes: true })`;
 *   never rewrite the declared type in the bond. Called directly, `upload()`
 *   passes `onError` an `UploadRefusedError` and returns a file with
 *   `uploaded: false` and NO `uploadPromise`.
 * - **Import-time setup:** `FILE_UPLOAD_PATH` is read ONCE at module import
 *   and the directory is created immediately — importing this package throws
 *   an actionable error if the path is not writable, and changing the env
 *   var later in the same process has no effect (restart required).
 *
 * @example
 * ```typescript
 * import { setProvider } from '@molecule/api-uploads'
 * import { provider } from '@molecule/api-uploads-filesystem'
 *
 * // Files land in FILE_UPLOAD_PATH: an absolute path as given, a relative one under the working
 * // directory (default ./uploads). A folder it creates ignores itself in git (its own .gitignore).
 * setProvider(provider)
 * ```
 *
 * @module
 */

export * from './browser-guard.js'
export * from './lifecycle.js'
export * from './provider.js'
export * from './types.js'
