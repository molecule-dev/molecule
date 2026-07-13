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
 * @module
 */

export * from './provider.js'
export * from './types.js'
