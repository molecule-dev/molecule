# @molecule/api-uploads-filesystem

File system upload provider for molecule.dev.

Handles file uploads to the local file system.

Note: For your files to remain on disk indefinitely, your server needs a permanent file system.
Many "serverless" deployments have transient file systems, meaning that files written to them will not remain.

## Type
`provider`

## Installation
```bash
npm install @molecule/api-uploads-filesystem
```

## API

### Interfaces

#### `File`

Filesystem-uploaded file extending the core UploadedFile with the active write stream.

```typescript
interface File extends UploadedFile {
  /**
   * The stream being written to disk.
   */
  upload?: NodeJS.WritableStream
}
```

#### `FileInfo`

Information about a file being uploaded.

This interface is provider-agnostic. Implementations using busboy
or other multipart parsers should adapt to this interface.

```typescript
interface FileInfo {
    /**
     * The original filename - e.g., `some-image.jpg`.
     */
    filename: string;
    /**
     * The file's encoding - e.g., `7bit`, `binary`.
     */
    encoding: string;
    /**
     * The file's MIME type - e.g., `image/jpeg`.
     */
    mimeType: string;
}
```

#### `UploadedFile`

Properties describing an uploading/uploaded file.

```typescript
interface UploadedFile {
    /**
     * The unique file identifier.
     */
    id: string;
    /**
     * The file's fieldname from the form.
     * Used as the key for the file within `req.files` - e.g., `req.files[fieldname] = file`.
     */
    fieldname: string;
    /**
     * The original filename - e.g., `some-image.jpg`.
     */
    filename: string;
    /**
     * The file's encoding - e.g., `binary`.
     */
    encoding: string;
    /**
     * The file's mimetype - e.g., `image/jpeg`.
     */
    mimetype: string;
    /**
     * The file's size in bytes.
     */
    size: number;
    /**
     * The source stream (available during upload).
     */
    stream?: NodeJS.ReadableStream;
    /**
     * A promise that resolves when the upload completes.
     */
    uploadPromise?: Promise<void>;
    /**
     * Whether the upload has completed.
     */
    uploaded: boolean;
    /**
     * The URL/location of the uploaded file (if available).
     */
    location?: string;
}
```

### Functions

#### `abortUpload(file)`

Aborts an in-progress file upload. Removes stream listeners, ends the write stream,
and deletes the partially-written file from disk.

```typescript
function abortUpload(file: File): void
```

- `file` — The `File` object returned by `upload()`.

#### `deleteFile(id)`

Deletes a previously uploaded file from the local file system by its UUID.

```typescript
function deleteFile(id: string): Promise<void>
```

- `id` — The UUID file identifier (also the filename on disk).

#### `getFileStream(id)`

Opens a read stream for a previously uploaded file.

```typescript
function getFileStream(id: string): fs.ReadStream
```

- `id` — The UUID file identifier.

**Returns:** A `ReadStream` for the file at `uploadPath/id`.

#### `upload(fieldname, stream, info, onError)`

Streams a file upload to the local file system. Creates a UUID-named file in `uploadPath`
and pipes the readable stream into it. Tracks upload progress via `file.size`.

```typescript
function upload(fieldname: string, stream: NodeJS.ReadableStream, info: FileInfo, onError: (error: Error) => void): File
```

- `fieldname` — The form field name this file was submitted under.
- `stream` — The readable stream of the uploaded file data.
- `info` — File metadata (filename, encoding, mimeType) from the multipart parser.
- `onError` — Callback invoked if the write stream errors or the stream exceeds its size limit.

**Returns:** A `File` object with the upload's ID, metadata, and a `uploadPromise` that resolves on completion.

### Constants

#### `provider`

File system upload provider implementing `UploadProvider`. Stores files
in the local directory specified by `FILE_UPLOAD_PATH`.

```typescript
const provider: UploadProvider
```

#### `uploadPath`

The absolute path where uploaded files are stored. Reads from `FILE_UPLOAD_PATH` env var, defaults to `'uploads'` in the CWD.

```typescript
const uploadPath: string
```

## Core Interface
Implements `@molecule/api-uploads` interface.

## Injection Notes

### Requirements

Peer dependencies:
- `@molecule/api-bond` ^1.0.0
- `@molecule/api-i18n` ^1.0.0
- `@molecule/api-uploads` ^1.0.0
