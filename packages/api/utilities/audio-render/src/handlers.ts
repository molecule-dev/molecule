/**
 * Framework-neutral HTTP handlers for the audio-render queue.
 *
 * Routes:
 * - `POST /render/audio`        — enqueue a session, return the {@link RenderJob}.
 * - `GET  /render/jobs/:id`     — return the current status of a job.
 * - `DELETE /render/jobs/:id`   — request cancellation of a job.
 *
 * The handlers don't bind to Express / Fastify / Koa directly; they
 * accept the same minimal request/response shim the canvas-render package
 * uses, so any framework adapter is a few lines of glue.
 *
 * The request body is untrusted. `enqueue` never forwards a client's
 * `outputPath`, `queueName` or `allowRemoteSources`: it mints the output
 * path inside the configured `outputDir` from a random UUID and resolves
 * every clip `audioUrl` against the configured `mediaRoot` (URLs, `..`
 * segments and absolute paths outside the root are rejected with HTTP 400).
 * Mount all three routes behind authentication.
 *
 * @example
 * ```ts
 * // Express adapter
 * import express from 'express'
 * import {
 *   createAudioRenderRoutes,
 * } from '@molecule/api-audio-render'
 *
 * const router = express.Router()
 * const routes = createAudioRenderRoutes({
 *   mediaRoot: '/srv/app/uploads', // clip audioUrls must resolve inside this dir
 *   outputDir: '/srv/app/renders', // output is written here as <uuid>.<format>
 * })
 *
 * // Mount behind your authentication middleware.
 * router.post('/render/audio', (req, res, next) =>
 *   routes.enqueue({ body: req.body }, expressShim(res)).catch(next),
 * )
 * router.get('/render/jobs/:id', (req, res, next) =>
 *   routes.status({ params: req.params }, expressShim(res)).catch(next),
 * )
 * router.delete('/render/jobs/:id', (req, res, next) =>
 *   routes.cancel({ params: req.params }, expressShim(res)).catch(next),
 * )
 * ```
 *
 * @module
 */

import { createOutputPath, resolveMediaSource } from './mediaPaths.js'
import {
  assertAllowedAudioFormat,
  cancelRender,
  getRenderStatus,
  renderAudio,
} from './renderAudio.js'
import type {
  AudioChannel,
  AudioClip,
  AudioRenderFormat,
  AudioRenderOptions,
  AudioSession,
  RenderJob,
} from './types.js'

/** Minimal request shape consumed by the handlers. */
export interface AudioRenderRequest {
  /** Parsed JSON body (POST). */
  body?: unknown
  /** Path parameters (`:id`). */
  params?: Record<string, string | undefined>
}

/** Minimal response shape consumed by the handlers. */
export interface AudioRenderResponse {
  setStatus: (status: number) => void
  sendJson: (body: unknown) => void
}

/**
 * Bundle of route handlers returned by {@link createAudioRenderRoutes}.
 */
export interface AudioRenderRoutes {
  /** `POST /render/audio` — enqueue a session. */
  enqueue: (req: AudioRenderRequest, res: AudioRenderResponse) => Promise<void>
  /** `GET /render/jobs/:id` — fetch a job's status. */
  status: (req: AudioRenderRequest, res: AudioRenderResponse) => Promise<void>
  /** `DELETE /render/jobs/:id` — request cancellation. */
  cancel: (req: AudioRenderRequest, res: AudioRenderResponse) => Promise<void>
}

/** Options for {@link createAudioRenderRoutes}. */
export interface CreateAudioRenderRoutesOptions {
  /**
   * Directory every clip `audioUrl` must live under. Relative paths resolve
   * against it; URLs, `..` segments and paths outside it are rejected.
   */
  mediaRoot: string
  /** Directory rendered files are written to, as `<uuid>.<format>`. */
  outputDir: string
  /**
   * Optional pre-flight validator. Throw to reject the enqueue request;
   * the thrown error's `.message` becomes the JSON `error` field with
   * HTTP 400.
   */
  validate?: (session: AudioSession, options: AudioRenderOptions) => void | Promise<void>
}

const isPlainObject = (value: unknown): value is Record<string, unknown> => {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

/**
 * Parse the enqueue body into a confined session and server-built options.
 * Only `format`, `sampleRate`, `channels` and `bitrate` are read from the
 * client's `options`.
 *
 * @param body - Raw parsed JSON.
 * @param mediaRoot - Directory clip sources must resolve inside.
 * @param outputDir - Directory the output path is minted in.
 * @returns The confined session and options, or an error message.
 */
const parseEnqueueBody = (
  body: unknown,
  mediaRoot: string,
  outputDir: string,
): { session: AudioSession; options: AudioRenderOptions } | { error: string } => {
  if (!isPlainObject(body)) {
    return { error: 'Request body must be a JSON object' }
  }
  const session = body['session']
  if (!isPlainObject(session)) {
    return { error: 'Request body must include `session` (an AudioSession object)' }
  }
  if (!Array.isArray((session as Record<string, unknown>)['channels'])) {
    return { error: 'session.channels must be an array' }
  }
  const rawOptions = body['options'] ?? {}
  if (!isPlainObject(rawOptions)) {
    return { error: '`options` must be an object' }
  }
  const client = rawOptions as AudioRenderOptions
  try {
    const format: AudioRenderFormat =
      client.format === undefined ? 'mp3' : assertAllowedAudioFormat(client.format)
    const options: AudioRenderOptions = { format, outputPath: createOutputPath(outputDir, format) }
    if (client.sampleRate !== undefined) options.sampleRate = client.sampleRate
    if (client.channels !== undefined) options.channels = client.channels
    if (client.bitrate !== undefined) options.bitrate = client.bitrate
    return {
      session: confineSession(session as unknown as AudioSession, mediaRoot),
      options,
    }
  } catch (err) {
    return { error: err instanceof Error ? err.message : 'Invalid request' }
  }
}

/**
 * Copy a session with every clip `audioUrl` resolved inside `mediaRoot`.
 * Structural validation is left to {@link renderAudio}.
 *
 * @param session - The untrusted session.
 * @param mediaRoot - Directory clip sources must resolve inside.
 * @returns A new session whose sources are absolute, confined paths.
 */
const confineSession = (session: AudioSession, mediaRoot: string): AudioSession => ({
  ...session,
  channels: session.channels.map((channel: AudioChannel) => {
    if (!channel || !Array.isArray(channel.clips)) return channel
    return {
      ...channel,
      clips: channel.clips.map((clip: AudioClip) => ({
        ...clip,
        audioUrl: resolveMediaSource(
          clip?.audioUrl,
          mediaRoot,
          `channel ${channel.id} clip audioUrl`,
        ),
      })),
    }
  }),
})

/**
 * Build the audio-render HTTP route handlers.
 *
 * @param routeOptions - Media root, output directory and optional validator.
 * @returns A bundle of three async handlers.
 * @throws {TypeError} If `mediaRoot` or `outputDir` is missing.
 */
export const createAudioRenderRoutes = (
  routeOptions: CreateAudioRenderRoutesOptions,
): AudioRenderRoutes => {
  const { mediaRoot, outputDir } = routeOptions ?? {}
  if (typeof mediaRoot !== 'string' || mediaRoot.length === 0) {
    throw new TypeError('createAudioRenderRoutes requires a mediaRoot directory')
  }
  if (typeof outputDir !== 'string' || outputDir.length === 0) {
    throw new TypeError('createAudioRenderRoutes requires an outputDir directory')
  }
  return {
    async enqueue(req, res) {
      const parsed = parseEnqueueBody(req.body, mediaRoot, outputDir)
      if ('error' in parsed) {
        res.setStatus(400)
        res.sendJson({ error: parsed.error })
        return
      }
      try {
        if (routeOptions.validate) {
          await routeOptions.validate(parsed.session, parsed.options)
        }
        const job = await renderAudio(parsed.session, parsed.options)
        res.setStatus(202)
        res.sendJson(serializeJob(job))
      } catch (err) {
        res.setStatus(400)
        res.sendJson({ error: err instanceof Error ? err.message : 'Bad request' })
      }
    },

    async status(req, res) {
      const id = req.params?.['id']
      if (!id) {
        res.setStatus(400)
        res.sendJson({ error: 'Missing :id parameter' })
        return
      }
      const job = getRenderStatus(id)
      if (!job) {
        res.setStatus(404)
        res.sendJson({ error: 'Job not found' })
        return
      }
      res.setStatus(200)
      res.sendJson(serializeJob(job))
    },

    async cancel(req, res) {
      const id = req.params?.['id']
      if (!id) {
        res.setStatus(400)
        res.sendJson({ error: 'Missing :id parameter' })
        return
      }
      const cancelled = cancelRender(id)
      if (!cancelled) {
        const job = getRenderStatus(id)
        if (!job) {
          res.setStatus(404)
          res.sendJson({ error: 'Job not found' })
          return
        }
        res.setStatus(409)
        res.sendJson({ error: `Job already ${job.status}` })
        return
      }
      const job = getRenderStatus(id)
      res.setStatus(200)
      res.sendJson(job ? serializeJob(job) : { id, status: 'cancelled' })
    },
  }
}

/**
 * Convert a {@link RenderJob} into a JSON-serializable payload.
 *
 * @param job
 * @internal
 */
const serializeJob = (job: RenderJob): Record<string, unknown> => {
  return {
    id: job.id,
    status: job.status,
    queueName: job.queueName,
    outputPath: job.outputPath,
    format: job.format,
    options: job.options,
    enqueuedAt: job.enqueuedAt.toISOString(),
    startedAt: job.startedAt?.toISOString(),
    finishedAt: job.finishedAt?.toISOString(),
    error: job.error,
  }
}
