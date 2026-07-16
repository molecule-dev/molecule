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
 *
 * @module
 */

export * from './browser-guard.js'
export * from './provider.js'
export * from './secrets.js'
export * from './types.js'
