/**
 * Framework-neutral HTTP handlers for the video-render endpoints.
 *
 * Three handlers are exposed:
 *  - `POST /render/video`     → enqueue a job (calls {@link renderVideo})
 *  - `GET  /render/jobs/:id`  → read status     (calls {@link getRenderStatus})
 *  - `DELETE /render/jobs/:id`→ cancel job      (calls {@link cancelRender})
 *
 * Each handler accepts a minimal request/response contract that any HTTP
 * framework can adapt (Express, Fastify, Koa, Hono).
 *
 * @module
 */

import { cancelRender, getRenderStatus, renderVideo } from './renderVideo.js'
import type { RenderVideoOptions, VideoTimeline } from './types.js'

/**
 * Minimal request shape used by the render handlers.
 */
export interface VideoRenderRequest {
  /** Parsed JSON body — only needed for the enqueue endpoint. */
  body?: unknown
  /** Path parameters — `{ id: string }` for status/cancel. */
  params?: Record<string, string | undefined>
}

/**
 * Minimal response shape used by the render handlers.
 */
export interface VideoRenderResponse {
  /** Set the HTTP status code. */
  setStatus(status: number): void
  /** Write a JSON body and end the response. */
  sendJson(body: unknown): void
}

/**
 * Options for {@link createEnqueueRenderHandler}. The optional `validate`
 * hook can reject requests pre-flight (e.g. tier limits, max duration).
 */
export interface CreateEnqueueRenderHandlerOptions {
  /** Pre-flight validator — throw to reject with HTTP 400. */
  validate?: (timeline: VideoTimeline, options: RenderVideoOptions) => void | Promise<void>
}

/**
 * Build the `POST /render/video` handler. The request body must be
 * `{ timeline, options }` (or `{ video, options }`).
 *
 * @param handlerOptions - Optional validator hook.
 * @returns An async handler.
 */
export function createEnqueueRenderHandler(
  handlerOptions: CreateEnqueueRenderHandlerOptions = {},
): (req: VideoRenderRequest, res: VideoRenderResponse) => Promise<void> {
  return async function handle(req, res) {
    const parsed = parseEnqueueBody(req.body)
    if ('error' in parsed) {
      res.setStatus(400)
      res.sendJson({ error: parsed.error })
      return
    }

    if (handlerOptions.validate) {
      try {
        await handlerOptions.validate(parsed.timeline, parsed.options)
      } catch (err) {
        res.setStatus(400)
        res.sendJson({ error: err instanceof Error ? err.message : 'Validation failed' })
        return
      }
    }

    try {
      const job = await renderVideo(parsed.timeline, parsed.options)
      res.setStatus(202)
      res.sendJson(job)
    } catch (err) {
      res.setStatus(400)
      res.sendJson({ error: err instanceof Error ? err.message : 'Render failed' })
    }
  }
}

/**
 * Build the `GET /render/jobs/:id` handler.
 *
 * @returns An async handler.
 */
export function createGetRenderStatusHandler(): (
  req: VideoRenderRequest,
  res: VideoRenderResponse,
) => Promise<void> {
  return async function handle(req, res) {
    const id = req.params?.['id']
    if (typeof id !== 'string' || id.length === 0) {
      res.setStatus(400)
      res.sendJson({ error: 'Missing :id path parameter' })
      return
    }
    const status = await getRenderStatus(id)
    if (status.status === 'failed' && status.error === 'Unknown jobId') {
      res.setStatus(404)
      res.sendJson(status)
      return
    }
    res.setStatus(200)
    res.sendJson(status)
  }
}

/**
 * Build the `DELETE /render/jobs/:id` handler.
 *
 * @returns An async handler.
 */
export function createCancelRenderHandler(): (
  req: VideoRenderRequest,
  res: VideoRenderResponse,
) => Promise<void> {
  return async function handle(req, res) {
    const id = req.params?.['id']
    if (typeof id !== 'string' || id.length === 0) {
      res.setStatus(400)
      res.sendJson({ error: 'Missing :id path parameter' })
      return
    }
    const status = await cancelRender(id)
    res.setStatus(200)
    res.sendJson(status)
  }
}

interface ParsedEnqueueBody {
  timeline: VideoTimeline
  options: RenderVideoOptions
}

/**
 * Parse and shape-check the enqueue request body.
 *
 * @param body - Raw parsed JSON.
 */
function parseEnqueueBody(body: unknown): ParsedEnqueueBody | { error: string } {
  if (body === null || typeof body !== 'object') {
    return { error: 'Request body must be a JSON object' }
  }
  const obj = body as Record<string, unknown>
  const timelineRaw = obj['timeline'] ?? obj['video']
  if (!timelineRaw || typeof timelineRaw !== 'object') {
    return { error: 'Request body must contain `timeline`' }
  }
  const optionsRaw = obj['options']
  if (!optionsRaw || typeof optionsRaw !== 'object') {
    return { error: 'Request body must contain `options`' }
  }
  const options = optionsRaw as Record<string, unknown>
  if (typeof options['outputPath'] !== 'string') {
    return { error: 'options.outputPath must be a string' }
  }
  return {
    timeline: timelineRaw as unknown as VideoTimeline,
    options: optionsRaw as unknown as RenderVideoOptions,
  }
}
