# @molecule/app-filesystem

`@molecule/app-filesystem`
Device filesystem access interface for molecule.dev

Provides a unified API for filesystem operations across platforms.
Supports reading, writing, and managing files and directories.

## Type
`native`

## Installation
```bash
npm install @molecule/app-filesystem
```

## API

### Interfaces

#### `CopyOptions`

Copy/move options

```typescript
interface CopyOptions {
  /** Source directory */
  fromDirectory?: Directory
  /** Destination directory */
  toDirectory?: Directory
  /** Overwrite existing file */
  overwrite?: boolean
}
```

#### `DeleteOptions`

Options for deleting a file or directory (directory type, recursive deletion).

```typescript
interface DeleteOptions {
  /** Directory type */
  directory?: Directory
  /** Delete directory contents recursively */
  recursive?: boolean
}
```

#### `FileInfo`

Metadata about a file or directory (name, path, size, timestamps, type).

```typescript
interface FileInfo {
  /** File name */
  name: string
  /** Full path */
  path: string
  /** File URI */
  uri: string
  /** File size in bytes */
  size: number
  /** Creation time (ISO string) */
  createdAt?: string
  /** Modification time (ISO string) */
  modifiedAt?: string
  /** Whether this is a directory */
  isDirectory: boolean
  /** Whether this is a file */
  isFile: boolean
  /** MIME type (if available) */
  mimeType?: string
}
```

#### `FilesystemCapabilities`

Filesystem capabilities

```typescript
interface FilesystemCapabilities {
  /** Whether filesystem access is supported */
  supported: boolean
  /** Available directories */
  directories: Directory[]
  /** Whether external storage is available */
  hasExternalStorage: boolean
  /** Whether file picking is supported */
  hasPicker: boolean
  /** Maximum file size (if limited) */
  maxFileSize?: number
}
```

#### `FilesystemProvider`

Filesystem provider interface

```typescript
interface FilesystemProvider {
  /**
   * Read a file as text
   * @param path - File path
   * @param options - Read options
   */
  readFile(path: string, options?: ReadOptions): Promise<string>

  /**
   * Read a file as binary data
   * @param path - File path
   * @param options - Read options
   */
  readFileAsBlob(path: string, options?: Omit<ReadOptions, 'encoding'>): Promise<Blob>

  /**
   * Write text to a file
   * @param path - File path
   * @param data - Content to write
   * @param options - Write options
   */
  writeFile(path: string, data: string, options?: WriteOptions): Promise<void>

  /**
   * Write binary data to a file
   * @param path - File path
   * @param data - Binary data to write
   * @param options - Write options
   */
  writeFileFromBlob(
    path: string,
    data: Blob,
    options?: Omit<WriteOptions, 'encoding'>,
  ): Promise<void>

  /**
   * Append text to a file
   * @param path - File path
   * @param data - Content to append
   * @param options - Write options
   */
  appendFile(path: string, data: string, options?: WriteOptions): Promise<void>

  /**
   * Delete a file
   * @param path - File path
   * @param options - Delete options
   */
  deleteFile(path: string, options?: DeleteOptions): Promise<void>

  /**
   * Create a directory
   * @param path - Directory path
   * @param options - Options
   */
  mkdir(path: string, options?: WriteOptions): Promise<void>

  /**
   * Remove a directory
   * @param path - Directory path
   * @param options - Delete options
   */
  rmdir(path: string, options?: DeleteOptions): Promise<void>

  /**
   * List directory contents
   * @param path - Directory path
   * @param options - List options
   */
  readdir(path: string, options?: ListOptions): Promise<FileInfo[]>

  /**
   * Get file/directory info
   * @param path - Path
   * @param options - Stat options
   */
  stat(path: string, options?: StatOptions): Promise<FileInfo>

  /**
   * Check if file/directory exists
   * @param path - Path
   * @param options - Options
   */
  exists(path: string, options?: StatOptions): Promise<boolean>

  /**
   * Copy a file
   * @param from - Source path
   * @param to - Destination path
   * @param options - Copy options
   */
  copy(from: string, to: string, options?: CopyOptions): Promise<void>

  /**
   * Move/rename a file
   * @param from - Source path
   * @param to - Destination path
   * @param options - Copy options
   */
  move(from: string, to: string, options?: CopyOptions): Promise<void>

  /**
   * Get the platform URI for a file path.
   * @param path - The file path to resolve.
   * @param options - Options including directory type.
   * @returns The file's platform-specific URI string.
   */
  getUri(path: string, options?: StatOptions): Promise<string>

  /**
   * Get available storage space in bytes.
   * @param directory - The directory type to check (defaults to app data).
   * @returns The available space in bytes.
   */
  getAvailableSpace(directory?: Directory): Promise<number>

  /**
   * Get the platform's filesystem capabilities.
   * @returns The capabilities indicating available directories, picker support, and size limits.
   */
  getCapabilities(): Promise<FilesystemCapabilities>
}
```

#### `ListOptions`

Options for listing directory contents (directory type, hidden files).

```typescript
interface ListOptions {
  /** Directory type */
  directory?: Directory
  /** Whether to include hidden files */
  includeHidden?: boolean
}
```

#### `ReadOptions`

Options for reading a file (target directory and text encoding).

```typescript
interface ReadOptions {
  /** Directory to read from */
  directory?: Directory
  /** File encoding */
  encoding?: Encoding
}
```

#### `StatOptions`

Options for getting file/directory metadata (target directory type).

```typescript
interface StatOptions {
  /** Directory type */
  directory?: Directory
}
```

#### `WriteOptions`

Options for writing a file (directory, encoding, recursive creation, append mode).

```typescript
interface WriteOptions {
  /** Directory to write to */
  directory?: Directory
  /** File encoding */
  encoding?: Encoding
  /** Whether to create parent directories */
  recursive?: boolean
  /** Whether to append to existing file */
  append?: boolean
}
```

### Types

#### `Directory`

File system directory type

```typescript
type Directory =
  | 'documents' // User documents
  | 'data' // App-specific data
  | 'cache' // Temporary cache
  | 'external' // External storage (Android)
  | 'library' // Library (iOS)
  | 'temp'
```

#### `Encoding`

Text encoding for file read/write operations.

```typescript
type Encoding = 'utf8' | 'ascii' | 'base64'
```

### Functions

#### `appendFile(path, data, options)`

Append text content to a file.

```typescript
function appendFile(path: string, data: string, options?: WriteOptions): Promise<void>
```

- `path` — The file path to append to.
- `data` — The text content to append.
- `options` — Write options (directory, encoding).

**Returns:** A promise that resolves when the data is appended.

#### `copy(from, to, options)`

Copy a file to a new location.

```typescript
function copy(from: string, to: string, options?: CopyOptions): Promise<void>
```

- `from` — The source file path.
- `to` — The destination file path.
- `options` — Copy options (source/dest directories, overwrite).

**Returns:** A promise that resolves when the file is copied.

#### `deleteFile(path, options)`

Delete a file.

```typescript
function deleteFile(path: string, options?: DeleteOptions): Promise<void>
```

- `path` — The file path to delete.
- `options` — Delete options (directory, recursive).

**Returns:** A promise that resolves when the file is deleted.

#### `exists(path, options)`

Check if a file or directory exists.

```typescript
function exists(path: string, options?: StatOptions): Promise<boolean>
```

- `path` — The path to check.
- `options` — Stat options (directory).

**Returns:** Whether the path exists.

#### `formatFileSize(bytes)`

Format a byte count as a human-readable file size string (e.g., '1.5 MB').

```typescript
function formatFileSize(bytes: number): string
```

- `bytes` — The size in bytes.

**Returns:** A formatted string with the appropriate unit (B, KB, MB, GB, TB).

#### `getAvailableSpace(directory)`

Get available storage space in bytes for a directory.

```typescript
function getAvailableSpace(directory?: Directory): Promise<number>
```

- `directory` — The directory type to check (defaults to app data).

**Returns:** The available space in bytes.

#### `getBasename(path)`

Get the filename without its extension from a path.

```typescript
function getBasename(path: string): string
```

- `path` — The file path.

**Returns:** The base filename without extension (e.g., 'readme' from '/docs/readme.md').

#### `getCapabilities()`

Get the platform's filesystem capabilities.

```typescript
function getCapabilities(): Promise<FilesystemCapabilities>
```

**Returns:** The capabilities indicating available directories, picker support, and size limits.

#### `getDirname(path)`

Get the directory portion of a file path.

```typescript
function getDirname(path: string): string
```

- `path` — The file path.

**Returns:** The parent directory path (e.g., '/docs' from '/docs/readme.md').

#### `getExtension(path)`

Extract the file extension from a path, without the leading dot.

```typescript
function getExtension(path: string): string
```

- `path` — The file path or filename.

**Returns:** The lowercase extension (e.g., 'txt'), or empty string if none.

#### `getMimeType(path)`

Infer a MIME type from a file extension. Supports common image, document,
text, media, and archive formats. Falls back to 'application/octet-stream'.

```typescript
function getMimeType(path: string): string
```

- `path` — The file path or extension to look up.

**Returns:** The inferred MIME type string.

#### `getProvider()`

Get the current filesystem provider.

```typescript
function getProvider(): FilesystemProvider
```

**Returns:** The active FilesystemProvider instance.

#### `getUri(path, options)`

Get the platform-specific URI for a file path.

```typescript
function getUri(path: string, options?: StatOptions): Promise<string>
```

- `path` — The file path to resolve.
- `options` — Stat options (directory).

**Returns:** The file's platform URI string.

#### `hasProvider()`

Check if a filesystem provider has been registered.

```typescript
function hasProvider(): boolean
```

**Returns:** Whether a FilesystemProvider has been bonded.

#### `joinPath(segments)`

Join multiple path segments into a single normalized path.
Collapses duplicate slashes and removes trailing slashes.

```typescript
function joinPath(segments?: string[]): string
```

- `segments` — The path segments to join.

**Returns:** The joined and normalized path.

#### `mkdir(path, options)`

Create a directory.

```typescript
function mkdir(path: string, options?: WriteOptions): Promise<void>
```

- `path` — The directory path to create.
- `options` — Write options (directory, recursive for parent directories).

**Returns:** A promise that resolves when the directory is created.

#### `move(from, to, options)`

Move or rename a file.

```typescript
function move(from: string, to: string, options?: CopyOptions): Promise<void>
```

- `from` — The source file path.
- `to` — The destination file path.
- `options` — Move options (source/dest directories, overwrite).

**Returns:** A promise that resolves when the file is moved.

#### `readdir(path, options)`

List directory contents.

```typescript
function readdir(path: string, options?: ListOptions): Promise<FileInfo[]>
```

- `path` — The directory path to list.
- `options` — List options (directory, include hidden files).

**Returns:** An array of FileInfo objects for each entry.

#### `readFile(path, options)`

Read a file as text.

```typescript
function readFile(path: string, options?: ReadOptions): Promise<string>
```

- `path` — The file path to read.
- `options` — Read options (directory, encoding).

**Returns:** The file contents as a string.

#### `readFileAsBlob(path, options)`

Read a file as binary data.

```typescript
function readFileAsBlob(path: string, options?: Omit<ReadOptions, "encoding">): Promise<Blob>
```

- `path` — The file path to read.
- `options` — Read options (directory).

**Returns:** The file contents as a Blob.

#### `rmdir(path, options)`

Remove a directory.

```typescript
function rmdir(path: string, options?: DeleteOptions): Promise<void>
```

- `path` — The directory path to remove.
- `options` — Delete options (directory, recursive for contents).

**Returns:** A promise that resolves when the directory is removed.

#### `setProvider(provider)`

Set the filesystem provider.

```typescript
function setProvider(provider: FilesystemProvider): void
```

- `provider` — FilesystemProvider implementation to register.

#### `stat(path, options)`

Get file or directory metadata.

```typescript
function stat(path: string, options?: StatOptions): Promise<FileInfo>
```

- `path` — The path to stat.
- `options` — Stat options (directory).

**Returns:** The FileInfo with size, dates, and type information.

#### `writeFile(path, data, options)`

Write text content to a file.

```typescript
function writeFile(path: string, data: string, options?: WriteOptions): Promise<void>
```

- `path` — The file path to write to.
- `data` — The text content to write.
- `options` — Write options (directory, encoding, recursive, append).

**Returns:** A promise that resolves when the file is written.

#### `writeFileFromBlob(path, data, options)`

Write binary data to a file.

```typescript
function writeFileFromBlob(path: string, data: Blob, options?: Omit<WriteOptions, "encoding">): Promise<void>
```

- `path` — The file path to write to.
- `data` — The binary data to write as a Blob.
- `options` — Write options (directory, recursive).

**Returns:** A promise that resolves when the file is written.

## Injection Notes

### Requirements

Peer dependencies:
- `@molecule/app-bond` ^1.0.0
- `@molecule/app-i18n` ^1.0.0

## Translations

Translation strings are provided by `@molecule/app-locales-filesystem`.
