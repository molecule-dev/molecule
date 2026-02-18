/**
 * Filesystem types for molecule.dev.
 *
 * @module
 */

/**
 * File system directory type
 */
export type Directory =
  | 'documents' // User documents
  | 'data' // App-specific data
  | 'cache' // Temporary cache
  | 'external' // External storage (Android)
  | 'library' // Library (iOS)
  | 'temp' // Temporary files

/**
 * Text encoding for file read/write operations.
 */
export type Encoding = 'utf8' | 'ascii' | 'base64'

/**
 * Metadata about a file or directory (name, path, size, timestamps, type).
 */
export interface FileInfo {
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

/**
 * Options for reading a file (target directory and text encoding).
 */
export interface ReadOptions {
  /** Directory to read from */
  directory?: Directory
  /** File encoding */
  encoding?: Encoding
}

/**
 * Options for writing a file (directory, encoding, recursive creation, append mode).
 */
export interface WriteOptions {
  /** Directory to write to */
  directory?: Directory
  /** File encoding */
  encoding?: Encoding
  /** Whether to create parent directories */
  recursive?: boolean
  /** Whether to append to existing file */
  append?: boolean
}

/**
 * Copy/move options
 */
export interface CopyOptions {
  /** Source directory */
  fromDirectory?: Directory
  /** Destination directory */
  toDirectory?: Directory
  /** Overwrite existing file */
  overwrite?: boolean
}

/**
 * Options for listing directory contents (directory type, hidden files).
 */
export interface ListOptions {
  /** Directory type */
  directory?: Directory
  /** Whether to include hidden files */
  includeHidden?: boolean
}

/**
 * Options for getting file/directory metadata (target directory type).
 */
export interface StatOptions {
  /** Directory type */
  directory?: Directory
}

/**
 * Options for deleting a file or directory (directory type, recursive deletion).
 */
export interface DeleteOptions {
  /** Directory type */
  directory?: Directory
  /** Delete directory contents recursively */
  recursive?: boolean
}

/**
 * Filesystem capabilities
 */
export interface FilesystemCapabilities {
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

/**
 * Filesystem provider interface
 */
export interface FilesystemProvider {
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
