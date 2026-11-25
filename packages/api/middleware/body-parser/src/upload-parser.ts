/**
 * The route-level upload parser: the one place a `multipart/form-data` body is read.
 *
 * The app-wide body parser reads JSON and URL-encoded bodies and leaves a multipart body
 * unread, so a route's upload parser can stream its file parts to storage with that route's
 * own limits. (When the global parser drained multipart bodies itself, every upload route had
 * to be mounted before it, and one mounted after it waited forever for a body already read.)
 *
 * @module
 */

import { bond, get as bondGet } from '@molecule/api-bond'

import type { Middleware } from './parser.js'

/** What the parser tells storage about one file part, as the client declared it. */
export interface UploadPartInfo {
  /** The client's filename, `undefined` when it sent none. Never use it as a storage key. */
  filename: string | undefined
  /** The part's transfer encoding, e.g. `7bit`. */
  encoding: string
  /** The part's declared MIME type, e.g. `image/png`. The client chooses it. */
  mimeType: string
}

/** A file storage is receiving or has received. */
export interface StoredUpload {
  /** The storage id. */
  id: string
  /** Settles when the file is fully written; rejects when writing fails or is aborted. */
  uploadPromise?: Promise<void>
}

/**
 * An error a storage passes to `onError` to refuse a file rather than to report that storing it
 * failed (a type it will not keep): the parser answers `status` (4xx) with the message of
 * `errorKey` as JSON, as it answers its own refusals. `UploadRefusedError` from
 * `@molecule/api-uploads` has this shape.
 */
export interface StorageRefusal extends Error {
  /** The HTTP status to answer, 400-499. */
  status: number
  /** The translation key of the message. */
  errorKey: string
  /** The values the message interpolates. */
  values?: Record<string, string | number>
}

/**
 * Where an upload parser stores accepted file parts. The bonded uploads provider of
 * `@molecule/api-uploads` has this shape.
 */
export interface UploadStorage<F extends StoredUpload = StoredUpload> {
  /**
   * Start storing one file part.
   *
   * @param fieldname - The form field the part was sent in.
   * @param stream - The part's bytes.
   * @param info - What the client declared about the part.
   * @param onError - Called when storing fails, or with a {@link StorageRefusal} to refuse the
   *   file: the client gets that status, not a server error.
   * @returns The file being stored.
   */
  upload(
    fieldname: string,
    stream: NodeJS.ReadableStream,
    info: UploadPartInfo,
    onError: (error: Error) => void,
  ): F
  /**
   * Stop storing a file whose `uploadPromise` is still pending and remove what was written.
   *
   * @param file - The file being stored.
   */
  abortUpload(file: F): void | Promise<void>
  /**
   * Remove a stored file.
   *
   * @param id - Its storage id.
   */
  deleteFile(id: string): Promise<void>
}

/** The largest file a route accepts when it names no `maxFileBytes`: 10 MiB. */
export const DEFAULT_MAX_FILE_BYTES = 10 * 1024 * 1024

/** The most text fields a route accepts when it names no `maxFields`. */
export const DEFAULT_MAX_FIELDS = 20

/** The largest text field a route accepts when it names no `maxFieldBytes`: 64 KiB. */
export const DEFAULT_MAX_FIELD_BYTES = 64 * 1024

/**
 * What one route accepts. Anything outside it is refused before the handler runs. A bond applies
 * the `DEFAULT_*` limits above to the ones a route leaves out.
 *
 * `@molecule/api-uploads` declares the same fields (less `storage`) as `ReceiveUploadsOptions`, so a
 * route reads them in one place: change both together.
 */
export interface UploadParserOptions<F extends StoredUpload = StoredUpload> {
  /** The form field the files are sent in. A file in any other field is refused with 400. */
  field: string
  /**
   * The largest file accepted, in bytes (default {@link DEFAULT_MAX_FILE_BYTES}, 10 MiB). A larger
   * one is refused with 413.
   */
  maxFileBytes?: number
  /** The most files accepted in `field` (default 1). More are refused with 413. */
  maxFiles?: number
  /**
   * The MIME types accepted, as the client declares them (`'image/png'`, or `'image/*'` for a
   * whole family). Another type is refused with 415. Omit it to accept any type.
   */
  types?: readonly string[]
  /** When false, a request with no file passes with none; by default it is refused with 400. */
  required?: boolean
  /** The most text fields accepted (default {@link DEFAULT_MAX_FIELDS}); they become `req.body`, as strings. */
  maxFields?: number
  /**
   * The largest text field, in bytes (default {@link DEFAULT_MAX_FIELD_BYTES}, 64 KiB). A larger one
   * is refused with 413.
   */
  maxFieldBytes?: number
  /** The storage for this request's files, read when a request arrives. */
  storage: () => UploadStorage<F>
}

/**
 * Creates a route's upload parser. It answers 415 for a body that is not multipart, 400 for a
 * malformed one, and stores accepted files only after the checks above pass. When any check
 * fails, storage fails, or the client disconnects, it removes every file it stored for the
 * request. The handler runs only when every file is fully stored.
 *
 * The parser goes on owning them after the handler starts. When the route answers with a status
 * of 400 or more, it removes the files the request still lists through {@link getParsedUploads}; a
 * 2xx or 3xx answer keeps them, and so does a client that goes away before the answer. Whatever removes
 * a stored file itself takes it off that list with {@link setParsedUploads}, so nothing removes
 * a file twice.
 */
export type UploadParserFactory = <F extends StoredUpload>(
  options: UploadParserOptions<F>,
) => Middleware

const BOND_TYPE_UPLOAD_FACTORY = 'middleware:body-parser:upload-factory'

/** Where an upload parser puts the files it stored, on the request. */
const UPLOADS_PROPERTY = 'uploads'

/**
 * Bonds the upload parser factory {@link createUploadParser} uses.
 *
 * @param factory - A body parser bond's upload parser factory.
 */
export const setUploadParserFactory = (factory: UploadParserFactory): void => {
  bond(BOND_TYPE_UPLOAD_FACTORY, factory)
}

/**
 * Gets the bonded upload parser factory.
 *
 * @returns The factory, or `null` if none has been bonded.
 */
export const getUploadParserFactory = (): UploadParserFactory | null =>
  bondGet<UploadParserFactory>(BOND_TYPE_UPLOAD_FACTORY) ?? null

/**
 * Creates a route's upload parser through the bonded factory. The factory is looked up on the
 * first request, so a router can be built before the bonds are wired.
 *
 * @param options - What the route accepts and where its files are stored.
 * @returns Middleware to put on the route, after its authentication check.
 * @throws {Error} On the first request, when no upload parser factory has been bonded.
 */
export const createUploadParser = <F extends StoredUpload>(
  options: UploadParserOptions<F>,
): Middleware => {
  let parser: Middleware | undefined
  return (req, res, next) => {
    if (!parser) {
      const factory = getUploadParserFactory()
      if (!factory) {
        next(
          new Error(
            'No upload parser factory has been bonded. Install a body parser bond (e.g., @molecule/api-middleware-body-parser-express) and call setUploadParserFactory().',
          ),
        )
        return
      }
      parser = factory(options)
    }
    parser(req, res, next)
  }
}

/**
 * Records the files an upload parser stored for a request. Called by body parser bonds.
 *
 * @param req - The request.
 * @param field - The form field the files came in.
 * @param files - The stored files, in arrival order.
 */
export const setParsedUploads = <F extends StoredUpload>(
  req: unknown,
  field: string,
  files: F[],
): void => {
  const target = req as Record<string, Record<string, StoredUpload[]> | undefined>
  target[UPLOADS_PROPERTY] = { ...target[UPLOADS_PROPERTY], [field]: files }
}

/**
 * The files the route's upload parser stored for a request and that are still in storage: the
 * list the parser removes when the route fails after the upload. Whatever removes one of them
 * itself takes it off the list, with {@link setParsedUploads}.
 *
 * @param req - The request.
 * @param field - The form field, or every field when omitted.
 * @returns The stored files, in arrival order; empty when there are none.
 */
export const getParsedUploads = <F extends StoredUpload>(req: unknown, field?: string): F[] => {
  const uploads = (req as Record<string, Record<string, F[]> | undefined> | null)?.[
    UPLOADS_PROPERTY
  ]
  if (!uploads) return []
  return field === undefined ? Object.values(uploads).flat() : (uploads[field] ?? [])
}
