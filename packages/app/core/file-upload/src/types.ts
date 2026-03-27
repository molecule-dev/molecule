/**
 * File upload provider interface and related types.
 *
 * Defines framework-agnostic contracts for file uploads with progress
 * tracking, validation, drag-and-drop, and multi-file support.
 *
 * @module
 */

// ---------------------------------------------------------------------------
// File Status
// ---------------------------------------------------------------------------

/** Possible states of a file during the upload lifecycle. */
export type FileUploadStatus =
  | 'idle'
  | 'preparing'
  | 'uploading'
  | 'processing'
  | 'complete'
  | 'error'
  | 'cancelled'

// ---------------------------------------------------------------------------
// File Validation
// ---------------------------------------------------------------------------

/**
 * Validation constraints applied to files before uploading.
 */
export interface FileValidation {
  /** Maximum file size in bytes. */
  maxSize?: number
  /** Minimum file size in bytes. */
  minSize?: number
  /** Accepted MIME types (e.g. `['image/png', 'image/jpeg']`). */
  acceptedTypes?: string[]
  /** Accepted file extensions including the dot (e.g. `['.png', '.jpg']`). */
  acceptedExtensions?: string[]
  /** Maximum number of files allowed when multi-file is enabled. */
  maxFiles?: number
  /**
   * Custom validation function. Return `null` for valid, or an error
   * message string for invalid.
   *
   * @param file - The file to validate.
   * @returns `null` if valid, or an error message string.
   */
  custom?: (file: UploadFile) => string | null
}

// ---------------------------------------------------------------------------
// Upload File
// ---------------------------------------------------------------------------

/**
 * Represents a file in the upload queue, including metadata and progress.
 */
export interface UploadFile {
  /** Unique identifier for this file within the upload instance. */
  id: string
  /** Original file name. */
  name: string
  /** File size in bytes. */
  size: number
  /** MIME type of the file. */
  type: string
  /** Current upload status. */
  status: FileUploadStatus
  /** Upload progress as a percentage (0–100). */
  progress: number
  /** Error message if `status` is `'error'`. */
  error?: string
  /** URL or identifier of the uploaded file after completion. */
  result?: string
  /** The source `File` object when available (browser environments). */
  source?: File
  /** Optional thumbnail/preview data URL for image files. */
  preview?: string
}

// ---------------------------------------------------------------------------
// Upload Destination
// ---------------------------------------------------------------------------

/**
 * Configuration for where and how files are uploaded.
 */
export interface UploadDestination {
  /** Target URL for the upload request. */
  url: string
  /** HTTP method to use. Defaults to `'POST'`. */
  method?: 'POST' | 'PUT' | 'PATCH'
  /** Additional HTTP headers to include with the upload request. */
  headers?: Record<string, string>
  /** Form field name for the file data. Defaults to `'file'`. */
  fieldName?: string
  /** Additional form data to include with the upload request. */
  additionalData?: Record<string, string>
  /**
   * Custom function to extract the result identifier from the upload
   * response. Called after a successful upload.
   *
   * @param response - The raw response body.
   * @returns The result identifier string.
   */
  parseResponse?: (response: unknown) => string
}

// ---------------------------------------------------------------------------
// Event Handlers
// ---------------------------------------------------------------------------

/**
 * Event callbacks for the file upload lifecycle.
 */
export interface FileUploadEvents {
  /** Called when files are added to the upload queue. */
  onFilesAdded?: (files: UploadFile[]) => void
  /** Called when a file is removed from the queue. */
  onFileRemoved?: (file: UploadFile) => void
  /** Called when a file's upload progress changes. */
  onProgress?: (file: UploadFile, progress: number) => void
  /** Called when a file upload completes successfully. */
  onComplete?: (file: UploadFile) => void
  /** Called when a file upload fails. */
  onError?: (file: UploadFile, error: string) => void
  /** Called when all files in the queue have been processed. */
  onAllComplete?: (files: UploadFile[]) => void
  /** Called when a file fails validation. */
  onValidationError?: (file: UploadFile, errors: string[]) => void
}

// ---------------------------------------------------------------------------
// Upload Options
// ---------------------------------------------------------------------------

/**
 * Configuration for creating a file upload instance.
 */
export interface FileUploadOptions {
  /** Upload destination configuration. */
  destination: UploadDestination
  /** File validation constraints. */
  validation?: FileValidation
  /** Whether to allow multiple file selection. Defaults to `true`. */
  multiple?: boolean
  /** Whether to start uploading immediately when files are added. Defaults to `false`. */
  autoUpload?: boolean
  /** Maximum number of concurrent uploads. Defaults to `3`. */
  maxConcurrent?: number
  /** Whether to generate image previews for image files. Defaults to `false`. */
  imagePreview?: boolean
  /** Maximum width/height in pixels for image previews. Defaults to `200`. */
  imagePreviewMaxSize?: number
  /** Event callbacks. */
  events?: FileUploadEvents
}

// ---------------------------------------------------------------------------
// Upload Instance
// ---------------------------------------------------------------------------

/**
 * A live file upload instance exposing queue management and upload control.
 */
export interface FileUploadInstance {
  // -- Queue management ---------------------------------------------------

  /**
   * Adds files to the upload queue.
   *
   * @param files - Files to add (browser `File` objects).
   * @returns The `UploadFile` representations that were added (after validation).
   */
  addFiles(files: File[]): UploadFile[]

  /**
   * Removes a file from the upload queue.
   *
   * @param fileId - The ID of the file to remove.
   */
  removeFile(fileId: string): void

  /** Removes all files from the upload queue. */
  clearFiles(): void

  /** Returns all files currently in the upload queue. */
  getFiles(): UploadFile[]

  /**
   * Returns a single file by ID, or `undefined` if not found.
   *
   * @param fileId - The ID of the file to retrieve.
   * @returns The file, or `undefined`.
   */
  getFile(fileId: string): UploadFile | undefined

  // -- Upload control -----------------------------------------------------

  /** Starts uploading all queued files that are in `'idle'` status. */
  upload(): void

  /**
   * Cancels the upload for a specific file.
   *
   * @param fileId - The ID of the file whose upload to cancel.
   */
  cancelUpload(fileId: string): void

  /** Cancels all active uploads. */
  cancelAll(): void

  /**
   * Retries a failed upload.
   *
   * @param fileId - The ID of the file to retry.
   */
  retry(fileId: string): void

  /** Retries all failed uploads. */
  retryAll(): void

  // -- State queries ------------------------------------------------------

  /** Returns `true` if any file is currently uploading. */
  isUploading(): boolean

  /**
   * Returns the overall upload progress as a percentage (0–100)
   * across all files.
   */
  getTotalProgress(): number

  // -- Lifecycle ----------------------------------------------------------

  /** Releases resources held by the upload instance. */
  destroy(): void
}

// ---------------------------------------------------------------------------
// Provider
// ---------------------------------------------------------------------------

/**
 * Contract that bond packages must implement to provide file upload
 * functionality.
 */
export interface FileUploadProvider {
  /**
   * Creates a new file upload instance from the given options.
   *
   * @param options - Upload configuration including destination, validation, and events.
   * @returns A file upload instance for managing queued files and uploads.
   */
  createUploader(options: FileUploadOptions): FileUploadInstance
}
