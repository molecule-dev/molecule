/**
 * Express body parser implementation for molecule.dev.
 *
 * @see https://expressjs.com/en/api.html#express.json
 * @see https://www.npmjs.com/package/busboy
 *
 * @module
 */

import busboy from 'busboy'
import express from 'express'

import { getLogger } from '@molecule/api-bond'
const logger = getLogger()
import './types.js'

import { t } from '@molecule/api-i18n'
import type { JsonParserOptions, Middleware } from '@molecule/api-middleware-body-parser'

/**
 * By default, our parser sets `req.body` to an object mapping each field to its data,
 * but some third party libraries (e.g., Stripe webhook verification) need the original (raw) body.
 * @param req - The Express request; `rawBody` is set on it.
 * @param res - The Express response (unused, required by Express verify callback signature).
 * @param buffer - The raw request body buffer.
 * @param encoding - The buffer encoding (defaults to `'utf8'`).
 */
const setRawBody = (
  req: express.Request,
  res: express.Response,
  buffer: Buffer,
  encoding: BufferEncoding,
): void => {
  if (buffer?.length) {
    req.rawBody = buffer.toString(encoding || `utf8`)
  }
}

// Use the JSON parser that comes with Express, with our `req.rawBody` customization.
// Explicit limit prevents ambiguity and protects against oversized payloads.
const jsonParser = express.json({ verify: setRawBody, limit: '2mb' })

// Use busboy for parsing URL-encoded bodies.
// Limit fields to prevent abuse (e.g. sending thousands of form fields to exhaust memory).
// busboy drops every field past its limit without a word, so one more than the limit is passed and
// `readFormFields` counts the fields itself: the field past the limit is the one it refuses on.
const FORM_MAX_FIELDS = 100
const FORM_LIMITS = {
  fields: FORM_MAX_FIELDS + 1,
  fieldSize: 1024 * 1024,
  files: 0,
  fileSize: 1024,
  parts: 110,
}

// Overall cumulative cap on buffered FIELD bytes, matching the 2mb JSON limit.
// Without this, busboy's per-field `fieldSize` (1mb) × `fields` (100) allowed ~100mb of
// buffered field data per request — a memory-exhaustion DoS that bypassed the JSON cap. [C9-1]
const FORM_MAX_TOTAL_BYTES = 2 * 1024 * 1024

/**
 * A URL-encoded form body. Parameters (`; charset=UTF-8`, which `fetch` adds to a
 * `URLSearchParams` body) do not change the type.
 *
 * @param contentType - The request's `Content-Type`.
 * @returns True for `application/x-www-form-urlencoded`.
 */
export const isUrlEncoded = (contentType?: string): boolean =>
  /^application\/x-www-form-urlencoded(?:\s*;|$)/i.test(contentType || ``)

/**
 * A multipart body, which only a route's upload parser reads (`uploadParserFactory`).
 *
 * @param contentType - The request's `Content-Type`.
 * @returns True for any `multipart/*` type.
 */
export const isMultipartBody = (contentType?: string): boolean =>
  /^multipart\//i.test(contentType || ``)

/**
 * Why a URL-encoded body was not parsed whole. Each is the client's doing, never a server error.
 */
type UrlEncodedBodyStop = 'tooLarge' | 'malformed' | 'disconnected'

/** What each stop is, in the log. */
const URL_ENCODED_STOP_MESSAGE: Record<UrlEncodedBodyStop, string> = {
  tooLarge: 'A URL-encoded body is over a limit: a field, the whole body, or the number of fields.',
  malformed: 'Malformed urlencoded form.',
  disconnected: 'Request closed unexpectedly.',
}

/** The answer to a URL-encoded body that was refused, for a client still there to read it. */
const URL_ENCODED_ANSWER = {
  413: { errorKey: 'middleware.error.payloadTooLarge', defaultValue: 'The request is too large.' },
  400: { errorKey: 'middleware.error.badRequest', defaultValue: 'Bad request.' },
} as const

/**
 * A URL-encoded body that was not parsed whole: it was over a size limit (answered 413), busboy
 * could not read it (400), or the client went away before it arrived (nobody is left to answer).
 */
class UrlEncodedBodyError extends Error {
  /**
   * A body that was not parsed whole.
   * @param stop - What stopped it.
   * @param options - The busboy error as `cause`, when busboy could not read the body.
   */
  constructor(
    readonly stop: UrlEncodedBodyStop,
    options?: ErrorOptions,
  ) {
    super(URL_ENCODED_STOP_MESSAGE[stop], options)
    this.name = 'UrlEncodedBodyError'
  }

  /** The status to answer: 413 or 400, or `null` when the client is gone. */
  get status(): 400 | 413 | null {
    if (this.stop === 'disconnected') return null
    return this.stop === 'tooLarge' ? 413 : 400
  }
}

/**
 * Reads a URL-encoded body into `req.body`. Its promise resolves once the form body has been
 * parsed, and rejects with an {@link UrlEncodedBodyError} when the body is refused or abandoned.
 *
 * Fields are assigned to `req.body` similarly to the JSON parser where each
 * field is attempted to be parsed as JSON.
 * @param req - The request object.
 * @param parser - The busboy parser for its body.
 */
const readFormFields = (req: express.Request, parser: busboy.Busboy): Promise<void> =>
  new Promise<void>((resolve, reject) => {
    let totalBytes = 0
    let fieldCount = 0
    let settled = false

    /** Stops reading: the body is refused, or its client is gone. */
    const stop = (cause: UrlEncodedBodyStop, options?: ErrorOptions): void => {
      if (settled) return
      settled = true
      req.unpipe(parser)
      reject(new UrlEncodedBodyError(cause, options))
    }

    parser.on(`field`, (key, value, info) => {
      if (settled) return
      // busboy drops every field past the limit without a word: the field past it is refused
      // here, so a form never reaches a handler with fields missing.
      if (++fieldCount > FORM_MAX_FIELDS) {
        stop('tooLarge')
        return
      }
      // A field busboy cut at its limit is not the field the client sent: refuse the body, as the
      // upload parser does, rather than pass on a value or a name that is cut short.
      if (info.nameTruncated || info.valueTruncated) {
        stop('tooLarge')
        return
      }
      // Enforce the cumulative byte ceiling on the ORIGINAL field bytes (before JSON
      // parsing) so a flood of large fields can't exhaust memory. [C9-1]
      totalBytes += Buffer.byteLength(key) + Buffer.byteLength(value)
      if (totalBytes > FORM_MAX_TOTAL_BYTES) {
        stop('tooLarge')
        return
      }

      try {
        // Attempt to parse field value as JSON
        value = JSON.parse(value)
      } catch (_error) {
        // Keep as string if not valid JSON — JSON.parse failure here is expected and safe to ignore.
      }

      req.body[key] = value
    })

    parser.on(`file`, (_fieldname, stream) => {
      // A URL-encoded body carries no files; drain anything busboy reports as one.
      stream.resume()
    })

    parser.on(`finish`, () => {
      if (settled) return
      settled = true
      resolve()
    })

    parser.on(`error`, (error: Error) => {
      stop('malformed', { cause: error })
    })

    req.on(`close`, () => {
      stop('disconnected')
    })

    req.pipe(parser)
  })

/**
 * Our URL-encoded form parser, which uses busboy to parse form fields.
 * @param req - The Express request to parse.
 * @param res - The Express response (used to send 400 or 413 when the body is refused).
 * @param next - The next Express middleware function.
 * @returns A promise that resolves when the form body has been parsed.
 */
const urlEncodedParser: express.RequestHandler = async (req, res, next) => {
  try {
    const parser = busboy({ headers: req.headers, limits: FORM_LIMITS })
    req.body = {}
    await readFormFields(req, parser)
    next()
  } catch (error) {
    const body = error instanceof UrlEncodedBodyError ? error : null
    if (body?.stop === 'disconnected') {
      // The client is gone: not a server error, and nobody is left to answer.
      logger.debug(
        'body parser: the client closed the request before its URL-encoded body arrived',
        {
          error,
        },
      )
      return
    }
    const status = body?.status ?? 400
    if (body) {
      // A body over a limit or unreadable is the client's doing: not a server error.
      logger.debug('body parser: refused a URL-encoded body', { status, error })
    } else {
      logger.error(error)
    }
    const answer = URL_ENCODED_ANSWER[status]
    res.status(status).send({
      error: t(answer.errorKey, undefined, { defaultValue: answer.defaultValue }),
      errorKey: answer.errorKey,
    })
  }
}

/**
 * Express body parser middleware provider.
 *
 * Routes requests to the appropriate parser: `busboy` for URL-encoded bodies, or Express's
 * built-in JSON parser for everything else. A multipart body is left unread for the route's
 * upload parser (`receiveUploads()` from `@molecule/api-uploads`), so an upload route works
 * wherever it is mounted. `req.body` is `{}` whenever no parser read the request (a multipart
 * or `text/plain` body, or none), so a handler reading a field never throws on `undefined`.
 * Sets `req.rawBody` for Stripe and similar libraries that need the unparsed body.
 * @param req - The incoming request object.
 * @param res - The response object.
 * @param next - The next middleware function.
 */
export const provider: Middleware = (req, res, next) => {
  const expressReq = req as express.Request
  const expressRes = res as express.Response

  // Guard against malformed requests with null headers
  if (!expressReq.headers) {
    expressReq.body = {}
    next()
    return
  }

  const contentType = expressReq.headers[`content-type`]
  if (isMultipartBody(contentType)) {
    expressReq.body ??= {}
    next()
  } else if (isUrlEncoded(contentType)) {
    urlEncodedParser(expressReq, expressRes, next as express.NextFunction)
  } else {
    jsonParser(expressReq, expressRes, (error?: unknown) => {
      if (!error) expressReq.body ??= {}
      next(error)
    })
  }
}

/**
 * Creates a JSON body parser middleware with custom options (e.g. custom `limit`, `type`, or `verify`).
 * @param options - Express JSON parser options passed directly to `express.json()`.
 * @returns A `Middleware` that parses JSON request bodies with the specified options.
 */
export const jsonParserFactory = (options?: JsonParserOptions): Middleware => {
  const middleware = express.json(options)
  return (req, res, next) => middleware(req as express.Request, res as express.Response, next)
}
