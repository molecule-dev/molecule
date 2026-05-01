/**
 * Framework-neutral HTTP handler for `GET /qr/:value`.
 *
 * Decoupled from any specific HTTP framework — accepts the minimal
 * {@link QrCodeRequest} / {@link QrCodeResponse} contract that Express,
 * Fastify, Koa, Hono, etc. all expose with a trivial adapter.
 *
 * @module
 */

import { generateQrCode } from './generateQrCode.js'
import {
  PNG_CONTENT_TYPE,
  SVG_CONTENT_TYPE,
  type QrCodeFormat,
  type QrErrorCorrectionLevel,
} from './types.js'

/**
 * Minimal request shape consumed by {@link createQrCodeHandler}.
 */
export interface QrCodeRequest {
  /** Value extracted from the URL path (`:value` route param). */
  params: { value: string }
  /**
   * Parsed querystring map. Recognized keys: `format`, `size`,
   * `errorCorrection`, `margin`, `fgColor`, `bgColor`.
   */
  query: Record<string, string | string[] | undefined>
}

/**
 * Minimal response shape consumed by {@link createQrCodeHandler}.
 */
export interface QrCodeResponse {
  /** Set a single response header. */
  setHeader: (name: string, value: string) => void
  /** Set the HTTP status code. */
  setStatus: (status: number) => void
  /** Write a binary buffer body and end the response. */
  sendBuffer: (buffer: Buffer) => void
  /** Write a text body (UTF-8) and end the response. */
  sendText: (body: string) => void
  /** Write a JSON body and end the response. */
  sendJson: (body: unknown) => void
}

/**
 * Options for {@link createQrCodeHandler}.
 */
export interface CreateQrCodeHandlerOptions {
  /**
   * Optional pre-flight validator. Throw to reject the request; the thrown
   * error's `.message` becomes the JSON `error` field with HTTP 400.
   */
  validate?: (value: string) => void | Promise<void>
  /** Maximum allowed `size` in pixels. Defaults to 1024. */
  maxSize?: number
  /** Default size when `?size=` is omitted. Defaults to 200. */
  defaultSize?: number
  /** Default format when `?format=` is omitted. Defaults to `'png'`. */
  defaultFormat?: QrCodeFormat
}

/**
 * Build a `(req, res) => Promise<void>` handler that decodes a path-param
 * value, generates the QR code in the requested format, and writes the
 * bytes back with appropriate `Content-Type` headers.
 *
 * @param handlerOptions - Optional pre-flight validator, max size, defaults.
 * @returns An async handler accepting `{ params, query }` and a response shim.
 *
 * @example
 * ```ts
 * // Express adapter
 * import express from 'express'
 * import { createQrCodeHandler } from '@molecule/api-qr-code'
 *
 * const router = express.Router()
 * const handle = createQrCodeHandler()
 *
 * router.get('/qr/:value', async (req, res, next) => {
 *   try {
 *     await handle(
 *       { params: { value: req.params.value }, query: req.query },
 *       {
 *         setHeader: (n, v) => res.setHeader(n, v),
 *         setStatus: (s) => { res.status(s) },
 *         sendBuffer: (buf) => { res.end(buf) },
 *         sendText: (txt) => { res.send(txt) },
 *         sendJson: (json) => { res.json(json) },
 *       },
 *     )
 *   } catch (err) { next(err) }
 * })
 * ```
 */
export function createQrCodeHandler(
  handlerOptions: CreateQrCodeHandlerOptions = {},
): (req: QrCodeRequest, res: QrCodeResponse) => Promise<void> {
  const maxSize = handlerOptions.maxSize ?? 1024
  const defaultSize = handlerOptions.defaultSize ?? 200
  const defaultFormat = handlerOptions.defaultFormat ?? 'png'

  return async function handle(req: QrCodeRequest, res: QrCodeResponse): Promise<void> {
    const value = decodeRouteValue(req.params?.value)
    if (!value) {
      res.setStatus(400)
      res.sendJson({ error: 'Missing path parameter `:value`.' })
      return
    }

    if (handlerOptions.validate) {
      try {
        await handlerOptions.validate(value)
      } catch (err) {
        res.setStatus(400)
        res.sendJson({ error: err instanceof Error ? err.message : 'Validation failed' })
        return
      }
    }

    const parsed = parseQuery(req.query, { defaultFormat, defaultSize, maxSize })
    if ('error' in parsed) {
      res.setStatus(400)
      res.sendJson({ error: parsed.error })
      return
    }

    const output = await generateQrCode(value, parsed.options)

    if (parsed.options.format === 'png') {
      const buf = output as Buffer
      res.setHeader('Content-Type', PNG_CONTENT_TYPE)
      res.setHeader('Content-Length', String(buf.byteLength))
      res.setStatus(200)
      res.sendBuffer(buf)
      return
    }

    // SVG and dataUrl are both UTF-8 strings; only the Content-Type differs.
    const contentType =
      parsed.options.format === 'dataUrl' ? 'text/plain; charset=utf-8' : SVG_CONTENT_TYPE
    res.setHeader('Content-Type', contentType)
    res.setStatus(200)
    res.sendText(output as string)
  }
}

/**
 * Decode a path-segment value safely (handles `%2F`, `%3D`, etc. that
 * frameworks sometimes leave URL-encoded for us).
 *
 * @param raw - Raw route param value.
 * @returns Decoded value, or `undefined` if missing/invalid.
 */
function decodeRouteValue(raw: string | undefined): string | undefined {
  if (typeof raw !== 'string' || raw.length === 0) return undefined
  try {
    return decodeURIComponent(raw)
  } catch {
    return raw
  }
}

interface ParsedQuery {
  options: {
    format: QrCodeFormat
    size: number
    errorCorrection?: QrErrorCorrectionLevel
    margin?: number
    fgColor?: string
    bgColor?: string
  }
}

/**
 * Pull the first string value off a querystring map (Express-style maps
 * sometimes hand out `string[]` for repeated keys).
 *
 * @param value - Single querystring value.
 * @returns First string value or undefined.
 */
function firstString(value: string | string[] | undefined): string | undefined {
  if (Array.isArray(value)) return value[0]
  return value
}

/**
 * Parse + validate the recognized querystring options.
 *
 * @param query - Raw querystring map.
 * @param defaults - Handler-level defaults + max size cap.
 * @returns Parsed options or an `{ error }` envelope.
 */
function parseQuery(
  query: QrCodeRequest['query'] | undefined,
  defaults: { defaultFormat: QrCodeFormat; defaultSize: number; maxSize: number },
): ParsedQuery | { error: string } {
  const q = query ?? {}
  const formatRaw = firstString(q['format']) ?? defaults.defaultFormat
  if (formatRaw !== 'svg' && formatRaw !== 'png' && formatRaw !== 'dataUrl') {
    return { error: `format must be one of: svg, png, dataUrl (got "${formatRaw}")` }
  }

  const sizeRaw = firstString(q['size'])
  let size = defaults.defaultSize
  if (sizeRaw !== undefined) {
    const parsed = Number(sizeRaw)
    if (!Number.isFinite(parsed) || parsed <= 0) {
      return { error: 'size must be a positive number' }
    }
    if (parsed > defaults.maxSize) {
      return { error: `size must be ≤ ${defaults.maxSize}` }
    }
    size = parsed
  }

  const ecRaw = firstString(q['errorCorrection'])
  let errorCorrection: QrErrorCorrectionLevel | undefined
  if (ecRaw !== undefined) {
    if (ecRaw !== 'L' && ecRaw !== 'M' && ecRaw !== 'Q' && ecRaw !== 'H') {
      return { error: 'errorCorrection must be one of: L, M, Q, H' }
    }
    errorCorrection = ecRaw
  }

  const marginRaw = firstString(q['margin'])
  let margin: number | undefined
  if (marginRaw !== undefined) {
    const parsed = Number(marginRaw)
    if (!Number.isFinite(parsed) || parsed < 0) {
      return { error: 'margin must be a non-negative number' }
    }
    margin = parsed
  }

  return {
    options: {
      format: formatRaw,
      size,
      ...(errorCorrection !== undefined && { errorCorrection }),
      ...(margin !== undefined && { margin }),
      ...(firstString(q['fgColor']) !== undefined && { fgColor: firstString(q['fgColor'])! }),
      ...(firstString(q['bgColor']) !== undefined && { bgColor: firstString(q['bgColor'])! }),
    },
  }
}
