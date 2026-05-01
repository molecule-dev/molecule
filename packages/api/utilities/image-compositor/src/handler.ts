/**
 * Framework-neutral HTTP handler for `POST /image/composite`.
 *
 * Decoupled from any concrete HTTP framework — accepts the minimal
 * {@link CompositeRequest}/{@link CompositeResponse} contract that
 * Express, Fastify, Koa, Hono, etc. all expose with a trivial adapter.
 *
 * The handler delegates to {@link compositeImage}, which itself goes
 * through `bond('image')` for raster I/O — this module never imports
 * `sharp` or any concrete image library.
 *
 * @example
 * ```ts
 * // Express adapter
 * import express from 'express'
 * import { createImageCompositeHandler } from '@molecule/api-image-compositor'
 *
 * const router = express.Router()
 * const handle = createImageCompositeHandler()
 *
 * router.post('/image/composite', async (req, res, next) => {
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

import { compositeImage } from './compositeImage.js'
import type {
  CompositeFormat,
  CompositeOptions,
  CompositorDependencies,
  LayeredImage,
} from './types.js'

/**
 * Minimal request shape consumed by {@link createImageCompositeHandler}.
 */
export interface CompositeRequest {
  /** Parsed JSON body — `{ doc, options }` envelope. */
  body: unknown
}

/**
 * Minimal response shape consumed by {@link createImageCompositeHandler}.
 */
export interface CompositeResponse {
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
 * Options for {@link createImageCompositeHandler}.
 */
export interface CreateImageCompositeHandlerOptions {
  /**
   * Optional pre-flight validator. Throw to reject the request; the thrown
   * error's `.message` becomes the JSON `error` field with HTTP 400.
   */
  validate?: (doc: LayeredImage, options: CompositeOptions) => void | Promise<void>
  /** Default suggested filename (without extension). Defaults to `'composite'`. */
  filename?: string
  /** Optional dependencies forwarded to {@link compositeImage}. */
  deps?: CompositorDependencies
}

/**
 * Map an output format to a `Content-Type` header value.
 *
 * @param format - Composite output format.
 */
export function contentTypeForFormat(format: CompositeFormat): string {
  switch (format) {
    case 'png':
      return 'image/png'
    case 'jpeg':
      return 'image/jpeg'
    case 'webp':
      return 'image/webp'
  }
}

/**
 * Map an output format to a file extension (without leading dot).
 *
 * @param format - Composite output format.
 */
export function extensionForFormat(format: CompositeFormat): string {
  switch (format) {
    case 'png':
      return 'png'
    case 'jpeg':
      return 'jpg'
    case 'webp':
      return 'webp'
  }
}

/**
 * Build a `(req, res) => Promise<void>` handler that invokes
 * {@link compositeImage} and streams the resulting buffer back.
 *
 * @param handlerOptions - Optional validator / filename / deps.
 * @returns An async handler accepting `{ body }` and a response shim.
 */
export function createImageCompositeHandler(
  handlerOptions: CreateImageCompositeHandlerOptions = {},
): (req: CompositeRequest, res: CompositeResponse) => Promise<void> {
  const baseFilename = handlerOptions.filename ?? 'composite'

  return async function handle(req: CompositeRequest, res: CompositeResponse): Promise<void> {
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

    const buffer = await compositeImage(doc, options, handlerOptions.deps)
    const format = options.format ?? 'png'
    const contentType = contentTypeForFormat(format)
    const extension = extensionForFormat(format)

    res.setHeader('Content-Type', contentType)
    res.setHeader('Content-Disposition', `attachment; filename="${baseFilename}.${extension}"`)
    res.setHeader('Content-Length', String(buffer.byteLength))
    res.setStatus(200)
    res.sendBuffer(buffer)
  }
}

interface ParsedBody {
  doc: LayeredImage
  options: CompositeOptions
}

/**
 * Coerce `req.body` into a `{ doc, options }` pair, lightly validated.
 *
 * Heavyweight validation (asset sizes, MIME sniffing, etc.) is the
 * caller's responsibility via the `validate` hook.
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
    return { error: 'Request body must contain `doc` (the layered-image document)' }
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
  if (format !== undefined && format !== 'png' && format !== 'jpeg' && format !== 'webp') {
    return { error: 'options.format must be one of: png, jpeg, webp' }
  }
  return {
    doc: doc as unknown as LayeredImage,
    options: optionsRaw as unknown as CompositeOptions,
  }
}
