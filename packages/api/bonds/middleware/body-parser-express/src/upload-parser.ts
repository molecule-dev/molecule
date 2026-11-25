/**
 * The Express upload parser: busboy for one route's `multipart/form-data` body, streaming each
 * accepted file part to the route's storage.
 *
 * @module
 */

import busboy from 'busboy'
import type express from 'express'

import { getLogger } from '@molecule/api-bond'
import { t } from '@molecule/api-i18n'
import {
  DEFAULT_MAX_FIELD_BYTES,
  DEFAULT_MAX_FIELDS,
  DEFAULT_MAX_FILE_BYTES,
  getParsedUploads,
  type Middleware,
  setParsedUploads,
  type StorageRefusal,
  type StoredUpload,
  type UploadParserFactory,
  type UploadParserOptions,
} from '@molecule/api-middleware-body-parser'

const logger = getLogger()

/** How long a failed request waits for an aborted file's write to settle before deleting it. */
const ABORT_SETTLE_MS = 5000

/** A refusal: its status and its translated message. */
interface Refusal {
  status: number
  key: string
  values?: Record<string, string | number>
  defaultValue: string
}

/**
 * The refusal a storage's error carries ({@link StorageRefusal}: a 4xx `status` and an
 * `errorKey`), or null for an error that is the server's.
 *
 * @param error - What the storage passed to `onError` or rejected `uploadPromise` with.
 * @returns The refusal to answer, or null.
 */
function storageRefusal(error: unknown): Refusal | null {
  if (!(error instanceof Error)) return null
  const { status, errorKey, values } = error as Partial<StorageRefusal>
  if (typeof status !== 'number' || status < 400 || status > 499) return null
  if (typeof errorKey !== 'string' || errorKey === '') return null
  return { status, key: errorKey, values, defaultValue: error.message }
}

/**
 * A byte count the way a person reads a limit: `5 MB`, `512 KB`.
 *
 * @param bytes - The byte count.
 * @returns The rounded size with its unit.
 */
export function formatByteLimit(bytes: number): string {
  if (bytes >= 1024 * 1024) return `${Number((bytes / (1024 * 1024)).toFixed(1))} MB`
  if (bytes >= 1024) return `${Number((bytes / 1024).toFixed(1))} KB`
  return `${bytes} B`
}

/**
 * Whether a declared MIME type is one of the accepted ones (`'image/png'`, or `'image/*'` for a
 * family). Parameters (`; charset=…`) and case are ignored.
 *
 * @param types - The accepted types; every type is accepted when absent.
 * @param mimeType - The part's declared type.
 * @returns True when it is accepted.
 */
export function acceptsType(types: readonly string[] | undefined, mimeType: string): boolean {
  if (!types || types.length === 0) return true
  const declared = mimeType.split(';')[0].trim().toLowerCase()
  return types.some((type) => {
    const accepted = type.trim().toLowerCase()
    return accepted.endsWith('/*')
      ? declared.startsWith(accepted.slice(0, -1))
      : declared === accepted
  })
}

const isMultipart = (contentType: string | undefined): boolean =>
  /^multipart\/form-data(?:\s*;|$)/i.test(contentType ?? '')

/**
 * Creates the upload parser for one route. See `UploadParserFactory` in
 * `@molecule/api-middleware-body-parser` for what it accepts and refuses.
 *
 * It goes on owning the request's files once it calls `next()`: when the route then answers with a
 * status of 400 or more, it removes the files the request still lists (`getParsedUploads`); a 2xx
 * or 3xx answer keeps them, and so does a client that goes away before the answer.
 *
 * @param options - What the route accepts and where its files are stored.
 * @returns The route's middleware.
 */
export const uploadParserFactory: UploadParserFactory = <F extends StoredUpload>(
  options: UploadParserOptions<F>,
): Middleware => {
  const maxFiles = options.maxFiles ?? 1
  const maxFileBytes = options.maxFileBytes ?? DEFAULT_MAX_FILE_BYTES
  const maxFields = options.maxFields ?? DEFAULT_MAX_FIELDS
  // busboy hands over one file part past the limit, so the parser decides what it is: a file in another
  // field is refused as one (400), another file in the route's field as too many (413). busboy counts the
  // file parts of every field, and answering 413 at its own limit refused a misplaced file as too many.
  // It also reports a size limit when a size REACHES it, and then cuts the part: one byte more than each
  // limit is passed, so a file of exactly `maxFileBytes`, or a field of exactly `maxFieldBytes`, arrives
  // whole and the report means the size is past it.
  const limits = {
    files: maxFiles + 1,
    fileSize: maxFileBytes + 1,
    fields: maxFields,
    fieldSize: (options.maxFieldBytes ?? DEFAULT_MAX_FIELD_BYTES) + 1,
    parts: maxFiles + 1 + maxFields,
  }

  return (rawReq, rawRes, rawNext) => {
    const req = rawReq as express.Request
    const res = rawRes as express.Response
    const next = rawNext as express.NextFunction
    const refuse = (refusal: Refusal): void => {
      res.status(refusal.status).json({
        error: t(refusal.key, refusal.values, { defaultValue: refusal.defaultValue }),
        errorKey: refusal.key,
      })
    }

    if (!isMultipart(req.headers['content-type'])) {
      refuse({
        status: 415,
        key: 'middleware.error.notMultipart',
        values: { field: options.field },
        defaultValue: `Send the file as multipart/form-data in the "${options.field}" field.`,
      })
      return
    }
    // Another parser read the body first; busboy would wait for bytes that never come.
    if (req.readableEnded) {
      next(
        new Error(
          'The upload body was already read before the upload parser ran: remove the other parser that reads multipart bodies on this route.',
        ),
      )
      return
    }

    let storage: ReturnType<typeof options.storage>
    try {
      storage = options.storage()
    } catch (error) {
      req.resume()
      next(error)
      return
    }
    let parser: busboy.Busboy
    try {
      parser = busboy({ headers: req.headers, limits })
    } catch (error) {
      // A multipart type busboy cannot read (no boundary): nothing was stored yet.
      logger.debug('upload parser: unreadable multipart headers', { error })
      req.resume()
      refuse({ status: 400, key: 'middleware.error.badRequest', defaultValue: 'Bad request.' })
      return
    }
    const files: F[] = []
    const stored = new Set<F>()
    const fields: Record<string, string> = {}
    let state: 'reading' | 'failed' | 'done' = 'reading'

    /** The files whose removal this parser has taken on: each is removed once. */
    const removed = new Set<F>()

    /**
     * Remove files this request stored: abort the ones still writing, and delete each one whose
     * write completed, including one that completed while the abort was on its way.
     *
     * @param candidates - The files to remove: every file of the request, unless the handler runs
     *   and removes some itself.
     */
    const discard = async (candidates: readonly F[] = files): Promise<void> => {
      await Promise.all(
        candidates.map(async (file) => {
          if (removed.has(file)) return
          removed.add(file)
          try {
            if (!stored.has(file)) await storage.abortUpload(file)
            const completed = file.uploadPromise
              ? await Promise.race([
                  file.uploadPromise.then(
                    () => true,
                    // A rejected write (the abort above, or the failure being handled) left no
                    // file to delete; the failure itself is reported by `fail`.
                    (_error: unknown) => false,
                  ),
                  // A storage whose abort never settles the write must not hold the answer:
                  // delete what it may have written and move on.
                  new Promise<'unsettled'>((resolve) =>
                    setTimeout(() => resolve('unsettled'), ABORT_SETTLE_MS).unref(),
                  ),
                ])
              : true
            if (completed === 'unsettled')
              logger.warn('upload parser: an aborted upload did not settle; deleting it', {
                id: file.id,
              })
            if (completed) await storage.deleteFile(file.id)
          } catch (error) {
            logger.warn('upload parser: could not remove a file of a failed upload', {
              id: file.id,
              error,
            })
          }
        }),
      )
    }

    /** Stop reading, remove the stored files, and answer with `refusal` or pass `error` on. */
    const fail = (outcome: { refusal: Refusal } | { error: unknown } | 'disconnected'): void => {
      if (state !== 'reading') return
      state = 'failed'
      req.unpipe(parser)
      // Drain the rest of the body, as Express's own parsers do on a refusal: a client still
      // sending then reads the answer instead of a reset connection.
      req.resume()
      void discard().then(() => {
        if (outcome === 'disconnected' || res.headersSent) return
        if ('refusal' in outcome) refuse(outcome.refusal)
        else next(outcome.error)
      })
    }

    const tooLarge: Refusal = {
      status: 413,
      key: 'middleware.error.fileTooLarge',
      values: { limit: formatByteLimit(maxFileBytes) },
      defaultValue: `The file is larger than ${formatByteLimit(maxFileBytes)}.`,
    }
    const fieldTooLarge: Refusal = {
      status: 413,
      key: 'middleware.error.payloadTooLarge',
      defaultValue: 'The request is too large.',
    }
    const malformed: Refusal = {
      status: 400,
      key: 'middleware.error.badRequest',
      defaultValue: 'Bad request.',
    }
    const tooManyFiles: Refusal = {
      status: 413,
      key: 'middleware.error.tooManyFiles',
      values: { max: maxFiles },
      defaultValue: `Too many files. The limit is ${maxFiles}.`,
    }

    parser.on('file', (fieldname, stream, info) => {
      // A body that ends inside a file part (a client that stops sending) errors the file stream
      // as well as the parser; with no listener that error would end the process.
      stream.on('error', (error: unknown) => {
        logger.debug('upload parser: a file part ended early', { error })
        fail({ refusal: malformed })
      })
      if (state !== 'reading') {
        stream.resume()
        return
      }
      if (fieldname !== options.field) {
        stream.resume()
        fail({
          refusal: {
            status: 400,
            key: 'middleware.error.unexpectedFile',
            values: { field: fieldname, expected: options.field },
            defaultValue: `Send the file in the "${options.field}" field, not "${fieldname}".`,
          },
        })
        return
      }
      if (files.length >= maxFiles) {
        stream.resume()
        fail({ refusal: tooManyFiles })
        return
      }
      if (!acceptsType(options.types, info.mimeType)) {
        stream.resume()
        const allowed = (options.types ?? []).join(', ')
        fail({
          refusal: {
            status: 415,
            key: 'middleware.error.fileTypeNotAllowed',
            values: { types: allowed },
            defaultValue: `This file type is not allowed. Allowed types: ${allowed}.`,
          },
        })
        return
      }
      stream.on('limit', () => fail({ refusal: tooLarge }))
      // A storage refuses a file (a type it will not keep) with a 4xx error: the client's answer.
      const failed = (error: unknown): void => {
        const refusal = storageRefusal(error)
        fail(refusal ? { refusal } : { error })
      }
      let file: F
      try {
        file = storage.upload(fieldname, stream, info, failed)
      } catch (error) {
        stream.resume()
        failed(error)
        return
      }
      files.push(file)
      file.uploadPromise?.then(() => stored.add(file), failed)
    })

    parser.on('field', (name, value, info) => {
      if (state !== 'reading') return
      if (info.nameTruncated || info.valueTruncated) {
        fail({ refusal: fieldTooLarge })
        return
      }
      fields[name] = value
    })

    parser.on('filesLimit', () => fail({ refusal: tooManyFiles }))
    parser.on('fieldsLimit', () => fail({ refusal: fieldTooLarge }))
    parser.on('partsLimit', () => fail({ refusal: fieldTooLarge }))
    parser.on('error', (error: unknown) => {
      logger.debug('upload parser: malformed multipart body', { error })
      fail({ refusal: malformed })
    })

    parser.on('close', () => {
      if (state !== 'reading') return
      if (files.length === 0 && options.required !== false) {
        fail({
          refusal: {
            status: 400,
            key: 'middleware.error.fileMissing',
            values: { field: options.field },
            defaultValue: `Send a file in the "${options.field}" field.`,
          },
        })
        return
      }
      // The handler runs once every file is fully written; a failed write has already failed
      // the request through its uploadPromise.
      void Promise.allSettled(files.map((file) => file.uploadPromise)).then(() => {
        if (state !== 'reading') return
        state = 'done'
        req.body = fields
        setParsedUploads(req, options.field, files)
        // The parser goes on owning the files while the route runs. An answer that says the
        // request failed removes them; a 2xx or 3xx answer keeps them. A client that goes away
        // before the answer removes nothing: the handler may already have saved a row that points
        // at the file, and removing it then would lose a stored upload. Only the files the request
        // still lists are removed: the handler may have removed some itself (discardUploads()),
        // which forgets them.
        const listed = (): F[] =>
          getParsedUploads<F>(req, options.field).filter((file) => files.includes(file))
        res.once('finish', () => {
          if (res.statusCode >= 400) void discard(listed())
        })
        next()
      })
    })

    // A client that disconnects mid-upload leaves partial files behind unless they are removed.
    req.on('close', () => {
      if (!req.complete) fail('disconnected')
    })

    req.pipe(parser)
  }
}
