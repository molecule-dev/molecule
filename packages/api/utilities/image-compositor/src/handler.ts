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
  Gradient,
  Layer,
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
  const { width, height, background } = doc
  if (!isNumber(width) || !isNumber(height) || !isOptionalString(background)) {
    return { error: 'doc has invalid dimensions or background' }
  }
  const layers: Layer[] = []
  for (const source of doc.layers) {
    const layer = readLayer(source)
    if (!layer) return { error: 'doc.layers contains a malformed layer' }
    layers.push(layer)
  }
  const { quality, resize } = optionsRaw
  if (!isOptionalNumber(quality) || (resize !== undefined && !isResize(resize))) {
    return { error: 'options has an invalid quality or resize' }
  }
  return {
    doc: { ...doc, width, height, background, layers },
    options: { ...optionsRaw, format, quality, resize },
  }
}

/** Recognize a JSON object with named fields. */
function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

/** Check a number read from the request body. */
function isNumber(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value)
}

/** Check an optional numeric field. */
function isOptionalNumber(value: unknown): value is number | undefined {
  return value === undefined || isNumber(value)
}

/** Check an optional string field. */
function isOptionalString(value: unknown): value is string | undefined {
  return value === undefined || typeof value === 'string'
}

/** Check the optional output dimensions. */
function isResize(value: unknown): value is NonNullable<CompositeOptions['resize']> {
  return isRecord(value) && isOptionalNumber(value.width) && isOptionalNumber(value.height)
}

/** Rehydrate a Buffer serialized by Node's JSON representation. */
function readBuffer(value: unknown): Buffer | undefined {
  if (Buffer.isBuffer(value)) return value
  if (
    !isRecord(value) ||
    value.type !== 'Buffer' ||
    !Array.isArray(value.data) ||
    !value.data.every(
      (byte) => isNumber(byte) && Number.isInteger(byte) && byte >= 0 && byte <= 255,
    )
  ) {
    return undefined
  }
  return Buffer.from(value.data)
}

/** Check the geometry and color stops of a gradient. */
function isGradient(value: unknown): value is Gradient {
  if (
    !isRecord(value) ||
    !Array.isArray(value.stops) ||
    !value.stops.every(
      (stop) => isRecord(stop) && isNumber(stop.offset) && typeof stop.color === 'string',
    )
  )
    return false
  if (value.type === 'linear') return [value.x0, value.y0, value.x1, value.y1].every(isNumber)
  return value.type === 'radial' && [value.cx, value.cy, value.r].every(isNumber)
}

/** Read a compositing layer and convert serialized image and mask bytes. */
function readLayer(value: unknown): Layer | undefined {
  if (!isRecord(value)) return undefined
  const { kind, position, opacity, blendMode, mask: sourceMask } = value
  if (
    !isRecord(position) ||
    !isNumber(position.x) ||
    !isNumber(position.y) ||
    !isOptionalNumber(position.width) ||
    !isOptionalNumber(position.height) ||
    !isOptionalNumber(opacity)
  )
    return undefined
  if (
    blendMode !== undefined &&
    blendMode !== 'normal' &&
    blendMode !== 'multiply' &&
    blendMode !== 'screen' &&
    blendMode !== 'overlay'
  )
    return undefined
  let mask: Layer['mask']
  if (sourceMask !== undefined) {
    if (!isRecord(sourceMask) || !isNumber(sourceMask.width) || !isNumber(sourceMask.height))
      return undefined
    const data = readBuffer(sourceMask.data)
    if (!data) return undefined
    mask = { data, width: sourceMask.width, height: sourceMask.height }
  }
  const base: Omit<Layer, 'kind'> = {
    ...value,
    position: { x: position.x, y: position.y, width: position.width, height: position.height },
    opacity,
    blendMode,
    mask,
  }
  if (kind === 'fill' && typeof value.color === 'string')
    return { ...base, kind, color: value.color }
  if (kind === 'gradient' && isGradient(value.gradient))
    return { ...base, kind, gradient: value.gradient }
  if (kind === 'image') {
    const src = readBuffer(value.src)
    if (src) return { ...base, kind, src }
  }
  return undefined
}
