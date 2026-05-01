/**
 * Framework-neutral HTTP handler for `POST /canvas/render`.
 *
 * Decoupled from any specific HTTP framework — accepts the minimal
 * {@link CanvasRenderRequest}/{@link CanvasRenderResponse} contract that
 * Express, Fastify, Koa, Hono, etc. all expose with a trivial adapter.
 *
 * @example
 * ```ts
 * // Express adapter
 * import express from 'express'
 * import { createCanvasRenderHandler } from '@molecule/api-canvas-render'
 *
 * const router = express.Router()
 * const handle = createCanvasRenderHandler()
 *
 * router.post('/canvas/render', async (req, res, next) => {
 *   try {
 *     await handle({ body: req.body }, {
 *       setHeader: (n, v) => res.setHeader(n, v),
 *       setStatus: (s) => { res.status(s) },
 *       sendBuffer: (buf) => { res.end(buf) },
 *       sendJson: (json) => { res.json(json) },
 *     })
 *   } catch (err) { next(err) }
 * })
 * ```
 *
 * @module
 */

import { renderCanvasDocument } from './renderCanvasDocument.js'
import type { CanvasDocument, RenderOptions } from './types.js'

/**
 * Minimal request shape consumed by {@link createCanvasRenderHandler}.
 */
export interface CanvasRenderRequest {
  /** Parsed JSON body — `{ doc, options }` envelope. */
  body: unknown
}

/**
 * Minimal response shape consumed by {@link createCanvasRenderHandler}.
 */
export interface CanvasRenderResponse {
  /** Set a single response header. */
  setHeader: (name: string, value: string) => void
  /** Set the HTTP status code. */
  setStatus: (status: number) => void
  /** Write a binary buffer body and end the response. */
  sendBuffer: (buffer: Buffer) => void
  /** Write a JSON body and end the response. */
  sendJson: (body: unknown) => void
}

/**
 * Options for {@link createCanvasRenderHandler}.
 */
export interface CreateCanvasRenderHandlerOptions {
  /**
   * Optional pre-flight validator. Throw to reject the request; the thrown
   * error's `.message` becomes the JSON `error` field with HTTP 400.
   */
  validate?: (doc: CanvasDocument, options: RenderOptions) => void | Promise<void>
  /** Default suggested filename (without extension). Defaults to `'canvas'`. */
  filename?: string
}

/**
 * Build a `(req, res) => Promise<void>` handler that invokes
 * {@link renderCanvasDocument} and streams the resulting buffer back.
 *
 * @param handlerOptions - Optional pre-flight validator + filename default.
 * @returns An async handler accepting `{ body }` and a response shim.
 */
export function createCanvasRenderHandler(
  handlerOptions: CreateCanvasRenderHandlerOptions = {},
): (req: CanvasRenderRequest, res: CanvasRenderResponse) => Promise<void> {
  const baseFilename = handlerOptions.filename ?? 'canvas'

  return async function handle(req: CanvasRenderRequest, res: CanvasRenderResponse): Promise<void> {
    const parsed = parseRequestBody(req.body)
    if ('error' in parsed) {
      res.setStatus(400)
      res.sendJson({ error: parsed.error })
      return
    }

    const { doc, options } = parsed

    if (handlerOptions.validate) {
      try {
        await handlerOptions.validate(doc, options)
      } catch (err) {
        res.setStatus(400)
        res.sendJson({
          error: err instanceof Error ? err.message : 'Validation failed',
        })
        return
      }
    }

    const result = await renderCanvasDocument(doc, options)

    res.setHeader('Content-Type', result.contentType)
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="${baseFilename}.${result.extension}"`,
    )
    res.setHeader('Content-Length', String(result.buffer.byteLength))
    res.setStatus(200)
    res.sendBuffer(result.buffer)
  }
}

interface ParsedBody {
  doc: CanvasDocument
  options: RenderOptions
}

/**
 * Coerce `req.body` into a `{ doc, options }` pair.
 *
 * @param body - Parsed JSON body.
 */
function parseRequestBody(body: unknown): ParsedBody | { error: string } {
  if (body === null || typeof body !== 'object') {
    return { error: 'Request body must be a JSON object' }
  }
  const obj = body as Record<string, unknown>
  const docRaw = obj['doc'] ?? obj['document']
  if (!docRaw || typeof docRaw !== 'object') {
    return { error: 'Request body must contain `doc` (the canvas document)' }
  }
  const doc = docRaw as Record<string, unknown>
  if (!Array.isArray(doc['layers'])) {
    return { error: 'doc.layers must be an array' }
  }
  if (typeof doc['width'] !== 'number' || typeof doc['height'] !== 'number') {
    return { error: 'doc.width and doc.height must be numbers' }
  }

  const optionsRaw =
    typeof obj['options'] === 'object' && obj['options'] !== null
      ? (obj['options'] as Record<string, unknown>)
      : {}
  const format = optionsRaw['format']
  if (format !== 'png' && format !== 'svg' && format !== 'pdf') {
    return { error: 'options.format must be one of: png, svg, pdf' }
  }
  return {
    doc: doc as unknown as CanvasDocument,
    options: optionsRaw as unknown as RenderOptions,
  }
}
