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
 * router.post('/files', async (req, res) => {
 *   const userId = getUserId(res)
 *   if (!userId) return res.status(401).json({ error: 'Authentication required.' })
 *   // busboy/multer yields (fieldname, stream, info) — validate BEFORE trusting it.
 *   if (!ALLOWED_TYPES.has(info.mimeType)) return res.status(415).json({ error: 'Unsupported type.' })
 *   const file = provider.upload(fieldname, stream, info, (e) => res.status(500).json({ error: e.message }))
 *   await saveFileRow({ id: file.id, userId, name: info.filename }) // own it
 *   res.json({ id: file.id })
 * })
 *
 * router.get('/files/:id', async (req, res) => {
 *   const row = await getFileRow(req.params.id)
 *   if (!row || row.userId !== getUserId(res)) return res.status(404).end() // ownership → no IDOR
 *   const stream = await provider.getFile?.(row.id)
 *   if (!stream) return res.status(404).end()
 *   stream.pipe(res)
 * })
 * ```
 *
 * @module
 */

export * from './errors.js'
export * from './provider.js'
export * from './types.js'
