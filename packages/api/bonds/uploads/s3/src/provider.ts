/**
 * AWS S3 upload provider implementation.
 *
 * Handles file uploads to AWS S3.
 *
 * @module
 */

import { DeleteObjectCommand, GetObjectCommand, S3Client } from '@aws-sdk/client-s3'
import { Upload } from '@aws-sdk/lib-storage'
import type { Readable } from 'stream'
import { v4 as uuid } from 'uuid'

import { getLogger } from '@molecule/api-bond'
import type { FileInfo, UploadProvider } from '@molecule/api-uploads'
const logger = getLogger()
import { t } from '@molecule/api-i18n'

import type { File } from './types.js'

/**
 * Lazily-initialized S3 client. Created on first use so that
 * process.env values have been populated by resolveAll() first.
 */
let _s3Client: S3Client | null = null
/**
 * Returns the lazily-initialized S3 client. Reads `AWS_S3_REGION` on first call.
 * @returns The shared `S3Client` instance.
 */
function getS3Client(): S3Client {
  if (!_s3Client) {
    _s3Client = new S3Client({
      region: process.env.AWS_S3_REGION || 'us-east-1',
    })
  }
  return _s3Client
}

/** Lazily-initialized S3 client proxy. Property access is forwarded to the real client on first use. */
export const s3Client: S3Client = new Proxy({} as S3Client, {
  get(_, prop, receiver) {
    return Reflect.get(getS3Client(), prop, receiver)
  },
})

/**
 * Returns the S3 bucket name from the `AWS_S3_BUCKET` environment variable.
 * @returns The bucket name, or an empty string if not set.
 */
function getBucketName(): string {
  return process.env.AWS_S3_BUCKET || ''
}

/**
 * Streams a file upload to AWS S3 using the `@aws-sdk/lib-storage` multipart Upload utility.
 * Creates a UUID key in the configured S3 bucket and pipes the readable stream into it.
 * @param fieldname - The form field name this file was submitted under.
 * @param stream - The readable stream of the uploaded file data.
 * @param info - File metadata (filename, encoding, mimeType) from the multipart parser.
 * @param onError - Callback invoked if the S3 upload fails or the stream exceeds its size limit.
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

  const s3Upload = new Upload({
    client: getS3Client(),
    params: {
      Bucket: getBucketName(),
      Key: id,
      Body: stream as Readable,
      ContentType: mimetype,
    },
  })

  const uploadPromise = new Promise<void>((resolve, reject) => {
    s3Upload
      .done()
      .then((result) => {
        delete file.abort
        delete file.uploadPromise
        file.uploaded = true
        file.location = result.Location
        resolve()
      })
      .catch((error) => {
        delete file.abort
        delete file.uploadPromise
        onError(error)
        reject(error)
      })
  })

  const file: File = {
    id,
    fieldname,
    filename,
    encoding,
    mimetype,
    size: 0,
    stream,
    abort: () => s3Upload.abort(),
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
 * Aborts an in-progress S3 upload. Removes stream listeners and calls the S3 multipart abort.
 * @param file - The `File` object returned by `upload()`.
 */
export const abortUpload = async (file: File): Promise<void> => {
  if (file.stream) {
    file.stream.removeAllListeners(`data`)
    file.stream.removeAllListeners(`limit`)
    file.stream.removeAllListeners(`end`)
    delete file.stream
  }

  if (file.abort) {
    try {
      await file.abort()
    } catch (error) {
      logger.error(`Error aborting S3 upload (id: ${file.id})`, error)
    }
  }

  delete file.abort
  delete file.uploadPromise
}

/**
 * Deletes a file from S3 by its UUID key using `DeleteObjectCommand`.
 * @param id - The UUID file identifier (S3 object key).
 */
export const deleteFile = async (id: string): Promise<void> => {
  try {
    await s3Client.send(
      new DeleteObjectCommand({
        Bucket: getBucketName(),
        Key: id,
      }),
    )
  } catch (error) {
    logger.error(`Error deleting S3 file (id: ${id})`, error)
    throw error
  }
}

/**
 * Downloads a file from S3 by its UUID key using `GetObjectCommand`.
 * @param id - The UUID file identifier (S3 object key).
 * @returns A readable stream of the file contents, or `null` if no body is returned.
 */
export const getFile = async (id: string): Promise<NodeJS.ReadableStream | null> => {
  const response = await s3Client.send(
    new GetObjectCommand({
      Bucket: getBucketName(),
      Key: id,
    }),
  )
  return (response.Body as NodeJS.ReadableStream) ?? null
}

/**
 * S3 upload provider implementing `UploadProvider`. Stores files in the
 * AWS S3 bucket specified by `AWS_S3_BUCKET`.
 */
export const provider: UploadProvider = {
  upload,
  abortUpload,
  deleteFile,
  getFile,
}
