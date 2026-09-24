/**
 * AWS S3 upload provider for molecule.dev.
 *
 * Handles file uploads to AWS S3.
 *
 * @remarks
 * Bond this as the uploads provider (see `@molecule/api-uploads` for the handler pattern and
 * the own-every-file / validate rules). Config is all ENV, server-side: `AWS_ACCESS_KEY_ID`,
 * `AWS_SECRET_ACCESS_KEY`, `AWS_S3_BUCKET`, `AWS_S3_REGION`. For an S3-COMPATIBLE store
 * (Cloudflare R2, MinIO, DigitalOcean Spaces) set `AWS_S3_ENDPOINT` (plus
 * `AWS_S3_FORCE_PATH_STYLE=true` for MinIO) — no code change.
 *
 * - **Keep the bucket PRIVATE — block all public access.** A public-read bucket/object leaks
 *   every user's files to anyone with the URL. Serve private files THROUGH your API (stream via
 *   `getFile`, scoped to the owner) or hand out a short-lived presigned URL; never make an
 *   object public just to "make it load".
 * - The AWS credentials are server-only (never in the browser) — the browser uploads to YOUR
 *   API, which streams to S3.
 * - **Blocked MIME types:** `text/html`, `application/xhtml+xml`, JavaScript
 *   types, `image/svg+xml`, and XML are REJECTED at `upload()` (reported via
 *   `onError`; same list as the filesystem bond) — SVG uploads must be
 *   rasterized/re-typed client-side. `Content-Disposition: attachment`
 *   (next bullet) is the second layer for everything that IS accepted.
 * - **Every object is uploaded with `Content-Disposition: attachment`** — a deliberate
 *   stored-XSS safety default (S3 has no server-side rendering, so this stops a browser from
 *   ever executing an uploaded HTML/SVG file inline). This means a browser hitting the object
 *   directly (a raw S3 URL, or an `<img src>`/`<iframe>` pointing at a presigned URL) always
 *   DOWNLOADS it instead of rendering it inline — including otherwise-safe images. If you need
 *   inline rendering, serve the file THROUGH your API's `getFile` route, which lets you set
 *   your own `Content-Disposition`/`Content-Type` after your own validation — do not rely on
 *   this bond's default for that. There is no override for this default in the current
 *   revision.
 * - **Aborting an upload rejects `uploadPromise` with `UploadAbortedError`** (from
 *   `@molecule/api-uploads`) — it never resolves as success and never calls the `upload()`
 *   call's `onError`. Identical behavior to the `@molecule/api-uploads-filesystem` bond; see
 *   that core package's `AbortHandler` remarks for the full cross-provider contract.
 * - **Runs behind an outbound proxy when `HTTPS_PROXY` is set.** The AWS SDK v3
 *   builds its own agent and reads no proxy variable, so on a host whose only
 *   egress path is a proxy every upload used to fail with a bare connection
 *   error. The client now gets a CONNECT-capable agent through its own
 *   `requestHandler` hook (`@molecule/api-proxy-agent`, resolved against
 *   `AWS_S3_ENDPOINT`/`AWS_ENDPOINT_URL_S3` when set and the regional endpoint
 *   otherwise). An internal S3-compatible endpoint listed in `NO_PROXY` keeps
 *   connecting directly, and with no proxy configured nothing is passed at all.
 *   Allowlist `*.amazonaws.com` (or your store's host) on the proxy.
 * - **There is no `createProvider()` and no `bond('uploads-s3', ...)`** — wire the exported
 *   `provider` with the core's `setProvider()` from `@molecule/api-uploads`. Env is read
 *   lazily (on the first S3 call), so secrets resolved after import are honored.
 * - **A missing `AWS_S3_BUCKET` does NOT throw from `upload()`** — it is reported through
 *   `onError` and the returned file has `uploaded: false` and no `uploadPromise`. Always pass
 *   a real `onError`.
 * - The object key is a bare uuid (`file.id`); `file.location` is the raw bucket URL — persist
 *   `file.id`, never `location` (it 403s on a private bucket). `getFile(id)` resolves `null`
 *   only for `NoSuchKey`; a wrong bucket or bad credentials still throw.
 *
 * @example
 * ```typescript
 * import { Readable } from 'node:stream'
 *
 * import { getProvider, setProvider } from '@molecule/api-uploads'
 * import { provider as s3Uploads } from '@molecule/api-uploads-s3'
 *
 * // Startup. Env: AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY, AWS_S3_BUCKET, AWS_S3_REGION
 * // (+ AWS_S3_ENDPOINT for R2/MinIO/Spaces). Keep the bucket PRIVATE.
 * setProvider(s3Uploads)
 *
 * const uploads = getProvider()
 * const source = Readable.from([Buffer.from('Hello, uploads!')]) // e.g. busboy's file stream
 * const file = uploads.upload(
 *   'document',
 *   source,
 *   { filename: 'hello.txt', encoding: '7bit', mimeType: 'text/plain' },
 *   (error) => console.error('Upload failed', error),
 * )
 * await file.uploadPromise // file.uploaded === true; the S3 object key is file.id
 *
 * // Persist file.id (NOT file.location). Later, stream it back through your API or delete it:
 * const stored = await uploads.getFile?.(file.id) // readable stream, or null if the key is gone
 * let text = ''
 * for await (const chunk of stored ?? []) text += String(chunk) // 'Hello, uploads!'
 * await uploads.deleteFile(file.id)
 * ```
 *
 * @module
 */

export * from './browser-guard.js'
export * from './provider.js'
export * from './secrets.js'
export * from './types.js'
