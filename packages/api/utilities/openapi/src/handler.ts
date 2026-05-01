/**
 * Framework-agnostic handler factory that serves an `OpenApiDoc` as
 * `application/json`. The returned function works with any
 * Express-shaped `(req, res)` pair (Connect, Express, Fastify-via-
 * compat, restify) — the request/response duck-types are minimal.
 *
 * @module
 */

import type { OpenApiDoc, OpenApiHandlerRequest, OpenApiHandlerResponse } from './types.js'

/** Options for `createOpenApiHandler()`. */
export interface OpenApiHandlerOptions {
  /**
   * Pretty-print the JSON output. Defaults to `false` so prod
   * payloads stay compact; turn on in dev for readable bodies.
   */
  pretty?: boolean
  /**
   * Override the `Content-Type` header (default
   * `application/json; charset=utf-8`).
   */
  contentType?: string
}

/**
 * Create a `GET /openapi.json` HTTP handler that responds with the
 * supplied OpenAPI document.
 *
 * The handler:
 * - Sends `405 Method Not Allowed` for non-`GET` requests.
 * - Sends `200` + `application/json; charset=utf-8` with the doc
 *   stringified (optionally pretty).
 * - Falls back from `res.json` → `res.send` → `res.end` so it works
 *   with Express, Connect, and bare-Node `http` handlers.
 *
 * @param doc - The OpenAPI document to serve.
 * @param options - Optional formatting/content-type overrides.
 * @returns A `(req, res) => void` handler.
 */
export const createOpenApiHandler = (
  doc: OpenApiDoc,
  options: OpenApiHandlerOptions = {},
): ((req: OpenApiHandlerRequest, res: OpenApiHandlerResponse) => void) => {
  const contentType = options.contentType ?? 'application/json; charset=utf-8'
  const body = options.pretty ? JSON.stringify(doc, null, 2) : JSON.stringify(doc)

  return (req, res) => {
    const method = (req.method ?? 'GET').toUpperCase()
    if (method !== 'GET' && method !== 'HEAD') {
      res.setHeader?.('Allow', 'GET, HEAD')
      sendStatus(res, 405, 'Method Not Allowed')
      return
    }
    res.setHeader?.('Content-Type', contentType)
    if (typeof res.status === 'function') {
      res.status(200)
    } else {
      res.statusCode = 200
    }
    if (typeof res.json === 'function') {
      res.json(JSON.parse(body))
      return
    }
    if (typeof res.send === 'function') {
      res.send(method === 'HEAD' ? '' : body)
      return
    }
    res.end?.(method === 'HEAD' ? undefined : body)
  }
}

/** Internal: write a status-only response across the various shapes. */
const sendStatus = (res: OpenApiHandlerResponse, code: number, message: string): void => {
  if (typeof res.status === 'function') {
    res.status(code)
  } else {
    res.statusCode = code
  }
  if (typeof res.send === 'function') {
    res.send(message)
    return
  }
  res.end?.(message)
}
