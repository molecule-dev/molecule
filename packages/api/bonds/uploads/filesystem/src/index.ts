/**
 * File system upload provider for molecule.dev.
 *
 * Handles file uploads to the local file system.
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
 *   `application/xhtml+xml`, JavaScript types, `image/svg+xml`, or XML are
 *   REJECTED at `upload()` as a stored-XSS defense (same list as the S3
 *   bond). The rejection is reported through the `onError` callback and the
 *   returned file has `uploaded: false` and NO `uploadPromise` — handle
 *   `onError`; don't await `uploadPromise` alone. Rasterize SVGs client-side
 *   if the app needs vector-source uploads.
 * - **Import-time setup:** `FILE_UPLOAD_PATH` is read ONCE at module import
 *   and the directory is created immediately — importing this package throws
 *   an actionable error if the path is not writable, and changing the env
 *   var later in the same process has no effect (restart required).
 *
 * @module
 */

export * from './browser-guard.js'
export * from './provider.js'
export * from './types.js'
