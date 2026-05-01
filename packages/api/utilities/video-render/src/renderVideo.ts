/**
 * Public entry points: {@link renderVideo}, {@link getRenderStatus},
 * {@link cancelRender}.
 *
 * These are queue-driven wrappers: `renderVideo` enqueues a job onto the
 * bonded `@molecule/api-queue` provider and immediately returns a job
 * handle. The actual ffmpeg work is performed by the worker (see
 * `processRenderJob` in `./worker.ts`).
 *
 * @module
 */

import { send as queueSend } from '@molecule/api-queue'

import { assertValidTimeline, assertSafePath } from './buildFfmpegArgs.js'
import { getJobStore } from './jobStore.js'
import type {
  RenderJob,
  RenderJobMessage,
  RenderJobStatus,
  RenderVideoOptions,
  VideoTimeline,
} from './types.js'

const DEFAULT_QUEUE_NAME = 'video-render'
const DEFAULT_FORMAT = 'mp4' as const
const CODEC_DEFAULTS: Record<'mp4' | 'webm', RenderJobMessage['options']['codec']> = {
  mp4: 'libx264',
  webm: 'libvpx-vp9',
}

/**
 * Generate a stable random job ID. Format: `vrj_<16 hex chars>`. Uses
 * `crypto.randomUUID()` when available (Node 19+), otherwise a `Math.random`
 * fallback (sufficient for non-cryptographic uniqueness).
 *
 * @returns A new job ID.
 */
export function generateJobId(): string {
  const cryptoObj = (globalThis as { crypto?: { randomUUID?: () => string } }).crypto
  if (cryptoObj?.randomUUID) {
    return `vrj_${cryptoObj.randomUUID().replace(/-/g, '').slice(0, 16)}`
  }
  // Fallback: 64-bit random hex.
  const r = Math.floor(Math.random() * Number.MAX_SAFE_INTEGER).toString(16).padStart(13, '0')
  const r2 = Math.floor(Math.random() * 0xffffff).toString(16).padStart(6, '0')
  return `vrj_${(r + r2).slice(0, 16)}`
}

/**
 * Enqueue a video render job.
 *
 * The function validates the timeline + options, records an initial
 * `queued` status in the job store, and pushes a {@link RenderJobMessage}
 * onto the bonded queue. Workers consuming the queue invoke
 * `processRenderJob` to do the actual ffmpeg work.
 *
 * @param timeline - The timeline definition.
 * @param options - Render options (must include `outputPath`).
 * @returns A handle containing the new `jobId` and initial `status`.
 *
 * @throws {TypeError} If the timeline or options fail validation.
 */
export async function renderVideo(
  timeline: VideoTimeline,
  options: RenderVideoOptions,
): Promise<RenderJob> {
  assertValidTimeline(timeline)
  if (typeof options.outputPath !== 'string') {
    throw new TypeError('options.outputPath is required')
  }
  assertSafePath(options.outputPath, 'options.outputPath')

  const format = options.format ?? DEFAULT_FORMAT
  const codec = options.codec ?? CODEC_DEFAULTS[format]
  const queueName = options.queueName ?? DEFAULT_QUEUE_NAME
  const jobId = options.jobId ?? generateJobId()

  const message: RenderJobMessage = {
    jobId,
    timeline,
    options: {
      ...options,
      format,
      codec,
      queueName,
      jobId,
    },
  }

  // Record initial status BEFORE enqueueing so a worker that picks the job
  // up immediately can patch it without racing the producer.
  await getJobStore().set(jobId, { status: 'queued' })

  await queueSend(queueName, { id: jobId, body: message })

  return { jobId, status: 'queued', queueName }
}

/**
 * Read the current status of a render job. When the job is unknown to the
 * job store, returns a `failed`-shaped status with a clear `error` message.
 *
 * @param jobId - The job identifier returned by {@link renderVideo}.
 * @returns The current {@link RenderJobStatus}.
 */
export async function getRenderStatus(jobId: string): Promise<RenderJobStatus> {
  if (typeof jobId !== 'string' || jobId.length === 0) {
    throw new TypeError('jobId must be a non-empty string')
  }
  const status = await getJobStore().get(jobId)
  if (!status) {
    return { status: 'failed', error: 'Unknown jobId' }
  }
  return status
}

/**
 * Mark a render job as cancelled. If the worker has already started
 * processing, it is responsible for observing the cancelled state at the
 * next progress checkpoint and tearing down its ffmpeg child.
 *
 * Returns the resulting status snapshot.
 *
 * @param jobId - The job identifier.
 * @returns The post-cancel status.
 */
export async function cancelRender(jobId: string): Promise<RenderJobStatus> {
  if (typeof jobId !== 'string' || jobId.length === 0) {
    throw new TypeError('jobId must be a non-empty string')
  }
  return getJobStore().patch(jobId, { status: 'cancelled', finishedAt: new Date() })
}
