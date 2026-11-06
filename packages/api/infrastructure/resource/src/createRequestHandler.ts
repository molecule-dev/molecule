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
 * Request overrides, or an explicit response that stops before the handler.
 * The response form supports extra validation and unresolved external filters
 * without writing data or inventing a placeholder identifier.
 */
export type RequestMappingResult = Partial<MoleculeRequest> | { response: Response }

/**
 * Per-route wire-format adapters. Validation and authorization still belong to
 * the original handler. Omit these options to retain its native contract.
 */
export interface RequestHandlerOptions {
  /**
   * Return the fields to replace before the handler validates the request.
   * The adapter preserves the original request's methods and getters, and does
   * not mutate it. Returning `{ body }` or `{ query }` is sufficient, including
   * frameworks whose request properties have read-only accessors.
   * Return `{ response: { statusCode, headers?, body } }` to answer before the
   * handler runs. That result still goes through mapResponse, with the original request.
   */
  mapRequest?: (
    req: MoleculeRequest,
    res: MoleculeResponse,
  ) => RequestMappingResult | Promise<RequestMappingResult>
  /**
   * Adapt the returned status, headers or body. This sees error and partial
   * responses too: narrow the success shape before changing it, and preserve
   * headers with `{ ...response, body }`. It never runs for fall-through.
   */
  mapResponse?: (
    response: Response,
    req: MoleculeRequest,
    res: MoleculeResponse,
  ) => Response | Promise<Response>
}

/**
 * Compose wire-format adapters around a structured resource handler without
 * sending its response. The response mapper receives the adapted request.
 * Exceptions propagate to the caller's normal error boundary.
 *
 * @param handler - The existing resource handler, including its checks.
 * @param options - Request and response mappings for this route only.
 * @returns A structured handler that keeps null/undefined fall-through intact.
 */
export const adaptHandler =
  (handler: Handler, options: RequestHandlerOptions = {}): Handler =>
  async (req, res) => {
    const overrides = options.mapRequest ? await options.mapRequest(req, res) : undefined
    const earlyResponse = overrides && 'response' in overrides ? overrides.response : undefined
    const request: MoleculeRequest =
      overrides && !earlyResponse
        ? Object.create(req, Object.getOwnPropertyDescriptors(overrides))
        : req
    const response = earlyResponse ?? (await handler(request, res))
    return response && options.mapResponse
      ? await options.mapResponse(response, request, res)
      : response
  }

/**
 * Wraps a resource handler into Express-compatible middleware. Calls the handler,
 * then applies `statusCode`, `headers`, and `body` to the response. If the handler
 * returns null/undefined, calls `next()`. Catches errors and forwards them as
 * i18n-translated error messages.
 *
 * @param handler - The resource handler function to wrap.
 * @param options - Optional wire-format mappings; neither mutates the shared handler.
 * @returns An Express-compatible middleware function `(req, res, next) => void`.
 */
export const createRequestHandler = (handler: Handler, options: RequestHandlerOptions = {}) => {
  const adapted = adaptHandler(handler, options)
  return async (req: MoleculeRequest, res: MoleculeResponse, next: MoleculeNextFunction) => {
    try {
      const response = await adapted(req, res)

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
}
