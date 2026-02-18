# @molecule/api-uploads

Uploads core interface for molecule.dev.

Defines the standard interface for upload providers.

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

## Translations

Translation strings are provided by `@molecule/api-locales-uploads`.
