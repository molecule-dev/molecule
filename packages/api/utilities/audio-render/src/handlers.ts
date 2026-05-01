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
 * @example
 * ```ts
 * // Express adapter
 * import express from 'express'
 * import {
 *   createAudioRenderRoutes,
 * } from '@molecule/api-audio-render'
 *
 * const router = express.Router()
 * const routes = createAudioRenderRoutes()
 *
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

import { cancelRender, getRenderStatus, renderAudio } from './renderAudio.js'
import type { AudioRenderOptions, AudioSession, RenderJob } from './types.js'

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
   * Optional pre-flight validator. Throw to reject the enqueue request;
   * the thrown error's `.message` becomes the JSON `error` field with
   * HTTP 400.
   */
  validate?: (session: AudioSession, options: AudioRenderOptions) => void | Promise<void>
}

const isPlainObject = (value: unknown): value is Record<string, unknown> => {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

const parseEnqueueBody = (
  body: unknown,
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
  const options = isPlainObject(body['options']) ? (body['options'] as AudioRenderOptions) : {}
  return {
    session: session as unknown as AudioSession,
    options,
  }
}

/**
 * Build the audio-render HTTP route handlers.
 *
 * @param routeOptions - Optional pre-flight validator.
 * @returns A bundle of three async handlers.
 */
export const createAudioRenderRoutes = (
  routeOptions: CreateAudioRenderRoutesOptions = {},
): AudioRenderRoutes => {
  return {
    async enqueue(req, res) {
      const parsed = parseEnqueueBody(req.body)
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
