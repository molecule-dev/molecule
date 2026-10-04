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
 * - **The exported `provider` is the default, env-configured store, and stays that way.**
 *   Existing apps need no change. To run MORE stores in the same app (user uploads on one,
 *   backups on another with its own endpoint, credentials, bucket and storage class), call
 *   `createProvider({ bucket, endpoint?, region?, forcePathStyle?, credentials?, storageClass?,
 *   keyPrefix?, connectionTimeoutMs?, socketTimeoutMs?, maxAttempts? })` once per extra store.
 *   Each instance has its own lazily-created client and reads NOTHING from the environment
 *   (except that, with no `credentials`, the AWS SDK falls back to its default chain — pass
 *   `credentials` for a second account). `configFromEnv()` returns the config the default
 *   uses, if you want to derive one from it.
 * - **`keyPrefix` is part of the id.** An instance with `keyPrefix: 'backups/'` returns ids like
 *   `backups/<uuid>`; pass them back to `getFile`/`deleteFile`/`headFile` unchanged — never
 *   strip or re-add the prefix yourself.
 * - **`headFile(id)`** (on `createProvider` instances and the default `provider`) returns
 *   `{ bytes, etag?, lastModified? }` without downloading, `null` when the object does not
 *   exist, and throws on any other failure (bad credentials, missing bucket, network).
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
 *
 * @example
 * ```typescript
 * import { setProvider } from '@molecule/api-uploads'
 * import { provider } from '@molecule/api-uploads-s3'
 *
 * // Default store: config is env-only, server-side — see the first remark for the full list.
 * setProvider(provider)
 * ```
 *
 * @example
 * ```typescript
 * import { createProvider } from '@molecule/api-uploads-s3'
 *
 * // A second, independent store (e.g. backups on Backblaze B2), alongside the default provider.
 * export const backups = createProvider({
 *   bucket: process.env.BACKUP_S3_BUCKET!,
 *   endpoint: process.env.BACKUP_S3_ENDPOINT,
 *   region: process.env.BACKUP_S3_REGION,
 *   credentials: {
 *     accessKeyId: process.env.BACKUP_S3_ACCESS_KEY_ID!,
 *     secretAccessKey: process.env.BACKUP_S3_SECRET_ACCESS_KEY!,
 *   },
 *   storageClass: 'STANDARD_IA',
 *   keyPrefix: 'nightly/',
 * })
 *
 * const file = backups.upload('dump', dumpStream, info, onError) // file.id === 'nightly/<uuid>'
 * await file.uploadPromise
 * const head = await backups.headFile(file.id) // { bytes, etag, lastModified } | null
 * ```
 *
 * @module
 */

export * from './browser-guard.js'
export * from './provider.js'
export * from './secrets.js'
export * from './types.js'
