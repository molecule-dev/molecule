/**
 * Uploads core interface for molecule.dev.
 *
 * Defines the standard interface for upload providers.
 *
 * @remarks
 * - **Bond first.** `getProvider()` throws until `setProvider(...)` runs.
 * - **`upload()` is SYNCHRONOUS** and returns immediately — the bytes are stored only after
 *   `await file.uploadPromise`. A size-limit hit only calls `onError`; the bundled bonds keep
 *   writing the truncated stream unless you `abortUpload(file)` there.
 * - `getFile` is OPTIONAL on the interface — call it as `getFile?.(id)` and 404 on `null`.
 *
 * A weak upload integration leaks files or trusts the client. Enforce these in your
 * handler around {@link UploadProvider.upload} / {@link UploadProvider.getFile} /
 * `deleteFile`:
 *
 * - **Own every file.** Persist the returned {@link UploadedFile} id with the uploader's
 *   `user_id`, and on read/delete load the row and 404 if it isn't the caller's — an
 *   unscoped `getFile(id)` is an IDOR (anyone enumerates everyone's files).
 * - **Validate server-side; never trust the client's declared type/size.** Check
 *   {@link FileInfo} (mimeType, filename) AND enforce a max-byte cap while streaming, and
 *   reject disallowed types — a client can lie about `Content-Type`.
 * - **The max-size cap comes from the multipart parser's limits, not from this package.**
 *   `UploadHandler` takes a plain `NodeJS.ReadableStream` — the bundled bonds enforce a size
 *   cap ONLY by listening for the multipart parser's `'limit'` event on that stream (busboy's
 *   `fileSize` option triggers it) and reporting it to `onError` as `'Stream limit reached.'`.
 *   Configure the cap on your multipart parser (e.g. busboy's `limits.fileSize`) — a plain
 *   stream that never emits `'limit'` is NEVER size-limited by these bonds.
 * - **Private by default.** Do NOT put user uploads on a public, guessable path; serve them
 *   through an authenticated route (or a short-lived signed URL). Public buckets leak files.
 * - **Persist the id, never the provider URL.** Store `file.id` (or a serve URL you build from
 *   it, e.g. `/api/files/<id>`) — NEVER the raw `file.location`. A bucket URL 403s the moment
 *   storage is private (the default here), so a rendered `location` works only on the local
 *   filesystem bond and breaks on S3; and only the id lets a later route serve, delete, or
 *   REPLACE the object. Persisting `location` strands the file — uncleanable.
 * - **Free the blob on delete AND replace.** Deleting the owning row must also call
 *   `deleteFile(id)` — a row-only delete orphans the object in storage forever. On REPLACE (a
 *   new upload overwriting a stored id) `deleteFile` the OLD id too, or every change leaks the
 *   previous blob. Both are best-effort (log, don't fail the request) and run AFTER the row
 *   write so a storage hiccup never leaves a row pointing at a gone object.
 * - **Never build a storage key from the raw client filename** — sanitize/generate the key
 *   server-side (path traversal / overwrite).
 * - Stream to storage (the API takes a `NodeJS.ReadableStream`); never buffer a whole upload
 *   in memory.
 * - **Aborting an upload is neither a success nor a failure.** `abortUpload()` rejects the
 *   file's `uploadPromise` with {@link UploadAbortedError} — it never resolves `uploadPromise`
 *   and never invokes the `upload()` call's `onError` for the abort itself. This holds across
 *   every bundled provider, so swapping providers never changes what a consumer observes on
 *   abort. See {@link UploadAbortedError} for the full contract.
 *
 * @example
 * ```typescript
 * import busboy from 'busboy'
 * import express from 'express'
 *
 * import { logger } from '@molecule/api-logger'
 * import { getProvider, setProvider, UploadAbortedError } from '@molecule/api-uploads'
 * import { provider as filesystemUploads } from '@molecule/api-uploads-filesystem'
 *
 * // Startup (FILE_UPLOAD_PATH is read when the bond is imported; swap in -s3 for S3).
 * setProvider(filesystemUploads)
 *
 * const MAX_BYTES = 10 * 1024 * 1024
 * const ALLOWED_TYPES = new Set(['image/png', 'image/jpeg', 'application/pdf'])
 * // YOUR file rows keyed by file.id (use a DB table) — never persist file.location.
 * const fileRows = new Map<string, { userId: string; filename: string; mimetype: string }>()
 *
 * const router = express.Router() // mount AFTER your auth middleware sets res.locals.userId
 *
 * router.post('/files', (req, res) => {
 *   const userId = String(res.locals.userId)
 *   const parser = busboy({ headers: req.headers, limits: { files: 1, fileSize: MAX_BYTES } })
 *   parser.on('file', (fieldname, stream, info) => {
 *     if (!ALLOWED_TYPES.has(info.mimeType)) {
 *       stream.resume() // drain it, or the request hangs
 *       return void res.status(415).json({ error: 'Unsupported file type' })
 *     }
 *     const uploads = getProvider()
 *     // onError fires on busboy's fileSize limit — abort so the partial file is removed.
 *     const file = uploads.upload(fieldname, stream, info, () => void uploads.abortUpload(file))
 *     file.uploadPromise
 *       ?.then(() => {
 *         fileRows.set(file.id, { userId, filename: info.filename, mimetype: info.mimeType })
 *         res.status(201).json({ id: file.id })
 *       })
 *       .catch((error: unknown) => {
 *         logger.warn('Upload failed', { error, userId })
 *         const status = error instanceof UploadAbortedError ? 413 : 500 // aborted = too large
 *         res.status(status).json({ error: 'Upload failed' })
 *       })
 *   })
 *   req.pipe(parser)
 * })
 *
 * router.get('/files/:id', async (req, res) => {
 *   const row = fileRows.get(req.params.id)
 *   // Ownership check → 404 (not 403) for someone else's id: no IDOR, no enumeration.
 *   if (!row || row.userId !== String(res.locals.userId)) return void res.status(404).end()
 *   const stream = await getProvider().getFile?.(req.params.id)
 *   if (!stream) return void res.status(404).end()
 *   res.type(row.mimetype).set('X-Content-Type-Options', 'nosniff')
 *   stream.pipe(res)
 * })
 * ```
 *
 * @e2e
 * Integration checklist — drive the real UI (live preview, no mocks), adapt
 * each item to this app's actual screens/flows, and check every box off one
 * by one. A box you can't check is an integration bug to fix — not a skip:
 * - [ ] Uploading a valid file through the UI shows progress/confirmation and the
 *   file appears in the user's file list.
 * - [ ] The uploaded content is retrievable: opening/downloading it returns the
 *   same content (an uploaded image actually renders).
 * - [ ] A disallowed file type is rejected with a visible error and does NOT
 *   appear in the list.
 * - [ ] An over-the-cap file is rejected cleanly (visible error, no partial
 *   phantom entry).
 * - [ ] Ownership is enforced: a second signed-in user cannot retrieve the first
 *   user's file by its id/URL (404 — not the file).
 * - [ ] Deleting a file removes it from the list, and it stays gone (and
 *   unretrievable) after a full reload.
 *
 * @module
 */

export * from './browser-guard.js'
export * from './errors.js'
export * from './provider.js'
export * from './types.js'
