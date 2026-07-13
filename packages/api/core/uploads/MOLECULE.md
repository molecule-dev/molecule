# @molecule/api-uploads

Uploads core interface for molecule.dev.

Defines the standard interface for upload providers.

## Quick Start

```ts
router.post('/files', async (req, res) => {
  const userId = getUserId(res)
  if (!userId) return res.status(401).json({ error: 'Authentication required.' })
  // busboy/multer yields (fieldname, stream, info) — validate BEFORE trusting it.
  if (!ALLOWED_TYPES.has(info.mimeType)) return res.status(415).json({ error: 'Unsupported type.' })
  const file = provider.upload(fieldname, stream, info, (e) => res.status(500).json({ error: e.message }))
  await saveFileRow({ id: file.id, userId, name: info.filename }) // own it
  res.json({ id: file.id })
})

router.get('/files/:id', async (req, res) => {
  const row = await getFileRow(req.params.id)
  if (!row || row.userId !== getUserId(res)) return res.status(404).end() // ownership → no IDOR
  const stream = await provider.getFile?.(row.id)
  if (!stream) return res.status(404).end()
  stream.pipe(res)
})
```

## Type
`core`

## Installation
```bash
npm install @molecule/api-uploads
```

## API

### Interfaces

#### `FileInfo`

Information about a file being uploaded.

This interface is provider-agnostic. Implementations using busboy
or other multipart parsers should adapt to this interface.

```typescript
interface FileInfo {
  /**
   * The original filename - e.g., `some-image.jpg`.
   */
  filename: string

  /**
   * The file's encoding - e.g., `7bit`, `binary`.
   */
  encoding: string

  /**
   * The file's MIME type - e.g., `image/jpeg`.
   */
  mimeType: string
}
```

#### `UploadedFile`

Properties describing an uploading/uploaded file.

```typescript
interface UploadedFile {
  /**
   * The unique file identifier.
   */
  id: string

  /**
   * The file's fieldname from the form.
   * Used as the key for the file within `req.files` - e.g., `req.files[fieldname] = file`.
   */
  fieldname: string

  /**
   * The original filename - e.g., `some-image.jpg`.
   */
  filename: string

  /**
   * The file's encoding - e.g., `binary`.
   */
  encoding: string

  /**
   * The file's mimetype - e.g., `image/jpeg`.
   */
  mimetype: string

  /**
   * The file's size in bytes.
   */
  size: number

  /**
   * The source stream (available during upload).
   */
  stream?: NodeJS.ReadableStream

  /**
   * A promise that resolves when the upload completes.
   */
  uploadPromise?: Promise<void>

  /**
   * Whether the upload has completed.
   */
  uploaded: boolean

  /**
   * The URL/location of the uploaded file (if available).
   */
  location?: string
}
```

#### `UploadProvider`

Upload provider interface.

All upload providers must implement this interface.

```typescript
interface UploadProvider {
  /**
   * Uploads a file from a stream.
   */
  upload: UploadHandler

  /**
   * Aborts an in-progress upload.
   */
  abortUpload: AbortHandler

  /**
   * Deletes a file.
   */
  deleteFile: DeleteHandler

  /**
   * Gets a file stream for reading.
   */
  getFile?: GetFileHandler
}
```

### Types

#### `AbortHandler`

Callback invoked to abort an in-progress upload and clean up any
partially written data in the storage backend.

```typescript
type AbortHandler = (file: UploadedFile) => void | Promise<void>
```

#### `DeleteHandler`

Callback invoked to permanently delete an uploaded file from storage.

```typescript
type DeleteHandler = (id: string) => Promise<void>
```

#### `GetFileHandler`

Callback invoked to retrieve a readable stream for an uploaded file,
or `null` if the file does not exist.

```typescript
type GetFileHandler = (id: string) => Promise<NodeJS.ReadableStream | null>
```

#### `UploadHandler`

Callback invoked by the multipart parser for each incoming file. Implementations
pipe the stream to a storage backend and return an `UploadedFile` descriptor.

```typescript
type UploadHandler = (
  fieldname: string,
  stream: NodeJS.ReadableStream,
  info: FileInfo,
  onError: (error: Error) => void,
) => UploadedFile
```

### Classes

#### `UploadAbortedError`

Thrown by conforming upload providers to reject a file's `uploadPromise` when
`abortUpload()` is called on it — signals a deliberate cancellation, distinguishable
from both a successful upload and a real transport/storage failure.

### Functions

#### `getProvider()`

Retrieves the bonded upload provider, throwing if none is configured.

```typescript
function getProvider(): UploadProvider
```

**Returns:** The bonded upload provider.

#### `hasProvider()`

Checks whether an upload provider is currently bonded.

```typescript
function hasProvider(): boolean
```

**Returns:** `true` if an upload provider is bonded.

#### `setProvider(provider)`

Registers an upload provider as the active singleton. Called by bond
packages during application startup.

```typescript
function setProvider(provider: UploadProvider): void
```

- `provider` — The upload provider implementation to bond.

## Available Providers

| Provider | Package |
|----------|---------|
| Local Filesystem | `@molecule/api-uploads-filesystem` |
| AWS S3 / S3-compatible | `@molecule/api-uploads-s3` |

## Injection Notes

### Requirements

Peer dependencies:
- `@molecule/api-bond` ^1.0.0
- `@molecule/api-i18n` ^1.0.0

A weak upload integration leaks files or trusts the client. Enforce these in your
handler around {@link UploadProvider.upload} / {@link UploadProvider.getFile} /
`deleteFile`:

- **Own every file.** Persist the returned {@link UploadedFile} id with the uploader's
  `user_id`, and on read/delete load the row and 404 if it isn't the caller's — an
  unscoped `getFile(id)` is an IDOR (anyone enumerates everyone's files).
- **Validate server-side; never trust the client's declared type/size.** Check
  {@link FileInfo} (mimeType, filename) AND enforce a max-byte cap while streaming, and
  reject disallowed types — a client can lie about `Content-Type`.
- **The max-size cap comes from the multipart parser's limits, not from this package.**
  `UploadHandler` takes a plain `NodeJS.ReadableStream` — the bundled bonds enforce a size
  cap ONLY by listening for the multipart parser's `'limit'` event on that stream (busboy's
  `fileSize` option triggers it) and reporting it to `onError` as `'Stream limit reached.'`.
  Configure the cap on your multipart parser (e.g. busboy's `limits.fileSize`) — a plain
  stream that never emits `'limit'` is NEVER size-limited by these bonds.
- **Private by default.** Do NOT put user uploads on a public, guessable path; serve them
  through an authenticated route (or a short-lived signed URL). Public buckets leak files.
- **Never build a storage key from the raw client filename** — sanitize/generate the key
  server-side (path traversal / overwrite).
- Stream to storage (the API takes a `NodeJS.ReadableStream`); never buffer a whole upload
  in memory.
- **Aborting an upload is neither a success nor a failure.** `abortUpload()` rejects the
  file's `uploadPromise` with {@link UploadAbortedError} — it never resolves `uploadPromise`
  and never invokes the `upload()` call's `onError` for the abort itself. This holds across
  every bundled provider, so swapping providers never changes what a consumer observes on
  abort. See {@link UploadAbortedError} for the full contract.

## Translations

Translation strings are provided by `@molecule/api-locales-uploads`.
