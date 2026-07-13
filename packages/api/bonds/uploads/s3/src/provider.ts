/**
 * AWS S3 upload provider implementation.
 *
 * Handles file uploads to AWS S3.
 *
 * @module
 */

import { DeleteObjectCommand, GetObjectCommand, S3Client } from '@aws-sdk/client-s3'
import { Upload } from '@aws-sdk/lib-storage'
import { PassThrough } from 'stream'
import { v4 as uuid } from 'uuid'

import { getLogger } from '@molecule/api-bond'
import type { FileInfo, UploadProvider } from '@molecule/api-uploads'
const logger = getLogger()
// Side-effect import: registers this bond's secret definitions so the
// runtime registry is populated even when provider.js is imported directly
// (not through the package barrel).
import './secrets.js'

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
    // Optional endpoint + path-style overrides let this provider target an
    // S3-compatible service (Cloudflare R2, MinIO, DigitalOcean Spaces, or a
    // credential broker). When `AWS_S3_ENDPOINT` is unset the SDK resolves the
    // default AWS regional endpoint and `AWS_S3_FORCE_PATH_STYLE` defaults to
    // the SDK's virtual-hosted-style addressing, so behaviour is unchanged.
    _s3Client = new S3Client({
      region: process.env.AWS_S3_REGION || 'us-east-1',
      ...(process.env.AWS_S3_ENDPOINT ? { endpoint: process.env.AWS_S3_ENDPOINT } : {}),
      ...(process.env.AWS_S3_FORCE_PATH_STYLE === 'true' ? { forcePathStyle: true } : {}),
    })
  }
  return _s3Client
}

/** Lazily-initialized S3 client proxy. Property access is forwarded to the real client on first use. */
export const s3Client: S3Client = new Proxy({} as S3Client, {
  get(_, prop, receiver) {
    return Reflect.get(getS3Client(), prop, receiver)
  },
  // set trap: methods run with `this` bound to the proxy — without it, instance-state writes land on the dummy target and are lost (see api-push-notifications-web-push)
  set(_, prop, value) {
    return Reflect.set(getS3Client(), prop, value)
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

  // Block dangerous MIME types that could enable XSS if served directly.
  // [M4-1] Keep this set in lockstep with bonds/uploads/filesystem/src/provider.ts so the
  // two swappable providers enforce an identical contract.
  const BLOCKED_MIME_TYPES = new Set([
    'text/html',
    'application/xhtml+xml',
    'application/javascript',
    'text/javascript',
    'application/x-javascript',
    'image/svg+xml',
    'text/xml',
    'application/xml',
  ])
  if (BLOCKED_MIME_TYPES.has(mimetype.toLowerCase())) {
    // Drain the rejected stream: an unconsumed file stream stalls the multipart
    // parser (busboy pauses on backpressure), which hangs the whole request even
    // after the handler has responded with the 4xx.
    stream.resume()
    const error = new Error(`File type ${mimetype} is not allowed for upload`)
    onError(error)
    return { id, fieldname, filename, encoding, mimetype, size: 0, uploaded: false } as File
  }

  const bucket = getBucketName()
  if (!bucket) {
    // Fail fast with an actionable message: with an empty Bucket the SDK rejects
    // later with a cryptic serialization error that never names the missing env var.
    stream.resume()
    onError(
      new Error(
        'AWS_S3_BUCKET is not set — set it to the S3 bucket name for uploads (see @molecule/api-uploads-s3 secrets).',
      ),
    )
    return { id, fieldname, filename, encoding, mimetype, size: 0, uploaded: false } as File
  }

  // Pipe through a PassThrough the bond controls: `@aws-sdk/lib-storage`
  // consumes its Body without emitting `data` events on the source, so
  // counting bytes directly on `stream` never fired and `file.size` stayed 0
  // (caught by the capability contract tests). Piping puts the source in
  // flowing mode — its `data` listeners (size accounting below) now fire —
  // while the SDK reads from the PassThrough.
  const body = new PassThrough()
  stream.pipe(body)

  const s3Upload = new Upload({
    client: getS3Client(),
    params: {
      Bucket: bucket,
      Key: id,
      Body: body,
      ContentType: mimetype,
      ContentDisposition: 'attachment',
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

  stream.on(`error`, (err) => {
    const error = err instanceof Error ? err : new Error(String(err))
    // Tear down the piped body too, or the SDK upload would wait forever on a
    // stream that will never end. `destroy(error)` re-emits the error on
    // `body`; if the SDK hasn't attached its own error listener yet, an
    // unlistened `error` event would crash the process — so handle it here.
    body.once(`error`, (_error) => {
      // Intentionally ignored: this is the same error we just passed to
      // destroy() and already surface via onError(error) below.
    })
    body.destroy(error)
    onError(error)
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
 * @returns A readable stream of the file contents, or `null` if the file does not exist.
 */
export const getFile = async (id: string): Promise<NodeJS.ReadableStream | null> => {
  try {
    const response = await s3Client.send(
      new GetObjectCommand({
        Bucket: getBucketName(),
        Key: id,
      }),
    )
    return (response.Body as NodeJS.ReadableStream) ?? null
  } catch (error) {
    // GetFileHandler contract (and parity with the filesystem bond): resolve `null`
    // when the file does not exist so callers can 404, and THROW only for real
    // failures (bad credentials, missing bucket, network). Without this, a deleted
    // key was indistinguishable from an outage. Keyed on the SDK's NoSuchKey error
    // name — NoSuchBucket and auth errors still throw (they are misconfiguration,
    // not "file not found", and must stay loud).
    if ((error as { name?: string }).name === 'NoSuchKey') {
      return null
    }
    throw error
  }
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
