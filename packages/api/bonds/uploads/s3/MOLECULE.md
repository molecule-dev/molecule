# @molecule/api-uploads-s3

AWS S3 upload provider for molecule.dev.

Handles file uploads to AWS S3.

## Type
`provider`

## Installation
```bash
npm install @molecule/api-uploads-s3
```

## API

### Interfaces

#### `File`

S3-uploaded file extending the core UploadedFile with S3-specific abort capabilities.

```typescript
interface File extends UploadedFile {
  /**
   * Aborts the in-progress S3 upload.
   */
  abort?: () => Promise<void>
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

Aborts an in-progress S3 upload. Removes stream listeners and calls the S3 multipart abort.

```typescript
function abortUpload(file: File): Promise<void>
```

- `file` — The `File` object returned by `upload()`.

#### `deleteFile(id)`

Deletes a file from S3 by its UUID key using `DeleteObjectCommand`.

```typescript
function deleteFile(id: string): Promise<void>
```

- `id` — The UUID file identifier (S3 object key).

#### `getFile(id)`

Downloads a file from S3 by its UUID key using `GetObjectCommand`.

```typescript
function getFile(id: string): Promise<NodeJS.ReadableStream | null>
```

- `id` — The UUID file identifier (S3 object key).

**Returns:** A readable stream of the file contents, or `null` if no body is returned.

#### `upload(fieldname, stream, info, onError)`

Streams a file upload to AWS S3 using the `@aws-sdk/lib-storage` multipart Upload utility.
Creates a UUID key in the configured S3 bucket and pipes the readable stream into it.

```typescript
function upload(fieldname: string, stream: NodeJS.ReadableStream, info: FileInfo, onError: (error: Error) => void): File
```

- `fieldname` — The form field name this file was submitted under.
- `stream` — The readable stream of the uploaded file data.
- `info` — File metadata (filename, encoding, mimeType) from the multipart parser.
- `onError` — Callback invoked if the S3 upload fails or the stream exceeds its size limit.

**Returns:** A `File` object with the upload's ID, metadata, and a `uploadPromise` that resolves on completion.

### Constants

#### `provider`

S3 upload provider implementing `UploadProvider`. Stores files in the
AWS S3 bucket specified by `AWS_S3_BUCKET`.

```typescript
const provider: UploadProvider
```

#### `s3Client`

Lazily-initialized S3 client proxy. Property access is forwarded to the real client on first use.

```typescript
const s3Client: S3Client
```

## Core Interface
Implements `@molecule/api-uploads` interface.

## Injection Notes

### Requirements

Peer dependencies:
- `@molecule/api-bond` ^1.0.0
- `@molecule/api-i18n` ^1.0.0
- `@molecule/api-uploads` ^1.0.0

### Environment Variables

- `AWS_ACCESS_KEY_ID` *(required)*
- `AWS_SECRET_ACCESS_KEY` *(required)*
- `S3_BUCKET` *(required)*
