/**
 * Wraps resource handler functions into Express-compatible middleware.
 *
 * Resource handlers return `{ statusCode, headers?, body }` objects instead of
 * calling `res.status().send()` directly, making them easier to test and
 * reuse across different HTTP frameworks (Express, Lambda, etc.).
 *
 * @module
 */

/* eslint-disable @typescript-eslint/no-explicit-any */
import { getLogger } from '@molecule/api-bond'

import type { MoleculeNextFunction, MoleculeRequest, MoleculeResponse } from './http-types.js'
const logger = getLogger()
import { t } from '@molecule/api-i18n'

/**
 * A resource handler function that processes a request and returns a structured
 * response object. If it returns `null` or `undefined`, the request is passed
 * to the next middleware via `next()`.
 *
 * @param req - The incoming HTTP request.
 * @param res - The HTTP response (available but handlers should return a Response instead of calling `res` directly).
 */
export type Handler = (
  req: MoleculeRequest,
  res: MoleculeResponse,
) => Promise<Response | null | undefined> | Response | null | undefined

/**
 * Structured response object returned by resource handlers. Contains the HTTP
 * status code, optional headers, and the response body payload.
 */
export interface Response {
  /**
   * HTTP status code to return.
   */
  statusCode: number
  /**
   * Optional map of HTTP header keys to values.
   */
  headers?: Record<string, string>
  /**
   * The response payload to return.
   */
  body: any
}

/**
 * Wraps a resource handler into Express-compatible middleware. Calls the handler,
 * then applies `statusCode`, `headers`, and `body` to the response. If the handler
 * returns null/undefined, calls `next()`. Catches errors and forwards them as
 * i18n-translated error messages.
 *
 * @param handler - The resource handler function to wrap.
 * @returns An Express-compatible middleware function `(req, res, next) => void`.
 */
export const createRequestHandler =
  (handler: Handler) =>
  async (req: MoleculeRequest, res: MoleculeResponse, next: MoleculeNextFunction) => {
    try {
      const response = await handler(req, res)

      if (response) {
        if (response.headers) {
          res.set(response.headers)
        }

        res.status(response.statusCode)
        res.send(response.body)
      } else {
        next()
      }
    } catch (error) {
      logger.error(error)
      next(t('resource.error.unknownError', undefined, { defaultValue: 'Something went wrong.' }))
    }
  }
