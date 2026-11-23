/**
 * Uploads core interface for molecule.dev.
 *
 * Defines the standard interface for upload providers.
 *
 * @remarks
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
 * ```ts
 * import busboy from 'busboy' // the multipart parser: npm install busboy @types/busboy
 * import { getProvider, type UploadedFile } from '@molecule/api-uploads'
 * // a bond (e.g. `@molecule/api-uploads-filesystem`) called setProvider() at startup
 *
 * const ALLOWED_TYPES = new Set(['image/png', 'image/jpeg', 'application/pdf', 'text/plain'])
 *
 * router.post('/files', (req, res) => {
 *   const userId = getUserId(res)
 *   if (!userId) return res.status(401).json({ error: 'Authentication required.' })
 *   // The size cap is the multipart parser's: the bonds report busboy's `limit` to onError.
 *   const parser = busboy({ headers: req.headers, limits: { files: 1, fileSize: 10 * 1024 * 1024 } })
 *   let file: UploadedFile | undefined
 *   let failure: Error | undefined
 *   parser.on('file', (fieldname, stream, info) => {
 *     // The client declares the type: check it before anything is stored.
 *     if (fieldname !== 'file' || !ALLOWED_TYPES.has(info.mimeType)) return stream.resume()
 *     file = getProvider().upload(fieldname, stream, info, (error) => (failure ??= error))
 *   })
 *   parser.on('close', async () => {
 *     // Wait for the write: answering earlier reports a file that may still fail.
 *     await file?.uploadPromise?.catch((error: Error) => (failure ??= error))
 *     if (!file || failure) {
 *       // An over-cap file reaches onError but is still written (truncated): delete it.
 *       if (file?.uploaded) await getProvider().deleteFile(file.id)
 *       return res.status(400).json({ error: failure?.message ?? 'Send one allowed file as "file".' })
 *     }
 *     await saveFileRow({ id: file.id, userId, name: file.filename }) // own it
 *     res.status(201).json({ id: file.id })
 *   })
 *   req.pipe(parser)
 * })
 *
 * router.get('/files/:id', async (req, res) => {
 *   const row = await getFileRow(req.params.id)
 *   if (!row || row.userId !== getUserId(res)) return res.status(404).end() // ownership → no IDOR
 *   const stream = await getProvider().getFile?.(row.id)
 *   if (!stream) return res.status(404).end()
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
