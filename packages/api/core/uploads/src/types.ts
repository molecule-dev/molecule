/**
 * Type definitions for the uploads core interface.
 *
 * @module
 */

/**
 * Properties describing an uploading/uploaded file.
 */
export interface UploadedFile {
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

/**
 * Information about a file being uploaded.
 *
 * This interface is provider-agnostic. Implementations using busboy
 * or other multipart parsers should adapt to this interface.
 */
export interface FileInfo {
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

/**
 * Callback invoked by the multipart parser for each incoming file. Implementations
 * pipe the stream to a storage backend and return an `UploadedFile` descriptor.
 *
 * @param fieldname - The form field name the file was submitted under.
 * @param stream - The readable stream of file data.
 * @param info - Metadata about the file (filename, encoding, MIME type).
 * @param onError - Callback to invoke if a stream error occurs during upload.
 */
export type UploadHandler = (
  fieldname: string,
  stream: NodeJS.ReadableStream,
  info: FileInfo,
  onError: (error: Error) => void,
) => UploadedFile

/**
 * Callback invoked to abort an in-progress upload and clean up any
 * partially written data in the storage backend.
 */
export type AbortHandler = (file: UploadedFile) => void | Promise<void>

/**
 * Callback invoked to permanently delete an uploaded file from storage.
 */
export type DeleteHandler = (id: string) => Promise<void>

/**
 * Callback invoked to retrieve a readable stream for an uploaded file,
 * or `null` if the file does not exist.
 */
export type GetFileHandler = (id: string) => Promise<NodeJS.ReadableStream | null>

/**
 * Upload provider interface.
 *
 * All upload providers must implement this interface.
 */
export interface UploadProvider {
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
