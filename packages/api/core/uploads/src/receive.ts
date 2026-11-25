/**
 * Route-level upload handling: receive a route's files into the bonded upload provider.
 *
 * @module
 */

import { getLogger } from '@molecule/api-bond'
import { t } from '@molecule/api-i18n'
import {
  createUploadParser,
  getParsedUploads,
  type Middleware,
  setParsedUploads,
  type UploadStorage,
} from '@molecule/api-middleware-body-parser'

import { isBlockedUploadType, UploadRefusedError } from './errors.js'
import { getProvider } from './provider.js'
import type { UploadedFile, UploadProvider } from './types.js'

const logger = getLogger()

/** The routes whose developer has been told, once, how to store the types a browser runs. */
const notedRoutes = new WeakSet<ReceiveUploadsOptions>()

/**
 * What an upload route accepts. Anything outside it is refused before the handler runs, with a
 * translated `{ error, errorKey }` body. The multipart parsing comes from the body parser bond
 * (`@molecule/api-middleware-body-parser-express` on Express), which `mlcl add` installs and
 * wires with the upload provider: a route needs only this package.
 */
export interface ReceiveUploadsOptions {
  /** The form field the files are sent in. A file in any other field is refused with 400. */
  field: string
  /** The largest file accepted, in bytes (default 10 MiB). A larger one is refused with 413. */
  maxFileBytes?: number
  /** The most files accepted in `field` (default 1). More are refused with 413. */
  maxFiles?: number
  /**
   * The MIME types accepted, as the client declares them (`'image/png'`, or `'image/*'` for a
   * whole family). Another type is refused with 415. Omit it to accept any type but those a
   * browser runs (see `allowActiveTypes`).
   */
  types?: readonly string[]
  /**
   * Store files of the types a browser runs when it opens them (HTML, SVG, JavaScript and every
   * XML type). Without it they are refused with 415 `uploads.error.fileTypeBlocked`, on every
   * provider, whatever `types` says. Set it only on a route whose files are served back through
   * `sendUpload()`, as downloads the browser does not open. Never set it on a route that shows its
   * files to users (an avatar, a gallery image): there the file would run on the app's origin.
   */
  allowActiveTypes?: boolean
  /** When false, a request with no file passes with none; by default it is refused with 400. */
  required?: boolean
  /** The most text fields accepted (default 20); they become `req.body`, as strings. */
  maxFields?: number
  /** The largest text field, in bytes (default 64 KiB). A larger one is refused with 413. */
  maxFieldBytes?: number
}

/**
 * Middleware that receives a route's uploaded files into the bonded upload provider.
 *
 * It refuses, before the handler runs and with a translated `{ error, errorKey }` body: a body
 * that is not `multipart/form-data` (415), a file over `maxFileBytes` or more than `maxFiles`
 * files (413), a type outside `types` or one a browser runs (415; see `allowActiveTypes`), a file
 * in another field or no file (400). When it
 * refuses, when storage fails, or when the client disconnects, every file it stored for the
 * request is removed. The handler runs once every file is fully stored: read them with
 * {@link getUploads}, and the text fields from `req.body` (as strings).
 *
 * It keeps owning the files after the handler starts. When the route then answers with a status
 * of 400 or more, they are removed too; a 2xx or 3xx answer keeps them, and so does a client that
 * goes away before the answer (the handler may already have saved what points at the file). A handler that fails need not clean up itself, though it can with
 * {@link discardUploads} (before it answers, or when it answers 2xx with the failure in the body).
 *
 * Put it after the route's authentication check, so an anonymous request is refused before
 * anything is stored. Calling it only records the options: the parser is built on the first
 * request, so a router module can be imported (by a test, before the bonds are wired) without a
 * body parser bond. It throws, when the router loads, for `types` that name a type a browser
 * runs without `allowActiveTypes: true`. Serve the files back with `sendUpload()`.
 *
 * @param options - The form field, and optionally the size cap (default 10 MiB), the accepted types
 *   and counts.
 * @returns The route's middleware.
 */
export const receiveUploads = (options: ReceiveUploadsOptions): Middleware => {
  const { allowActiveTypes = false, ...parserOptions } = options
  // A route that lists a type a browser runs means to store it: say how, when the router loads.
  const listed = (options.types ?? []).find((type) => isBlockedUploadType(type))
  if (listed && !allowActiveTypes)
    throw new Error(
      t(
        'uploads.error.activeTypeListed',
        { type: listed },
        {
          defaultValue:
            'receiveUploads() lists {{type}}, a type a browser runs. Pass allowActiveTypes: true to store it, and serve those files with sendUpload().',
        },
      ),
    )
  let parser: Middleware | undefined
  return (req, res, next) => {
    parser ??= createUploadParser<UploadedFile>({
      ...parserOptions,
      storage: () => routeStorage(getProvider(), options),
    })
    parser(req, res, next)
  }
}

/**
 * The bonded provider as a route stores into it: with the route's `allowActiveTypes` on each
 * file's info, and a note in the server log for the first file the route refuses for its type.
 *
 * @param provider - The bonded upload provider.
 * @param options - The route's options.
 * @returns The storage the upload parser writes to.
 */
const routeStorage = (
  provider: UploadProvider,
  options: ReceiveUploadsOptions,
): UploadStorage<UploadedFile> => {
  const { allowActiveTypes = false } = options
  return {
    upload: (fieldname, stream, info, onError) =>
      provider.upload(
        fieldname,
        stream,
        allowActiveTypes ? { ...info, allowActiveTypes } : info,
        (error) => {
          if (
            error instanceof UploadRefusedError &&
            error.errorKey === 'uploads.error.fileTypeBlocked'
          )
            noteTypeRefusal(options, error.values?.type)
          onError(error)
        },
      ),
    abortUpload: (file) => provider.abortUpload(file),
    deleteFile: (id) => provider.deleteFile(id),
  }
}

/**
 * Notes in the server log that a route refused a file of a type a browser runs: once per route at
 * `warn`, with the note a developer needs; after that at `debug`, since any client can cause one.
 *
 * @param options - The route that refused the file.
 * @param type - The type that was refused.
 */
const noteTypeRefusal = (
  options: ReceiveUploadsOptions,
  type: string | number | undefined,
): void => {
  if (notedRoutes.has(options)) {
    logger.debug('uploads: refused another file of a type a browser runs', { type })
    return
  }
  notedRoutes.add(options)
  logger.warn(
    'uploads: refused a file of a type a browser runs; that is the default. Set allowActiveTypes: true only on a route that serves its files as downloads through sendUpload(), never on one that shows them to users (an avatar, a gallery image): there a browser could run the file on your origin. Logged once per route.',
    { type },
  )
}

/**
 * The files {@link receiveUploads} stored for this request: the ones still in storage, so none
 * after {@link discardUploads} removed them.
 *
 * @param req - The request.
 * @param field - The form field, or every field when omitted.
 * @returns The stored files, in arrival order; empty when none were sent.
 */
export const getUploads = (req: unknown, field?: string): UploadedFile[] =>
  getParsedUploads<UploadedFile>(req, field)

/**
 * Removes the files {@link receiveUploads} stored for this request. Call it when the handler fails
 * after the upload and will not answer with an error status: a handler that reports the failure in
 * a 2xx body. One that throws, or answers 400 or more, needs no call: the parser removes the files
 * itself when it sees that answer.
 *
 * Each file removed is forgotten, so `getUploads(req)` no longer lists it and nothing removes it
 * twice. A file that cannot be removed is logged and stays listed, for the parser to try again.
 *
 * @param req - The request.
 */
export const discardUploads = async (req: unknown): Promise<void> => {
  const provider = getProvider()
  const removed = new Set<UploadedFile>()
  await Promise.all(
    getUploads(req).map(async (file) => {
      try {
        await provider.deleteFile(file.id)
        removed.add(file)
      } catch (error) {
        logger.warn('uploads: could not remove a file of a failed request', { id: file.id, error })
      }
    }),
  )
  // The request lists its files per form field, which is each file's own `fieldname`. Rewrite a
  // field's list without the files just removed, so the parser, which reads the list again when the
  // route fails after the upload, does not remove them a second time.
  for (const field of new Set([...removed].map((file) => file.fieldname)))
    setParsedUploads(
      req,
      field,
      getUploads(req, field).filter((file) => !removed.has(file)),
    )
}
