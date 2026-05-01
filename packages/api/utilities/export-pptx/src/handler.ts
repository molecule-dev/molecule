/**
 * Framework-neutral HTTP handler for `POST /export/pptx`.
 *
 * The handler is decoupled from any specific HTTP framework — it accepts the
 * minimal {@link PptxRequest}/{@link PptxResponse} contract Express,
 * Fastify, Koa, Hono, etc. all expose with trivial adapters. This keeps
 * `@molecule/api-export-pptx` swappable per the molecule decoupling
 * principle: the route module in your app maps the framework's
 * (req, res) shape onto this contract.
 *
 * @example
 * ```ts
 * // Express adapter (in a route file owned by the app)
 * import express from 'express'
 * import { createPptxExportHandler } from '@molecule/api-export-pptx'
 *
 * const router = express.Router()
 * const handle = createPptxExportHandler()
 *
 * router.post('/export/pptx', async (req, res, next) => {
 *   try {
 *     await handle({
 *       body: req.body,
 *     }, {
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

import { exportPptx } from './exportPptx.js'
import type { Deck, ExportPptxOptions } from './types.js'

/**
 * Minimal request shape consumed by {@link createPptxExportHandler}. The
 * adapter is responsible for parsing JSON before calling — most frameworks
 * already have body-parser middleware that does this.
 */
export interface PptxRequest {
  /** Parsed JSON body — expected shape is `Deck` (optionally `{ deck, options }`). */
  body: unknown
}

/**
 * Minimal response shape consumed by {@link createPptxExportHandler}. The
 * adapter forwards calls to the underlying framework's response object.
 */
export interface PptxResponse {
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
 * Options for {@link createPptxExportHandler}.
 */
export interface CreatePptxExportHandlerOptions {
  /**
   * Optional pre-flight validator. Throw to reject the request; the thrown
   * error's `.message` becomes the JSON `error` field with HTTP 400.
   * Use this to enforce app-specific size/auth/quota rules.
   */
  validate?: (deck: Deck, options: ExportPptxOptions) => void | Promise<void>
}

/**
 * Build a `(req, res) => Promise<void>` handler that:
 *
 * 1. Reads `req.body` (a parsed `Deck`, or `{ deck, options }`).
 * 2. Calls {@link exportPptx} to produce the `.pptx` buffer.
 * 3. Writes `Content-Type`, `Content-Disposition: attachment`, and
 *    `Content-Length` headers.
 * 4. Streams the buffer back as the response body.
 *
 * @param handlerOptions - Optional pre-flight validator.
 * @returns An async handler accepting {@link PptxRequest} + {@link PptxResponse}.
 */
export function createPptxExportHandler(
  handlerOptions: CreatePptxExportHandlerOptions = {},
): (req: PptxRequest, res: PptxResponse) => Promise<void> {
  return async function handle(req: PptxRequest, res: PptxResponse): Promise<void> {
    const parsed = parseRequestBody(req.body)
    if ('error' in parsed) {
      res.setStatus(400)
      res.sendJson({ error: parsed.error })
      return
    }

    const { deck, options } = parsed

    if (handlerOptions.validate) {
      try {
        await handlerOptions.validate(deck, options)
      } catch (err) {
        res.setStatus(400)
        res.sendJson({
          error: err instanceof Error ? err.message : 'Validation failed',
        })
        return
      }
    }

    const result = await exportPptx(deck, options)

    res.setHeader('Content-Type', result.contentType)
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="${encodeFilename(result.filename)}"`,
    )
    res.setHeader('Content-Length', String(result.buffer.byteLength))
    res.setStatus(200)
    res.sendBuffer(result.buffer)
  }
}

interface ParsedBody {
  deck: Deck
  options: ExportPptxOptions
}

/**
 * Coerce `req.body` into a `Deck` + `ExportPptxOptions`. Accepts either a
 * bare `Deck` (legacy shape) or a `{ deck, options }` envelope (preferred).
 * @param body
 */
function parseRequestBody(body: unknown): ParsedBody | { error: string } {
  if (body === null || typeof body !== 'object') {
    return { error: 'Request body must be a JSON object' }
  }

  const obj = body as Record<string, unknown>

  // Envelope shape: { deck, options? }
  if ('deck' in obj && obj['deck'] && typeof obj['deck'] === 'object') {
    const deck = obj['deck'] as Record<string, unknown>
    if (!Array.isArray(deck['slides'])) {
      return { error: 'deck.slides must be an array' }
    }
    return {
      deck: deck as unknown as Deck,
      options:
        typeof obj['options'] === 'object' && obj['options'] !== null
          ? (obj['options'] as ExportPptxOptions)
          : {},
    }
  }

  // Bare Deck shape: { slides: [...] }
  if (Array.isArray(obj['slides'])) {
    return { deck: obj as unknown as Deck, options: {} }
  }

  return { error: 'Request body must contain `slides` (or `deck.slides`)' }
}

/**
 * RFC 5987 / RFC 6266-friendly filename encoder. ASCII filenames are
 * passed through; anything outside ASCII is percent-encoded so the value
 * remains valid inside `filename="..."`.
 * @param filename
 */
function encodeFilename(filename: string): string {
  // eslint-disable-next-line no-control-regex
  return filename.replace(/[\x00-\x1f"\\]/g, (c) => {
    if (c === '"' || c === '\\') return '\\' + c
    return '%' + c.charCodeAt(0).toString(16).padStart(2, '0').toUpperCase()
  })
}
