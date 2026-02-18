/**
 * Express body parser implementation for molecule.dev.
 *
 * @see https://expressjs.com/en/api.html#express.json
 * @see https://www.npmjs.com/package/connect-busboy
 *
 * @module
 */

import connectBusboy from 'connect-busboy'
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
const jsonParser = express.json({ verify: setRawBody })

// Use busboy for parsing multipart bodies.
const busboy = connectBusboy()

// Same as busboy's content type checker.
const shouldUseBusboy = (contentType?: string): boolean =>
  /^(?:multipart\/.+)|(?:application\/x-www-form-urlencoded)$/i.test(contentType || ``)

/**
 * Asynchronously handles each field for multipart requests.
 *
 * Fields are assigned to `req.body` similarly to the JSON parser where each
 * field is attempted to be parsed as JSON.
 * @param req - The request object.
 */
const handleMultipart = (req: express.Request): Promise<void> =>
  new Promise<void>((resolve, reject) => {
    req.busboy.on(`field`, (key, value) => {
      try {
        // Attempt to parse field value as JSON
        value = JSON.parse(value)
      } catch {
        // Keep as string if not valid JSON
      }

      req.body[key] = value
    })

    req.busboy.on(`file`, (fieldname, stream) => {
      // Skip files in basic body parser - use @molecule/utilities-files for file handling
      stream.resume()
    })

    req.busboy.on(`finish`, () => {
      resolve()
    })

    req.busboy.on(`error`, (error: Error) => {
      reject(error)
    })

    req.on(`close`, () => {
      reject(new Error(`Request closed unexpectedly.`))
    })

    req.pipe(req.busboy)
  })

/**
 * Our custom multipart parser which uses busboy to parse form fields.
 *
 * For file uploads, use `@molecule/utilities-files` instead.
 * @param req - The Express request to parse.
 * @param res - The Express response (used to send 400 on parse errors).
 * @param next - The next Express middleware function.
 * @returns A promise that resolves when the multipart body has been parsed.
 */
const multipartParser: express.RequestHandler = (req, res, next) =>
  busboy(req, res, async (error) => {
    if (error) {
      next(error)
      return
    }

    try {
      req.body = {}
      await handleMultipart(req)
      next()
    } catch (error) {
      logger.error(error)
      res.status(400).send({
        error: t('middleware.error.badRequest', undefined, { defaultValue: 'Bad request.' }),
        errorKey: 'middleware.error.badRequest',
      })
    }
  })

/**
 * Express body parser middleware provider.
 *
 * Routes requests to the appropriate parser: `busboy` for multipart/form-data and
 * URL-encoded bodies, or Express's built-in JSON parser for everything else.
 * Sets `req.rawBody` for Stripe and similar libraries that need the unparsed body.
 *
 * For file uploads, use `@molecule/utilities-files`.
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

  if (shouldUseBusboy(expressReq.headers[`content-type`])) {
    multipartParser(expressReq, expressRes, next as express.NextFunction)
  } else {
    jsonParser(expressReq, expressRes, next as express.NextFunction)
  }
}

/**
 * Creates a JSON body parser middleware with custom options (e.g. custom `limit`, `type`, or `verify`).
 * @param options - Express JSON parser options passed directly to `express.json()`.
 * @returns A `Middleware` that parses JSON request bodies with the specified options.
 */
export const jsonParserFactory = (options?: JsonParserOptions): Middleware =>
  express.json(options) as unknown as Middleware
