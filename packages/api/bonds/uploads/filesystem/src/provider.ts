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

import { randomUUID } from 'node:crypto'

import fs from 'fs'
import path from 'path'

import { getLogger } from '@molecule/api-bond'
import type { FileInfo, UploadProvider } from '@molecule/api-uploads'
import { blockedTypeRefusal, UploadAbortedError } from '@molecule/api-uploads'
const logger = getLogger()
import { t } from '@molecule/api-i18n'

import { registerLifecycleIntegration } from './lifecycle.js'
import type { File } from './types.js'

/** Warn if FILE_UPLOAD_PATH is not set. */
if (!process.env.FILE_UPLOAD_PATH) {
  logger.warn('FILE_UPLOAD_PATH is not set, defaulting to "uploads"')
}

/**
 * The absolute path where uploaded files are stored: `FILE_UPLOAD_PATH` (an absolute path as given,
 * a relative one under the working directory), default `uploads` in the working directory.
 */
export const uploadPath = path.resolve(process.env.FILE_UPLOAD_PATH || `uploads`)

// Ensure upload directory exists — fail fast with an actionable message if it
// cannot be created (read-only filesystem, bad FILE_UPLOAD_PATH) instead of a
// bare ENOENT/EROFS that never names the env var controlling the location.
let createdUploadPath = false
try {
  if (!fs.existsSync(uploadPath)) {
    fs.mkdirSync(uploadPath, { recursive: true })
    createdUploadPath = true
  }
} catch (error) {
  throw new Error(
    `@molecule/api-uploads-filesystem: could not create upload directory "${uploadPath}". ` +
      `Set FILE_UPLOAD_PATH to a writable path (currently ` +
      `${process.env.FILE_UPLOAD_PATH ? `"${process.env.FILE_UPLOAD_PATH}"` : `unset, defaulting to "uploads"`}).`,
    { cause: error },
  )
}

// Uploaded files are user data, never project source: a folder this provider creates ignores
// itself in git, so a project never commits what its users uploaded. A folder that already
// existed is the project's own and is left as it is.
if (createdUploadPath) {
  try {
    fs.writeFileSync(path.join(uploadPath, '.gitignore'), '*\n')
  } catch (error) {
    logger.warn(
      `Could not write ${path.join(uploadPath, '.gitignore')}: git may track uploaded files`,
      {
        error,
      },
    )
  }
}

/**
 * The shape of every id `upload()` mints: `randomUUID()`. Nothing else names an upload, so an id
 * is refused unless it is exactly this: one path segment of hex digits and dashes, which rules out
 * a path into or out of the folder, a NUL and an over-long string before anything reaches the disk.
 */
const ID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/

/** What the disk says when a path names nothing: it is not there (nor is its folder), or the name is too long. */
const NAMES_NOTHING: ReadonlySet<string> = new Set(['ENOENT', 'ENOTDIR', 'ENAMETOOLONG'])

/**
 * Whether a failed lookup means that no file is there, rather than that the disk failed.
 *
 * @param error - What a filesystem call rejected or threw with.
 * @returns True for a missing path, a missing folder or a name too long for the disk.
 */
const namesNothing = (error: unknown): boolean =>
  error instanceof Error && NAMES_NOTHING.has((error as NodeJS.ErrnoException).code ?? '')

/**
 * The path of the stored file `id` names, or `null` when it names none: only an id in the shape
 * `upload()` mints is one, so a path (`exports/report.txt`, `../x`), a dot-name (the folder's own
 * `.gitignore`), a NUL, an over-long string or any other spelling names no upload.
 *
 * @param id - A file id, as a client may have sent it.
 * @returns The absolute path inside `uploadPath`, or `null`.
 */
const storedPath = (id: string): string | null =>
  ID_PATTERN.test(id) ? path.join(uploadPath, id) : null

/**
 * Looks at the entry at a stored file's path, without following a symlink.
 *
 * @param resolved - The path {@link storedPath} answered.
 * @returns Its stats, or `null` when nothing is there.
 * @throws {NodeJS.ErrnoException} The disk's error for any other failure (a folder that cannot be read).
 */
const lstatStored = async (resolved: string): Promise<fs.Stats | null> => {
  try {
    return await fs.promises.lstat(resolved)
  } catch (error) {
    if (namesNothing(error)) return null
    throw error
  }
}

/**
 * Whether `resolved` is a regular file: an upload. A symlink, a directory or nothing at all is not.
 *
 * @param resolved - The path {@link storedPath} answered.
 * @returns True only for a regular file.
 * @throws {NodeJS.ErrnoException} The disk's error for any other failure (a folder that cannot be read).
 */
const isStoredFile = (resolved: string): boolean => {
  try {
    return fs.lstatSync(resolved).isFile()
  } catch (error) {
    if (namesNothing(error)) return false
    throw error
  }
}

/**
 * Notes at debug that a client sent an id that names no upload: any client can, so it is no warning.
 * The id is the client's own text, so only its start is logged.
 *
 * @param id - The id as it was sent.
 */
const noteRefusedId = (id: string): void => {
  logger.debug('Refused a file id that names no upload in FILE_UPLOAD_PATH', {
    id: id.slice(0, 100),
  })
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
  const id = randomUUID()

  const filename = (info.filename ?? '').substring(0, 1023)
  const encoding = info.encoding.substring(0, 1023)
  const mimetype = info.mimeType.substring(0, 255)

  // [M4-1] Refuse the types a browser runs (stored XSS) unless the route allows them
  // (info.allowActiveTypes): the core's rule, the same for every provider, so swapping providers
  // never changes what a route accepts. A refusal, not a failure: receiveUploads() answers it 415.
  const refusal = blockedTypeRefusal(info)
  if (refusal) {
    // Drain the rejected stream: an unconsumed file stream stalls the multipart
    // parser (busboy pauses on backpressure), which hangs the whole request even
    // after the handler has responded with the 4xx.
    stream.resume()
    onError(refusal)
    return { id, fieldname, filename, encoding, mimetype, size: 0, uploaded: false } as File
  }

  const uploadStream = fs.createWriteStream(path.join(uploadPath, id))

  // Guards the 'finish'/'error' listeners below from double-settling uploadPromise
  // once abortUpload() has taken over: destroy() (called from `file.abort` further
  // down) does not itself emit 'finish', but this flag also protects against any
  // stream implementation quirk that fires a settled-adjacent event post-destroy.
  let aborted = false
  // Captured from the executor below so `file.abort` (defined outside the executor,
  // since it needs to close over `file` for cleanup) can reject uploadPromise
  // deterministically instead of depending on stream-event timing.
  let rejectUploadPromise: (error: Error) => void = () => {}

  const uploadPromise = new Promise<void>((resolve, reject) => {
    rejectUploadPromise = reject

    uploadStream.on(`finish`, () => {
      if (aborted) return
      delete file.upload
      delete file.uploadPromise
      delete file.abort
      file.uploaded = true
      resolve()
    })

    uploadStream.on(`error`, (error) => {
      if (aborted) return
      delete file.upload
      delete file.uploadPromise
      delete file.abort
      // Best-effort cleanup of the partially written file: abortUpload() early-returns
      // once `file.upload` is gone (deleted just above), so without this unlink a
      // failed write would orphan the partial file on disk forever.
      fs.unlink(path.join(uploadPath, id), (unlinkError) => {
        if (unlinkError && unlinkError.code !== 'ENOENT') {
          logger.warn(`Could not remove partial upload after write error (id: ${id})`, unlinkError)
        }
      })
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
    // [ambiguous-failure fix] abortUpload() used to call uploadStream.end(), which
    // fires 'finish' — so uploadPromise RESOLVED (success) for a deliberately
    // aborted upload, after the file had already been unlinked from disk. destroy()
    // never fires 'finish', and rejecting here (instead of relying on stream events)
    // deterministically settles uploadPromise with a distinguishable
    // UploadAbortedError — never a silent success, never routed through onError
    // (an abort is not a transport failure). See @molecule/api-uploads' AbortHandler
    // remarks for the full cross-provider contract (parity with the S3 bond).
    abort: () => {
      aborted = true
      // The write stream opens its file asynchronously, and destroy() waits for an open in
      // flight before it closes: unlinking at once would run before that open creates the file
      // (an upload refused at its first chunk), leaving it on disk. Remove it once closed.
      const removePartial = (): void => {
        fs.unlink(path.join(uploadPath, id), (unlinkError) => {
          if (unlinkError && unlinkError.code !== 'ENOENT') {
            logger.warn(`Could not remove partial upload after abort (id: ${id})`, unlinkError)
          }
        })
      }
      if (uploadStream.closed) removePartial()
      else uploadStream.once('close', removePartial)
      uploadStream.destroy()
      rejectUploadPromise(new UploadAbortedError())
      delete file.upload
      delete file.uploadPromise
      delete file.abort
    },
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
 * Aborts an in-progress file upload. Removes stream listeners, destroys the write
 * stream, deletes the partially-written file from disk, and rejects the file's
 * `uploadPromise` with an `UploadAbortedError`.
 * @param file - The `File` object returned by `upload()`.
 */
export const abortUpload = (file: File): void => {
  if (file.stream) {
    file.stream.removeAllListeners(`data`)
    file.stream.removeAllListeners(`limit`)
    file.stream.removeAllListeners(`end`)
    delete file.stream
  }

  // Files created by `upload()` (the normal path) carry a self-contained `abort`
  // closure — it destroys the write stream (never `.end()`, which would fire
  // 'finish' and resolve uploadPromise as a false success) and rejects
  // uploadPromise with UploadAbortedError. See the [ambiguous-failure fix] note
  // on `file.abort` in upload() for why this replaced `uploadStream.end()`.
  if (file.abort) {
    file.abort()
    return
  }

  // Fallback for a `File` not produced by `upload()` (e.g. a hand-built object, or
  // one whose upload already settled and cleared `abort`): nothing to reject, so
  // just clean up storage. Mirrors the pre-fix behavior for this edge case only.
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
 * Deletes a previously uploaded file from the local file system by its UUID. An id that is not one
 * `upload()` minted names no upload, and there is nothing to remove: the call resolves and nothing
 * on disk is touched. So for a directory or a symlink that happens to carry an id's shape: neither
 * is an upload.
 * @param id - The UUID file identifier (also the filename on disk).
 * @returns A promise that resolves when the file is deleted, and rejects when no file has that id
 *   (`ENOENT`) or the disk fails.
 */
export const deleteFile = async (id: string): Promise<void> => {
  const resolved = storedPath(id)
  if (resolved === null) return
  const entry = await lstatStored(resolved)
  if (entry !== null && !entry.isFile()) return
  try {
    await fs.promises.unlink(resolved)
  } catch (error) {
    logger.error(`Error deleting file (id: ${id})`, error)
    throw error
  }
}

/**
 * Opens a read stream for a previously uploaded file. Prefer `provider.getFile(id)`, which answers
 * `null` for an id with no stored file.
 * @param id - The UUID file identifier.
 * @returns A `ReadStream` for the file at `uploadPath/id`. A stream is handed out only for a
 *   stored file, so none errors later with no listener to hear it.
 * @throws {Error} `Invalid file ID` for an id `upload()` never mints; an `ENOENT` error when no
 *   stored file has the id (also a symlink or a directory); the disk's error when its folder cannot
 *   be read.
 */
export const getFileStream = (id: string): fs.ReadStream => {
  const resolved = storedPath(id)
  if (resolved === null) throw new Error('Invalid file ID')
  if (!isStoredFile(resolved))
    throw Object.assign(new Error(`ENOENT: no stored file has the id ${id}`), { code: 'ENOENT' })
  return fs.createReadStream(resolved)
}

/**
 * File system upload provider implementing `UploadProvider`. Stores files
 * in the local directory specified by `FILE_UPLOAD_PATH`.
 */
export const provider: UploadProvider = {
  upload,
  abortUpload,
  deleteFile,
  async ping() {
    // A writability check: the directory exists (created at import) but the
    // disk can be full, remounted read-only, or removed after boot.
    await fs.promises.access(uploadPath, fs.constants.W_OK)
  },
  // Conform to the GetFileHandler contract: resolve `null` when no stored file has the id.
  // `fs.createReadStream` on a missing path returns a stream that emits ENOENT *asynchronously* —
  // and `pipe()` does NOT forward 'error' events, so a consumer following the core docs
  // (`if (!stream) return 404; stream.pipe(res)`) would crash the process on an unhandled 'error'
  // instead of serving a 404. Every id a client can send that is not one `upload()` minted resolves
  // `null` before anything reaches the disk, so a route's 404 covers them all; a symlink or a
  // directory that carries an id's shape is not an upload either.
  getFile: async (id: string) => {
    const resolved = storedPath(id)
    if (resolved === null) {
      noteRefusedId(id)
      return null
    }
    const entry = await lstatStored(resolved)
    return entry?.isFile() ? fs.createReadStream(resolved) : null
  },
}

// Register the readiness probe once, when this bond is imported; the core
// queues it until a lifecycle provider is bonded.
registerLifecycleIntegration({
  ping: async () => {
    await provider.ping?.()
  },
})
