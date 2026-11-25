/**
 * Uploads core interface for molecule.dev.
 *
 * Defines the standard interface for upload providers, {@link receiveUploads}: the route
 * middleware that receives a request's files into the bonded provider, and {@link sendUpload}, which
 * serves a stored file back as a download the browser does not open (never `stream.pipe(res)`).
 *
 * @remarks
 * A weak upload integration leaks files or trusts the client. {@link receiveUploads} does the
 * request side: it refuses wrong types, oversized files, extra files and non-multipart bodies
 * before the handler runs, removes partial files when a request fails or the client disconnects,
 * and removes the stored files when the route then fails. The handler still owns the rest:
 *
 * - **Own every file.** Persist the returned {@link UploadedFile} id with the uploader's
 *   `user_id`, and on read/delete load the row and 404 if it isn't the caller's — an
 *   unscoped `getFile(id)` is an IDOR (anyone enumerates everyone's files).
 * - **Put the auth check before `receiveUploads`**, so an anonymous request is refused before
 *   anything is stored.
 * - **Serve a stored file with {@link sendUpload}**, not `stream.pipe(res)`, which sends no type
 *   and lets the browser guess one: a file whose declared type lied would run on the app's
 *   origin. `sendUpload` sends `application/octet-stream` as an attachment with `nosniff`;
 *   `{ inline: true, type: file.mimetype }` shows an image, audio, video or plain text file.
 * - **The declared type is the client's claim.** `types` refuses what the client declares, and
 *   every provider refuses the types a browser runs (HTML, SVG, JavaScript, every XML type) with
 *   415. A route that stores any file, served back only through `sendUpload`, passes
 *   `allowActiveTypes: true`; a route that shows its files to users (an avatar) never does. When
 *   the content matters (an image you render), check the stored bytes too.
 * - **A failed route keeps nothing.** When the handler throws, or answers with a status of 400 or
 *   more, `receiveUploads` removes the files it stored. A client that goes away before the answer
 *   removes nothing: the handler may already have saved what points at the file. Call
 *   `discardUploads(req)` only when the handler fails yet answers 2xx (the failure in the body), so
 *   the stored files do not stay with nothing pointing at them.
 * - **Use `receiveUploads` rather than a multipart parser of your own.** The bundled provider
 *   bonds cap a file's size only through the parser's `'limit'` event on the stream
 *   (`'Stream limit reached.'` on `onError`); a plain stream is never size-limited.
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
 *   and never invokes the `upload()` call's `onError` for the abort itself — and what was written
 *   of the file is removed. This holds across
 *   every bundled provider, so swapping providers never changes what a consumer observes on
 *   abort. See {@link UploadAbortedError} for the full contract.
 *
 * @example
 * ```ts
 * import { getProvider, getUploads, receiveUploads, sendUpload } from '@molecule/api-uploads'
 * // a bond (e.g. `@molecule/api-uploads-filesystem`) called setProvider() at startup
 *
 * router.post(
 *   '/files',
 *   requireAuth, // refuse anonymous requests before anything is stored
 *   receiveUploads({
 *     field: 'file',
 *     maxFileBytes: 5 * 1024 * 1024, // optional; 10 MiB when left out
 *     types: ['image/png', 'image/jpeg', 'application/pdf', 'text/plain'],
 *   }), // refuses: 415 not multipart or another type, 413 too large or too many, 400 no file or another field
 *   async (req, res) => {
 *     const [file] = getUploads(req, 'file') // fully stored; refusals never reach here
 *     await saveFileRow({ id: file.id, userId: getUserId(res), name: file.filename }) // own it
 *     res.status(201).json({ id: file.id }) // a throw or a 4xx/5xx answer removes the stored file
 *   },
 * )
 *
 * router.get('/files/:id', async (req, res) => {
 *   const row = await getFileRow(req.params.id)
 *   if (!row || row.userId !== getUserId(res)) return res.status(404).end() // ownership → no IDOR
 *   const stream = await getProvider().getFile?.(row.id) // null for any id no stored file has, `../x` too
 *   if (!stream) return res.status(404).end()
 *   await sendUpload(res, stream, { filename: row.name }) // a download; { inline: true, type } shows an image
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
export * from './receive.js'
export * from './send.js'
export * from './types.js'
