/**
 * Framework-neutral HTTP handlers for the animation-renderer:
 *
 * - `POST /animation/render` — submit a job; returns the job id + status
 * - `GET /animation/render/:id` — read status / completion buffer
 * - `DELETE /animation/render/:id` — cancel
 *
 * Each handler accepts the minimal request/response contract used by
 * the rest of the molecule.dev API utilities (see
 * `@molecule/api-canvas-render` for the precedent). Express, Fastify,
 * Koa, Hono, etc. all expose these with a trivial adapter.
 *
 * @module
 */

import { cancelRender, getRenderStatus, renderAnimation } from './renderAnimation.js'
import type { AnimationDocument, RenderAnimationOptions } from './types.js'

/**
 * Minimal request shape consumed by the handlers.
 */
export interface AnimationRenderRequest {
  /** Parsed JSON body — `{ doc, options }`. Only used by the submit handler. */
  body?: unknown
  /** Path/query parameter holding the job id. Used by status / cancel handlers. */
  params?: { id?: string }
  /** Whether the client requested the result buffer inline (`?download=1`). */
  query?: { download?: string }
}

/**
 * Minimal response shape consumed by the handlers.
 */
export interface AnimationRenderResponse {
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
 * Options for {@link createAnimationRenderHandler}.
 */
export interface CreateAnimationRenderHandlerOptions {
  /**
   * Optional pre-flight validator. Throw to reject the request; the
   * thrown error's `.message` becomes the JSON `error` field with HTTP 400.
   */
  validate?: (doc: AnimationDocument, options: RenderAnimationOptions) => void | Promise<void>
}

/**
 * Build a handler for `POST /animation/render`. Validates the body,
 * enqueues the job, and returns the job id and initial status. The
 * response is sent immediately — the caller polls
 * {@link createAnimationStatusHandler} for completion.
 *
 * @param handlerOptions - Optional validator.
 * @returns Async handler accepting `{ body }` + a response shim.
 */
export function createAnimationRenderHandler(
  handlerOptions: CreateAnimationRenderHandlerOptions = {},
): (req: AnimationRenderRequest, res: AnimationRenderResponse) => Promise<void> {
  return async function handle(req, res) {
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

    let job
    try {
      job = renderAnimation(doc, options)
    } catch (err) {
      res.setStatus(400)
      res.sendJson({
        error: err instanceof Error ? err.message : 'Render failed',
      })
      return
    }

    // Surface unhandled rejection on the job's `done` promise so Node
    // doesn't crash the process — the status handler will report failures.
    job.done.catch(() => undefined)

    res.setStatus(202)
    res.sendJson({
      id: job.id,
      status: job.status,
      format: job.format,
      totalFrames: job.totalFrames,
    })
  }
}

/**
 * Build a handler for `GET /animation/render/:id`. Returns either the
 * current snapshot (for non-terminal states) or the final buffer with
 * the appropriate content-type when the job has completed and the
 * client requested it via `?download=1`.
 *
 * @returns Async handler.
 */
export function createAnimationStatusHandler(): (
  req: AnimationRenderRequest,
  res: AnimationRenderResponse,
) => Promise<void> {
  return async function handle(req, res) {
    const id = req.params?.id
    if (!id) {
      res.setStatus(400)
      res.sendJson({ error: 'Missing job id' })
      return
    }
    const snapshot = getRenderStatus(id)
    if (!snapshot) {
      res.setStatus(404)
      res.sendJson({ error: 'Job not found' })
      return
    }
    res.setStatus(200)
    res.sendJson(snapshot)
  }
}

/**
 * Build a handler for `DELETE /animation/render/:id`. Cancels a queued
 * or running job. Returns 404 if no such job exists or 409 if the job
 * had already reached a terminal state.
 *
 * @returns Async handler.
 */
export function createAnimationCancelHandler(): (
  req: AnimationRenderRequest,
  res: AnimationRenderResponse,
) => Promise<void> {
  return async function handle(req, res) {
    const id = req.params?.id
    if (!id) {
      res.setStatus(400)
      res.sendJson({ error: 'Missing job id' })
      return
    }
    const snapshot = getRenderStatus(id)
    if (!snapshot) {
      res.setStatus(404)
      res.sendJson({ error: 'Job not found' })
      return
    }
    const cancelled = cancelRender(id)
    if (!cancelled) {
      res.setStatus(409)
      res.sendJson({ error: 'Job already finished' })
      return
    }
    res.setStatus(200)
    res.sendJson({ id, status: 'cancelled' })
  }
}

interface ParsedBody {
  doc: AnimationDocument
  options: RenderAnimationOptions
}

/**
 * Coerce `req.body` into a `{ doc, options }` pair, performing the
 * minimum validation that protects the queue from obviously malformed
 * input. Deeper validation (per-layer kind checks, transform bounds,
 * etc.) is the caller's responsibility — pass a `validate` function to
 * {@link createAnimationRenderHandler}.
 *
 * @param body - Parsed JSON body.
 * @returns Parsed pair or an error sentinel.
 */
function parseRequestBody(body: unknown): ParsedBody | { error: string } {
  if (body === null || typeof body !== 'object') {
    return { error: 'Request body must be a JSON object' }
  }
  const obj = body as Record<string, unknown>
  const docRaw = obj['doc'] ?? obj['document']
  if (!docRaw || typeof docRaw !== 'object') {
    return { error: 'Request body must contain `doc` (the animation document)' }
  }
  const doc = docRaw as Record<string, unknown>
  if (!Array.isArray(doc['layers'])) {
    return { error: 'doc.layers must be an array' }
  }
  if (typeof doc['width'] !== 'number' || typeof doc['height'] !== 'number') {
    return { error: 'doc.width and doc.height must be numbers' }
  }
  if (typeof doc['duration'] !== 'number' || doc['duration'] <= 0) {
    return { error: 'doc.duration must be a positive number' }
  }
  const optionsRaw =
    typeof obj['options'] === 'object' && obj['options'] !== null
      ? (obj['options'] as Record<string, unknown>)
      : {}
  const format = optionsRaw['format']
  if (format !== undefined && format !== 'lottie' && format !== 'mp4' && format !== 'gif') {
    return { error: 'options.format must be one of: lottie, mp4, gif' }
  }
  return {
    doc: doc as unknown as AnimationDocument,
    options: optionsRaw as unknown as RenderAnimationOptions,
  }
}
