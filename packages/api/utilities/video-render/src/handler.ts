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
 * The request body is untrusted. The enqueue handler never forwards a
 * client's `outputPath`, `jobId`, `queueName` or `allowRemoteSources`: it
 * mints the output path inside the configured `outputDir` from a random
 * UUID, lets {@link renderVideo} generate the job id, and resolves every clip
 * source against the configured `mediaRoot` (URLs, `..` segments and
 * absolute paths outside the root are rejected with HTTP 400). All three
 * handlers must be mounted behind authentication.
 *
 * @module
 */

import { assertAllowedFormat } from './buildFfmpegArgs.js'
import { createOutputPath, resolveMediaSource } from './mediaPaths.js'
import { cancelRender, getRenderStatus, renderVideo } from './renderVideo.js'
import type {
  RenderVideoOptions,
  VideoClip,
  VideoRenderFormat,
  VideoTimeline,
  VideoTrack,
} from './types.js'

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
 * Options for {@link createEnqueueRenderHandler}. `mediaRoot` and
 * `outputDir` are required; the optional `validate` hook can reject
 * requests pre-flight (e.g. tier limits, max duration).
 */
export interface CreateEnqueueRenderHandlerOptions {
  /**
   * Directory every clip source must live under. Relative sources resolve
   * against it; URLs, `..` segments and paths outside it are rejected.
   */
  mediaRoot: string
  /** Directory rendered files are written to, as `<uuid>.<format>`. */
  outputDir: string
  /** Pre-flight validator — throw to reject with HTTP 400. */
  validate?: (timeline: VideoTimeline, options: RenderVideoOptions) => void | Promise<void>
}

/**
 * Build the `POST /render/video` handler. The request body must be
 * `{ timeline, options? }` (or `{ video, options? }`). Only `format`,
 * `resolution`, `fps`, `codec` and `crf` are read from `options`.
 *
 * @param handlerOptions - Media root, output directory and optional validator.
 * @returns An async handler.
 * @throws {TypeError} If `mediaRoot` or `outputDir` is missing.
 */
export function createEnqueueRenderHandler(
  handlerOptions: CreateEnqueueRenderHandlerOptions,
): (req: VideoRenderRequest, res: VideoRenderResponse) => Promise<void> {
  const { mediaRoot, outputDir } = handlerOptions ?? {}
  if (typeof mediaRoot !== 'string' || mediaRoot.length === 0) {
    throw new TypeError('createEnqueueRenderHandler requires a mediaRoot directory')
  }
  if (typeof outputDir !== 'string' || outputDir.length === 0) {
    throw new TypeError('createEnqueueRenderHandler requires an outputDir directory')
  }
  return async function handle(req, res) {
    const parsed = parseEnqueueBody(req.body, mediaRoot, outputDir)
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
 * Parse the enqueue request body into a confined timeline and server-built
 * options. Client fields outside the allow-list are dropped.
 *
 * @param body - Raw parsed JSON.
 * @param mediaRoot - Directory clip sources must resolve inside.
 * @param outputDir - Directory the output path is minted in.
 * @returns The confined timeline and options, or an error message.
 */
function parseEnqueueBody(
  body: unknown,
  mediaRoot: string,
  outputDir: string,
): ParsedEnqueueBody | { error: string } {
  if (body === null || typeof body !== 'object') {
    return { error: 'Request body must be a JSON object' }
  }
  const obj = body as Record<string, unknown>
  const timelineRaw = obj['timeline'] ?? obj['video']
  if (!timelineRaw || typeof timelineRaw !== 'object') {
    return { error: 'Request body must contain `timeline`' }
  }
  const optionsRaw = obj['options'] ?? {}
  if (typeof optionsRaw !== 'object' || optionsRaw === null) {
    return { error: '`options` must be an object' }
  }
  const client = optionsRaw as Partial<RenderVideoOptions>
  try {
    const format: VideoRenderFormat =
      client.format === undefined
        ? 'mp4'
        : (assertAllowedFormat(client.format) as VideoRenderFormat)
    const options: RenderVideoOptions = { format, outputPath: createOutputPath(outputDir, format) }
    if (client.resolution !== undefined) options.resolution = client.resolution
    if (client.fps !== undefined) options.fps = client.fps
    if (client.codec !== undefined) options.codec = client.codec
    if (client.crf !== undefined) options.crf = client.crf
    return {
      timeline: confineTimeline(timelineRaw as VideoTimeline, mediaRoot),
      options,
    }
  } catch (err) {
    return { error: err instanceof Error ? err.message : 'Invalid request' }
  }
}

/**
 * Copy a timeline with every clip source resolved inside `mediaRoot`.
 * Structural validation is left to {@link renderVideo}.
 *
 * @param timeline - The untrusted timeline.
 * @param mediaRoot - Directory clip sources must resolve inside.
 * @returns A new timeline whose sources are absolute, confined paths.
 */
function confineTimeline(timeline: VideoTimeline, mediaRoot: string): VideoTimeline {
  if (!Array.isArray(timeline.tracks)) return timeline
  return {
    ...timeline,
    tracks: timeline.tracks.map((track: VideoTrack) => {
      if (!track || !Array.isArray(track.clips)) return track
      return {
        ...track,
        clips: track.clips.map((clip: VideoClip) => ({
          ...clip,
          source: resolveMediaSource(
            clip?.source,
            mediaRoot,
            `track[${track.id}].clip[${clip?.id}].source`,
          ),
        })),
      }
    }),
  }
}
