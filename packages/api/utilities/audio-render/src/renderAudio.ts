/**
 * Public surface: dispatch an {@link AudioSession} to the render queue
 * and look up / cancel previously-dispatched jobs.
 *
 * The actual ffmpeg invocation lives in `worker.ts` — `renderAudio`
 * itself never spawns a child process; it just enqueues a payload and
 * registers a {@link RenderJob} the caller can poll.
 *
 * @module
 */

import { tmpdir } from 'node:os'
import { join } from 'node:path'

import { send } from '@molecule/api-queue'

import { sanitizeAudioPath } from './ffmpegCommand.js'
import { getJob, registerJob, updateJob } from './jobStore.js'
import type {
  AudioRenderFormat,
  AudioRenderJobPayload,
  AudioRenderOptions,
  AudioSession,
  RenderJob,
} from './types.js'

/** Default queue name jobs are dispatched to. */
export const DEFAULT_AUDIO_RENDER_QUEUE = 'audio-render'

/**
 * Resolve a `RenderJob`'s options + paths from the partial caller input.
 *
 * @param options
 * @internal
 */
const resolveOptions = (
  options: AudioRenderOptions = {},
): {
  format: AudioRenderFormat
  sampleRate: number
  channels: number
  bitrate?: string
  outputPath: string
  queueName: string
} => {
  const format: AudioRenderFormat = options.format ?? 'mp3'
  const sampleRate = options.sampleRate ?? 44100
  const channels = options.channels ?? 2
  const bitrate = options.bitrate ?? (format === 'mp3' ? '192k' : undefined)
  const queueName = options.queueName ?? DEFAULT_AUDIO_RENDER_QUEUE

  const id =
    (globalThis.crypto?.randomUUID?.() as string | undefined) ??
    `${Date.now()}-${Math.random().toString(36).slice(2)}`
  const outputPath = options.outputPath
    ? sanitizeAudioPath(options.outputPath, 'options.outputPath')
    : join(tmpdir(), `audio-render-${id}.${format}`)

  return { format, sampleRate, channels, bitrate, outputPath, queueName }
}

/**
 * Validate the caller-supplied session so the worker doesn't have to.
 *
 * @param session
 * @internal
 */
const validateSession = (session: AudioSession): void => {
  if (!session || typeof session !== 'object') {
    throw new Error('session must be an object')
  }
  if (!Array.isArray(session.channels)) {
    throw new Error('session.channels must be an array')
  }
  if (
    typeof session.duration !== 'number' ||
    !Number.isFinite(session.duration) ||
    session.duration < 0
  ) {
    throw new Error('session.duration must be a non-negative finite number')
  }
  for (const channel of session.channels) {
    if (!channel || typeof channel.id !== 'string' || channel.id.length === 0) {
      throw new Error('every channel requires a non-empty string id')
    }
    if (!Array.isArray(channel.clips)) {
      throw new Error(`channel ${channel.id}: clips must be an array`)
    }
    for (const clip of channel.clips) {
      sanitizeAudioPath(clip.audioUrl, `channel ${channel.id} clip audioUrl`)
      if (
        typeof clip.startTime !== 'number' ||
        !Number.isFinite(clip.startTime) ||
        clip.startTime < 0
      ) {
        throw new Error(`channel ${channel.id}: clip.startTime must be non-negative finite`)
      }
      if (
        typeof clip.duration !== 'number' ||
        !Number.isFinite(clip.duration) ||
        clip.duration < 0
      ) {
        throw new Error(`channel ${channel.id}: clip.duration must be non-negative finite`)
      }
    }
  }
}

/**
 * Enqueue an {@link AudioSession} for offline mixdown.
 *
 * Does NOT block on rendering. Returns immediately with a {@link RenderJob}
 * whose `status` starts at `'queued'`; poll {@link getRenderStatus} or
 * subscribe to the queue from a worker process to track progress.
 *
 * @param session - The multi-track session to render.
 * @param options - Output format / sample rate / channel count / bitrate
 *                  overrides. All fields optional — sensible mp3 defaults.
 * @returns The freshly-enqueued render job.
 * @throws {Error} If the session is malformed, a clip path contains a
 *                 control character, or no queue provider is bonded.
 */
export const renderAudio = async (
  session: AudioSession,
  options: AudioRenderOptions = {},
): Promise<RenderJob> => {
  validateSession(session)
  const resolved = resolveOptions(options)

  const enqueuedAt = new Date()
  const payload: AudioRenderJobPayload = {
    jobId: '', // filled in once the queue assigns the message id
    session,
    options,
    outputPath: resolved.outputPath,
    format: resolved.format,
  }

  const messageId = await send<AudioRenderJobPayload>(resolved.queueName, { body: payload })
  payload.jobId = messageId

  const job: RenderJob = {
    id: messageId,
    status: 'queued',
    queueName: resolved.queueName,
    outputPath: resolved.outputPath,
    format: resolved.format,
    session,
    options: {
      format: resolved.format,
      sampleRate: resolved.sampleRate,
      channels: resolved.channels,
      bitrate: resolved.bitrate,
    },
    enqueuedAt,
  }

  registerJob(job)
  return job
}

/**
 * Look up a previously-enqueued render job by id.
 *
 * **Process-local.** This reads the active job store (an in-memory `Map` by
 * default), which only reflects the worker's transitions when the worker runs
 * in the SAME process (true with the `@molecule/api-queue-memory` bond). With
 * a distributed queue bond and a separate worker process this returns the
 * stale `queued` snapshot forever — the worker's `processing`/`completed`/
 * `failed` updates land in the worker's own store. To make status observable
 * across processes, inject a shared backend via `setAudioJobStore()` in BOTH
 * processes, or persist durable status from the worker's `onJobComplete`
 * callback and read it from your own storage.
 *
 * @param jobId - The id returned in `RenderJob.id` from {@link renderAudio}.
 * @returns The job as known to THIS process's store, or `undefined`.
 */
export const getRenderStatus = (jobId: string): RenderJob | undefined => {
  return getJob(jobId)
}

/**
 * Mark a render job as cancelled.
 *
 * Cancellation is cooperative: a job already in `processing` will be
 * marked but the worker decides whether to honour the flag (the bundled
 * worker checks before spawning ffmpeg and again on completion). Jobs in
 * a terminal state (`completed`, `failed`, `cancelled`) are not changed.
 *
 * **Process-local**, same caveat as {@link getRenderStatus}: the flag is
 * written to this process's job store, so a worker in a separate process only
 * observes it when a shared store is injected via `setAudioJobStore()` in both
 * processes.
 *
 * @param jobId - The id returned in `RenderJob.id` from {@link renderAudio}.
 * @returns `true` if the job was found and a cancellation flag applied,
 *          `false` if the id is unknown or the job is already terminal.
 */
export const cancelRender = (jobId: string): boolean => {
  const job = getJob(jobId)
  if (!job) return false
  if (job.status === 'completed' || job.status === 'failed' || job.status === 'cancelled') {
    return false
  }
  updateJob(jobId, { status: 'cancelled', finishedAt: new Date() })
  return true
}
