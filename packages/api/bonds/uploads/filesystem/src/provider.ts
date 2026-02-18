/**
 * File system upload provider implementation.
 *
 * Handles file uploads to the local file system.
 *
 * Note: For your files to remain on disk indefinitely, your server needs a permanent file system.
 * Many "serverless" deployments have transient file systems, meaning that files written to them will not remain.
 *
 * @module
 */

import fs from 'fs'
import path from 'path'
import { v4 as uuid } from 'uuid'

import { getLogger } from '@molecule/api-bond'
import type { FileInfo, UploadProvider } from '@molecule/api-uploads'
const logger = getLogger()
import { t } from '@molecule/api-i18n'

import type { File } from './types.js'

/** Warn if FILE_UPLOAD_PATH is not set. */
if (!process.env.FILE_UPLOAD_PATH) {
  logger.warn('FILE_UPLOAD_PATH is not set, defaulting to "uploads"')
}

/** The absolute path where uploaded files are stored. Reads from `FILE_UPLOAD_PATH` env var, defaults to `'uploads'` in the CWD. */
export const uploadPath = path.join(process.cwd(), process.env.FILE_UPLOAD_PATH || `uploads`)

// Ensure upload directory exists
if (!fs.existsSync(uploadPath)) {
  fs.mkdirSync(uploadPath, { recursive: true })
}

/**
 * Streams a file upload to the local file system. Creates a UUID-named file in `uploadPath`
 * and pipes the readable stream into it. Tracks upload progress via `file.size`.
 * @param fieldname - The form field name this file was submitted under.
 * @param stream - The readable stream of the uploaded file data.
 * @param info - File metadata (filename, encoding, mimeType) from the multipart parser.
 * @param onError - Callback invoked if the write stream errors or the stream exceeds its size limit.
 * @returns A `File` object with the upload's ID, metadata, and a `uploadPromise` that resolves on completion.
 */
export const upload = (
  fieldname: string,
  stream: NodeJS.ReadableStream,
  info: FileInfo,
  onError: (error: Error) => void,
): File => {
  const id = uuid()

  const filename = info.filename.substring(0, 1023)
  const encoding = info.encoding.substring(0, 1023)
  const mimetype = info.mimeType.substring(0, 255)

  const uploadStream = fs.createWriteStream(path.join(uploadPath, id))

  const uploadPromise = new Promise<void>((resolve, reject) => {
    uploadStream.on(`finish`, () => {
      delete file.upload
      delete file.uploadPromise
      file.uploaded = true
      resolve()
    })

    uploadStream.on(`error`, (error) => {
      delete file.upload
      delete file.uploadPromise
      onError(error)
      reject(error)
    })

    stream.pipe(uploadStream)
  })

  const file: File = {
    id,
    fieldname,
    filename,
    encoding,
    mimetype,
    size: 0,
    stream,
    upload: uploadStream,
    uploadPromise,
    uploaded: false,
  }

  stream.on(`data`, (data) => {
    file.size += data.length
  })

  stream.on(`end`, () => {
    delete file.stream
  })

  stream.on(`limit`, () => {
    onError(
      new Error(
        t('uploads.error.streamLimitReached', undefined, { defaultValue: 'Stream limit reached.' }),
      ),
    )
  })

  return file
}

/**
 * Aborts an in-progress file upload. Removes stream listeners, ends the write stream,
 * and deletes the partially-written file from disk.
 * @param file - The `File` object returned by `upload()`.
 */
export const abortUpload = (file: File): void => {
  if (file.stream) {
    file.stream.removeAllListeners(`data`)
    file.stream.removeAllListeners(`limit`)
    file.stream.removeAllListeners(`end`)
    delete file.stream
  }

  if (!file.upload && !file.uploaded) {
    return
  }

  if (file.upload && 'end' in file.upload && typeof file.upload.end === 'function') {
    file.upload.end()
  }

  fs.unlink(path.join(uploadPath, file.id), (error) => {
    if (error) {
      logger.error(`Error deleting uploaded file (id: ${file.id})`, error)
    }
  })

  delete file.upload
  delete file.uploadPromise
}

/**
 * Deletes a previously uploaded file from the local file system by its UUID.
 * @param id - The UUID file identifier (also the filename on disk).
 */
export const deleteFile = (id: string): Promise<void> => {
  return new Promise((resolve, reject) => {
    fs.unlink(path.join(uploadPath, id), (error) => {
      if (error) {
        logger.error(`Error deleting file (id: ${id})`, error)
        reject(error)
      } else {
        resolve()
      }
    })
  })
}

/**
 * Opens a read stream for a previously uploaded file.
 * @param id - The UUID file identifier.
 * @returns A `ReadStream` for the file at `uploadPath/id`.
 */
export const getFileStream = (id: string): fs.ReadStream => {
  return fs.createReadStream(path.join(uploadPath, id))
}

/**
 * File system upload provider implementing `UploadProvider`. Stores files
 * in the local directory specified by `FILE_UPLOAD_PATH`.
 */
export const provider: UploadProvider = {
  upload,
  abortUpload,
  deleteFile,
  getFile: async (id: string) => getFileStream(id),
}
