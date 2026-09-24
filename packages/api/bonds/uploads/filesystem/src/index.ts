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
 * - **`FILE_UPLOAD_PATH` is RELATIVE to `process.cwd()`** (it is `path.join`ed onto it — an
 *   absolute path is NOT honored as absolute). Files are stored under a bare uuid (the
 *   returned `file.id`) with NO extension and NO metadata — persist `filename`/`mimetype`
 *   yourself if you need them to serve the file back.
 * - **There is no `bond('uploads-filesystem', ...)`** — wire it with the core's
 *   `setProvider(provider)` from `@molecule/api-uploads`. It exports no `createProvider()`:
 *   the only configuration is the env var.
 * - `upload()` returns synchronously — the bytes are on disk only after `await
 *   file.uploadPromise`. `getFile(id)` resolves `null` for an unknown id (never an erroring
 *   stream); an id that escapes the upload directory throws `Invalid file ID`.
 *
 * @example
 * ```typescript
 * import { Readable } from 'node:stream'
 *
 * import { getProvider, setProvider } from '@molecule/api-uploads'
 * import { provider as filesystemUploads } from '@molecule/api-uploads-filesystem'
 *
 * // Startup. Env: FILE_UPLOAD_PATH (relative to process.cwd(), default 'uploads') — read at import.
 * setProvider(filesystemUploads)
 *
 * const uploads = getProvider()
 * const source = Readable.from([Buffer.from('Hello, uploads!')]) // e.g. busboy's file stream
 * const file = uploads.upload(
 *   'document',
 *   source,
 *   { filename: 'hello.txt', encoding: '7bit', mimeType: 'text/plain' },
 *   (error) => console.error('Upload failed', error),
 * )
 * await file.uploadPromise // file.uploaded === true, file.size === 15
 *
 * // Persist file.id (NOT a path). Later, stream it back or delete it:
 * const stored = await uploads.getFile?.(file.id) // ReadStream, or null if missing
 * let text = ''
 * for await (const chunk of stored ?? []) text += String(chunk) // 'Hello, uploads!'
 * await uploads.deleteFile(file.id)
 * ```
 *
 * @module
 */

export * from './browser-guard.js'
export * from './provider.js'
export * from './types.js'
