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

#### `uploadsS3SecretDefinitions`

Secret definitions required by the S3 uploads bond.

```typescript
const uploadsS3SecretDefinitions: SecretDefinition[]
```

## Core Interface
Implements `@molecule/api-uploads` interface.

## Bond Wiring

Setup function to register this provider with the core interface:

```typescript
import { setProvider } from '@molecule/api-uploads'
import { provider } from '@molecule/api-uploads-s3'

export function setupUploadsS3(): void {
  setProvider(provider)
}
```

## Injection Notes

### Requirements

Peer dependencies:
- `@molecule/api-bond` ^1.0.0
- `@molecule/api-i18n` ^1.0.0
- `@molecule/api-secrets` ^1.0.0
- `@molecule/api-uploads` ^1.0.0

### Environment Variables

- `AWS_ACCESS_KEY_ID` *(required)* — AWS access key ID
  - Setup: Create an IAM user with the needed policy (SES/S3/SQS) and create an access key under Security credentials.
  - Get it here: [https://console.aws.amazon.com/iam/](https://console.aws.amazon.com/iam/)
  - Example: `AKIA...`
- `AWS_SECRET_ACCESS_KEY` *(required)* — AWS secret access key
  - Setup: Shown once when creating the IAM access key — store it immediately.
  - Get it here: [https://console.aws.amazon.com/iam/](https://console.aws.amazon.com/iam/)
- `AWS_S3_BUCKET` *(required)* — S3 bucket name
  - Setup: Name of the S3 bucket to store uploads in (create one in the S3 console).
  - Get it here: [https://console.aws.amazon.com/s3/](https://console.aws.amazon.com/s3/)
  - Example: `my-app-uploads`
- `AWS_S3_REGION` *(optional)* — S3 bucket region — default: `us-east-1`
  - Setup: The AWS region of your uploads bucket.
  - Example: `us-east-1`
- `AWS_S3_ENDPOINT` *(optional)* — S3 endpoint override
  - Setup: Endpoint URL for S3-compatible stores (MinIO, Cloudflare R2, DigitalOcean Spaces) — molecule's managed storage sets this automatically; leave empty for real AWS S3.
  - Example: `http://localhost:9000`
- `AWS_S3_FORCE_PATH_STYLE` *(optional)* — S3 path-style addressing
  - Setup: Set to 'true' for MinIO-style path addressing (http://host/bucket instead of virtual-hosted buckets); set automatically by molecule's managed storage. Leave unset for real AWS S3.
  - Example: `true`
